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
  baseEntitled: number;
  carriedForward: number;
  approved: number;
  pending: number;
  remaining: number;
};

import { calculateWorkingDaysDetailed } from "./holidays";

/**
 * Counts official working days (excluding weekends and statutory public holidays)
 * between two YYYY-MM-DD dates (inclusive).
 */
export function calculateWorkingDays(
  startDateStr: string,
  endDateStr: string,
): number {
  return calculateWorkingDaysDetailed(startDateStr, endDateStr).workingDays;
}

/**
 * Computes per-leave-type balances for a given user in the specified calendar year,
 * automatically carrying forward all unutilized days from prior years.
 */
export function computeUserBalances(
  leaveTypes: LeaveType[],
  requests: LeaveRequest[],
  userEmail: string,
  year: number = new Date().getFullYear(),
  carryForwardOverrides?: Record<string, number>,
): LeaveBalanceSummary[] {
  const normalized = userEmail.toLowerCase();
  const yearPrefix = `${year}-`;

  return leaveTypes.map((lt) => {
    // Current year matching requests
    const currentYearMatching = requests.filter(
      (r) =>
        r.user_email.toLowerCase() === normalized &&
        r.leave_type === lt.code &&
        r.start_date.startsWith(yearPrefix),
    );

    const approved = currentYearMatching
      .filter((r) => r.status === "approved")
      .reduce((sum, r) => sum + r.working_days, 0);

    const pending = currentYearMatching
      .filter((r) => r.status === "pending")
      .reduce((sum, r) => sum + r.working_days, 0);

    // Compute automatic carry-forward from all unutilized prior years
    const priorYears = Array.from(
      new Set(
        requests
          .filter(
            (r) =>
              r.user_email.toLowerCase() === normalized &&
              r.leave_type === lt.code &&
              parseInt(r.start_date.slice(0, 4), 10) < year,
          )
          .map((r) => parseInt(r.start_date.slice(0, 4), 10)),
      ),
    ).sort((a, b) => a - b);

    let autoCarriedForward = 0;
    for (const py of priorYears) {
      const pyPrefix = `${py}-`;
      const pyApproved = requests
        .filter(
          (r) =>
            r.user_email.toLowerCase() === normalized &&
            r.leave_type === lt.code &&
            r.status === "approved" &&
            r.start_date.startsWith(pyPrefix),
        )
        .reduce((sum, r) => sum + r.working_days, 0);

      // Any unused days in that prior year carry forward
      const unutilized = Math.max(0, lt.annual_days - pyApproved);
      autoCarriedForward += unutilized;
    }

    const explicitOverride = carryForwardOverrides ? carryForwardOverrides[lt.code] : undefined;
    const carriedForward = typeof explicitOverride === "number" ? explicitOverride : autoCarriedForward;

    const baseEntitled = lt.annual_days;
    const totalEntitled = baseEntitled + carriedForward;
    const remaining = Math.max(0, totalEntitled - approved - pending);

    return {
      leaveType: lt,
      entitled: totalEntitled,
      baseEntitled,
      carriedForward,
      approved,
      pending,
      remaining,
    };
  });
}
