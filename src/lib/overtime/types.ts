export type OvertimeCompensatoryChoice = "paid" | "time_off_in_lieu";

export type OvertimeRecord = {
  id: string;
  user_id: string;
  user_email: string;
  overtime_date: string;
  hours: number;
  task_summary: string;
  ticket_ref: string | null;
  compensatory_choice: OvertimeCompensatoryChoice;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_note: string | null;
  created_at: string;
};

export type OvertimeStats = {
  totalHoursApproved: number;
  totalHoursPending: number;
  paidHoursApproved: number;
  toilHoursApproved: number;
};

export function computeOvertimeStats(records: OvertimeRecord[], userEmail?: string): OvertimeStats {
  const filtered = userEmail
    ? records.filter((r) => r.user_email.toLowerCase() === userEmail.toLowerCase())
    : records;

  let totalHoursApproved = 0;
  let totalHoursPending = 0;
  let paidHoursApproved = 0;
  let toilHoursApproved = 0;

  for (const r of filtered) {
    const hrs = Number(r.hours) || 0;
    if (r.status === "approved") {
      totalHoursApproved += hrs;
      if (r.compensatory_choice === "time_off_in_lieu") {
        toilHoursApproved += hrs;
      } else {
        paidHoursApproved += hrs;
      }
    } else if (r.status === "pending") {
      totalHoursPending += hrs;
    }
  }

  return {
    totalHoursApproved,
    totalHoursPending,
    paidHoursApproved,
    toilHoursApproved,
  };
}
