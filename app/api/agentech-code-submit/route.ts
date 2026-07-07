import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createCodeSubmissionRecord,
  getAccountRecord,
  markDeveloperReviewGateOnAccount,
  spendAccountCredits,
  updateCodeSubmissionRecord
} from "@/lib/account-records";
import { accountSessionCookieName } from "@/lib/account-session";
import { runAgentechAiCodeReview } from "@/lib/agentech-ai-review";
import { validateAgentechCode } from "@/lib/agentech-validation";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";

type SubmissionPayload = {
  developerName?: string;
  robotModel?: string;
  runMode?: string;
  code?: string;
  githubRepoUrl?: string;
  githubBranch?: string;
  commands?: string[];
};

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function extractCommands(code: string) {
  const commands: string[] = [];
  const pattern = /(?:Agentech|dog)\.(\w+)\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(code)) !== null) {
    const args = match[2].trim();
    commands.push(`${match[1]}(${args})`);
  }
  return commands;
}

function isAllowedGithubRepo(value: string) {
  if (!value) {
    return true;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com" && url.pathname.split("/").filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

function cleanBranch(value: string) {
  const branch = value || "main";
  if (!/^[A-Za-z0-9._/-]{1,120}$/.test(branch)) {
    return null;
  }
  return branch;
}

function isAllowedRunMode(value: string) {
  return value === "AI software security review" || value === "Benchmark review only" || value === "Dry-run review";
}

async function getSignedInEmail() {
  const cookieStore = await cookies();
  return normalizeEmail(cookieStore.get(accountSessionCookieName)?.value);
}

function getAiReviewCreditCost() {
  const parsed = Number(process.env.AGENTECH_AI_REVIEW_CREDITS ?? 50);
  return Number.isFinite(parsed) && parsed > 0 ? Math.ceil(parsed) : 1;
}

async function writeLocalSubmission(id: string, record: unknown) {
  const outputDir = path.join(process.cwd(), "agentech_submissions");
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, `${id}.json`), JSON.stringify(record, null, 2), "utf8");
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as SubmissionPayload;
    const email = await getSignedInEmail();
    const developerName = cleanText(payload.developerName);
    const robotModel = cleanText(payload.robotModel, "Aegis Ultra");
    const runMode = cleanText(payload.runMode, "Benchmark review only");
    const code = cleanText(payload.code);
    const githubRepoUrl = cleanText(payload.githubRepoUrl);
    const githubBranch = cleanBranch(cleanText(payload.githubBranch, "main"));
    const commands = extractCommands(code);

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Sign in before submitting code for AI review." }, { status: 401 });
    }

    if (!developerName) {
      return NextResponse.json({ error: "Developer name or team is required." }, { status: 400 });
    }

    if (!isAllowedGithubRepo(githubRepoUrl)) {
      return NextResponse.json({ error: "Use a valid https://github.com/owner/repo URL." }, { status: 400 });
    }

    if (!githubBranch) {
      return NextResponse.json(
        { error: "Branch name can only include letters, numbers, '.', '_', '/', and '-'." },
        { status: 400 }
      );
    }

    if (!isAllowedRunMode(runMode)) {
      return NextResponse.json(
        { error: "Custom code can only be submitted for benchmark review until the benchmark gate is available and passed." },
        { status: 400 }
      );
    }

    if ((!code || !commands.length) && !githubRepoUrl) {
      return NextResponse.json({ error: "Paste Agentech code or provide a GitHub repository link." }, { status: 400 });
    }

    const validationErrors = validateAgentechCode(code);
    if (validationErrors.length) {
      return NextResponse.json({ error: validationErrors.join(" ") }, { status: 400 });
    }

    const account = await getAccountRecord(email);
    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const submittedAt = new Date().toISOString();
    const id = `agentech-${submittedAt.replace(/[-:.TZ]/g, "").slice(0, 14)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const record = {
      id,
      email,
      submittedAt,
      developerName,
      robotModel,
      runMode,
      source: githubRepoUrl ? "github" : "pasted_code",
      githubRepoUrl: githubRepoUrl || null,
      githubBranch: githubRepoUrl ? githubBranch : null,
      commands,
      code,
      physicalSafetyStatus: "passed",
      aiSecurityStatus: "locked",
      creditsCharged: 0
    };

    await createCodeSubmissionRecord({
      id,
      email,
      developerName,
      robotModel,
      runMode,
      source: record.source as "pasted_code" | "github",
      githubRepoUrl: record.githubRepoUrl,
      githubBranch: record.githubBranch,
      commands,
      code
    });
    await markDeveloperReviewGateOnAccount({
      email,
      submissionId: id,
      physicalSafetyStatus: "passed",
      aiSecurityStatus: "locked"
    });

    const creditCost = getAiReviewCreditCost();
    const spend = await spendAccountCredits(email, creditCost);
    if (!spend || spend.rechargeRequired) {
      await writeLocalSubmission(id, record);
      return NextResponse.json(
        {
          error: `Physical safety passed, but the AI security scan needs ${creditCost} account credit${creditCost === 1 ? "" : "s"}.`,
          id,
          physicalSafetyStatus: "passed",
          aiSecurityStatus: "locked",
          creditsRequired: creditCost,
          shortfall: spend?.shortfall ?? creditCost
        },
        { status: 402 }
      );
    }

    await updateCodeSubmissionRecord(id, {
      ai_security_status: "pending",
      credits_charged: creditCost
    });
    await markDeveloperReviewGateOnAccount({
      email,
      submissionId: id,
      aiSecurityStatus: "pending"
    });

    let aiResult: Awaited<ReturnType<typeof runAgentechAiCodeReview>>;
    try {
      aiResult = await runAgentechAiCodeReview({
        developerName,
        robotModel,
        runMode,
        githubRepoUrl: record.githubRepoUrl,
        githubBranch: record.githubBranch,
        commands,
        code
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "OpenAI code scan failed.";
      await updateCodeSubmissionRecord(id, {
        ai_security_status: "error",
        ai_security_summary: message,
        ai_security_findings: [message],
        ai_security_reviewed_at: new Date().toISOString(),
        credits_charged: creditCost
      });
      await markDeveloperReviewGateOnAccount({
        email,
        submissionId: id,
        aiSecurityStatus: "error"
      });
      await writeLocalSubmission(id, {
        ...record,
        aiSecurityStatus: "error",
        aiSecuritySummary: message,
        creditsCharged: creditCost
      });

      return NextResponse.json(
        {
          error: `Physical safety passed, but the AI security scan could not complete: ${message}`,
          id,
          physicalSafetyStatus: "passed",
          aiSecurityStatus: "error",
          creditsCharged: creditCost
        },
        { status: 502 }
      );
    }

    const aiSecurityStatus = aiResult.review.passed ? "passed" : "failed";
    await updateCodeSubmissionRecord(id, {
      ai_security_status: aiSecurityStatus,
      ai_security_model: aiResult.model,
      ai_security_summary: aiResult.review.summary,
      ai_security_findings: aiResult.review.findings,
      ai_security_risk_level: aiResult.review.riskLevel,
      ai_security_reviewed_at: new Date().toISOString(),
      credits_charged: creditCost
    });
    await markDeveloperReviewGateOnAccount({
      email,
      submissionId: id,
      aiSecurityStatus
    });

    await writeLocalSubmission(id, {
      ...record,
      aiSecurityStatus,
      aiSecurityModel: aiResult.model,
      aiSecuritySummary: aiResult.review.summary,
      aiSecurityFindings: aiResult.review.findings,
      aiSecurityRiskLevel: aiResult.review.riskLevel,
      creditsCharged: creditCost
    });

    if (!aiResult.review.passed) {
      return NextResponse.json(
        {
          error: `AI security scan failed: ${aiResult.review.summary}`,
          id,
          physicalSafetyStatus: "passed",
          aiSecurityStatus,
          riskLevel: aiResult.review.riskLevel,
          findings: aiResult.review.findings,
          creditsCharged: creditCost
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      id,
      submittedAt,
      commandCount: commands.length,
      source: record.source,
      githubBranch: record.githubBranch,
      physicalSafetyStatus: "passed",
      aiSecurityStatus,
      riskLevel: aiResult.review.riskLevel,
      summary: aiResult.review.summary,
      findings: aiResult.review.findings,
      creditsCharged: creditCost,
      status: "approved_for_live_test"
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Submission failed." },
      { status: 500 }
    );
  }
}
