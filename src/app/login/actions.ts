"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail, normalizeEmail } from "@/lib/auth/allowed-users";

async function getOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export type LoginState = {
  step: "email" | "code";
  email: string;
  error?: string;
  message?: string;
};

const NOT_ALLOWED =
  "This email is not authorised to access the Leave Management system.";

/** Step 1: send a one-time sign-in code to an allow-listed email. */
export async function sendCode(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));

  if (!email) {
    return { step: "email", email, error: "Please enter your email address." };
  }
  if (!isAllowedEmail(email)) {
    return { step: "email", email, error: NOT_ALLOWED };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // Where the magic link (if the email contains one) lands.
      emailRedirectTo: `${await getOrigin()}/auth/callback`,
    },
  });

  if (error) {
    return { step: "email", email, error: error.message };
  }

  return {
    step: "code",
    email,
    message: `We sent a sign-in email to ${email}. Enter the code from it, or open the link in this browser.`,
  };
}

/** Step 2: verify the code and establish the session. */
export async function verifyCode(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const token = String(formData.get("token") ?? "").replace(/\s/g, "");

  if (!isAllowedEmail(email)) {
    return { step: "email", email, error: NOT_ALLOWED };
  }
  if (!/^\d{6,10}$/.test(token)) {
    return { step: "code", email, error: "Enter the code from your email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return { step: "code", email, error: "Invalid or expired code. Try again." };
  }

  redirect("/");
}

/** Single entry point for the login form, dispatching on the `intent` field. */
export async function loginAction(
  prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  switch (formData.get("intent")) {
    case "verify":
      return verifyCode(prev, formData);
    case "reset":
      return { step: "email", email: prev.email };
    default:
      return sendCode(prev, formData);
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
