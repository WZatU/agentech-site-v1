import { NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";
import { supabaseRequest } from "@/lib/supabase-server";

type DeletePayload = {
  email?: string;
  itemId?: string;
};

export async function DELETE(request: Request) {
  const payload = (await request.json().catch(() => null)) as DeletePayload | null;
  const email = normalizeEmail(payload?.email);
  const itemId = payload?.itemId || "";
  const match = /^item-(\d+)$/.exec(itemId);

  if (!isValidEmail(email) || !match) {
    return NextResponse.json({ error: "Choose a valid unpaid item to remove." }, { status: 400 });
  }

  await supabaseRequest<null>("agentech_invoice_items", {
    method: "DELETE",
    query: `id=eq.${match[1]}&email=eq.${encodeURIComponent(email)}&paid=eq.false`,
    prefer: "return=minimal"
  });

  return NextResponse.json({ ok: true });
}
