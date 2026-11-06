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
  InformationCircleIcon,
  ArrowPathIcon,
} from "@/components/ui/icons";

export type SpeedometerCardProps = {
  leaveType: LeaveType;
  entitled: number;
  approved: number;
  pending: number;
  remaining: number;
  activeLeaveRequest?: LeaveRequest | null;
  upcomingLeaveRequest?: LeaveRequest | null;
  chartStyle?: "speedometer" | "radial_donut";
};

export function LeaveSpeedometerCard({
  leaveType,
  entitled,
  approved,
  pending,
  remaining,
  activeLeaveRequest,
  upcomingLeaveRequest,
  chartStyle = "speedometer",
}: SpeedometerCardProps) {
  const filterId = useId();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Preference for viewing applied leave countdown vs annual balance
  const hasAppliedLeave = Boolean(activeLeaveRequest || upcomingLeaveRequest);
  const [viewMode, setViewMode] = useState<"applied_leave" | "annual_balance">(
    hasAppliedLeave ? "applied_leave" : "annual_balance"
  );

  // 1. Applied Leave Timeline Metrics:
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

    // Working days on leave elapsed so far
    let daysOnLeave = 0;
    let daysRemaining = totalDays;

    if (isOngoing) {
      // Days from when leave started to today (clamped)
      const elapsedWorkingDays = calculateWorkingDays(startDate, todayStr);
      daysOnLeave = Math.min(totalDays, Math.max(1, elapsedWorkingDays));
      // Remaining working days before the leave is supposed to end
      daysRemaining = Math.max(0, totalDays - daysOnLeave);
    } else if (isFuture) {
      daysOnLeave = 0;
      daysRemaining = totalDays;
    } else if (isPast) {
      daysOnLeave = totalDays;
      daysRemaining = 0;
    }

    const remainingPercentage =
      totalDays > 0 ? Math.max(0, Math.min(100, Math.round((daysRemaining / totalDays) * 100))) : 0;

    return {
      leave: targetLeave,
      startDate,
      endDate,
      totalDays,
      daysOnLeave,
      daysRemaining,
      remainingPercentage,
      isOngoing,
      isFuture,
      isPast,
    };
  }, [activeLeaveRequest, upcomingLeaveRequest, todayStr]);

  // Determine which metrics the speedometer needle and dial should display:
  // If in applied_leave mode, display days from when leave was applied to when it is supposed to end.
  // Otherwise, display annual allowance metrics.
  const activeMetrics = useMemo(() => {
    if (viewMode === "applied_leave" && appliedLeaveDetails) {
      const { daysRemaining, totalDays, remainingPercentage, daysOnLeave, startDate, endDate, isOngoing } =
        appliedLeaveDetails;

      return {
        type: "applied_leave" as const,
        primaryCount: daysRemaining,
        maxCount: totalDays,
        unitLabel: isOngoing ? "days left of current leave" : "days applied",
        percentage: remainingPercentage,
        startDate,
        endDate,
        daysTaken: daysOnLeave,
        statusTitle: isOngoing ? "Active Leave In Progress" : "Scheduled Leave",
        sublabel: isOngoing
          ? `${daysRemaining} working days until leave ends on ${endDate}`
          : `Starts on ${startDate} • Ends on ${endDate}`,
      };
    }

    // Default to annual balance
    const remainingPercent =
      entitled > 0 ? Math.max(0, Math.min(100, Math.round((remaining / entitled) * 100))) : 0;

    return {
      type: "annual_balance" as const,
      primaryCount: remaining,
      maxCount: entitled,
      unitLabel: "days left of annual balance",
      percentage: remainingPercent,
      startDate: null,
      endDate: null,
      daysTaken: approved,
      statusTitle: "Annual Balance",
      sublabel: `${remaining} days available before yearly depletion`,
    };
  }, [viewMode, appliedLeaveDetails, remaining, entitled, approved]);

  // Depletion status badge & styling
  const depletionStatus = useMemo(() => {
    const { primaryCount, percentage, type } = activeMetrics;

    if (primaryCount === 0) {
      return {
        label: type === "applied_leave" ? "Leave Depleted" : "Allowance Depleted",
        badge: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
        accentHex: "#ef4444",
        indicatorText: "0 days left (Exhausted)",
      };
    }
    if (primaryCount <= 3 || percentage <= 20) {
      return {
        label: type === "applied_leave" ? "Ending Soon" : "Near Depleted",
        badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
        accentHex: "#f43f5e",
        indicatorText: `${primaryCount}d before depletion`,
      };
    }
    if (percentage <= 50) {
      return {
        label: type === "applied_leave" ? "Halfway Finished" : "Moderate Balance",
        badge: "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20",
        accentHex: "#f59e0b",
        indicatorText: `${primaryCount}d remaining`,
      };
    }
    return {
      label: type === "applied_leave" ? "Active Leave" : "Healthy Balance",
      badge: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20",
      accentHex: "#00A34D", // Safaricom Green
      indicatorText: `${primaryCount}d remaining`,
    };
  }, [activeMetrics]);

  // Speedometer Geometry with Solid Central Anchor
  // Canvas: 240 x 170
  // Central Anchor Pivot: cx = 120, cy = 115
  const cx = 120;
  const cy = 115;
  const radius = 82;
  const arcLength = 314.86; // 82 * (220 * Math.PI / 180)

  // Target needle angle:
  // 0% -> -110° (Empty / Depleted, left)
  // 50% -> 0° (Straight UP at 12 o'clock)
  // 100% -> +110° (Full allowance, right)
  const needleAngle = -110 + (activeMetrics.percentage / 100) * 220;

  // Arc path: starts at 160° (bottom-left) sweeps 220° to 380° (bottom-right)
  const arcPath = "M 42.95 143.05 A 82 82 0 1 1 197.05 143.05";
  const fillDashoffset = arcLength * (1 - activeMetrics.percentage / 100);

  // Speedometer dial tick marks
  const ticks = [
    { percent: 0, label: "0d", isMajor: true },
    { percent: 25, label: "", isMajor: false },
    { percent: 50, label: "50%", isMajor: true },
    { percent: 75, label: "", isMajor: false },
    { percent: 100, label: `${activeMetrics.maxCount}d`, isMajor: true },
  ];

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* Card Header: Leave Type & Mode Toggle */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-sm font-bold text-gray-900 tracking-tight block">
              {leaveType.name}
            </span>
            <span className="text-[11px] text-gray-400 font-medium">
              Annual Entitlement: {entitled}d
            </span>
          </div>

          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${depletionStatus.badge}`}>
            {depletionStatus.label}
          </span>
        </div>

        {/* Applied Leave Mode Switcher if an applied leave exists */}
        {hasAppliedLeave && (
          <div className="mt-2.5 flex items-center justify-between rounded-xl bg-gray-50 p-1 border border-gray-100 text-[11px]">
            <span className="text-gray-500 font-medium px-1">Tracking:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode("applied_leave")}
                className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                  viewMode === "applied_leave"
                    ? "bg-white text-brand shadow-xs border border-gray-200"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Applied Leave
              </button>
              <button
                type="button"
                onClick={() => setViewMode("annual_balance")}
                className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                  viewMode === "annual_balance"
                    ? "bg-white text-gray-900 shadow-xs border border-gray-200"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Annual Pool
              </button>
            </div>
          </div>
        )}

        {/* Applied Leave Timeline Banner: Start -> Supposed to End */}
        {appliedLeaveDetails && viewMode === "applied_leave" && (
          <div className="mt-2 rounded-xl bg-emerald-50/90 p-2 border border-emerald-200/80 text-[11px] text-emerald-900">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1">
                <CalendarDaysIcon className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                <span>
                  {appliedLeaveDetails.isOngoing ? "On Leave Now" : "Upcoming Scheduled Leave"}
                </span>
              </span>
              <span className="font-mono text-emerald-800">
                {appliedLeaveDetails.totalDays} working days
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-emerald-700">
              <span>Applied: {appliedLeaveDetails.startDate}</span>
              <span className="font-semibold text-emerald-900">
                Ends: {appliedLeaveDetails.endDate}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Speedometer Gauge with Sturdy Central Anchor */}
      <div className="my-2 flex flex-col items-center justify-center">
        {chartStyle === "speedometer" ? (
          <div className="relative flex w-full flex-col items-center">
            {/* Speedometer SVG Canvas */}
            <svg
              viewBox="0 0 240 170"
              className="w-full max-w-[230px] overflow-visible"
              aria-label={`Speedometer showing ${activeMetrics.primaryCount} of ${activeMetrics.maxCount} days`}
            >
              <defs>
                {/* Arc Multi-Stop Gradient */}
                <linearGradient id={`gaugeGrad-${filterId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="30%" stopColor="#f59e0b" />
                  <stop offset="70%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#00A34D" />
                </linearGradient>

                {/* Central Anchor Bezel Radial Gradient */}
                <radialGradient id={`anchorBezelGrad-${filterId}`} cx="40%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#f3f4f6" />
                  <stop offset="50%" stopColor="#9ca3af" />
                  <stop offset="90%" stopColor="#4b5563" />
                  <stop offset="100%" stopColor="#1f2937" />
                </radialGradient>

                {/* Central Anchor Inner Core Gradient */}
                <radialGradient id={`anchorCoreGrad-${filterId}`} cx="45%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#374151" />
                  <stop offset="70%" stopColor="#1f2937" />
                  <stop offset="100%" stopColor="#111827" />
                </radialGradient>

                {/* Needle 3D Bevel Highlights */}
                <linearGradient id={`needleLeftGrad-${filterId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#9ca3af" />
                  <stop offset="100%" stopColor="#4b5563" />
                </linearGradient>

                <linearGradient id={`needleRightGrad-${filterId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#374151" />
                  <stop offset="100%" stopColor="#1f2937" />
                </linearGradient>

                {/* Drop Shadows */}
                <filter id={`anchorShadow-${filterId}`} x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.3" />
                </filter>
                <filter id={`needleShadow-${filterId}`} x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#000000" floodOpacity="0.28" />
                </filter>
              </defs>

              {/* Background Instrument Scale Track */}
              <path
                d={arcPath}
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="12"
                strokeLinecap="round"
              />

              {/* Depletion Reserve Zone (0 - 20% danger underlay) */}
              <path
                d={arcPath}
                fill="none"
                stroke="#fee2e2"
                strokeWidth="12"
                strokeDasharray={`${arcLength * 0.2} ${arcLength}`}
                strokeDashoffset="0"
                strokeLinecap="round"
                className="opacity-70"
              />

              {/* Active Animated Value Arc */}
              <motion.path
                d={arcPath}
                fill="none"
                stroke={`url(#gaugeGrad-${filterId})`}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${arcLength} ${arcLength}`}
                initial={{ strokeDashoffset: arcLength }}
                animate={{ strokeDashoffset: fillDashoffset }}
                transition={{
                  duration: 1.1,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.1,
                }}
              />

              {/* Graduation Ticks Radiating from the Central Anchor */}
              {ticks.map((t, idx) => {
                const angleDeg = 160 + (t.percent / 100) * 220;
                const rad = (angleDeg * Math.PI) / 180;
                const innerR = t.isMajor ? radius - 11 : radius - 7;
                const outerR = radius - 2;
                const labelR = radius - 21;

                const x1 = cx + innerR * Math.cos(rad);
                const y1 = cy + innerR * Math.sin(rad);
                const x2 = cx + outerR * Math.cos(rad);
                const y2 = cy + outerR * Math.sin(rad);

                const lx = cx + labelR * Math.cos(rad);
                const ly = cy + labelR * Math.sin(rad) + 3;

                return (
                  <g key={idx}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={t.isMajor ? "#6b7280" : "#d1d5db"}
                      strokeWidth={t.isMajor ? "1.75" : "1"}
                    />
                    {t.label && (
                      <text
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="700"
                        fill="#6b7280"
                        className="select-none font-mono"
                      >
                        {t.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* NEEDLE ASSEMBLY (Anchored firmly into the Central Hub) */}
              <motion.g
                initial={{ rotate: -110 }}
                animate={{ rotate: needleAngle }}
                transition={{
                  type: "spring",
                  stiffness: 85,
                  damping: 14,
                  mass: 0.65,
                  delay: 0.15,
                }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
                filter={`url(#needleShadow-${filterId})`}
              >
                {/* Counterweight Spade extending behind the anchor */}
                <path
                  d={`M ${cx - 3.5} ${cy} C ${cx - 4.5} ${cy + 10}, ${cx - 2} ${cy + 17}, ${cx} ${cy + 18} C ${cx + 2} ${cy + 17}, ${cx + 4.5} ${cy + 10}, ${cx + 3.5} ${cy} Z`}
                  fill="#374151"
                />

                {/* Left Needle Half (Light Metallic Bevel) */}
                <path
                  d={`M ${cx - 3} ${cy} L ${cx} ${cy - radius + 10} L ${cx} ${cy} Z`}
                  fill={`url(#needleLeftGrad-${filterId})`}
                />

                {/* Right Needle Half (Dark Metallic Shadow) */}
                <path
                  d={`M ${cx + 3} ${cy} L ${cx} ${cy - radius + 10} L ${cx} ${cy} Z`}
                  fill={`url(#needleRightGrad-${filterId})`}
                />

                {/* Needle Center Ridge Line */}
                <line
                  x1={cx}
                  y1={cy - 2}
                  x2={cx}
                  y2={cy - radius + 9}
                  stroke="#ffffff"
                  strokeWidth="0.75"
                  strokeOpacity="0.6"
                />

                {/* Pointer Tip Arrow (Colored by depletion state) */}
                <polygon
                  points={`${cx - 2.5},${cy - radius + 18} ${cx},${cy - radius + 4} ${cx + 2.5},${cy - radius + 18}`}
                  fill={depletionStatus.accentHex}
                />
              </motion.g>

              {/* PROMINENT CENTRAL ANCHOR (Mechanical Hub & Pivot Bezel) */}
              <g filter={`url(#anchorShadow-${filterId})`}>
                {/* Layer 1: Outer Chrome Bezel Ring */}
                <circle cx={cx} cy={cy} r="16" fill={`url(#anchorBezelGrad-${filterId})`} />
                <circle cx={cx} cy={cy} r="15" fill="none" stroke="#ffffff" strokeWidth="0.75" strokeOpacity="0.7" />

                {/* Layer 2: Deep Dark Instrument Collar */}
                <circle cx={cx} cy={cy} r="12" fill={`url(#anchorCoreGrad-${filterId})`} />

                {/* Layer 3: Brushed Chrome Middle Cap */}
                <circle cx={cx} cy={cy} r="7.5" fill={`url(#anchorBezelGrad-${filterId})`} />

                {/* Layer 4: Center Pivot Rivet Dot */}
                <circle cx={cx} cy={cy} r="4" fill={depletionStatus.accentHex} />
                <circle cx={cx} cy={cy} r="1.5" fill="#ffffff" />
              </g>
            </svg>

            {/* Speedometer Digital Readout Below Anchor */}
            <div className="-mt-1.5 text-center">
              <div className="flex items-baseline justify-center gap-1.5">
                <motion.span
                  key={activeMetrics.primaryCount}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="font-mono text-3xl font-extrabold tracking-tight text-gray-900"
                >
                  {activeMetrics.primaryCount}
                </motion.span>
                <span className="text-xs font-semibold text-gray-500">
                  / {activeMetrics.maxCount} days left
                </span>
              </div>
              <span className="text-[11px] font-semibold text-gray-700 block">
                {activeMetrics.sublabel}
              </span>
            </div>
          </div>
        ) : (
          /* Alternative Radial Donut View */
          <div className="relative flex h-36 w-36 items-center justify-center">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
              <circle cx="50" cy="50" r="38" className="stroke-gray-100" strokeWidth="9" fill="transparent" />
              <motion.circle
                cx="50"
                cy="50"
                r="38"
                stroke={depletionStatus.accentHex}
                strokeWidth="9"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - activeMetrics.percentage / 100)}`}
                strokeLinecap="round"
                fill="transparent"
                initial={{ strokeDashoffset: 2 * Math.PI * 38 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 38 * (1 - activeMetrics.percentage / 100) }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-2xl font-extrabold text-gray-900">{activeMetrics.primaryCount}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Days Left</span>
            </div>
          </div>
        )}
      </div>

      {/* Depletion Countdown Meter & Proximity Indicator */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-2.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-gray-600">
            {viewMode === "applied_leave" ? "Applied Leave Progress:" : "Annual Allowance:"}
          </span>
          <span className="font-mono text-gray-900">{activeMetrics.percentage}% available</span>
        </div>

        {/* Dynamic Depletion Bar */}
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${activeMetrics.percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full transition-colors ${
              activeMetrics.percentage > 50
                ? "bg-emerald-500"
                : activeMetrics.percentage > 20
                ? "bg-amber-500"
                : "bg-red-500"
            }`}
          />
        </div>

        {/* Days on Leave vs Remaining Days Metric Breakdown */}
        <div className="mt-2.5 grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
          <div className="flex items-center gap-1 text-gray-600">
            <span className="inline-block h-2 w-2 rounded-full bg-gray-400 shrink-0" />
            <span>On Leave:</span>
            <strong className="font-mono font-bold text-gray-800">{activeMetrics.daysTaken}d</strong>
          </div>
          <div className="flex items-center justify-end gap-1 text-gray-600">
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: depletionStatus.accentHex }}
            />
            <span>Remaining:</span>
            <strong className="font-mono font-bold text-gray-900">{activeMetrics.primaryCount}d</strong>
          </div>
        </div>

        {/* Pending Requests Notice */}
        {pending > 0 && (
          <div className="mt-1.5 flex items-center justify-between border-t border-gray-200/60 pt-1 text-[10px] text-amber-700 font-medium">
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3 shrink-0" />
              <span>Pending review:</span>
            </span>
            <strong className="font-mono font-semibold">{pending}d requested</strong>
          </div>
        )}
      </div>

      {/* Date Window Footer: Applied Start -> Supposed to End */}
      {activeMetrics.startDate && activeMetrics.endDate && (
        <div className="mt-2 text-[11px] text-gray-600 flex items-center justify-between bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3 text-gray-400 shrink-0" />
            <span>Applied: <strong className="text-gray-800">{activeMetrics.startDate}</strong></span>
          </span>
          <span>
            Ends: <strong className="text-gray-900">{activeMetrics.endDate}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
