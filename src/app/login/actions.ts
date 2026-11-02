"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail, normalizeEmail } from "@/lib/auth/allowed-users";

export type LoginState = {
  email: string;
  error?: string;
  info?: string;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!email) {
    return {
      email,
      error: "Please enter your Safaricom email address.",
    };
  }

  if (!isAllowedEmail(email)) {
    return {
      email,
      error: "This email address is not authorised to access the system.",
    };
  }

  if (!password) {
    return {
      email,
      error: "Please enter your password.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return {
      email,
      error: "Invalid email or password. Contact your team approver if you need your account provisioned or password reset.",
    };
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
