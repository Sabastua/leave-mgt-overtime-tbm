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
  mode: "password" | "link" | "sent" | "reset";
  email: string;
  error?: string;
  info?: string;
};

const NOT_ALLOWED =
  "This email is not authorised to access the Leave Management system.";

/**
 * Signs in an allow-listed user with email + password, or sets up their
 * password on first sign-in if they haven't created one yet.
 */
async function signInOrSetupPassword(
  email: string,
  password: string,
): Promise<LoginState> {
  if (!email) {
    return {
      mode: "password",
      email,
      error: "Please enter your Safaricom email address.",
    };
  }
  if (!isAllowedEmail(email)) {
    return { mode: "password", email, error: NOT_ALLOWED };
  }
  if (!password || password.length < 6) {
    return {
      mode: "password",
      email,
      error: "Password must be at least 6 characters.",
    };
  }

  const supabase = await createClient();

  // 1. Try signing in with existing credentials
  const signInAttempt = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!signInAttempt.error && signInAttempt.data.session) {
    redirect("/");
  }

  // 2. If the user already exists in auth.users from a previous OTP attempt
  //    without a password (or unconfirmed), claim the initial password via RPC
  //    if the migration has been run.
  const { data: claimStatus } = await supabase.rpc("claim_initial_password", {
    p_email: email,
    p_password: password,
  });

  if (claimStatus === "password_set" || claimStatus === "confirmed") {
    const retry = await supabase.auth.signInWithPassword({ email, password });
    if (!retry.error && retry.data.session) {
      redirect("/");
    }
  }

  if (claimStatus === "has_password") {
    return {
      mode: "password",
      email,
      error:
        "Incorrect password for this account. Try again or use 'Email me a sign-in link'.",
    };
  }

  // 3. Otherwise, create the account for the first time with this password.
  const signUpAttempt = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await getOrigin()}/auth/callback`,
    },
  });

  if (signUpAttempt.error) {
    // If user already registered and has a password, report invalid password
    if (
      signUpAttempt.error.message.toLowerCase().includes("already registered")
    ) {
      return {
        mode: "password",
        email,
        error:
          "Incorrect password for this account. Try again or use 'Email me a sign-in link'.",
      };
    }
    return {
      mode: "password",
      email,
      error: signUpAttempt.error.message,
    };
  }

  if (signUpAttempt.data.session) {
    redirect("/");
  }

  // If signUp didn't return a session (e.g. Confirm Email is enabled in Supabase
  // and the auto-confirm SQL trigger was just applied), try claim + signIn once more.
  await supabase.rpc("claim_initial_password", {
    p_email: email,
    p_password: password,
  });
  const finalSignIn = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (!finalSignIn.error && finalSignIn.data.session) {
    redirect("/");
  }

  return {
    mode: "password",
    email,
    info: "Account created! If you aren't signed in yet, run `supabase/migrations/0002_leave_management.sql` in the Supabase SQL Editor (or disable 'Confirm email' under Authentication -> Providers -> Email) and click Sign in again.",
  };
}

/**
 * Sends a magic sign-in link to an allow-listed email.
 */
async function sendLink(email: string): Promise<LoginState> {
  if (!email) {
    return { mode: "link", email, error: "Please enter your email address." };
  }
  if (!isAllowedEmail(email)) {
    return { mode: "link", email, error: NOT_ALLOWED };
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
        ? "Supabase free-tier email limit reached (max 2 emails/hour). Use the Password tab above to sign in immediately without email."
        : error.message;
    return { mode: "link", email, error: message };
  }

  return { mode: "sent", email };
}

/**
 * Sets or resets the password directly for any allow-listed team member.
 */
async function resetTeamPassword(
  email: string,
  password: string,
): Promise<LoginState> {
  if (!email || !isAllowedEmail(email)) {
    return { mode: "reset", email, error: NOT_ALLOWED };
  }
  if (!password || password.length < 6) {
    return {
      mode: "reset",
      email,
      error: "New password must be at least 6 characters.",
    };
  }

  const supabase = await createClient();

  const { data: claimStatus, error: rpcError } = await supabase.rpc(
    "claim_initial_password",
    {
      p_email: email,
      p_password: password,
    },
  );

  if (rpcError) {
    return { mode: "reset", email, error: rpcError.message };
  }

  if (claimStatus === "no_user") {
    // If user has not been created in auth.users yet, sign them up directly
    const signUpAttempt = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${await getOrigin()}/auth/callback`,
      },
    });
    if (signUpAttempt.error) {
      return { mode: "reset", email, error: signUpAttempt.error.message };
    }
    if (signUpAttempt.data.session) {
      redirect("/");
    }
  }

  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (!signIn.error && signIn.data.session) {
    redirect("/");
  }

  return {
    mode: "password",
    email,
    info: "Password updated successfully. Please sign in with your new password.",
  };
}

/** Single entry point for the login form, dispatching on the `intent` field. */
export async function loginAction(
  prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const intent = String(formData.get("intent") ?? "password");
  const emailInput = normalizeEmail(
    String(formData.get("email") ?? prev.email ?? ""),
  );

  switch (intent) {
    case "switch-to-link":
      return { mode: "link", email: emailInput };
    case "switch-to-password":
      return { mode: "password", email: emailInput };
    case "switch-to-reset":
      return { mode: "reset", email: emailInput };
    case "reset-password": {
      const password = String(formData.get("password") ?? "");
      return resetTeamPassword(emailInput, password);
    }
    case "send-link":
      return sendLink(emailInput);
    case "resend": {
      const result = await sendLink(prev.email);
      return result.error ? { ...result, mode: "sent" } : result;
    }
    case "password":
    default: {
      const password = String(formData.get("password") ?? "");
      return signInOrSetupPassword(emailInput, password);
    }
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
