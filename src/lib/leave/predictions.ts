import type { AllowedUser } from "@/lib/auth/allowed-users";
import { computeUserBalances, type LeaveRequest, type LeaveType } from "@/lib/leave/types";
import { parseOvertimeRecordMeta, type OvertimeRecord } from "@/lib/overtime/types";

export type LeaveImpactSeverity = "critical" | "high" | "moderate" | "low";

export type NextLeavePrediction = {
  member: AllowedUser;
  rank: number;
  likelihoodScore: number; // 0 - 100
  likelihoodLabel: "Very High" | "High" | "Moderate" | "Low";
  predictedLeaveType: string;
  predictedDurationDays: number;
  predictedWindow: string;
  primaryReason: string;
  reasons: string[];
  metrics: {
    annualRemaining: number;
    annualEntitled: number;
    carriedForward: number;
    totalTakenThisYear: number;
    daysSinceLastLeave: number | null;
    recentOvertimeHours: number;
    toilHoursBanked: number;
    activeCoveragesCount: number;
    pendingRequestDates: string | null;
  };
  impact: {
    severity: LeaveImpactSeverity;
    severityLabel: string;
    impactScore: number; // 0 - 100
    currentCapacityPercent: number;
    projectedCapacityPercent: number;
    currentOnDutyCount: number;
    projectedOnDutyCount: number;
    breachesMinStaffing: boolean;
    handoverConflicts: string[];
    keyProjectsAffected: string[];
    estimatedReplacementOtHours: number;
    recommendedReliefColleague: {
      name: string;
      email: string;
      reason: string;
    } | null;
    summary: string;
  };
};

/**
 * Excludes non-person test accounts (e.g. "test") and the dedicated manager approver (fmbuthia).
 */
export function isEligibleTeamStaffForPrediction(member: AllowedUser): boolean {
  if (!member.is_active) return false;
  const email = member.email.trim().toLowerCase();
  const name = (member.full_name || "").trim().toLowerCase();

  // Exclude F. Mbuthia (dedicated approver/manager)
  if (email.startsWith("fmbuthia@") || name.includes("mbuthia")) {
    return false;
  }

  // Exclude test placeholder accounts
  if (
    email.startsWith("test@") ||
    email.startsWith("test.") ||
    email.includes("+test") ||
    name === "test" ||
    name.startsWith("test ") ||
    name.endsWith(" test")
  ) {
    return false;
  }

  return true;
}

export function predictNextLeaveAndImpact(params: {
  teamMembers: AllowedUser[];
  leaveRequests: LeaveRequest[];
  leaveTypes: LeaveType[];
  overtimeRecords: OvertimeRecord[];
  currentYear: number;
  minOnDutyStaff?: number;
  minCapacityThreshold?: number;
}): NextLeavePrediction[] {
  const {
    teamMembers,
    leaveRequests,
    leaveTypes,
    overtimeRecords,
    currentYear,
    minOnDutyStaff = 2,
    minCapacityThreshold = 70,
  } = params;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMs = new Date(todayStr).getTime();
  const eligibleMembers = teamMembers.filter(isEligibleTeamStaffForPrediction);
  if (eligibleMembers.length === 0) return [];

  const memberMap = new Map(
    eligibleMembers.map((m) => [m.email.toLowerCase(), m])
  );

  const currentlyOnLeaveEmails = new Set(
    leaveRequests
      .filter(
        (r) =>
          r.status === "approved" &&
          r.start_date <= todayStr &&
          r.end_date >= todayStr &&
          memberMap.has(r.user_email.toLowerCase())
      )
      .map((r) => r.user_email.toLowerCase())
  );

  const currentOnDutyCount = Math.max(
    0,
    eligibleMembers.length - currentlyOnLeaveEmails.size
  );
  const currentCapacityPercent = Math.round(
    (currentOnDutyCount / eligibleMembers.length) * 100
  );

  const upcomingCoveragesByEmail = new Map<string, LeaveRequest[]>();
  leaveRequests
    .filter(
      (r) =>
        (r.status === "approved" || r.status === "pending") &&
        r.end_date >= todayStr &&
        r.handover_email
    )
    .forEach((r) => {
      const hEmail = r.handover_email!.toLowerCase();
      const list = upcomingCoveragesByEmail.get(hEmail) || [];
      list.push(r);
      upcomingCoveragesByEmail.set(hEmail, list);
    });

  const otHoursByEmail = new Map<string, number>();
  overtimeRecords
    .filter((r) => r.status === "approved" || r.status === "pending")
    .forEach((r) => {
      const e = r.user_email.toLowerCase();
      otHoursByEmail.set(e, (otHoursByEmail.get(e) || 0) + (Number(r.hours) || 0));
    });

  const rawPredictions = eligibleMembers.map((member) => {
    const emailLower = member.email.toLowerCase();
    const isCurrentlyOnLeave = currentlyOnLeaveEmails.has(emailLower);

    const balances = computeUserBalances(
      leaveTypes,
      leaveRequests,
      member.email,
      currentYear
    );
    const annualBal = balances.find((b) => b.leaveType.code === "annual");
    const annualRemaining = annualBal?.remaining ?? 21;
    const annualEntitled = annualBal?.entitled ?? 21;
    const carriedForward = annualBal?.carriedForward ?? 0;
    const totalTakenThisYear = balances.reduce((s, b) => s + b.approved, 0);

    const memberLeaves = leaveRequests.filter(
      (r) => r.user_email.toLowerCase() === emailLower
    );

    const pendingLeaves = memberLeaves
      .filter((r) => r.status === "pending" && r.end_date >= todayStr)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));

    const futureApprovedLeaves = memberLeaves
      .filter((r) => r.status === "approved" && r.start_date > todayStr)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));

    const pastApprovedLeaves = memberLeaves
      .filter((r) => r.status === "approved" && r.end_date < todayStr)
      .sort((a, b) => b.end_date.localeCompare(a.end_date));

    let daysSinceLastLeave: number | null = null;
    if (pastApprovedLeaves.length > 0) {
      const lastEndMs = new Date(pastApprovedLeaves[0].end_date).getTime();
      daysSinceLastLeave = Math.max(
        0,
        Math.round((todayMs - lastEndMs) / (1000 * 60 * 60 * 24))
      );
    }

    const memberOt = overtimeRecords.filter(
      (r) =>
        r.user_email.toLowerCase() === emailLower &&
        (r.status === "approved" || r.status === "pending")
    );
    const recentOvertimeHours = memberOt.reduce(
      (s, r) => s + (Number(r.hours) || 0),
      0
    );
    const toilHoursBanked = memberOt
      .filter((r) => r.compensatory_choice === "time_off_in_lieu")
      .reduce((s, r) => s + (Number(r.hours) || 0), 0);

    const projectSet = new Set<string>();
    memberOt.forEach((r) => {
      const meta = parseOvertimeRecordMeta(r);
      if (meta.projectTitle) projectSet.add(meta.projectTitle);
    });
    const keyProjectsAffected = Array.from(projectSet).slice(0, 2);

    const activeCoverages = upcomingCoveragesByEmail.get(emailLower) || [];

    // Compute likelihood score
    let score = 15;
    const reasons: string[] = [];

    if (pendingLeaves.length > 0) {
      const nextReq = pendingLeaves[0];
      score += 38;
      reasons.push(`Pending ${nextReq.working_days}d leave (${nextReq.start_date})`);
    } else if (futureApprovedLeaves.length > 0) {
      const nextApp = futureApprovedLeaves[0];
      score += 32;
      reasons.push(`Scheduled ${nextApp.working_days}d leave (${nextApp.start_date})`);
    }

    const unspentRatio = annualEntitled > 0 ? annualRemaining / annualEntitled : 0;
    score += Math.round(unspentRatio * 24);
    if (annualRemaining >= 15) {
      reasons.push(`${annualRemaining}d unspent annual balance`);
    }

    if (carriedForward > 0) {
      score += Math.min(12, carriedForward * 2);
      reasons.push(`${carriedForward}d carry-forward balance`);
    }

    if (daysSinceLastLeave === null && totalTakenThisYear === 0) {
      score += 18;
      reasons.push(`No leave taken yet in ${currentYear}`);
    } else if (daysSinceLastLeave !== null && daysSinceLastLeave >= 60) {
      score += Math.min(16, Math.round(daysSinceLastLeave / 7));
      reasons.push(`${daysSinceLastLeave}d since last leave`);
    }

    if (recentOvertimeHours >= 6) {
      score += Math.min(18, Math.round(recentOvertimeHours * 0.7));
      reasons.push(`${recentOvertimeHours.toFixed(1)}h recent overtime`);
    }

    if (isCurrentlyOnLeave) {
      score = Math.max(10, score - 45);
      reasons.unshift("Currently on leave");
    }

    const likelihoodScore = Math.min(98, Math.max(12, score));
    const likelihoodLabel: NextLeavePrediction["likelihoodLabel"] =
      likelihoodScore >= 75
        ? "Very High"
        : likelihoodScore >= 55
        ? "High"
        : likelihoodScore >= 35
        ? "Moderate"
        : "Low";

    if (reasons.length === 0) {
      reasons.push(`${annualRemaining}d annual balance remaining`);
    }

    const primaryReason = reasons.slice(0, 2).join(" • ");

    let predictedLeaveType = "Annual Leave";
    let predictedDurationDays = annualRemaining >= 14 ? 7 : 5;
    let predictedWindow = "Next 2–3 weeks";

    if (pendingLeaves.length > 0) {
      predictedDurationDays = pendingLeaves[0].working_days;
      predictedWindow = pendingLeaves[0].start_date;
    } else if (futureApprovedLeaves.length > 0) {
      predictedDurationDays = futureApprovedLeaves[0].working_days;
      predictedWindow = futureApprovedLeaves[0].start_date;
    }

    // Compute Operational Impact
    const projectedOnDutyCount = isCurrentlyOnLeave
      ? currentOnDutyCount
      : Math.max(0, currentOnDutyCount - 1);
    const projectedCapacityPercent = Math.round(
      (projectedOnDutyCount / eligibleMembers.length) * 100
    );
    const breachesMinStaffing =
      projectedOnDutyCount < minOnDutyStaff ||
      projectedCapacityPercent < minCapacityThreshold;

    const handoverConflicts = activeCoverages.map((cov) => {
      const coveredMember = memberMap.get(cov.user_email.toLowerCase());
      return coveredMember?.full_name || cov.user_email;
    });

    let impactScore = 25;
    if (breachesMinStaffing) impactScore += 35;
    if (handoverConflicts.length > 0) impactScore += 20;
    if (recentOvertimeHours >= 10) impactScore += 15;
    if (keyProjectsAffected.length > 0) impactScore += 10;
    impactScore = Math.min(98, impactScore);

    const severity: LeaveImpactSeverity =
      impactScore >= 75
        ? "critical"
        : impactScore >= 55 || breachesMinStaffing || handoverConflicts.length > 0
        ? "high"
        : impactScore >= 38
        ? "moderate"
        : "low";

    const severityLabel =
      severity === "critical"
        ? "Critical Impact"
        : severity === "high"
        ? "High Impact"
        : severity === "moderate"
        ? "Moderate Impact"
        : "Low Impact";

    const avgWeeklyOt = recentOvertimeHours > 0 ? recentOvertimeHours / 4 : 2;
    const estimatedReplacementOtHours =
      Math.round(avgWeeklyOt * (predictedDurationDays / 5) * 10) / 10;

    // Best backup relief from eligible staff (excluding fmbuthia & test)
    const candidateReliefList = eligibleMembers
      .filter(
        (m) =>
          m.email.toLowerCase() !== emailLower &&
          !currentlyOnLeaveEmails.has(m.email.toLowerCase())
      )
      .map((m) => {
        const mEmail = m.email.toLowerCase();
        const covCount = (upcomingCoveragesByEmail.get(mEmail) || []).length;
        const mOt = otHoursByEmail.get(mEmail) || 0;
        return { m, covCount, mOt, loadPenalty: covCount * 25 + mOt * 1.2 };
      })
      .sort((a, b) => a.loadPenalty - b.loadPenalty);

    const bestRelief =
      candidateReliefList.length > 0
        ? {
            name:
              candidateReliefList[0].m.full_name ||
              candidateReliefList[0].m.email,
            email: candidateReliefList[0].m.email,
            reason: "Lowest current handover & OT load",
          }
        : null;

    const summary =
      handoverConflicts.length > 0
        ? `Staffing drops to ${projectedCapacityPercent}% (${projectedOnDutyCount}/${eligibleMembers.length}) & clashes with relief for ${handoverConflicts.join(", ")}.`
        : keyProjectsAffected.length > 0
        ? `Staffing shifts to ${projectedCapacityPercent}% (${projectedOnDutyCount}/${eligibleMembers.length}); requires coverage on ${keyProjectsAffected[0]}.`
        : `Staffing shifts from ${currentCapacityPercent}% to ${projectedCapacityPercent}% (${projectedOnDutyCount}/${eligibleMembers.length} on duty).`;

    return {
      member,
      rank: 0,
      likelihoodScore,
      likelihoodLabel,
      predictedLeaveType,
      predictedDurationDays,
      predictedWindow,
      primaryReason,
      reasons,
      metrics: {
        annualRemaining,
        annualEntitled,
        carriedForward,
        totalTakenThisYear,
        daysSinceLastLeave,
        recentOvertimeHours,
        toilHoursBanked,
        activeCoveragesCount: activeCoverages.length,
        pendingRequestDates:
          pendingLeaves.length > 0
            ? `${pendingLeaves[0].start_date} → ${pendingLeaves[0].end_date}`
            : null,
      },
      impact: {
        severity,
        severityLabel,
        impactScore,
        currentCapacityPercent,
        projectedCapacityPercent,
        currentOnDutyCount,
        projectedOnDutyCount,
        breachesMinStaffing,
        handoverConflicts,
        keyProjectsAffected,
        estimatedReplacementOtHours,
        recommendedReliefColleague: bestRelief,
        summary,
      },
    };
  });

  rawPredictions.sort(
    (a, b) =>
      b.likelihoodScore - a.likelihoodScore ||
      b.impact.impactScore - a.impact.impactScore
  );

  return rawPredictions.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}
