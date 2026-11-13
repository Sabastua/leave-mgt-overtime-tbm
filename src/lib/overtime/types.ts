export type OvertimeCompensatoryChoice = "paid" | "time_off_in_lieu";
export type OvertimeMultiplier = 1.0 | 1.5 | 2.0 | 2.5;
export type OvertimeRateBasis = "hourly" | "daily" | "custom_amount";
export type OvertimeTimeMode = "hours" | "time_range" | "full_day";

export const BASE_HOURLY_RATE = 1250;
export const DEFAULT_DAILY_RATE = 10000; // 8 hrs * KES 1,250/hr
export const STANDARD_DAY_HOURS = 8;
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
  timeRange: string | null;
  rateBasis: OvertimeRateBasis;
  rateBasisLabel: string;
  unitRateKes: number;
  multiplier: OvertimeMultiplier;
  multiplierLabel: "Flat Rate" | "Standard" | "Weekend" | "Holiday";
  payoutKes: number;
};

const KENYA_PUBLIC_HOLIDAYS_MMDD: Record<string, string> = {
  "01-01": "New Year's Day",
  "05-01": "Labour Day",
  "06-01": "Madaraka Day",
  "10-10": "Mazingira Day",
  "10-20": "Mashujaa Day",
  "12-12": "Jamhuri Day",
  "12-25": "Christmas Day",
  "12-26": "Boxing Day",
};

export function detectDateRateCategory(dateStr: string): {
  category: "weekday" | "weekend" | "holiday";
  multiplier: OvertimeMultiplier;
  badgeText: string;
  defaultSubtitle: string;
} {
  if (!dateStr) {
    return {
      category: "weekday",
      multiplier: 1.5,
      badgeText: "Weekday (1.5x Standard)",
      defaultSubtitle: "Night Shift Support",
    };
  }
  const mmdd = dateStr.slice(5, 10);
  if (KENYA_PUBLIC_HOLIDAYS_MMDD[mmdd]) {
    return {
      category: "holiday",
      multiplier: 2.5,
      badgeText: `${KENYA_PUBLIC_HOLIDAYS_MMDD[mmdd]} (2.5x Holiday)`,
      defaultSubtitle: "Public Holiday Coverage",
    };
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  if (y && m && d) {
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const dayName = dayOfWeek === 0 ? "Sunday" : "Saturday";
      return {
        category: "weekend",
        multiplier: 2.0,
        badgeText: `${dayName} (2.0x Weekend)`,
        defaultSubtitle: "Weekend Maintenance",
      };
    }
  }
  return {
    category: "weekday",
    multiplier: 1.5,
    badgeText: "Weekday (1.5x Standard)",
    defaultSubtitle: "After-Hours Shift Support",
  };
}

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

  // Parse optional structured key-value tokens in ticket_ref (e.g. OT-2026-889|PAY:15000|RATE:10000|BASIS:daily|TIME:08:00-17:00|MULT:1.5)
  const refTokens = rawRef.split("|").map((t) => t.trim());
  const kvMap: Record<string, string> = {};
  for (const token of refTokens.slice(1)) {
    const idx = token.indexOf(":");
    if (idx > 0) {
      const k = token.slice(0, idx).toUpperCase();
      const v = token.slice(idx + 1).trim();
      kvMap[k] = v;
    }
  }

  // 1. Extract Ref Code (e.g. OT-2023-889)
  const firstRefToken = refTokens[0] || "";
  const refMatch = firstRefToken.match(/OT-\d{4}-\d{3,5}/i) || rawRef.match(/OT-\d{4}-\d{3,5}/i);
  const refCode = refMatch
    ? refMatch[0].toUpperCase()
    : firstRefToken && firstRefToken.length <= 16
    ? firstRefToken.toUpperCase()
    : `OT-${year}-${deterministicDigits(record.id || record.overtime_date)}`;

  // 2. Extract Multiplier (1.0, 1.5, 2.0, 2.5)
  let multiplier: OvertimeMultiplier = 1.5;
  const combinedText = `${rawRef} ${rawSummary}`;
  if (kvMap.MULT) {
    const parsedMult = parseFloat(kvMap.MULT);
    if (parsedMult === 1.0 || parsedMult === 1.5 || parsedMult === 2.0 || parsedMult === 2.5) {
      multiplier = parsedMult;
    }
  } else if (combinedText.includes("2.5x")) {
    multiplier = 2.5;
  } else if (combinedText.includes("2.0x") || combinedText.includes("2x")) {
    multiplier = 2.0;
  } else if (combinedText.includes("1.0x") || combinedText.includes("1x")) {
    multiplier = 1.0;
  } else if (combinedText.includes("1.5x")) {
    multiplier = 1.5;
  } else if (record.overtime_date) {
    multiplier = detectDateRateCategory(record.overtime_date).multiplier;
  }

  const multiplierLabel: "Flat Rate" | "Standard" | "Weekend" | "Holiday" =
    multiplier === 2.5
      ? "Holiday"
      : multiplier === 2.0
      ? "Weekend"
      : multiplier === 1.0
      ? "Flat Rate"
      : "Standard";

  // 3. Extract Time Range (e.g. 17:00–21:30 or Full Day)
  let timeRange: string | null = kvMap.TIME || null;
  if (!timeRange) {
    const timeMatch = rawSummary.match(/\b(\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2})\b/);
    if (timeMatch) {
      timeRange = timeMatch[1].replace(/\s*-\s*/, "–");
    } else if (/full\s*day/i.test(rawSummary)) {
      timeRange = "Full Day (08:00–17:00)";
    }
  }

  // 4. Extract Project Title and Task Category / Subtitle
  const lines = rawSummary
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const rawFirstLine = lines[0] || "Enterprise System Support";
  const projectTitle = rawFirstLine
    .replace(/\s*\((?:1\.0|1\.5|2\.0|2\.5)x.*?\)\s*$/i, "")
    .trim();

  let taskCategory = "";
  if (lines.length > 1) {
    taskCategory = lines[1]
      .replace(/^Shift:\s*/i, "")
      .replace(/\s*\((?:1\.0|1\.5|2\.0|2\.5)x.*?\)/i, "")
      .replace(/\s*•\s*\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}.*$/i, "")
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

  // 5. Extract Rate Basis, Unit Rate, and Payout Amount (KES)
  const hours = Number(record.hours) || 0;
  let rateBasis: OvertimeRateBasis = "hourly";
  if (kvMap.BASIS === "daily" || kvMap.BASIS === "custom_amount" || kvMap.BASIS === "hourly") {
    rateBasis = kvMap.BASIS;
  }

  const parsedUnitRate = kvMap.RATE ? parseFloat(kvMap.RATE) : NaN;
  const unitRateKes =
    !isNaN(parsedUnitRate) && parsedUnitRate > 0
      ? parsedUnitRate
      : rateBasis === "daily"
      ? DEFAULT_DAILY_RATE
      : BASE_HOURLY_RATE;

  const parsedPayout = kvMap.PAY ? parseFloat(kvMap.PAY) : NaN;
  const payoutKes =
    !isNaN(parsedPayout) && parsedPayout >= 0
      ? Math.round(parsedPayout * 100) / 100
      : rateBasis === "daily"
      ? Math.round((hours / STANDARD_DAY_HOURS) * unitRateKes * multiplier * 100) / 100
      : Math.round(hours * unitRateKes * multiplier * 100) / 100;

  const rateBasisLabel =
    rateBasis === "daily"
      ? `KES ${formatKes(unitRateKes)}/day`
      : rateBasis === "custom_amount"
      ? "Logged Day/Shift Amount"
      : `KES ${formatKes(unitRateKes)}/hr`;

  return {
    refCode,
    formattedDate: formatOvertimeDate(record.overtime_date),
    projectTitle,
    taskCategory,
    timeRange,
    rateBasis,
    rateBasisLabel,
    unitRateKes,
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
    task_summary: "Enterprise Cloud Migration\nWeekend Maintenance (2.0x) • 08:00–17:00",
    ticket_ref: "OT-2023-889|PAY:20000|RATE:1250|BASIS:hourly|TIME:08:00–17:00|MULT:2.0",
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
    task_summary: "Billing System Patching\nNight Shift Support (1.5x) • 18:00–00:00",
    ticket_ref: "OT-2023-872|PAY:11250|RATE:1250|BASIS:hourly|TIME:18:00–00:00|MULT:1.5",
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
    task_summary: "M-Pesa API Upgrades\nEmergency Deployment (2.5x) • 18:00–06:00",
    ticket_ref: "OT-2023-851|PAY:37500|RATE:1250|BASIS:hourly|TIME:18:00–06:00|MULT:2.5",
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
    task_summary: "Enterprise Security Audit\nOvertime Weekend (2.0x) • 08:00–18:30",
    ticket_ref: "OT-2023-834|PAY:26250|RATE:1250|BASIS:hourly|TIME:08:00–18:30|MULT:2.0",
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
