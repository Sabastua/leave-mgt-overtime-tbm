"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isAllowedEmail,
  normalizeEmail,
} from "@/lib/auth/allowed-users";
import {
  calculateWorkingDays,
  DEFAULT_LEAVE_TYPES,
  type LeaveTypeCode,
} from "@/lib/leave/types";

export type ActionState = {
  error?: string;
  success?: string;
};

const VALID_CODES = new Set(DEFAULT_LEAVE_TYPES.map((t) => t.code));

export async function submitLeaveRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ? normalizeEmail(user.email) : null;
  if (!user || !email || !isAllowedEmail(email)) {
    redirect("/login");
  }

  const leaveType = String(formData.get("leave_type") ?? "") as LeaveTypeCode;
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const handoverRaw = normalizeEmail(
    String(formData.get("handover_email") ?? ""),
  );

  if (!VALID_CODES.has(leaveType)) {
    return { error: "Please select a valid leave type." };
  }
  if (!startDate || !endDate) {
    return { error: "Please select both a start date and an end date." };
  }
  if (endDate < startDate) {
    return { error: "End date cannot be earlier than start date." };
  }

  const workingDays = calculateWorkingDays(startDate, endDate);
  if (workingDays <= 0) {
    return {
      error:
        "Selected dates fall only on weekends. Choose at least one working day (Mon–Fri).",
    };
  }

  const handoverEmail =
    handoverRaw && isAllowedEmail(handoverRaw) && handoverRaw !== email
      ? handoverRaw
      : null;

  const { error } = await supabase.from("leave_requests").insert({
    user_id: user.id,
    user_email: email,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    working_days: workingDays,
    reason,
    handover_email: handoverEmail,
    status: "pending",
  });

  if (error) {
    if (error.code === "42P01" || error.message.includes("leave_requests")) {
      return {
        error:
          "Database tables are not created yet. Run `supabase/migrations/0002_leave_management.sql` in the Supabase SQL Editor first.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/");
  return {
    success: `Leave request for ${workingDays} working day(s) submitted for approval.`,
  };
}

export async function reviewLeaveRequest(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ? normalizeEmail(user.email) : null;
  if (!user || !email) {
    redirect("/login");
  }

  const { data: member } = await supabase
    .from("allowed_users")
    .select("role, is_active")
    .eq("email", email)
    .single();

  if (!member || !member.is_active || member.role !== "approver") {
    redirect("/login");
  }

  const requestId = String(formData.get("request_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewerNote = String(formData.get("reviewer_note") ?? "").trim();

  if (!requestId || (decision !== "approved" && decision !== "rejected")) {
    return;
  }

  await supabase
    .from("leave_requests")
    .update({
      status: decision,
      reviewed_by: email,
      reviewed_at: new Date().toISOString(),
      reviewer_note: reviewerNote || null,
    })
    .eq("id", requestId);

  revalidatePath("/");
}

export async function cancelLeaveRequest(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ? normalizeEmail(user.email) : null;
  if (!user || !email || !isAllowedEmail(email)) {
    redirect("/login");
  }

  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) return;

  await supabase
    .from("leave_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("user_id", user.id)
    .eq("status", "pending");

  revalidatePath("/");
}
