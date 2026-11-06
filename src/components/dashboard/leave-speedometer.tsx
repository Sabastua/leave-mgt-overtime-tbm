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

  // 1. Annual Allowance Metrics (Core Baseline)
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

    // Working days on leave elapsed so far
    let daysOnLeave = 0;
    let daysRemainingInLeave = totalDays;

    if (isOngoing) {
      // Days from when leave started to today (clamped)
      const elapsedWorkingDays = calculateWorkingDays(startDate, todayStr);
      daysOnLeave = Math.min(totalDays, Math.max(1, elapsedWorkingDays));
      // Remaining working days before the leave is supposed to end
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

  // Gauge Focus Mode: Default to "annual_balance" so annual days are never lost,
  // but allow focusing on the applied leave countdown if one is active.
  const [gaugeFocus, setGaugeFocus] = useState<"annual_balance" | "applied_leave">("annual_balance");

  // Speedometer Active Value
  const gaugeData = useMemo(() => {
    if (gaugeFocus === "applied_leave" && appliedLeaveDetails) {
      return {
        value: appliedLeaveDetails.daysRemainingInLeave,
        maxValue: appliedLeaveDetails.totalDays,
        percent: appliedLeaveDetails.leaveRemainingPercent,
        label: "Days Left in Leave",
        subtext: appliedLeaveDetails.isOngoing
          ? `until leave ends on ${appliedLeaveDetails.endDate}`
          : `applied for ${appliedLeaveDetails.startDate}`,
      };
    }

    // Default: Annual Days
    return {
      value: annualRemaining,
      maxValue: annualEntitled,
      percent: annualRemainingPercent,
      label: "Annual Days Remaining",
      subtext: `out of ${annualEntitled} annual days`,
    };
  }, [gaugeFocus, appliedLeaveDetails, annualRemaining, annualEntitled, annualRemainingPercent]);

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
        label: "Moderate Allowance",
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

  // Speedometer Geometry with Solid Central Anchor
  // Canvas: 240 x 170
  // Central Anchor: cx = 120, cy = 115
  const cx = 120;
  const cy = 115;
  const radius = 82;
  const arcLength = 314.86; // 82 * (220 * Math.PI / 180)

  // Target needle angle:
  // 0% -> -110° (Empty / Depleted, left)
  // 50% -> 0° (Straight UP at 12 o'clock)
  // 100% -> +110° (Full allowance, right)
  const needleAngle = -110 + (gaugeData.percent / 100) * 220;

  // Arc path: starts at 160° sweeps 220° to 380°
  const arcPath = "M 42.95 143.05 A 82 82 0 1 1 197.05 143.05";
  const fillDashoffset = arcLength * (1 - gaugeData.percent / 100);

  // Speedometer dial tick marks
  const ticks = [
    { percent: 0, label: "0d", isMajor: true },
    { percent: 25, label: "", isMajor: false },
    { percent: 50, label: `${Math.round(gaugeData.maxValue / 2)}d`, isMajor: true },
    { percent: 75, label: "", isMajor: false },
    { percent: 100, label: `${gaugeData.maxValue}d`, isMajor: true },
  ];

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* Top Header: Leave Type, Annual Allowance & Status */}
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

        {/* Dial Focus Switcher (Only if an applied leave exists) */}
        {appliedLeaveDetails && (
          <div className="mt-2.5 flex items-center justify-between rounded-xl bg-gray-50 p-1 border border-gray-100 text-[11px]">
            <span className="text-gray-500 font-medium px-1">Gauge Focus:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setGaugeFocus("annual_balance")}
                className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                  gaugeFocus === "annual_balance"
                    ? "bg-white text-gray-900 shadow-xs border border-gray-200"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Annual Pool ({annualRemaining}d left)
              </button>
              <button
                type="button"
                onClick={() => setGaugeFocus("applied_leave")}
                className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                  gaugeFocus === "applied_leave"
                    ? "bg-white text-brand shadow-xs border border-gray-200"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Applied Leave ({appliedLeaveDetails.daysRemainingInLeave}d left)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Speedometer Gauge with Solid Central Anchor */}
      <div className="my-2 flex flex-col items-center justify-center">
        {chartStyle === "speedometer" ? (
          <div className="relative flex w-full flex-col items-center">
            {/* Speedometer SVG Canvas */}
            <svg
              viewBox="0 0 240 170"
              className="w-full max-w-[230px] overflow-visible"
              aria-label={`Speedometer showing ${gaugeData.value} of ${gaugeData.maxValue} days`}
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

                {/* Pointer Tip Arrow */}
                <polygon
                  points={`${cx - 2.5},${cy - radius + 18} ${cx},${cy - radius + 4} ${cx + 2.5},${cy - radius + 18}`}
                  fill={depletionStatus.accentHex}
                />
              </motion.g>

              {/* PROMINENT CENTRAL ANCHOR (Mechanical Hub & Pivot Bezel) */}
              <g filter={`url(#anchorShadow-${filterId})`}>
                <circle cx={cx} cy={cy} r="16" fill={`url(#anchorBezelGrad-${filterId})`} />
                <circle cx={cx} cy={cy} r="15" fill="none" stroke="#ffffff" strokeWidth="0.75" strokeOpacity="0.7" />
                <circle cx={cx} cy={cy} r="12" fill={`url(#anchorCoreGrad-${filterId})`} />
                <circle cx={cx} cy={cy} r="7.5" fill={`url(#anchorBezelGrad-${filterId})`} />
                <circle cx={cx} cy={cy} r="4" fill={depletionStatus.accentHex} />
                <circle cx={cx} cy={cy} r="1.5" fill="#ffffff" />
              </g>
            </svg>

            {/* Speedometer Digital Readout Below Anchor */}
            <div className="-mt-1.5 text-center">
              <div className="flex items-baseline justify-center gap-1.5">
                <motion.span
                  key={gaugeData.value}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="font-mono text-3xl font-extrabold tracking-tight text-gray-900"
                >
                  {gaugeData.value}
                </motion.span>
                <span className="text-xs font-semibold text-gray-500">
                  / {gaugeData.maxValue} {gaugeData.label}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-gray-600 block">
                {gaugeData.subtext}
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
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - gaugeData.percent / 100)}`}
                strokeLinecap="round"
                fill="transparent"
                initial={{ strokeDashoffset: 2 * Math.PI * 38 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 38 * (1 - gaugeData.percent / 100) }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-2xl font-extrabold text-gray-900">{gaugeData.value}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Days Left</span>
            </div>
          </div>
        )}
      </div>

      {/* Applied Leave Countdown Section: From Applied Date to Supposed to End Date */}
      {appliedLeaveDetails ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5 text-emerald-900">
              <CalendarDaysIcon className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>
                {appliedLeaveDetails.isOngoing ? "Active Leave In Progress" : "Scheduled Applied Leave"}
              </span>
            </span>
            <span className="font-mono text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md font-semibold">
              {appliedLeaveDetails.totalDays} working days applied
            </span>
          </div>

          {/* Date Window: When Applied -> When Supposed to End */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
            <span>Applied Start: <strong className="font-mono text-emerald-950">{appliedLeaveDetails.startDate}</strong></span>
            <span>Supposed to End: <strong className="font-mono text-emerald-950">{appliedLeaveDetails.endDate}</strong></span>
          </div>

          {/* Applied Leave Depletion Bar */}
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-200/80">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${appliedLeaveDetails.leaveRemainingPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-emerald-600 transition-all"
            />
          </div>

          {/* Days on Leave vs Days Remaining to End */}
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
          <span>No leave active currently • Full annual balance intact</span>
        </div>
      )}

      {/* Annual Days Core Breakdown Bar */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-2.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-gray-700">Annual Days Balance:</span>
          <span className="font-mono text-gray-900">
            {annualRemaining} / {annualEntitled} days ({annualRemainingPercent}% left)
          </span>
        </div>

        {/* Dynamic Annual Depletion Bar */}
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${annualRemainingPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full transition-colors ${
              annualRemainingPercent > 50
                ? "bg-emerald-500"
                : annualRemainingPercent > 20
                ? "bg-amber-500"
                : "bg-red-500"
            }`}
          />
        </div>

        {/* Annual Metric Grid: Entitled vs Taken vs Remaining */}
        <div className="mt-2.5 grid grid-cols-3 gap-1 pt-1 text-center text-[11px]">
          <div className="rounded-lg bg-white p-1.5 border border-gray-100">
            <span className="text-[10px] text-gray-400 block font-medium">Entitled</span>
            <strong className="font-mono text-gray-800 font-bold">{annualEntitled}d</strong>
          </div>
          <div className="rounded-lg bg-white p-1.5 border border-gray-100">
            <span className="text-[10px] text-gray-400 block font-medium">Taken</span>
            <strong className="font-mono text-gray-800 font-bold">{annualApproved}d</strong>
          </div>
          <div className="rounded-lg bg-white p-1.5 border border-gray-100">
            <span className="text-[10px] text-gray-400 block font-medium">Annual Left</span>
            <strong className="font-mono text-emerald-700 font-bold">{annualRemaining}d</strong>
          </div>
        </div>

        {/* Pending Requests Notice */}
        {annualPending > 0 && (
          <div className="mt-2 flex items-center justify-between border-t border-gray-200/60 pt-1.5 text-[10px] text-amber-700 font-medium">
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3 shrink-0" />
              <span>Pending review:</span>
            </span>
            <strong className="font-mono font-semibold">{annualPending}d requested</strong>
          </div>
        )}
      </div>
    </div>
  );
}
