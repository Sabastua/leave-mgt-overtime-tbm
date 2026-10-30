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

    if (!email || !email.includes("@")) {
      return { error: "Please provide a valid email address." };
    }
    if (!fullName) {
      return { error: "Please enter the member's full name." };
    }
    if (role !== "staff" && role !== "approver") {
      return { error: "Invalid role selected." };
    }

    const { error } = await supabase.from("allowed_users").upsert({
      email,
      full_name: fullName,
      role,
      is_active: true,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/");
    return { success: `Successfully added ${fullName} (${email}) as ${role}.` };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to add member" };
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
