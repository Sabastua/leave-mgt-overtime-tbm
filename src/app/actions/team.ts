"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeEmail,
  isApproverRole,
  isApproverEmail,
  type UserRole,
} from "@/lib/auth/allowed-users";

export type TeamActionState = {
  error?: string;
  success?: string;
};

async function ensureApprover() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ? normalizeEmail(user.email) : null;
  if (!user || !email) {
    redirect("/login");
  }

  // Check static approver configuration first
  if (isApproverEmail(email)) {
    return { supabase, userEmail: email };
  }

  // Check database role
  const { data: member } = await supabase
    .from("allowed_users")
    .select("role")
    .eq("email", email)
    .single();

  if (!member || !isApproverRole(member.role)) {
    throw new Error("Unauthorized: Only approvers/managers can manage team members.");
  }

  return { supabase, userEmail: email };
}

export async function addTeamMember(
  _prev: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  try {
    const { supabase } = await ensureApprover();

    const email = normalizeEmail(String(formData.get("email") ?? ""));
    const fullName = String(formData.get("full_name") ?? "").trim();
    const role = (String(formData.get("role") ?? "staff") as UserRole) || "staff";
    const password = String(formData.get("password") ?? "").trim();

    if (!email || !email.endsWith("@safaricom.co.ke")) {
      return { error: "Please provide a valid Safaricom email address (@safaricom.co.ke)." };
    }
    if (!fullName) {
      return { error: "Please enter the member's full name." };
    }
    if (role !== "staff" && role !== "approver") {
      return { error: "Invalid role selected." };
    }
    if (!password || password.length < 6) {
      return { error: "Password must be at least 6 characters." };
    }

    // Try provisioning via secure admin RPC (handles both auth.users and allowed_users)
    const { error: rpcError } = await supabase.rpc("admin_provision_user", {
      p_email: email,
      p_password: password,
      p_full_name: fullName,
      p_role: role,
    });

    if (rpcError) {
      // Fallback: upsert to allowed_users directly if migration 0006 is pending
      const { error: upsertError } = await supabase.from("allowed_users").upsert({
        email,
        full_name: fullName,
        role,
        is_active: true,
      });

      if (upsertError) {
        return { error: `Failed to create user: ${rpcError.message}` };
      }
    }

    revalidatePath("/");
    return { success: `Successfully added and provisioned ${fullName} (${email}) as ${role}.` };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to add member" };
  }
}

export async function resetTeamMemberPassword(
  _prev: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  try {
    const { supabase } = await ensureApprover();

    const email = normalizeEmail(String(formData.get("email") ?? ""));
    const newPassword = String(formData.get("new_password") ?? "").trim();

    if (!email) {
      return { error: "Target email is required." };
    }
    if (!newPassword || newPassword.length < 6) {
      return { error: "New password must be at least 6 characters." };
    }

    const { error: rpcError } = await supabase.rpc("admin_reset_user_password", {
      p_email: email,
      p_password: newPassword,
    });

    if (rpcError) {
      return { error: `Password reset failed: ${rpcError.message}` };
    }

    revalidatePath("/");
    return { success: `Password for ${email} has been updated successfully.` };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to reset password" };
  }
}

export async function updateTeamMemberRole(formData: FormData): Promise<void> {
  const { supabase, userEmail } = await ensureApprover();

  const targetEmail = normalizeEmail(String(formData.get("email") ?? ""));
  const newRole = String(formData.get("role") ?? "") as UserRole;

  if (!targetEmail || (newRole !== "staff" && newRole !== "approver")) {
    return;
  }

  // Prevent an approver from demoting themselves if they are the only approver
  if (targetEmail === userEmail && newRole === "staff") {
    const { count } = await supabase
      .from("allowed_users")
      .select("*", { count: "exact", head: true })
      .eq("role", "approver")
      .eq("is_active", true);

    if (count && count <= 1) {
      return;
    }
  }

  await supabase
    .from("allowed_users")
    .update({ role: newRole })
    .eq("email", targetEmail);

  revalidatePath("/");
}

export async function toggleTeamMemberStatus(formData: FormData): Promise<void> {
  const { supabase, userEmail } = await ensureApprover();

  const targetEmail = normalizeEmail(String(formData.get("email") ?? ""));
  const activeStatus = String(formData.get("is_active") ?? "") === "true";

  if (!targetEmail || targetEmail === userEmail) {
    return; // Cannot deactivate yourself
  }

  await supabase
    .from("allowed_users")
    .update({ is_active: activeStatus })
    .eq("email", targetEmail);

  revalidatePath("/");
}

export async function removeTeamMember(formData: FormData): Promise<void> {
  const { supabase, userEmail } = await ensureApprover();

  const targetEmail = normalizeEmail(String(formData.get("email") ?? ""));
  if (!targetEmail || targetEmail === userEmail) {
    return; // Cannot delete yourself
  }

  await supabase.from("allowed_users").delete().eq("email", targetEmail);

  revalidatePath("/");
}
