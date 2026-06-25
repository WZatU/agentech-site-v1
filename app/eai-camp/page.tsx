import { redirect } from "next/navigation";

import { eaiImmersionSlug } from "@/lib/program-journey-data";

export default function EaiCampRedirectPage() {
  redirect(`/agentech-education/${eaiImmersionSlug}`);
}
