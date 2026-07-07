import { notFound, redirect } from "next/navigation";
import { AiGatewayAdminDashboard } from "@/components/ai-gateway-admin-dashboard";
import { isValidEmail } from "@/lib/prototype-auth";
import { getServerAccountEmail } from "@/lib/server-account-session";
import { supabaseRequest } from "@/lib/supabase-server";

export const metadata = {
  title: "AI Gateway Admin | Agentech",
  description: "Owner-only EAI Cloud AI Gateway usage monitor."
};

async function isAiGatewayAdmin(email: string) {
  if (email !== "info@agent-tech.ai") {
    return false;
  }

  const rows = await supabaseRequest<Array<{ email: string; active: boolean }>>("agentech_admin_users", {
    query: `email=eq.${encodeURIComponent(email)}&active=eq.true&select=email,active&limit=1`
  }).catch(() => []);

  return rows.length > 0;
}

export default async function AiGatewayAdminPage() {
  const email = await getServerAccountEmail();

  if (!isValidEmail(email)) {
    redirect("/login?next=/admin/ai-gateway");
  }

  if (!(await isAiGatewayAdmin(email))) {
    notFound();
  }

  return <AiGatewayAdminDashboard adminEmail={email} />;
}
