"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isAllowedEmail,
  isApproverEmail,
  normalizeEmail,
} from "@/lib/auth/allowed-users";
import { type OvertimeCompensatoryChoice } from "@/lib/overtime/types";

export type OvertimeActionState = {
  error?: string;
  success?: string;
};

export async function submitOvertimeRequest(
  _prev: OvertimeActionState,
  formData: FormData
): Promise<OvertimeActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ? normalizeEmail(user.email) : null;
  if (!user || !email || !isAllowedEmail(email)) {
    redirect("/login");
  }

  const overtimeDate = String(formData.get("overtime_date") ?? "").trim();
  const hours = parseFloat(String(formData.get("hours") ?? "0"));
  const rawTaskSummary = String(formData.get("task_summary") ?? "").trim();
  const rawTicketRef = String(formData.get("ticket_ref") ?? "").trim();
  const multiplierRaw = String(formData.get("multiplier") ?? "1.5").trim();
  const multiplier =
    multiplierRaw === "2.5" ? "2.5" : multiplierRaw === "2.0" ? "2.0" : "1.5";
  const categorySubtitle =
    multiplier === "2.5"
      ? "Emergency Deployment"
      : multiplier === "2.0"
      ? "Weekend Maintenance"
      : "Night Shift Support";

  const compensatoryChoice = String(
    formData.get("compensatory_choice") ?? "paid"
  ) as OvertimeCompensatoryChoice;

  if (!overtimeDate) {
    return { error: "Please select an overtime date." };
  }
  if (isNaN(hours) || hours <= 0 || hours > 24) {
    return { error: "Please specify valid overtime hours (between 0.5 and 24)." };
  }
  if (!rawTaskSummary) {
    return { error: "Please enter a project or task reference." };
  }

  const year = overtimeDate.slice(0, 4) || String(new Date().getFullYear());
  const randomDigits = Math.floor(100 + Math.random() * 900);
  const ticketRef = rawTicketRef || `OT-${year}-${randomDigits}`;

  const taskSummary = rawTaskSummary.includes("\n")
    ? rawTaskSummary
    : `${rawTaskSummary}\n${categorySubtitle} (${multiplier}x)`;

  const { error } = await supabase.from("overtime_records").insert({
    user_id: user.id,
    user_email: email,
    overtime_date: overtimeDate,
    hours,
    task_summary: taskSummary,
    ticket_ref: ticketRef,
    compensatory_choice: compensatoryChoice,
    status: "pending",
  });

  if (error) {
    if (error.code === "42P01" || error.message.includes("overtime_records")) {
      return {
        error:
          "Overtime database table not created yet. Run `supabase/migrations/0003_overtime_management.sql` in the Supabase SQL Editor.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: `Overtime claim of ${hours} hours submitted successfully.` };
}

export async function reviewOvertimeRequest(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ? normalizeEmail(user.email) : null;
  if (!user || !email) {
    redirect("/login");
  }

  const isStaticApprover = isApproverEmail(email);

  if (!isStaticApprover) {
    const { data: member } = await supabase
      .from("allowed_users")
      .select("role")
      .eq("email", email)
      .single();

    if (!member || member.role !== "approver") {
      redirect("/login");
    }
  }

  const recordId = String(formData.get("record_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewerNote = String(formData.get("reviewer_note") ?? "").trim();

  if (!recordId || (decision !== "approved" && decision !== "rejected")) {
    return;
  }

  // Fetch claim details so an explicit approval message is sent to staff
  const { data: rec } = await supabase
    .from("overtime_records")
    .select("overtime_date, hours, compensatory_choice, user_email, task_summary")
    .eq("id", recordId)
    .single();

  const approverLabel = "F. Mbuthia (Manager)";
  const defaultMessage =
    decision === "approved"
      ? `Approved by ${approverLabel}. Overtime of ${rec?.hours ?? ""}h on ${rec?.overtime_date ?? ""} (${rec?.compensatory_choice ? rec.compensatory_choice.toUpperCase() : ""}) authorized for payroll cutoff.`
      : `Declined by ${approverLabel}. Please consult your manager for clarification.`;

  const finalNote = reviewerNote || defaultMessage;

  await supabase
    .from("overtime_records")
    .update({
      status: decision,
      reviewed_by: email,
      reviewed_at: new Date().toISOString(),
      reviewer_note: finalNote,
    })
    .eq("id", recordId);

  revalidatePath("/");
}

export async function batchReviewOvertimeRequests(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ? normalizeEmail(user.email) : null;
  if (!user || !email) {
    redirect("/login");
  }

  const isStaticApprover = isApproverEmail(email);
  if (!isStaticApprover) {
    const { data: member } = await supabase
      .from("allowed_users")
      .select("role")
      .eq("email", email)
      .single();

    if (!member || member.role !== "approver") {
      redirect("/login");
    }
  }

  const recordIdsRaw = String(formData.get("record_ids") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewerNote = String(formData.get("reviewer_note") ?? "").trim();

  const recordIds = recordIdsRaw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (recordIds.length === 0 || (decision !== "approved" && decision !== "rejected")) {
    return;
  }

  const approverLabel = "F. Mbuthia (Manager)";
  const defaultMessage =
    decision === "approved"
      ? `Approved by ${approverLabel} in batch authorization for payroll cutoff.`
      : `Batch declined by ${approverLabel}.`;

  const finalNote = reviewerNote || defaultMessage;

  await supabase
    .from("overtime_records")
    .update({
      status: decision,
      reviewed_by: email,
      reviewed_at: new Date().toISOString(),
      reviewer_note: finalNote,
    })
    .in("id", recordIds)
    .eq("status", "pending");

  revalidatePath("/");
}

export async function cancelOvertimeRequest(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ? normalizeEmail(user.email) : null;
  if (!user || !email || !isAllowedEmail(email)) {
    redirect("/login");
  }

  const recordId = String(formData.get("record_id") ?? "");
  if (!recordId) return;

  await supabase
    .from("overtime_records")
    .update({ status: "cancelled" })
    .eq("id", recordId)
    .eq("user_id", user.id)
    .eq("status", "pending");

  revalidatePath("/");
}
