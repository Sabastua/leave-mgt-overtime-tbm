export type OvertimeCompensatoryChoice = "paid" | "time_off_in_lieu";
export type OvertimeMultiplier = 1.5 | 2.0 | 2.5;

export const BASE_HOURLY_RATE = 1250;
export const ENTERPRISE_TIER_LABEL = "Enterprise Grade 4";
export const PAYE_WITHHOLDING_RATE = 0.3;

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
  totalDisbursedKes: number;
  pendingPayoutKes: number;
};

export type ParsedOvertimeMeta = {
  refCode: string;
  formattedDate: string;
  projectTitle: string;
  taskCategory: string;
  multiplier: OvertimeMultiplier;
  multiplierLabel: "Standard" | "Weekend" | "Holiday";
  payoutKes: number;
};

function deterministicDigits(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  const num = (hash % 900) + 100;
  return String(num);
}

export function formatOvertimeDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatKes(amount: number, includeDecimals = false): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  });
}

export function parseOvertimeRecordMeta(record: OvertimeRecord): ParsedOvertimeMeta {
  const rawSummary = (record.task_summary || "").trim();
  const rawRef = (record.ticket_ref || "").trim();
  const year = record.overtime_date?.slice(0, 4) || String(new Date().getFullYear());

  // 1. Extract Ref Code (e.g. OT-2023-889)
  const refMatch = rawRef.match(/OT-\d{4}-\d{3,5}/i);
  const refCode = refMatch
    ? refMatch[0].toUpperCase()
    : rawRef && !rawRef.includes("|") && rawRef.length <= 16
    ? rawRef.toUpperCase()
    : `OT-${year}-${deterministicDigits(record.id || record.overtime_date)}`;

  // 2. Extract Multiplier (1.5, 2.0, 2.5) from ticket_ref or task_summary, or infer from date
  let multiplier: OvertimeMultiplier = 1.5;
  const combinedText = `${rawRef} ${rawSummary}`;
  if (combinedText.includes("2.5x")) {
    multiplier = 2.5;
  } else if (combinedText.includes("2.0x") || combinedText.includes("2x")) {
    multiplier = 2.0;
  } else if (combinedText.includes("1.5x")) {
    multiplier = 1.5;
  } else if (record.overtime_date) {
    const [y, m, d] = record.overtime_date.split("-").map(Number);
    if (y && m && d) {
      const dayOfWeek = new Date(y, m - 1, d).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        multiplier = 2.0;
      }
    }
  }

  const multiplierLabel: "Standard" | "Weekend" | "Holiday" =
    multiplier === 2.5 ? "Holiday" : multiplier === 2.0 ? "Weekend" : "Standard";

  // 3. Extract Project Title and Task Category / Subtitle
  const lines = rawSummary
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const rawFirstLine = lines[0] || "Enterprise System Support";
  const projectTitle = rawFirstLine.replace(/\s*\((?:1\.5|2\.0|2\.5)x.*?\)\s*$/i, "").trim();

  let taskCategory = "";
  if (lines.length > 1) {
    taskCategory = lines[1]
      .replace(/^Shift:\s*/i, "")
      .replace(/\s*\((?:1\.5|2\.0|2\.5)x.*?\)\s*$/i, "")
      .trim();
  }
  if (!taskCategory) {
    if (multiplier === 2.5) {
      taskCategory = "Emergency Deployment";
    } else if (multiplier === 2.0) {
      taskCategory = "Weekend Maintenance";
    } else {
      taskCategory = "Night Shift Support";
    }
  }

  const hours = Number(record.hours) || 0;
  const payoutKes = Math.round(hours * BASE_HOURLY_RATE * multiplier * 100) / 100;

  return {
    refCode,
    formattedDate: formatOvertimeDate(record.overtime_date),
    projectTitle,
    taskCategory,
    multiplier,
    multiplierLabel,
    payoutKes,
  };
}

export const DEMO_OVERTIME_RECORDS: OvertimeRecord[] = [
  {
    id: "demo-ot-889",
    user_id: "demo",
    user_email: "",
    overtime_date: "2023-10-18",
    hours: 8.0,
    task_summary: "Enterprise Cloud Migration\nWeekend Maintenance (2.0x)",
    ticket_ref: "OT-2023-889",
    compensatory_choice: "paid",
    status: "approved",
    reviewed_by: "Dr. Jane Wangari",
    reviewed_at: "2023-10-20T10:00:00Z",
    reviewer_note: "Verified & Disbursed via M-Pesa Bulk",
    created_at: "2023-10-18T18:00:00Z",
  },
  {
    id: "demo-ot-872",
    user_id: "demo",
    user_email: "",
    overtime_date: "2023-10-12",
    hours: 6.0,
    task_summary: "Billing System Patching\nNight Shift Support (1.5x)",
    ticket_ref: "OT-2023-872",
    compensatory_choice: "paid",
    status: "approved",
    reviewed_by: "Dr. Jane Wangari",
    reviewed_at: "2023-10-14T10:00:00Z",
    reviewer_note: "Verified & Disbursed via M-Pesa Bulk",
    created_at: "2023-10-12T22:00:00Z",
  },
  {
    id: "demo-ot-851",
    user_id: "demo",
    user_email: "",
    overtime_date: "2023-10-05",
    hours: 12.0,
    task_summary: "M-Pesa API Upgrades\nEmergency Deployment (2.5x)",
    ticket_ref: "OT-2023-851",
    compensatory_choice: "paid",
    status: "pending",
    reviewed_by: null,
    reviewed_at: null,
    reviewer_note: null,
    created_at: "2023-10-05T20:00:00Z",
  },
  {
    id: "demo-ot-834",
    user_id: "demo",
    user_email: "",
    overtime_date: "2023-09-28",
    hours: 10.5,
    task_summary: "Enterprise Security Audit\nOvertime Weekend (2.0x)",
    ticket_ref: "OT-2023-834",
    compensatory_choice: "paid",
    status: "approved",
    reviewed_by: "Dr. Jane Wangari",
    reviewed_at: "2023-09-30T10:00:00Z",
    reviewer_note: "Verified & Disbursed via M-Pesa Bulk",
    created_at: "2023-09-28T19:00:00Z",
  },
];

export function computeOvertimeStats(records: OvertimeRecord[], userEmail?: string): OvertimeStats {
  const filtered = userEmail
    ? records.filter((r) => r.user_email.toLowerCase() === userEmail.toLowerCase())
    : records;

  let totalHoursApproved = 0;
  let totalHoursPending = 0;
  let paidHoursApproved = 0;
  let toilHoursApproved = 0;
  let totalDisbursedKes = 0;
  let pendingPayoutKes = 0;

  for (const r of filtered) {
    const hrs = Number(r.hours) || 0;
    const meta = parseOvertimeRecordMeta(r);
    if (r.status === "approved") {
      totalHoursApproved += hrs;
      totalDisbursedKes += meta.payoutKes;
      if (r.compensatory_choice === "time_off_in_lieu") {
        toilHoursApproved += hrs;
      } else {
        paidHoursApproved += hrs;
      }
    } else if (r.status === "pending") {
      totalHoursPending += hrs;
      pendingPayoutKes += meta.payoutKes;
    }
  }

  return {
    totalHoursApproved,
    totalHoursPending,
    paidHoursApproved,
    toilHoursApproved,
    totalDisbursedKes,
    pendingPayoutKes,
  };
}
