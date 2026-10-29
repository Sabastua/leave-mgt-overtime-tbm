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
  step: "email" | "sent";
  email: string;
  error?: string;
};

const NOT_ALLOWED =
  "This email is not authorised to access the Leave Management system.";

/**
 * Sends a magic sign-in link to an allow-listed email.
 *
 * The project uses Supabase's default "Magic Link" email template (which is
 * locked on new free-tier projects without custom SMTP), so the email contains
 * a link only — no numeric code. The link lands on /auth/callback.
 */
async function sendLink(email: string): Promise<LoginState> {
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
      emailRedirectTo: `${await getOrigin()}/auth/callback`,
    },
  });

  if (error) {
    const message =
      error.status === 429
        ? "Too many sign-in emails requested. Please wait a minute and try again."
        : error.message;
    return { step: "email", email, error: message };
  }

  return { step: "sent", email };
}

/** Single entry point for the login form, dispatching on the `intent` field. */
export async function loginAction(
  prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  switch (formData.get("intent")) {
    case "reset":
      return { step: "email", email: prev.email };
    case "resend": {
      const result = await sendLink(prev.email);
      return result.error ? { ...result, step: "sent" } : result;
    }
    default:
      return sendLink(normalizeEmail(String(formData.get("email") ?? "")));
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
