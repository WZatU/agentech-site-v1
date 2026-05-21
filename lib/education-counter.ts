import { supabaseRequest } from "@/lib/supabase-server";

type CounterRow = {
  key: string;
  value: number;
};

const counterKey = "children_enrolled";

export async function getChildrenEnrolled() {
  try {
    const children = await supabaseRequest<Array<{ id: number }>>("agentech_children", {
      query: "select=id"
    });
    return children.length;
  } catch {
    try {
      const rows = await supabaseRequest<CounterRow[]>("agentech_counters", {
        query: `key=eq.${counterKey}&select=key,value&limit=1`
      });
      return rows[0]?.value ?? 0;
    } catch {
      return 0;
    }
  }
}

export async function incrementChildrenEnrolled(count: number) {
  const current = await getChildrenEnrolled();
  const next = current + count;

  await supabaseRequest<CounterRow[]>("agentech_counters", {
    method: "POST",
    query: "on_conflict=key",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      key: counterKey,
      value: next
    }
  });

  return next;
}
