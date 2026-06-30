import { NextResponse } from "next/server";
import { createRobotSession, getAccessProfiles, getAccountRecord } from "@/lib/account-records";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";

type RobotSlotPayload = {
  email?: string;
  profileId?: number | string;
  scheduledStart?: string;
  timeZone?: string;
  robotModel?: string;
  presetDemo?: string;
  requestedRunType?: string;
  notes?: string;
};

const slotDurationMinutes = 30;
const minimumLeadTimeMs = 24 * 60 * 60 * 1000;
const defaultTimeZone = "America/Los_Angeles";

const robotModels = new Set(["Aegis Ultra", "Aegis EDU", "Aegis Pro", "Navi"]);
const presetDemos = new Map([
  ["starter_demo", "Starter demo: stand up, five forward steps, left/right, look up/down, backflip"],
  ["stand_up", "Stand up"],
  ["five_forward", "Five forward steps"],
  ["left_right", "Left/right movement"],
  ["look_up_down", "Look up/down"],
  ["backflip", "Backflip"]
]);

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toProfileId(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as RobotSlotPayload | null;
  const email = normalizeEmail(payload?.email);
  const profileId = toProfileId(payload?.profileId);
  const scheduledStartRaw = clean(payload?.scheduledStart);
  const scheduledStart = new Date(scheduledStartRaw);
  const timeZone = validTimeZone(clean(payload?.timeZone));
  const requestedRunType = clean(payload?.requestedRunType) || "preset_demo";
  const robotModel = robotModels.has(clean(payload?.robotModel)) ? clean(payload?.robotModel) : "Aegis Ultra";
  const presetDemoKey = presetDemos.has(clean(payload?.presetDemo)) ? clean(payload?.presetDemo) : "starter_demo";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "A valid account email is required." }, { status: 400 });
  }

  if (!profileId) {
    return NextResponse.json({ error: "Choose the profile that will use this robot slot." }, { status: 400 });
  }

  if (Number.isNaN(scheduledStart.getTime())) {
    return NextResponse.json({ error: "Choose a valid robot slot time." }, { status: 400 });
  }

  if (scheduledStart.getTime() < Date.now() + minimumLeadTimeMs) {
    return NextResponse.json({ error: "Robot slots must be requested at least 24 hours in advance." }, { status: 400 });
  }

  if (!isWithinRobotHours(scheduledStart, timeZone)) {
    return NextResponse.json({ error: "Robot slots must start between 9:00 AM and 5:00 PM." }, { status: 400 });
  }

  if (requestedRunType !== "preset_demo") {
    return NextResponse.json(
      { error: "Custom robot code requires the benchmark gate first. Request a preset demo slot for now." },
      { status: 400 }
    );
  }

  const account = await getAccountRecord(email);
  if (!account) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const profiles = await getAccessProfiles(email);
  const selectedProfile = profiles.find((profile) => profile.id === profileId);
  if (!selectedProfile) {
    return NextResponse.json({ error: "That profile does not belong to this account." }, { status: 403 });
  }

  const presetDemo = presetDemos.get(presetDemoKey) ?? presetDemos.get("starter_demo") ?? "Preset robot demo";
  const scheduledEnd = addMinutes(scheduledStart, slotDurationMinutes);
  const session = await createRobotSession({
    email,
    accessProfileId: selectedProfile.id,
    profileUsername: selectedProfile.username,
    profileType: selectedProfile.profile_type,
    sessionTitle: `${presetDemo} for @${selectedProfile.username}`,
    robotModel,
    scheduledStart: scheduledStart.toISOString(),
    scheduledEnd: scheduledEnd.toISOString(),
    requestedRunType: "preset_demo",
    approvedRunType: "preset_demo",
    presetDemo,
    benchmarkStatus: "not_started",
    notes: clean(payload?.notes) || null
  });

  return NextResponse.json({ ok: true, session });
}
