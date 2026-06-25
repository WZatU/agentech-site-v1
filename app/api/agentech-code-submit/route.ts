import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { validateAgentechCode } from "@/lib/agentech-validation";

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

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as SubmissionPayload;
    const developerName = cleanText(payload.developerName);
    const robotModel = cleanText(payload.robotModel, "Aegis Ultra");
    const runMode = cleanText(payload.runMode, "Dry-run review");
    const code = cleanText(payload.code);
    const githubRepoUrl = cleanText(payload.githubRepoUrl);
    const githubBranch = cleanBranch(cleanText(payload.githubBranch, "main"));
    const commands = extractCommands(code);

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

    if ((!code || !commands.length) && !githubRepoUrl) {
      return NextResponse.json({ error: "Paste Agentech code or provide a GitHub repository link." }, { status: 400 });
    }

    const validationErrors = validateAgentechCode(code);
    if (validationErrors.length) {
      return NextResponse.json({ error: validationErrors.join(" ") }, { status: 400 });
    }

    const submittedAt = new Date().toISOString();
    const id = `agentech-${submittedAt.replace(/[-:.TZ]/g, "").slice(0, 14)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const record = {
      id,
      submittedAt,
      developerName,
      robotModel,
      runMode,
      source: githubRepoUrl ? "github" : "pasted_code",
      githubRepoUrl: githubRepoUrl || null,
      githubBranch: githubRepoUrl ? githubBranch : null,
      commands,
      code
    };

    const outputDir = path.join(process.cwd(), "agentech_submissions");
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(outputDir, `${id}.json`), JSON.stringify(record, null, 2), "utf8");

    return NextResponse.json({
      id,
      submittedAt,
      commandCount: commands.length,
      source: record.source,
      githubBranch: record.githubBranch,
      status: "queued_for_review"
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Submission failed." },
      { status: 500 }
    );
  }
}
