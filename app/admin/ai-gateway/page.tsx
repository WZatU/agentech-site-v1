import { notFound, redirect } from "next/navigation";
import { AiGatewayAdminDashboard } from "@/components/ai-gateway-admin-dashboard";
import { isAgentechGatewayOwnerEmail } from "@/lib/company-accounts";
import { isValidEmail } from "@/lib/prototype-auth";
import { getServerAccountEmail } from "@/lib/server-account-session";
import { supabaseRequest } from "@/lib/supabase-server";

export const metadata = {
  title: "AI Gateway Admin | Agentech",
  description: "Owner-only EAI Cloud AI Gateway usage monitor."
};

async function isAiGatewayAdmin(email: string) {
  if (!isAgentechGatewayOwnerEmail(email)) {
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

  return (
    <main className="account-white-page min-h-screen bg-[#f6f8fc] px-4 py-8 text-slate-950 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <AiGatewayAdminDashboard adminEmail={email} />
      </div>
    </main>
  );
}
