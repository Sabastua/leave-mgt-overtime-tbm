"use client";

import { useId, useMemo, useState } from "react";
import { motion } from "motion/react";
import type { LeaveType, LeaveRequest } from "@/lib/leave/types";
import {
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
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
  const [isHovered, setIsHovered] = useState(false);
  const filterId = useId();

  // Percentage calculations
  const remainingPercent =
    entitled > 0 ? Math.max(0, Math.min(100, Math.round((remaining / entitled) * 100))) : 0;
  const takenPercent =
    entitled > 0 ? Math.max(0, Math.min(100, Math.round((approved / entitled) * 100))) : 0;
  const pendingPercent =
    entitled > 0 ? Math.max(0, Math.min(100, Math.round((pending / entitled) * 100))) : 0;

  // Depletion State
  const depletionStatus = useMemo(() => {
    if (remaining === 0) {
      return {
        label: "Depleted",
        sublabel: "No days remaining",
        color: "red",
        badge: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
        accentHex: "#ef4444",
        gradientStop: "#dc2626",
      };
    }
    if (remaining <= 3 || remainingPercent <= 15) {
      return {
        label: "Near Depleted",
        sublabel: `${remaining}d before exhaustion`,
        color: "rose",
        badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
        accentHex: "#f43f5e",
        gradientStop: "#e11d48",
      };
    }
    if (remainingPercent <= 40) {
      return {
        label: "Low Allowance",
        sublabel: `${remaining}d left before depletion`,
        color: "amber",
        badge: "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20",
        accentHex: "#f59e0b",
        gradientStop: "#d97706",
      };
    }
    if (remainingPercent <= 70) {
      return {
        label: "Moderate Allowance",
        sublabel: `${remaining}d available`,
        color: "blue",
        badge: "bg-blue-50 text-blue-800 ring-1 ring-blue-600/20",
        accentHex: "#3b82f6",
        gradientStop: "#2563eb",
      };
    }
    return {
      label: "Healthy Balance",
      sublabel: `${remaining}d available`,
      color: "emerald",
      badge: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20",
      accentHex: "#10b981",
      gradientStop: "#059669",
    };
  }, [remaining, remainingPercent]);

  // Speedometer Geometry
  // Arc sweeps 220° from 160° (bottom-left) across the top to 380°/20° (bottom-right)
  const cx = 100;
  const cy = 96;
  const radius = 72;
  const arcLength = 276.46; // radius * (220 * Math.PI / 180)

  // Target needle angle: -110° at 0% (Empty), 0° at 50% (Halfway), +110° at 100% (Full)
  const needleAngle = -110 + (remainingPercent / 100) * 220;

  // Arc path: starts at (cx + r*cos(160°), cy + r*sin(160°)) to (cx + r*cos(20°), cy + r*sin(20°))
  const arcPath = "M 32.34 120.63 A 72 72 0 1 1 167.66 120.63";

  // Target fill dashoffset
  const fillDashoffset = arcLength * (1 - remainingPercent / 100);

  // Speedometer graduation tick marks
  const ticks = [
    { percent: 0, label: "0d", isMajor: true },
    { percent: 25, label: "", isMajor: false },
    { percent: 50, label: "50%", isMajor: true },
    { percent: 75, label: "", isMajor: false },
    { percent: 100, label: `${entitled}d`, isMajor: true },
  ];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Top Header: Leave Type & Entitlement */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-sm font-bold text-gray-900 tracking-tight block">
              {leaveType.name}
            </span>
            <span className="text-[11px] text-gray-400 font-medium">
              Annual Allowance: {entitled} days
            </span>
          </div>

          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${depletionStatus.badge}`}>
            {depletionStatus.label}
          </span>
        </div>

        {/* Active Leave Today Alert Banner */}
        {activeLeaveRequest && (
          <div className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-600/20 animate-in fade-in">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>
              On leave now: through {activeLeaveRequest.end_date} ({activeLeaveRequest.working_days}d)
            </span>
          </div>
        )}
      </div>

      {/* Main Chart Section: Animated Speedometer or Radial Donut */}
      <div className="my-2 flex flex-col items-center justify-center">
        {chartStyle === "speedometer" ? (
          <div className="relative flex w-full flex-col items-center">
            {/* Speedometer SVG Canvas */}
            <svg
              viewBox="0 0 200 135"
              className="w-full max-w-[210px] overflow-visible"
              aria-label={`Speedometer showing ${remaining} days remaining of ${entitled}`}
            >
              <defs>
                {/* Dynamic Arc Gradient based on depletion level */}
                <linearGradient id={`gaugeGrad-${filterId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="35%" stopColor="#f59e0b" />
                  <stop offset="70%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>

                {/* Needle Metallic Gradient */}
                <linearGradient id={`needleGrad-${filterId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#111827" />
                  <stop offset="50%" stopColor="#374151" />
                  <stop offset="100%" stopColor="#1f2937" />
                </linearGradient>

                {/* Needle Drop Shadow */}
                <filter id={`needleShadow-${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Background Track (Empty Scale) */}
              <path
                d={arcPath}
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="11"
                strokeLinecap="round"
              />

              {/* Depletion Warning Zones (Subtle dashed under-glow) */}
              {/* Danger Zone (0 - 20%): Left red band */}
              <path
                d={arcPath}
                fill="none"
                stroke="#fee2e2"
                strokeWidth="11"
                strokeDasharray={`${arcLength * 0.2} ${arcLength}`}
                strokeDashoffset="0"
                strokeLinecap="round"
                className="opacity-70"
              />

              {/* Animated Value Arc (Fill based on remaining balance) */}
              <motion.path
                d={arcPath}
                fill="none"
                stroke={`url(#gaugeGrad-${filterId})`}
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray={`${arcLength} ${arcLength}`}
                initial={{ strokeDashoffset: arcLength }}
                animate={{ strokeDashoffset: fillDashoffset }}
                transition={{
                  duration: 1.2,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.1,
                }}
              />

              {/* Speedometer Graduation Ticks */}
              {ticks.map((t, idx) => {
                const angleDeg = 160 + (t.percent / 100) * 220;
                const rad = (angleDeg * Math.PI) / 180;
                const innerR = t.isMajor ? radius - 10 : radius - 7;
                const outerR = radius - 2;
                const labelR = radius - 20;

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
                      stroke={t.isMajor ? "#9ca3af" : "#d1d5db"}
                      strokeWidth={t.isMajor ? "1.5" : "1"}
                    />
                    {t.label && (
                      <text
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        fontSize="8"
                        fontWeight="600"
                        fill="#6b7280"
                        className="select-none font-mono"
                      >
                        {t.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Speedometer Needle Assembly */}
              <motion.g
                initial={{ rotate: -110 }}
                animate={{ rotate: needleAngle }}
                transition={{
                  type: "spring",
                  stiffness: 75,
                  damping: 13,
                  mass: 0.7,
                  delay: 0.2,
                }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
                filter={`url(#needleShadow-${filterId})`}
              >
                {/* Needle Blade */}
                <path
                  d={`M ${cx - 2.5} ${cy} L ${cx - 0.75} ${cy - radius + 10} L ${cx + 0.75} ${cy - radius + 10} L ${cx + 2.5} ${cy} Z`}
                  fill={`url(#needleGrad-${filterId})`}
                />
                {/* Needle Tip Accent Arrow */}
                <polygon
                  points={`${cx - 1.75},${cy - radius + 18} ${cx},${cy - radius + 4} ${cx + 1.75},${cy - radius + 18}`}
                  fill={depletionStatus.accentHex}
                />
                {/* Counterweight Tail */}
                <path
                  d={`M ${cx - 2} ${cy} L ${cx} ${cy + 12} L ${cx + 2} ${cy} Z`}
                  fill="#4b5563"
                />
              </motion.g>

              {/* Center Hub / Pivot Cap */}
              <circle cx={cx} cy={cy} r="8.5" fill="#111827" />
              <circle cx={cx} cy={cy} r="6.5" fill="#374151" />
              <circle cx={cx} cy={cy} r="3" fill={depletionStatus.accentHex} />
            </svg>

            {/* Speedometer Digital Readout Below Hub */}
            <div className="-mt-1 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.3 }}
                  className="font-mono text-3xl font-extrabold tracking-tight text-gray-900"
                >
                  {remaining}
                </motion.span>
                <span className="text-xs font-semibold text-gray-500">
                  / {entitled} days left
                </span>
              </div>
              <span className="text-[11px] font-semibold text-gray-600 block">
                {depletionStatus.sublabel}
              </span>
            </div>
          </div>
        ) : (
          /* Alternative Radial Donut Chart View */
          <div className="relative flex h-36 w-36 items-center justify-center">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
              {/* Background Ring */}
              <circle
                cx="50"
                cy="50"
                r="38"
                className="stroke-gray-100"
                strokeWidth="9"
                fill="transparent"
              />
              {/* Approved / Taken Ring Segment */}
              <motion.circle
                cx="50"
                cy="50"
                r="38"
                stroke="#64748b"
                strokeWidth="9"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - takenPercent / 100)}`}
                strokeLinecap="round"
                fill="transparent"
                initial={{ strokeDashoffset: 2 * Math.PI * 38 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 38 * (1 - takenPercent / 100) }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
              {/* Remaining Balance Ring */}
              <motion.circle
                cx="50"
                cy="50"
                r="28"
                stroke={depletionStatus.accentHex}
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - remainingPercent / 100)}`}
                strokeLinecap="round"
                fill="transparent"
                initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - remainingPercent / 100) }}
                transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
              />
            </svg>

            {/* Donut Center Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-2xl font-extrabold text-gray-900">{remaining}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Days Left
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Depletion Countdown Meter & Proximity Indicator */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-2.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-gray-600">Depletion Gauge:</span>
          <span className="font-mono text-gray-900">{remainingPercent}% available</span>
        </div>

        {/* Dynamic Depletion Track */}
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${remainingPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full transition-colors ${
              remainingPercent > 50
                ? "bg-emerald-500"
                : remainingPercent > 20
                ? "bg-amber-500"
                : "bg-red-500"
            }`}
          />
        </div>

        {/* Days on Leave vs Remaining Days Metric Pill Breakdown */}
        <div className="mt-2.5 grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
          <div className="flex items-center gap-1 text-gray-600">
            <span className="inline-block h-2 w-2 rounded-full bg-gray-400 shrink-0" />
            <span>On Leave:</span>
            <strong className="font-mono font-bold text-gray-800">{approved}d</strong>
          </div>
          <div className="flex items-center justify-end gap-1 text-gray-600">
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: depletionStatus.accentHex }}
            />
            <span>Remaining:</span>
            <strong className="font-mono font-bold text-gray-900">{remaining}d</strong>
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

      {/* Upcoming Leave Notice Footer */}
      {upcomingLeaveRequest && !activeLeaveRequest && (
        <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-1">
          <CalendarDaysIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span>
            Upcoming leave: <strong className="text-gray-700">{upcomingLeaveRequest.start_date}</strong> ({upcomingLeaveRequest.working_days}d)
          </span>
        </div>
      )}
    </div>
  );
}
