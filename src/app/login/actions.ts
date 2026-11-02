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

export type PasswordUpdateState = {
  error?: string;
  success?: string;
};

export async function updateMyPassword(
  _prev: PasswordUpdateState,
  formData: FormData
): Promise<PasswordUpdateState> {
  const newPassword = String(formData.get("new_password") ?? "").trim();
  const confirmPassword = String(formData.get("confirm_password") ?? "").trim();

  if (!newPassword || newPassword.length < 6) {
    return { error: "New password must be at least 6 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { error: error.message };
  }

  return { success: "Your password has been updated successfully." };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
