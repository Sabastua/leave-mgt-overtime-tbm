export type LeaveTypeCode = "annual" | "sick" | "compassionate" | "study";

export type LeaveType = {
  code: LeaveTypeCode;
  name: string;
  annual_days: number;
  color: string;
  description: string;
  sort_order: number;
};

export const DEFAULT_LEAVE_TYPES: LeaveType[] = [
  {
    code: "annual",
    name: "Annual Leave",
    annual_days: 21,
    color: "emerald",
    description: "Standard paid annual vacation entitlement",
    sort_order: 1,
  },
  {
    code: "sick",
    name: "Sick Leave",
    annual_days: 14,
    color: "amber",
    description: "Medical & recovery leave",
    sort_order: 2,
  },
  {
    code: "compassionate",
    name: "Compassionate Leave",
    annual_days: 5,
    color: "purple",
    description: "Bereavement or urgent family emergencies",
    sort_order: 3,
  },
  {
    code: "study",
    name: "Study / Exam Leave",
    annual_days: 5,
    color: "blue",
    description: "Professional exams and study days",
    sort_order: 4,
  },
];

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export type LeaveRequest = {
  id: string;
  user_id: string;
  user_email: string;
  leave_type: LeaveTypeCode;
  start_date: string;
  end_date: string;
  working_days: number;
  reason: string;
  handover_email: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_note: string | null;
  created_at: string;
};

export type LeaveBalanceSummary = {
  leaveType: LeaveType;
  entitled: number;
  approved: number;
  pending: number;
  remaining: number;
};

/**
 * Counts weekday working days (Mon–Fri) between two YYYY-MM-DD dates (inclusive).
 */
export function calculateWorkingDays(
  startDateStr: string,
  endDateStr: string,
): number {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(`${startDateStr}T00:00:00Z`);
  const end = new Date(`${endDateStr}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/**
 * Computes per-leave-type balances for a given user in the current calendar year.
 */
export function computeUserBalances(
  leaveTypes: LeaveType[],
  requests: LeaveRequest[],
  userEmail: string,
  year: number = new Date().getFullYear(),
): LeaveBalanceSummary[] {
  const normalized = userEmail.toLowerCase();
  const yearPrefix = `${year}-`;

  return leaveTypes.map((lt) => {
    const matching = requests.filter(
      (r) =>
        r.user_email.toLowerCase() === normalized &&
        r.leave_type === lt.code &&
        r.start_date.startsWith(yearPrefix),
    );

    const approved = matching
      .filter((r) => r.status === "approved")
      .reduce((sum, r) => sum + r.working_days, 0);

    const pending = matching
      .filter((r) => r.status === "pending")
      .reduce((sum, r) => sum + r.working_days, 0);

    const remaining = Math.max(0, lt.annual_days - approved - pending);

    return {
      leaveType: lt,
      entitled: lt.annual_days,
      approved,
      pending,
      remaining,
    };
  });
}
