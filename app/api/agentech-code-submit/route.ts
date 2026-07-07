import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createCodeSubmissionRecord,
  getAccountRecord,
  getCodeSubmissionRecord,
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
  uploadedFileName?: string;
  commands?: string[];
  reviewStage?: string;
  submissionId?: string;
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

function isAllowedRunMode(value: string) {
  return value === "Software check" || value === "AI software security review" || value === "Benchmark review only" || value === "Dry-run review";
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
    const runMode = cleanText(payload.runMode, "Software check");
    const code = cleanText(payload.code);
    const uploadedFileName = cleanText(payload.uploadedFileName);
    const reviewStage = cleanText(payload.reviewStage, "physical");
    const submissionId = cleanText(payload.submissionId);
    const commands = extractCommands(code);

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Sign in before submitting code for AI review." }, { status: 401 });
    }

    if (!developerName) {
      return NextResponse.json({ error: "Developer name or team is required." }, { status: 400 });
    }

    if (!isAllowedRunMode(runMode)) {
      return NextResponse.json({ error: "Choose a valid review mode." }, { status: 400 });
    }

    if (!code || !commands.length) {
      return NextResponse.json({ error: "Upload or paste an Agentech Python code file before running review." }, { status: 400 });
    }

    const validationErrors = validateAgentechCode(code);
    if (validationErrors.length) {
      return NextResponse.json({ error: validationErrors.join(" ") }, { status: 400 });
    }

    const account = await getAccountRecord(email);
    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    if (reviewStage === "physical") {
      const submittedAt = new Date().toISOString();
      const id = `agentech-${submittedAt.replace(/[-:.TZ]/g, "").slice(0, 14)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const source = uploadedFileName ? "uploaded_file" : "pasted_code";
      const record = {
        id,
        email,
        submittedAt,
        developerName,
        robotModel,
        runMode,
        source,
        uploadedFileName: uploadedFileName || null,
        githubRepoUrl: null,
        githubBranch: null,
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
        source,
        uploadedFileName: uploadedFileName || null,
        githubRepoUrl: null,
        githubBranch: null,
        commands,
        code
      });
      await markDeveloperReviewGateOnAccount({
        email,
        submissionId: id,
        physicalSafetyStatus: "passed",
        aiSecurityStatus: "locked"
      });
      await writeLocalSubmission(id, record);

      return NextResponse.json({
        id,
        submittedAt,
        commandCount: commands.length,
        source,
        uploadedFileName: uploadedFileName || null,
        physicalSafetyStatus: "passed",
        aiSecurityStatus: "locked",
        status: "physical_safety_passed"
      });
    }

    if (reviewStage !== "software") {
      return NextResponse.json({ error: "Choose physical or software review stage." }, { status: 400 });
    }

    if (!submissionId) {
      return NextResponse.json({ error: "Run the physical safety check before starting the software check." }, { status: 400 });
    }

    const submission = await getCodeSubmissionRecord(submissionId, email);
    if (!submission) {
      return NextResponse.json({ error: "Physical safety submission not found for this account." }, { status: 404 });
    }

    if (
      account.developer_latest_code_submission_id !== submissionId ||
      account.developer_physical_safety_status !== "passed"
    ) {
      return NextResponse.json(
        { error: "Supabase has not marked this account as physical-safety passed for this submission yet." },
        { status: 403 }
      );
    }

    if (submission.physical_safety_status !== "passed") {
      return NextResponse.json({ error: "Software check unlocks only after the physical safety check passes." }, { status: 403 });
    }

    if (submission.code !== code) {
      return NextResponse.json({ error: "Code changed after physical safety passed. Run the physical safety check again." }, { status: 409 });
    }

    const record = {
      id: submission.id,
      email,
      submittedAt: submission.created_at,
      developerName: submission.developer_name,
      robotModel: submission.robot_model,
      runMode: submission.run_mode,
      source: submission.source,
      uploadedFileName: submission.uploaded_file_name,
      githubRepoUrl: null,
      githubBranch: null,
      commands,
      code,
      physicalSafetyStatus: "passed",
      aiSecurityStatus: "pending",
      creditsCharged: 0
    };

    const creditCost = getAiReviewCreditCost();
    const spend = await spendAccountCredits(email, creditCost);
    if (!spend || spend.rechargeRequired) {
      await writeLocalSubmission(submission.id, record);
      return NextResponse.json(
        {
          error: `Physical safety passed, but the AI security scan needs ${creditCost} account credit${creditCost === 1 ? "" : "s"}.`,
          id: submission.id,
          physicalSafetyStatus: "passed",
          aiSecurityStatus: "locked",
          creditsRequired: creditCost,
          shortfall: spend?.shortfall ?? creditCost
        },
        { status: 402 }
      );
    }

    await updateCodeSubmissionRecord(submission.id, {
      ai_security_status: "pending",
      credits_charged: creditCost
    });
    await markDeveloperReviewGateOnAccount({
      email,
      submissionId: submission.id,
      aiSecurityStatus: "pending"
    });

    let aiResult: Awaited<ReturnType<typeof runAgentechAiCodeReview>>;
    try {
      aiResult = await runAgentechAiCodeReview({
        developerName,
        robotModel,
        runMode,
        githubRepoUrl: null,
        githubBranch: null,
        commands,
        code
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "OpenAI code scan failed.";
      await updateCodeSubmissionRecord(submission.id, {
        ai_security_status: "error",
        ai_security_summary: message,
        ai_security_findings: [message],
        ai_security_reviewed_at: new Date().toISOString(),
        credits_charged: creditCost
      });
      await markDeveloperReviewGateOnAccount({
        email,
        submissionId: submission.id,
        aiSecurityStatus: "error"
      });
      await writeLocalSubmission(submission.id, {
        ...record,
        aiSecurityStatus: "error",
        aiSecuritySummary: message,
        creditsCharged: creditCost
      });

      return NextResponse.json(
        {
          error: `Physical safety passed, but the AI security scan could not complete: ${message}`,
          id: submission.id,
          physicalSafetyStatus: "passed",
          aiSecurityStatus: "error",
          creditsCharged: creditCost
        },
        { status: 502 }
      );
    }

    const aiSecurityStatus = aiResult.review.passed ? "passed" : "failed";
    await updateCodeSubmissionRecord(submission.id, {
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
      submissionId: submission.id,
      aiSecurityStatus
    });

    await writeLocalSubmission(submission.id, {
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
          id: submission.id,
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
      id: submission.id,
      submittedAt: submission.created_at,
      commandCount: commands.length,
      source: record.source,
      uploadedFileName: record.uploadedFileName,
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
