"use client";

import { useId, useMemo, useState } from "react";
import { motion } from "motion/react";
import type { LeaveType, LeaveRequest } from "@/lib/leave/types";
import { calculateWorkingDays } from "@/lib/leave/types";
import {
  CalendarDaysIcon,
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
} from "@/components/ui/icons";

export type RadialStackedCardProps = {
  leaveType: LeaveType;
  entitled: number;
  approved: number;
  pending: number;
  remaining: number;
  activeLeaveRequest?: LeaveRequest | null;
  upcomingLeaveRequest?: LeaveRequest | null;
};

export function LeaveRadialStackedCard({
  leaveType,
  entitled,
  approved,
  pending,
  remaining,
  activeLeaveRequest,
  upcomingLeaveRequest,
}: RadialStackedCardProps) {
  const filterId = useId();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // 1. Annual Allowance Baseline Metrics
  const annualEntitled = entitled;
  const annualApproved = approved;
  const annualPending = pending;
  const annualRemaining = remaining;
  const annualRemainingPercent =
    annualEntitled > 0
      ? Math.max(0, Math.min(100, Math.round((annualRemaining / annualEntitled) * 100)))
      : 0;

  // 2. Applied Leave Timeline Metrics:
  // "from when the leave was applied to when it is supposed to end"
  const appliedLeaveDetails = useMemo(() => {
    const targetLeave = activeLeaveRequest || upcomingLeaveRequest;
    if (!targetLeave) return null;

    const startDate = targetLeave.start_date;
    const endDate = targetLeave.end_date;
    const totalDays = targetLeave.working_days;

    const isOngoing = startDate <= todayStr && endDate >= todayStr;
    const isFuture = startDate > todayStr;
    const isPast = endDate < todayStr;

    let daysOnLeave = 0;
    let daysRemainingInLeave = totalDays;

    if (isOngoing) {
      const elapsedWorkingDays = calculateWorkingDays(startDate, todayStr);
      daysOnLeave = Math.min(totalDays, Math.max(1, elapsedWorkingDays));
      daysRemainingInLeave = Math.max(0, totalDays - daysOnLeave);
    } else if (isFuture) {
      daysOnLeave = 0;
      daysRemainingInLeave = totalDays;
    } else if (isPast) {
      daysOnLeave = totalDays;
      daysRemainingInLeave = 0;
    }

    const leaveProgressPercent =
      totalDays > 0 ? Math.max(0, Math.min(100, Math.round((daysOnLeave / totalDays) * 100))) : 0;
    const leaveRemainingPercent =
      totalDays > 0 ? Math.max(0, Math.min(100, Math.round((daysRemainingInLeave / totalDays) * 100))) : 0;

    return {
      leave: targetLeave,
      startDate,
      endDate,
      totalDays,
      daysOnLeave,
      daysRemainingInLeave,
      leaveProgressPercent,
      leaveRemainingPercent,
      isOngoing,
      isFuture,
      isPast,
    };
  }, [activeLeaveRequest, upcomingLeaveRequest, todayStr]);

  // Depletion status badge & styling
  const depletionStatus = useMemo(() => {
    if (annualRemaining === 0) {
      return {
        label: "Annual Depleted",
        badge: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
        accentHex: "#ef4444",
      };
    }
    if (annualRemaining <= 3 || annualRemainingPercent <= 20) {
      return {
        label: "Near Depleted",
        badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
        accentHex: "#f43f5e",
      };
    }
    if (annualRemainingPercent <= 50) {
      return {
        label: "Moderate Balance",
        badge: "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20",
        accentHex: "#f59e0b",
      };
    }
    return {
      label: "Healthy Balance",
      badge: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20",
      accentHex: "#00A34D", // Safaricom Green
    };
  }, [annualRemaining, annualRemainingPercent]);

  // Radial Chart - Stacked Math Geometry
  // Canvas: 200 x 200
  // Center: (100, 100)
  const cx = 100;
  const cy = 100;

  // Outer Stacked Ring: Annual Days Pool
  const outerRadius = 70;
  const outerCircumference = 2 * Math.PI * outerRadius; // ~439.82

  const safeEntitled = Math.max(1, annualEntitled);
  const outerApprovedLen = (annualApproved / safeEntitled) * outerCircumference;
  const outerPendingLen = (annualPending / safeEntitled) * outerCircumference;
  const outerRemainingLen = (annualRemaining / safeEntitled) * outerCircumference;

  // Inner Stacked Ring: Applied Leave Journey (if active/scheduled)
  const innerRadius = 50;
  const innerCircumference = 2 * Math.PI * innerRadius; // ~314.16

  const appliedTotal = appliedLeaveDetails ? Math.max(1, appliedLeaveDetails.totalDays) : 1;
  const innerElapsedLen = appliedLeaveDetails
    ? (appliedLeaveDetails.daysOnLeave / appliedTotal) * innerCircumference
    : 0;
  const innerRemainingLen = appliedLeaveDetails
    ? (appliedLeaveDetails.daysRemainingInLeave / appliedTotal) * innerCircumference
    : 0;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* Card Header: Leave Type, Annual Allowance & Status */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-sm font-bold text-gray-900 tracking-tight block">
              {leaveType.name}
            </span>
            <span className="text-[11px] font-semibold text-gray-500">
              Annual Entitlement: <strong className="text-gray-900">{annualEntitled} days</strong>
            </span>
          </div>

          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${depletionStatus.badge}`}>
            {depletionStatus.label}
          </span>
        </div>
      </div>

      {/* Main Section: Radial Chart - Stacked */}
      <div className="my-2 flex flex-col items-center justify-center">
        <div className="relative flex h-48 w-48 items-center justify-center">
          <svg
            viewBox="0 0 200 200"
            className="h-full w-full -rotate-90 transform overflow-visible"
            aria-label={`Leave balance showing ${annualRemaining} remaining of ${annualEntitled} days`}
          >
            <defs>
              <linearGradient id={`remainingGrad-${filterId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#00A34D" />
              </linearGradient>

              <filter id={`ringShadow-${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.1" />
              </filter>
            </defs>

            {/* Polar Grid: Subtle Concentric Background Circles (Shadcn style) */}
            <circle
              cx={cx}
              cy={cy}
              r={outerRadius}
              className="stroke-slate-100"
              strokeWidth="12"
              fill="none"
            />
            <circle
              cx={cx}
              cy={cy}
              r={innerRadius}
              className="stroke-slate-100/70"
              strokeWidth={appliedLeaveDetails ? "8" : "1"}
              strokeDasharray={appliedLeaveDetails ? undefined : "3 3"}
              fill="none"
            />

            {/* OUTER STACKED RADIAL BAR: ANNUAL DAYS POOL */}
            {/* Segment 1: Taken / Approved Annual Days (Slate-500) */}
            {annualApproved > 0 && (
              <motion.circle
                cx={cx}
                cy={cy}
                r={outerRadius}
                stroke="#64748b"
                strokeWidth="12"
                strokeDasharray={`${outerApprovedLen} ${outerCircumference}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                fill="none"
                initial={{ strokeDasharray: `0 ${outerCircumference}` }}
                animate={{ strokeDasharray: `${outerApprovedLen} ${outerCircumference}` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="transition-all hover:opacity-85 cursor-pointer"
                onMouseEnter={() => setHoveredSegment("taken")}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            )}

            {/* Segment 2: Pending Approval Days (Amber-500) */}
            {annualPending > 0 && (
              <motion.circle
                cx={cx}
                cy={cy}
                r={outerRadius}
                stroke="#f59e0b"
                strokeWidth="12"
                strokeDasharray={`${outerPendingLen} ${outerCircumference}`}
                strokeDashoffset={-outerApprovedLen}
                strokeLinecap="round"
                fill="none"
                initial={{ strokeDasharray: `0 ${outerCircumference}` }}
                animate={{ strokeDasharray: `${outerPendingLen} ${outerCircumference}` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                className="transition-all hover:opacity-85 cursor-pointer"
                onMouseEnter={() => setHoveredSegment("pending")}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            )}

            {/* Segment 3: Remaining Annual Allowance (Safaricom Green / Emerald) */}
            {annualRemaining > 0 && (
              <motion.circle
                cx={cx}
                cy={cy}
                r={outerRadius}
                stroke={`url(#remainingGrad-${filterId})`}
                strokeWidth="12"
                strokeDasharray={`${outerRemainingLen} ${outerCircumference}`}
                strokeDashoffset={-(outerApprovedLen + outerPendingLen)}
                strokeLinecap="round"
                fill="none"
                filter={`url(#ringShadow-${filterId})`}
                initial={{ strokeDasharray: `0 ${outerCircumference}` }}
                animate={{ strokeDasharray: `${outerRemainingLen} ${outerCircumference}` }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                className="transition-all hover:opacity-90 cursor-pointer"
                onMouseEnter={() => setHoveredSegment("remaining")}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            )}

            {/* INNER STACKED RADIAL BAR: APPLIED LEAVE JOURNEY (If active or scheduled) */}
            {appliedLeaveDetails && (
              <>
                {/* Inner Segment 1: Days on leave elapsed (Slate-400) */}
                {appliedLeaveDetails.daysOnLeave > 0 && (
                  <motion.circle
                    cx={cx}
                    cy={cy}
                    r={innerRadius}
                    stroke="#94a3b8"
                    strokeWidth="8"
                    strokeDasharray={`${innerElapsedLen} ${innerCircumference}`}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                    fill="none"
                    initial={{ strokeDasharray: `0 ${innerCircumference}` }}
                    animate={{ strokeDasharray: `${innerElapsedLen} ${innerCircumference}` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  />
                )}

                {/* Inner Segment 2: Remaining days until leave ends (Teal-500) */}
                {appliedLeaveDetails.daysRemainingInLeave > 0 && (
                  <motion.circle
                    cx={cx}
                    cy={cy}
                    r={innerRadius}
                    stroke="#0d9488"
                    strokeWidth="8"
                    strokeDasharray={`${innerRemainingLen} ${innerCircumference}`}
                    strokeDashoffset={-innerElapsedLen}
                    strokeLinecap="round"
                    fill="none"
                    initial={{ strokeDasharray: `0 ${innerCircumference}` }}
                    animate={{ strokeDasharray: `${innerRemainingLen} ${innerCircumference}` }}
                    transition={{ duration: 0.9, ease: "easeOut", delay: 0.25 }}
                  />
                )}
              </>
            )}
          </svg>

          {/* Radial Chart - Stacked Center Label (Shadcn style typography) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
            <motion.span
              key={annualRemaining}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="font-mono text-3xl font-extrabold tracking-tight text-gray-900"
            >
              {annualRemaining}
            </motion.span>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Days Left
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">
              {annualRemainingPercent}% of {annualEntitled}d
            </span>
          </div>
        </div>

        {/* Dynamic Hover Tooltip / Status Display */}
        <div className="h-5 text-center text-[11px] font-semibold transition-all">
          {hoveredSegment === "remaining" && (
            <span className="text-emerald-700">Annual Allowance Left: {annualRemaining} days</span>
          )}
          {hoveredSegment === "taken" && (
            <span className="text-slate-600">Taken this Year: {annualApproved} days</span>
          )}
          {hoveredSegment === "pending" && (
            <span className="text-amber-700">Pending Approval: {annualPending} days</span>
          )}
          {!hoveredSegment && (
            <span className="text-gray-500">{annualRemaining} days available before yearly depletion</span>
          )}
        </div>
      </div>

      {/* Applied Leave Journey Countdown: "From When Leave Was Applied to When It Is Supposed to End" */}
      {appliedLeaveDetails ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5 text-emerald-900">
              <CalendarDaysIcon className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>
                {appliedLeaveDetails.isOngoing ? "Active Leave In Progress" : "Scheduled Applied Leave"}
              </span>
            </span>
            <span className="font-mono text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md font-semibold">
              {appliedLeaveDetails.totalDays} working days applied
            </span>
          </div>

          {/* Applied Start Date -> Supposed to End Date */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
            <span>Applied: <strong className="font-mono text-emerald-950">{appliedLeaveDetails.startDate}</strong></span>
            <span>Supposed to End: <strong className="font-mono text-emerald-950">{appliedLeaveDetails.endDate}</strong></span>
          </div>

          {/* Applied Leave Stacked Countdown Bar */}
          <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-emerald-200/80">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${appliedLeaveDetails.leaveProgressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-slate-500 transition-all"
              title={`${appliedLeaveDetails.daysOnLeave}d on leave`}
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${appliedLeaveDetails.leaveRemainingPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              className="h-full bg-teal-600 transition-all"
              title={`${appliedLeaveDetails.daysRemainingInLeave}d remaining`}
            />
          </div>

          {/* Days on Leave vs Days Remaining */}
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className="text-emerald-800">
              On leave: <strong className="font-mono font-bold text-emerald-950">{appliedLeaveDetails.daysOnLeave}d elapsed</strong>
            </span>
            <span className="text-emerald-900">
              Remaining: <strong className="font-mono font-bold text-emerald-950">{appliedLeaveDetails.daysRemainingInLeave}d until end</strong>
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-2.5 text-center text-[11px] text-gray-500">
          <span>No leave active currently • Full annual allowance intact</span>
        </div>
      )}

      {/* Annual Days Stacked Breakdown Bar & Legend */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-2.5">
        <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
          <span className="text-gray-700">Annual Days Pool:</span>
          <span className="font-mono text-gray-900">
            {annualRemaining} / {annualEntitled} days remaining
          </span>
        </div>

        {/* Stacked Legend Grid */}
        <div className="grid grid-cols-3 gap-1 pt-1 text-center text-[11px]">
          <div className="rounded-lg bg-white p-1.5 border border-gray-100 flex flex-col items-center">
            <span className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
              Remaining
            </span>
            <strong className="font-mono text-emerald-700 font-bold mt-0.5">{annualRemaining}d</strong>
          </div>

          <div className="rounded-lg bg-white p-1.5 border border-gray-100 flex flex-col items-center">
            <span className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-slate-500 shrink-0" />
              Taken
            </span>
            <strong className="font-mono text-gray-800 font-bold mt-0.5">{annualApproved}d</strong>
          </div>

          <div className="rounded-lg bg-white p-1.5 border border-gray-100 flex flex-col items-center">
            <span className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-gray-300 shrink-0" />
              Entitled
            </span>
            <strong className="font-mono text-gray-900 font-bold mt-0.5">{annualEntitled}d</strong>
          </div>
        </div>

        {/* Pending Requests Notice */}
        {annualPending > 0 && (
          <div className="mt-2 flex items-center justify-between border-t border-gray-200/60 pt-1.5 text-[10px] text-amber-700 font-medium">
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3 shrink-0" />
              <span>Pending manager review:</span>
            </span>
            <strong className="font-mono font-semibold">{annualPending}d requested</strong>
          </div>
        )}
      </div>
    </div>
  );
}
