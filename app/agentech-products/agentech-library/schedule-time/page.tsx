import { redirect } from "next/navigation";
import { getEaicHubTaskPath } from "@/lib/eaic-hub";

export default function ScheduleRobotTimePage() {
  redirect(getEaicHubTaskPath("schedule-time"));
}
