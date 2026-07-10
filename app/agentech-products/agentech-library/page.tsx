import { redirect } from "next/navigation";
import { eaicHubPath } from "@/lib/eaic-hub";

export default function AgentechLibraryPage() {
  redirect(eaicHubPath);
}
