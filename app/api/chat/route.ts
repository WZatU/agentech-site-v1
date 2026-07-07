import { NextRequest, NextResponse } from "next/server";
import { callOpenAiResponsesThroughGateway } from "@/lib/eai-ai-gateway";
import { isValidEmail } from "@/lib/prototype-auth";
import { getServerAccountEmail } from "@/lib/server-account-session";

type ChatPayload = {
  model?: string;
  messages?: unknown;
  input?: unknown;
};

function getGatewayErrorStatus(error: unknown) {
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: unknown }).status)
    : 500;
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

export async function POST(request: NextRequest) {
  try {
    const email = await getServerAccountEmail(request);
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as ChatPayload | null;
    const model = typeof payload?.model === "string" && payload.model.trim()
      ? payload.model.trim()
      : process.env.OPENAI_CHAT_MODEL || "gpt-5.5";
    const input = payload?.input ?? payload?.messages;

    if (!Array.isArray(input) && typeof input !== "string") {
      return NextResponse.json({ error: "Send messages or input for the gateway chat request." }, { status: 400 });
    }

    const gatewayResponse = await callOpenAiResponsesThroughGateway({
      userId: email,
      endpoint: "chat",
      model,
      body: {
        model,
        input
      }
    });

    if (!gatewayResponse.ok) {
      return NextResponse.json(
        { error: "Model provider unavailable", providerStatus: gatewayResponse.status },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      model,
      response: gatewayResponse.payload,
      usage: gatewayResponse.usage,
      estimatedCost: gatewayResponse.estimatedCost
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI gateway request failed." },
      { status: getGatewayErrorStatus(error) }
    );
  }
}
