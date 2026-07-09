import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  allocateCreditSpend,
  createCodeSubmissionRecord,
  getAccountRecord,
  getCodeSubmissionRecord,
  markDeveloperReviewGateOnAccount,
  spendAccountCredits,
  updateCodeSubmissionRecord
} from "@/lib/account-records";
import { runAgentechAiCodeReview } from "@/lib/agentech-ai-review";
import { evaluateAgentechMovementSafety } from "@/lib/agentech-motion-safety";
import { validateAgentechCode } from "@/lib/agentech-validation";
import { isValidEmail } from "@/lib/prototype-auth";
import { getServerAccountEmail } from "@/lib/server-account-session";

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
  return value === "Physical hardware limit and capability test" || value === "Software check" || value === "AI software security review" || value === "Benchmark review only";
}

function getAiReviewCreditCost() {
  const parsed = Number(process.env.AGENTECH_AI_REVIEW_CREDITS ?? 50);
  return Number.isFinite(parsed) && parsed > 0 ? Math.ceil(parsed) : 1;
}

function getGatewayErrorStatus(error: unknown) {
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: unknown }).status)
    : 502;
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 502;
}

async function writeLocalSubmission(id: string, record: unknown) {
  const outputDir = path.join(process.cwd(), "agentech_submissions");
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, `${id}.json`), JSON.stringify(record, null, 2), "utf8");
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as SubmissionPayload;
    const submittedEmail = await getServerAccountEmail(request);
    const isLocalPreview = process.env.NODE_ENV !== "production";
    const email = isValidEmail(submittedEmail) ? submittedEmail : isLocalPreview ? "developer.preview@agentech.local" : submittedEmail;
    const developerName = cleanText(payload.developerName, isLocalPreview ? "Local preview" : "Agentech developer") || "Agentech developer";
    const robotModel = cleanText(payload.robotModel, "Aegies");
    const runMode = cleanText(payload.runMode, "Software check");
    const code = cleanText(payload.code);
    const uploadedFileName = cleanText(payload.uploadedFileName);
    const reviewStage = cleanText(payload.reviewStage, "physical");
    const submissionId = cleanText(payload.submissionId);
    const commands = extractCommands(code);

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Sign in before submitting code for AI review." }, { status: 401 });
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
    const movementSafety = evaluateAgentechMovementSafety(code);

    if (isLocalPreview) {
      if (reviewStage === "physical") {
        if (!movementSafety.submitReady) {
          return NextResponse.json(
            {
              error: movementSafety.detail,
              movementSafety,
              physicalSafetyStatus: movementSafety.level === "WARNING" ? "warning" : "failed",
              status: "physical_hardware_blocked"
            },
            { status: 400 }
          );
        }
        const submittedAt = new Date().toISOString();
        const id = `local-hardware-${submittedAt.replace(/[-:.TZ]/g, "").slice(0, 14)}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const source = uploadedFileName ? "uploaded_file" : "pasted_code";
        await writeLocalSubmission(id, {
          id,
          email,
          submittedAt,
          developerName,
          robotModel,
          runMode,
          source,
          uploadedFileName: uploadedFileName || null,
          commands,
          code,
          physicalSafetyStatus: "passed",
          movementSafety,
          aiSecurityStatus: "locked",
          creditsCharged: 0,
          localPreview: true
        });

        return NextResponse.json({
          id,
          submittedAt,
          commandCount: commands.length,
          source,
          uploadedFileName: uploadedFileName || null,
          physicalSafetyStatus: "passed",
          movementSafety,
          aiSecurityStatus: "locked",
          status: "physical_hardware_passed",
          localPreview: true
        });
      }

      if (reviewStage === "software") {
        const id = submissionId || `local-software-${Date.now()}`;
        return NextResponse.json({
          id,
          submittedAt: new Date().toISOString(),
          commandCount: commands.length,
          source: uploadedFileName ? "uploaded_file" : "pasted_code",
          uploadedFileName: uploadedFileName || null,
          physicalSafetyStatus: "passed",
          aiSecurityStatus: "passed",
          riskLevel: "low",
          summary: "Local preview Software Check passed without account credits.",
          findings: [],
          creditsCharged: 0,
          status: "approved_for_live_test",
          localPreview: true
        });
      }
    }

    const account = await getAccountRecord(email);
    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    if (reviewStage === "physical") {
      if (!movementSafety.submitReady) {
        return NextResponse.json(
          {
            error: movementSafety.detail,
            movementSafety,
            physicalSafetyStatus: movementSafety.level === "WARNING" ? "warning" : "failed",
            status: "physical_hardware_blocked"
          },
          { status: 400 }
        );
      }
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
        movementSafety,
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
        movementSafety,
        aiSecurityStatus: "locked",
        status: "physical_hardware_passed"
      });
    }

    if (reviewStage !== "software") {
      return NextResponse.json({ error: "Choose physical or software review stage." }, { status: 400 });
    }

    if (!submissionId) {
      return NextResponse.json({ error: "Run Step 3 Physical Hardware Check before starting Step 4 Software Check." }, { status: 400 });
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
        { error: "Supabase has not marked this account as Physical Hardware Check passed for this submission yet." },
        { status: 403 }
      );
    }

    if (submission.physical_safety_status !== "passed") {
      return NextResponse.json({ error: "Software Check unlocks only after Step 3 Physical Hardware Check passes." }, { status: 403 });
    }

    if (submission.code !== code) {
      return NextResponse.json({ error: "Code changed after Step 3 Physical Hardware Check passed. Run the hardware check again." }, { status: 409 });
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
    const spendPreview = allocateCreditSpend(account, creditCost);
    if (spendPreview.rechargeRequired) {
      await writeLocalSubmission(submission.id, record);
      return NextResponse.json(
        {
          error: `Step 3 Physical Hardware Check passed, but Step 4 Software Check needs ${creditCost} account credit${creditCost === 1 ? "" : "s"}.`,
          id: submission.id,
          physicalSafetyStatus: "passed",
          aiSecurityStatus: "locked",
          creditsRequired: creditCost,
          shortfall: spendPreview.shortfall
        },
        { status: 402 }
      );
    }

    await updateCodeSubmissionRecord(submission.id, {
      ai_security_status: "pending",
      credits_charged: 0
    });
    await markDeveloperReviewGateOnAccount({
      email,
      submissionId: submission.id,
      aiSecurityStatus: "pending"
    });

    let aiResult: Awaited<ReturnType<typeof runAgentechAiCodeReview>>;
    try {
      aiResult = await runAgentechAiCodeReview({
        userId: email,
        developerName,
        robotModel,
        runMode,
        githubRepoUrl: null,
        githubBranch: null,
        commands,
        code
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI gateway code scan failed.";
      const status = getGatewayErrorStatus(error);
      await updateCodeSubmissionRecord(submission.id, {
        ai_security_status: "error",
        ai_security_summary: message,
        ai_security_findings: [message],
        ai_security_reviewed_at: new Date().toISOString(),
        credits_charged: 0
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
        creditsCharged: 0
      });

      return NextResponse.json(
        {
          error: `Step 3 Physical Hardware Check passed, but Step 4 Software Check could not complete: ${message}`,
          id: submission.id,
          physicalSafetyStatus: "passed",
          aiSecurityStatus: "error",
          creditsCharged: 0
        },
        { status }
      );
    }

    const spend = await spendAccountCredits(email, creditCost);
    if (!spend || spend.rechargeRequired) {
      const message = "AI security scan completed, but account credits could not be charged. Recharge and run Software Check again.";
      await updateCodeSubmissionRecord(submission.id, {
        ai_security_status: "error",
        ai_security_summary: message,
        ai_security_findings: [message],
        ai_security_reviewed_at: new Date().toISOString(),
        credits_charged: 0
      });
      await markDeveloperReviewGateOnAccount({
        email,
        submissionId: submission.id,
        aiSecurityStatus: "error"
      });
      return NextResponse.json({ error: message, id: submission.id, physicalSafetyStatus: "passed", aiSecurityStatus: "error" }, { status: 402 });
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
