"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

type AuthMode = "signin" | "signup";
type SignupStep = "email" | "verify";

type ApiResult = {
  ok?: boolean;
  email?: string;
  error?: string;
  devCode?: string;
  message?: string;
};

export function UniversalAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account-setup";
  const [mode, setMode] = useState<AuthMode>("signup");
  const [signupStep, setSignupStep] = useState<SignupStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [devCode, setDevCode] = useState("");

  function rememberAndContinue(accountEmail: string) {
    window.localStorage.setItem("agentechAccountEmail", accountEmail);
    router.push(next);
  }

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    setDevCode("");

    const response = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const result = (await response.json()) as ApiResult;

    if (!response.ok) {
      setStatus("error");
      setMessage(result.error || "Unable to send code.");
      return;
    }

    setStatus("success");
    setSignupStep("verify");
    setMessage(result.message || "Verification code sent.");
    setDevCode(result.devCode || "");
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/auth/create-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, password })
    });
    const result = (await response.json()) as ApiResult;

    if (!response.ok || !result.email) {
      setStatus("error");
      setMessage(result.error || "Unable to create account.");
      return;
    }

    setStatus("success");
    rememberAndContinue(result.email);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const result = (await response.json()) as ApiResult;

    if (!response.ok || !result.email) {
      setStatus("error");
      setMessage(result.error || "Unable to sign in.");
      return;
    }

    setStatus("success");
    rememberAndContinue(result.email);
  }

  return (
    <div className="rounded-[28px] border border-[#cbd5e1] bg-white p-7 shadow-xl shadow-slate-300/70 md:p-9">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#334155]">Universal Account</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0b1220]">Agentech sign in</h2>
        <p className="mt-3 text-sm leading-6 text-[#334155]">
          Use one account for education programs and robot preorders. Online payment is not accepted right now.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 rounded-2xl bg-[#f1f5f9] p-1">
        {(["signup", "signin"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setMode(option);
              setStatus("idle");
              setMessage("");
              setDevCode("");
            }}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === option ? "bg-white text-[#0b1220] shadow-sm" : "text-[#475569]"
            }`}
          >
            {option === "signup" ? "Create Account" : "Sign In"}
          </button>
        ))}
      </div>

      {mode === "signup" && signupStep === "email" ? (
        <form onSubmit={sendCode} className="space-y-5">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1f2937]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-3 text-sm text-[#0b1220] outline-none focus:border-[#0b1220] focus:ring-4 focus:ring-[#dbe4ef]"
              required
            />
          </label>
          <button type="submit" className="w-full rounded-full bg-[#0b1220] px-5 py-3 text-sm font-semibold text-white">
            {status === "loading" ? "Sending..." : "Send Verification Code"}
          </button>
        </form>
      ) : null}

      {mode === "signup" && signupStep === "verify" ? (
        <form onSubmit={createAccount} className="space-y-5">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1f2937]">Verification Code</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              className="mt-2 w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-3 text-sm text-[#0b1220] outline-none focus:border-[#0b1220] focus:ring-4 focus:ring-[#dbe4ef]"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1f2937]">Create Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-3 text-sm text-[#0b1220] outline-none focus:border-[#0b1220] focus:ring-4 focus:ring-[#dbe4ef]"
              minLength={8}
              required
            />
          </label>
          <button type="submit" className="w-full rounded-full bg-[#0b1220] px-5 py-3 text-sm font-semibold text-white">
            {status === "loading" ? "Creating..." : "Create Account"}
          </button>
          <button type="button" onClick={() => setSignupStep("email")} className="w-full text-sm font-semibold text-[#475569]">
            Use a different email
          </button>
        </form>
      ) : null}

      {mode === "signin" ? (
        <form onSubmit={signIn} className="space-y-5">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1f2937]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-3 text-sm text-[#0b1220] outline-none focus:border-[#0b1220] focus:ring-4 focus:ring-[#dbe4ef]"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1f2937]">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-3 text-sm text-[#0b1220] outline-none focus:border-[#0b1220] focus:ring-4 focus:ring-[#dbe4ef]"
              required
            />
          </label>
          <button type="submit" className="w-full rounded-full bg-[#0b1220] px-5 py-3 text-sm font-semibold text-white">
            {status === "loading" ? "Signing in..." : "Sign In"}
          </button>
        </form>
      ) : null}

      {message ? (
        <p className={`mt-5 text-sm ${status === "error" ? "text-red-600" : "text-emerald-700"}`}>{message}</p>
      ) : null}
      {devCode ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Temporary testing code: <span className="font-semibold">{devCode}</span>
        </div>
      ) : null}
    </div>
  );
}
