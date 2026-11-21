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
    mitigationSteps: string[];
  };
};

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
  const activeMembers = teamMembers.filter((m) => m.is_active);
  if (activeMembers.length === 0) return [];

  const memberMap = new Map(
    activeMembers.map((m) => [m.email.toLowerCase(), m])
  );

  // Identify who is currently on approved leave today
  const currentlyOnLeaveEmails = new Set(
    leaveRequests
      .filter(
        (r) =>
          r.status === "approved" &&
          r.start_date <= todayStr &&
          r.end_date >= todayStr
      )
      .map((r) => r.user_email.toLowerCase())
  );

  const currentOnDutyCount = Math.max(
    0,
    activeMembers.length - currentlyOnLeaveEmails.size
  );
  const currentCapacityPercent = Math.round(
    (currentOnDutyCount / activeMembers.length) * 100
  );

  // Pre-calculate handover load per member (active or upcoming leaves where they are relief)
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

  // Pre-calculate overtime hours per member for relief scoring
  const otHoursByEmail = new Map<string, number>();
  overtimeRecords
    .filter((r) => r.status === "approved" || r.status === "pending")
    .forEach((r) => {
      const e = r.user_email.toLowerCase();
      otHoursByEmail.set(e, (otHoursByEmail.get(e) || 0) + (Number(r.hours) || 0));
    });

  // Evaluate each active member
  const rawPredictions = activeMembers.map((member) => {
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

    // Member's leave history
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

    // Member's overtime & projects
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
    const keyProjectsAffected = Array.from(projectSet).slice(0, 3);

    // Historical relief duties completed + active coverages
    const activeCoverages = upcomingCoveragesByEmail.get(emailLower) || [];
    const totalTimesActedAsRelief = leaveRequests.filter(
      (r) =>
        r.status === "approved" &&
        r.handover_email?.toLowerCase() === emailLower
    ).length;

    // --- COMPUTE LIKELIHOOD SCORE (0 - 100) ---
    let score = 15; // Baseline probability
    const reasons: string[] = [];

    // 1. Pending or upcoming scheduled leave
    if (pendingLeaves.length > 0) {
      const nextReq = pendingLeaves[0];
      score += 38;
      reasons.push(
        `Has a pending ${nextReq.working_days}-day leave request queued for ${nextReq.start_date}`
      );
    } else if (futureApprovedLeaves.length > 0) {
      const nextApp = futureApprovedLeaves[0];
      score += 32;
      reasons.push(
        `Scheduled for upcoming approved leave (${nextApp.working_days}d starting ${nextApp.start_date})`
      );
    }

    // 2. Unspent annual balance pressure
    const unspentRatio =
      annualEntitled > 0 ? annualRemaining / annualEntitled : 0;
    const balancePoints = Math.round(unspentRatio * 24);
    score += balancePoints;
    if (annualRemaining >= 15) {
      reasons.push(
        `High unspent annual balance (${annualRemaining} of ${annualEntitled} days remaining)`
      );
    }

    // 3. Carry-forward forfeiture pressure
    if (carriedForward > 0) {
      score += Math.min(12, carriedForward * 2);
      reasons.push(
        `${carriedForward} carried-forward day${carriedForward === 1 ? "" : "s"} at risk of cycle forfeiture`
      );
    }

    // 4. Rest deficit / days since last leave
    if (daysSinceLastLeave === null && totalTakenThisYear === 0) {
      score += 18;
      reasons.push(`Has taken 0 leave days so far in FY ${currentYear}`);
    } else if (daysSinceLastLeave !== null && daysSinceLastLeave >= 60) {
      score += Math.min(16, Math.round(daysSinceLastLeave / 7));
      reasons.push(`${daysSinceLastLeave} days elapsed since last completed leave`);
    }

    // 5. Overtime fatigue & TOIL accumulation
    if (recentOvertimeHours >= 8) {
      score += Math.min(18, Math.round(recentOvertimeHours * 0.7));
      reasons.push(
        `High overtime workload (${recentOvertimeHours.toFixed(1)}h logged) increases burnout/rest likelihood`
      );
    }
    if (toilHoursBanked >= 8) {
      score += 10;
      reasons.push(
        `${(toilHoursBanked / 8).toFixed(1)} TOIL compensatory rest days banked`
      );
    }

    // 6. Relief duty fatigue
    if (totalTimesActedAsRelief >= 2) {
      score += 6;
      reasons.push(
        `Acted as relief coverage for ${totalTimesActedAsRelief} teammate leaves`
      );
    }

    // If already on leave right now, lower "next to go" score
    if (isCurrentlyOnLeave) {
      score = Math.max(10, score - 45);
      reasons.unshift("Currently on active leave today");
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
      reasons.push(
        `${annualRemaining} annual leave days available in current cycle`
      );
    }

    // Predict leave type, duration, and window
    let predictedLeaveType = "Annual Leave";
    let predictedDurationDays =
      annualRemaining >= 14 ? 7 : annualRemaining >= 7 ? 5 : 3;
    let predictedWindow = "Within next 2–4 weeks";

    if (pendingLeaves.length > 0) {
      const p = pendingLeaves[0];
      predictedDurationDays = p.working_days;
      predictedWindow = `${p.start_date} to ${p.end_date}`;
      const lt = leaveTypes.find((t) => t.code === p.leave_type);
      predictedLeaveType = lt?.name || "Annual Leave";
    } else if (futureApprovedLeaves.length > 0) {
      const f = futureApprovedLeaves[0];
      predictedDurationDays = f.working_days;
      predictedWindow = `${f.start_date} to ${f.end_date}`;
      const lt = leaveTypes.find((t) => t.code === f.leave_type);
      predictedLeaveType = lt?.name || "Annual Leave";
    } else if (toilHoursBanked >= 16 && recentOvertimeHours >= 16) {
      predictedLeaveType = "Annual Leave + TOIL Rest";
      predictedDurationDays = Math.min(
        10,
        Math.max(4, Math.round(toilHoursBanked / 8) + 3)
      );
      predictedWindow = "Next 10–21 days (Post-Overtime Recovery)";
    } else if (annualRemaining >= 18) {
      predictedWindow = "Next 2–3 weeks (Quota Burn-Down)";
    }

    // --- COMPUTE OPERATIONAL IMPACT ---
    const projectedOnDutyCount = isCurrentlyOnLeave
      ? currentOnDutyCount
      : Math.max(0, currentOnDutyCount - 1);
    const projectedCapacityPercent = Math.round(
      (projectedOnDutyCount / activeMembers.length) * 100
    );
    const breachesMinStaffing =
      projectedOnDutyCount < minOnDutyStaff ||
      projectedCapacityPercent < minCapacityThreshold;

    const handoverConflicts = activeCoverages.map((cov) => {
      const coveredMember = memberMap.get(cov.user_email.toLowerCase());
      const coveredName = coveredMember?.full_name || cov.user_email;
      return `Assigned as relief for ${coveredName} (${cov.start_date} to ${cov.end_date})`;
    });

    let impactScore = 25;
    if (breachesMinStaffing) impactScore += 35;
    if (handoverConflicts.length > 0)
      impactScore += Math.min(25, handoverConflicts.length * 15);
    if (member.role === "approver") impactScore += 18;
    if (recentOvertimeHours >= 10) impactScore += 15;
    if (keyProjectsAffected.length > 0) impactScore += 10;
    impactScore = Math.min(98, impactScore);

    const severity: LeaveImpactSeverity =
      impactScore >= 75 || (breachesMinStaffing && handoverConflicts.length > 0)
        ? "critical"
        : impactScore >= 55 || breachesMinStaffing || handoverConflicts.length > 0
        ? "high"
        : impactScore >= 38
        ? "moderate"
        : "low";

    const severityLabel =
      severity === "critical"
        ? "Critical Operational Impact"
        : severity === "high"
        ? "High Operational Impact"
        : severity === "moderate"
        ? "Moderate Team Impact"
        : "Low / Manageable Impact";

    // Estimate overtime hours that will shift to teammates during their absence
    const avgWeeklyOt = recentOvertimeHours > 0 ? recentOvertimeHours / 4 : 2;
    const estimatedReplacementOtHours =
      Math.round(avgWeeklyOt * (predictedDurationDays / 5) * 10) / 10;

    // Recommend the best available relief colleague
    const candidateReliefList = activeMembers
      .filter(
        (m) =>
          m.email.toLowerCase() !== emailLower &&
          !currentlyOnLeaveEmails.has(m.email.toLowerCase())
      )
      .map((m) => {
        const mEmail = m.email.toLowerCase();
        const covCount = (upcomingCoveragesByEmail.get(mEmail) || []).length;
        const mOt = otHoursByEmail.get(mEmail) || 0;
        const loadPenalty = covCount * 25 + mOt * 1.2;
        return { m, covCount, mOt, loadPenalty };
      })
      .sort((a, b) => a.loadPenalty - b.loadPenalty);

    const bestRelief =
      candidateReliefList.length > 0
        ? {
            name:
              candidateReliefList[0].m.full_name ||
              candidateReliefList[0].m.email,
            email: candidateReliefList[0].m.email,
            reason:
              candidateReliefList[0].covCount === 0
                ? `On duty with 0 conflicting handover assignments (${candidateReliefList[0].mOt.toFixed(1)}h recent OT)`
                : `Lowest current coverage load (${candidateReliefList[0].covCount} active handover)`,
          }
        : null;

    // Build concise impact summary & mitigation steps
    const summaryParts: string[] = [
      `On-duty staffing shifts from ${currentCapacityPercent}% (${currentOnDutyCount}/${activeMembers.length}) to ${projectedCapacityPercent}% (${projectedOnDutyCount}/${activeMembers.length}).`,
    ];
    if (handoverConflicts.length > 0) {
      summaryParts.push(
        `Creates ${handoverConflicts.length} relief coverage clash${
          handoverConflicts.length > 1 ? "es" : ""
        }.`
      );
    }
    if (keyProjectsAffected.length > 0) {
      summaryParts.push(
        `Impacts active overtime support on ${keyProjectsAffected.join(", ")}.`
      );
    }
    if (member.role === "approver") {
      summaryParts.push(
        "Requires temporary delegation of manager approval authority."
      );
    }

    const mitigationSteps: string[] = [];
    if (bestRelief) {
      mitigationSteps.push(
        `Pre-assign ${bestRelief.name} as primary relief colleague (${bestRelief.reason}).`
      );
    }
    if (handoverConflicts.length > 0) {
      mitigationSteps.push(
        `Reassign ${handoverConflicts.length} overlapping relief handover duty before approving leave dates.`
      );
    }
    if (breachesMinStaffing) {
      mitigationSteps.push(
        `Stagger leave start date or defer non-urgent requests to keep on-duty staffing above ${minOnDutyStaff} members (${minCapacityThreshold}%).`
      );
    }
    if (keyProjectsAffected.length > 0) {
      mitigationSteps.push(
        `Conduct technical runbook handover for ${keyProjectsAffected[0]} (~${estimatedReplacementOtHours}h projected shift coverage).`
      );
    }
    if (mitigationSteps.length === 0) {
      mitigationSteps.push(
        "Team capacity remains healthy; standard peer handover is sufficient."
      );
    }

    return {
      member,
      rank: 0,
      likelihoodScore,
      likelihoodLabel,
      predictedLeaveType,
      predictedDurationDays,
      predictedWindow,
      reasons: reasons.slice(0, 4),
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
        summary: summaryParts.join(" "),
        mitigationSteps,
      },
    };
  });

  // Sort by highest likelihood score first (tie-break by impact score)
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
