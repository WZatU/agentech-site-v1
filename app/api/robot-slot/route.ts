import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRobotSession, findRobotSessionConflict, getAccessProfiles, getAccountRecord, getRobotSessionsInWindow, hasPassedDeveloperCodeReview } from "@/lib/account-records";
import { accountSessionCookieName } from "@/lib/account-session";
import { sendEmail } from "@/lib/email";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";

type RobotSlotPayload = {
  email?: string;
  profileId?: number | string;
  scheduledStart?: string;
  timeZone?: string;
  robotModel?: string;
  presetDemo?: string;
  requestedRunType?: string;
  durationMinutes?: number | string;
  notes?: string;
};

const defaultSlotDurationMinutes = 5;
const allowedSlotDurations = new Set([5, 10, 15, 30]);
const slotIntervalMinutes = 5;
const minimumLeadTimeMs = 2 * 60 * 1000;
const defaultTimeZone = "America/Los_Angeles";

const robotModels = new Set(["Aegis Ultra", "Aegis EDU", "Aegis Pro", "Navi"]);
const presetDemos = new Map([
  ["starter_demo", "Starter demo: stand up, five forward steps, left/right, look up/down, backflip"],
  ["stand_up", "Stand up"],
  ["five_forward", "Five forward steps"],
  ["left_right", "Left/right movement"],
  ["look_up_down", "Look up/down"],
  ["backflip", "Backflip"],
  ["approved_custom_code", "Approved custom code live test"]
]);

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toProfileId(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function getSignedInEmail() {
  const cookieStore = await cookies();
  return normalizeEmail(cookieStore.get(accountSessionCookieName)?.value);
}

function isInternalEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@agent-tech.ai");
}

function getDurationMinutes(value: unknown) {
  const parsed = Number(value);
  return allowedSlotDurations.has(parsed) ? parsed : defaultSlotDurationMinutes;
}

function validTimeZone(value: string) {
  if (!value) {
    return defaultTimeZone;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return defaultTimeZone;
  }
}

function getTimeParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

  return { hour, minute };
}

function isWithinRobotHours(date: Date, timeZone: string) {
  const { hour, minute } = getTimeParts(date, timeZone);
  const minutes = hour * 60 + minute;

  return minutes >= 9 * 60 && minutes < 17 * 60;
}

function isBookableSlotInterval(date: Date, timeZone: string) {
  const { minute } = getTimeParts(date, timeZone);
  return minute % slotIntervalMinutes === 0;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function roundUpToSlot(date: Date) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  const minutes = rounded.getMinutes();
  const remainder = minutes % slotIntervalMinutes;
  if (remainder !== 0) {
    rounded.setMinutes(minutes + slotIntervalMinutes - remainder, 0, 0);
  }
  return rounded;
}

function normalizeRobotSlotStart(requestedStart: Date, timeZone: string) {
  const minimumStart = roundUpToSlot(new Date(Date.now() + minimumLeadTimeMs));
  const normalized = roundUpToSlot(requestedStart.getTime() < minimumStart.getTime() ? minimumStart : requestedStart);

  if (isWithinRobotHours(normalized, timeZone)) {
    return normalized;
  }

  while (!isWithinRobotHours(normalized, timeZone)) {
    normalized.setMinutes(normalized.getMinutes() + slotIntervalMinutes, 0, 0);
  }

  return normalized;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(date);
}

async function sendRobotSlotConfirmation(input: {
  email: string;
  accountName: string;
  profileUsername: string;
  profileType: string;
  robotModel: string;
  presetDemo: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  timeZone: string;
}) {
  const scheduledWindow = `${formatDateTime(input.scheduledStart, input.timeZone)} - ${formatDateTime(input.scheduledEnd, input.timeZone)}`;
  const subject = "Agentech robot slot request received";
  const text = [
    `Hi ${input.accountName || "there"},`,
    "",
    "We received your robot viewing slot request.",
    "",
    `Profile: @${input.profileUsername} (${input.profileType})`,
    `Robot: ${input.robotModel}`,
    `Time: ${scheduledWindow}`,
    `Demo: ${input.presetDemo}`,
    "",
    input.presetDemo === "Approved custom code live test"
      ? "This slot is for a supervised live test of code that passed Agentech physical safety and AI software security review."
      : "This slot is for a supervised preset viewing session.",
    "",
    "Agentech"
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5; max-width: 640px;">
      <h1 style="font-size: 24px; margin: 0 0 16px;">Robot slot request received</h1>
      <p>Hi ${escapeHtml(input.accountName || "there")},</p>
      <p>We received your robot viewing slot request.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr><td style="padding: 8px 0; color: #6b7280;">Profile</td><td style="padding: 8px 0; font-weight: 700;">@${escapeHtml(input.profileUsername)} (${escapeHtml(input.profileType)})</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Robot</td><td style="padding: 8px 0; font-weight: 700;">${escapeHtml(input.robotModel)}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Time</td><td style="padding: 8px 0; font-weight: 700;">${escapeHtml(scheduledWindow)}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Demo</td><td style="padding: 8px 0; font-weight: 700;">${escapeHtml(input.presetDemo)}</td></tr>
      </table>
      <p>${input.presetDemo === "Approved custom code live test" ? "This slot is for a supervised live test of code that passed Agentech physical safety and AI software security review." : "This slot is for a supervised preset viewing session."}</p>
      <p style="margin-top: 24px;">Agentech</p>
    </div>
  `;

  return sendEmail({
    to: input.email,
    subject,
    text,
    html
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const start = new Date(clean(url.searchParams.get("start")));
  const end = new Date(clean(url.searchParams.get("end")));

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: "Choose a valid availability window." }, { status: 400 });
  }

  const sessions = await getRobotSessionsInWindow(start.toISOString(), end.toISOString());
  const activeStatuses = new Set(["requested", "confirmed", "approved", "scheduled", "pending"]);
  const bookedSlots = sessions
    .filter((session) => activeStatuses.has(session.session_status.replace(/ /g, "_").toLowerCase()))
    .map((session) => ({
      id: session.id,
      scheduledStart: session.scheduled_start,
      scheduledEnd: session.scheduled_end,
      status: session.session_status
    }));

  return NextResponse.json({ ok: true, bookedSlots });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as RobotSlotPayload | null;
  const email = normalizeEmail(payload?.email);
  const signedInEmail = await getSignedInEmail();
  const profileId = toProfileId(payload?.profileId);
  const scheduledStartRaw = clean(payload?.scheduledStart);
  const requestedScheduledStart = new Date(scheduledStartRaw);
  const timeZone = validTimeZone(clean(payload?.timeZone));
  const requestedRunType = clean(payload?.requestedRunType) || "preset_demo";
  const durationMinutes = getDurationMinutes(payload?.durationMinutes);
  const robotModel = robotModels.has(clean(payload?.robotModel)) ? clean(payload?.robotModel) : "Aegis Ultra";
  const presetDemoKey = presetDemos.has(clean(payload?.presetDemo)) ? clean(payload?.presetDemo) : "starter_demo";

  if (!isValidEmail(signedInEmail)) {
    return NextResponse.json({ error: "Sign in before scheduling a robot viewing session." }, { status: 401 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "A valid account email is required." }, { status: 400 });
  }

  if (email !== signedInEmail) {
    return NextResponse.json({ error: "Robot slots can only be scheduled from the signed-in account." }, { status: 403 });
  }

  if (!profileId) {
    return NextResponse.json({ error: "Choose the profile that will use this robot slot." }, { status: 400 });
  }

  if (Number.isNaN(requestedScheduledStart.getTime())) {
    return NextResponse.json({ error: "Choose a valid robot slot time." }, { status: 400 });
  }

  const scheduledStart = normalizeRobotSlotStart(requestedScheduledStart, timeZone);

  if (!isWithinRobotHours(scheduledStart, timeZone)) {
    return NextResponse.json({ error: "Robot slots must start between 9:00 AM and 5:00 PM." }, { status: 400 });
  }

  if (!isBookableSlotInterval(scheduledStart, timeZone)) {
    return NextResponse.json({ error: "Robot slots must start on a 5-minute boundary." }, { status: 400 });
  }

  if (requestedRunType !== "preset_demo" && requestedRunType !== "custom_code") {
    return NextResponse.json(
      { error: "Choose preset viewing or an approved custom-code live test." },
      { status: 400 }
    );
  }

  const account = await getAccountRecord(email);
  if (!account) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  if (!isInternalEmail(email) && Number(account.credit_balance ?? 0) <= 0) {
    return NextResponse.json({ error: "Robot viewing requires account credits." }, { status: 402 });
  }

  const profiles = await getAccessProfiles(email);
  const selectedProfile = profiles.find((profile) => profile.id === profileId);
  if (!selectedProfile) {
    return NextResponse.json({ error: "That profile does not belong to this account." }, { status: 403 });
  }

  if (requestedRunType === "custom_code" && !isInternalEmail(email) && !(await hasPassedDeveloperCodeReview(email))) {
    return NextResponse.json(
      { error: "Custom live-code testing unlocks only after the physical safety gate and AI security scan both pass." },
      { status: 403 }
    );
  }

  const presetDemo = requestedRunType === "custom_code"
    ? presetDemos.get("approved_custom_code") ?? "Approved custom code live test"
    : presetDemos.get(presetDemoKey) ?? presetDemos.get("starter_demo") ?? "Preset robot demo";
  const scheduledEnd = addMinutes(scheduledStart, durationMinutes);
  const conflictingSession = await findRobotSessionConflict(scheduledStart.toISOString(), scheduledEnd.toISOString());
  if (conflictingSession) {
    return NextResponse.json({ error: "That robot slot is already requested. Choose another available time." }, { status: 409 });
  }

  const session = await createRobotSession({
    email,
    accessProfileId: selectedProfile.id,
    profileUsername: selectedProfile.username,
    profileType: selectedProfile.profile_type,
    sessionTitle: `${presetDemo} for @${selectedProfile.username}`,
    robotModel,
    scheduledStart: scheduledStart.toISOString(),
    scheduledEnd: scheduledEnd.toISOString(),
    requestedRunType: requestedRunType as "preset_demo" | "custom_code",
    approvedRunType: requestedRunType === "custom_code" ? "custom_code" : "preset_demo",
    presetDemo,
    benchmarkStatus: requestedRunType === "custom_code" ? "passed" : "not_started",
    notes: clean(payload?.notes) || null
  });

  const accountName = [account.first_name, account.last_name].filter(Boolean).join(" ");
  const emailResult = await sendRobotSlotConfirmation({
    email,
    accountName,
    profileUsername: selectedProfile.username,
    profileType: selectedProfile.profile_type,
    robotModel,
    presetDemo,
    scheduledStart,
    scheduledEnd,
    timeZone
  }).catch(() => ({ sent: false }));

  return NextResponse.json({ ok: true, session, emailSent: emailResult.sent });
}
