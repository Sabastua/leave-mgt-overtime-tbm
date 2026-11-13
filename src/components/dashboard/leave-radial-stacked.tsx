"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import type { LeaveType, LeaveRequest } from "@/lib/leave/types";
import { calculateWorkingDays } from "@/lib/leave/types";
import {
  CalendarDaysIcon,
  ClockIcon,
  HeartIcon,
  AcademicCapIcon,
  FirstAidIcon,
  DocumentTextIcon,
} from "@/components/ui/icons";

function formatLeaveDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export type RadialStackedCardProps = {
  leaveType: LeaveType;
  entitled: number;
  baseEntitled?: number;
  carriedForward?: number;
  approved: number;
  pending: number;
  remaining: number;
  activeLeaveRequest?: LeaveRequest | null;
  upcomingLeaveRequest?: LeaveRequest | null;
  categoryIndex?: number;
  onSelectType?: (typeCode: string) => void;
};

export function LeaveRadialStackedCard({
  leaveType,
  entitled,
  carriedForward = 0,
  approved,
  pending,
  remaining,
  activeLeaveRequest,
  upcomingLeaveRequest,
  categoryIndex = 1,
  onSelectType,
}: RadialStackedCardProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const annualEntitled = entitled;
  const annualApproved = approved;
  const annualPending = pending;
  const annualRemaining = remaining;
  const annualRemainingPercent =
    annualEntitled > 0
      ? Math.max(0, Math.min(100, Math.round((annualRemaining / annualEntitled) * 100)))
      : 0;

  // Applied Leave Timeline Metrics
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

    return {
      leave: targetLeave,
      startDate,
      endDate,
      totalDays,
      daysOnLeave,
      daysRemainingInLeave,
      leaveProgressPercent,
      isOngoing,
      isFuture,
      isPast,
    };
  }, [activeLeaveRequest, upcomingLeaveRequest, todayStr]);

  // Visual configuration mapped to Enterprise Design System
  const config = useMemo(() => {
    const code = leaveType.code.toLowerCase();
    const currentYear = new Date().getFullYear();

    if (code.includes("annual")) {
      return {
        glowClass: "bg-primary/5 group-hover:bg-primary/10",
        iconContainer: "bg-primary-container/20 text-primary",
        icon: <CalendarDaysIcon className="h-5 w-5" />,
        ringColorClass: "text-primary",
        percentColorClass: "text-primary",
        footerLeft: carriedForward > 0 ? `+${carriedForward}d carried over` : `Expires Dec 31, ${currentYear}`,
        footerRight: "Standard Quota",
        footerRightColor: "text-primary",
      };
    }
    if (code.includes("sick")) {
      return {
        glowClass: "bg-secondary/5 group-hover:bg-secondary/10",
        iconContainer: "bg-secondary-container text-on-secondary-container",
        icon: <FirstAidIcon className="h-5 w-5" />,
        ringColorClass: "text-secondary",
        percentColorClass: "text-secondary",
        footerLeft: "Requires cert > 3 days",
        footerRight: "Protected",
        footerRightColor: "text-on-secondary-container",
      };
    }
    if (code.includes("compassionate")) {
      return {
        glowClass: "bg-tertiary-container/5 group-hover:bg-tertiary-container/10",
        iconContainer: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
        icon: <HeartIcon className="h-5 w-5" />,
        ringColorClass: "text-tertiary-container",
        percentColorClass: "text-tertiary-container",
        footerLeft: "Immediate Family",
        footerRight: "As Needed",
        footerRightColor: "text-tertiary-container",
      };
    }
    if (code.includes("study")) {
      return {
        glowClass: "bg-primary-fixed/20 group-hover:bg-primary-fixed/30",
        iconContainer: "bg-primary-fixed text-on-primary-fixed",
        icon: <AcademicCapIcon className="h-5 w-5" />,
        ringColorClass: "text-[#2CB34A]",
        percentColorClass: "text-primary",
        footerLeft: "HR Pre-Approval Req.",
        footerRight: "Active",
        footerRightColor: "text-primary",
      };
    }

    return {
      glowClass: "bg-primary/5 group-hover:bg-primary/10",
      iconContainer: "bg-surface-container-high text-on-surface",
      icon: <DocumentTextIcon className="h-5 w-5" />,
      ringColorClass: "text-primary",
      percentColorClass: "text-primary",
      footerLeft: "Standard Policy",
      footerRight: "Available",
      footerRightColor: "text-primary",
    };
  }, [leaveType.code, carriedForward]);

  const catNum = String(categoryIndex).padStart(2, "0");

  return (
    <div
      onClick={() => onSelectType?.(leaveType.code)}
      className="bg-surface-container-low p-6 lg:p-7 rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 border border-surface-container-high cursor-pointer"
    >
      {/* Soft Ambient Glow */}
      <div
        className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full blur-2xl transition-all duration-300 ${config.glowClass}`}
      />

      <div>
        {/* Card Header: Category & Type */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <span className="text-label-sm uppercase text-on-surface-variant font-medium tracking-wide">
              Category {catNum}
            </span>
            <h3 className="font-headline-sm text-on-surface tracking-tight mt-0.5">
              {leaveType.name}
            </h3>
          </div>
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${config.iconContainer}`}
          >
            {config.icon}
          </div>
        </div>

        {/* Circular Progress & Metric Representation */}
        <div className="flex items-center gap-space-md my-3">
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              {/* Background track ring */}
              <path
                className="text-surface-container-high"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              {/* Progress ring */}
              <motion.path
                className={config.ringColorClass}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                initial={{ strokeDasharray: "0, 100" }}
                animate={{ strokeDasharray: `${annualRemainingPercent}, 100` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>

            {/* Inner Center Number */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="font-headline-sm font-bold text-on-surface tabular-nums">
                {annualRemaining}
              </span>
              <span className="text-label-sm text-on-surface-variant font-medium">Days</span>
            </div>
          </div>

          <div className="flex flex-col gap-0.5 text-xs">
            <div className="text-body-sm text-on-surface-variant">
              Entitlement: <span className="font-semibold text-on-surface">{annualEntitled} Days</span>
            </div>
            <div className="text-body-sm text-on-surface-variant">
              Taken YTD: <span className="font-semibold text-on-surface">{annualApproved} Days</span>
            </div>
            {annualPending > 0 && (
              <div className="text-body-sm text-[#F59E0B] font-medium flex items-center gap-1">
                <ClockIcon className="h-3 w-3 shrink-0" />
                <span>{annualPending}d Pending</span>
              </div>
            )}
            <div className={`text-body-sm font-semibold mt-1 ${config.percentColorClass}`}>
              {annualRemainingPercent}% Remaining
            </div>
          </div>
        </div>

        {/* Scheduled / Ongoing Leave Strip */}
        {appliedLeaveDetails && (
          <div className="mt-2 mb-3 rounded-lg bg-surface border border-surface-container-high px-3 py-2 text-xs">
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
              <span className="tabular-nums font-medium">
                {formatLeaveDate(appliedLeaveDetails.startDate)} &ndash; {formatLeaveDate(appliedLeaveDetails.endDate)}
              </span>
              <span className="font-semibold text-primary">
                {appliedLeaveDetails.isOngoing
                  ? `${appliedLeaveDetails.daysRemainingInLeave}d remaining`
                  : "Scheduled"}
              </span>
            </div>
            {appliedLeaveDetails.isOngoing && (
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                <div
                  style={{ width: `${appliedLeaveDetails.leaveProgressPercent}%` }}
                  className="h-full bg-primary rounded-full transition-all duration-500"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Footer: Expiry / Policy & Quota Status */}
      <div className="pt-3.5 border-t border-surface-container-high flex justify-between items-center text-body-sm text-on-surface-variant">
        <span className="text-xs text-on-surface-variant">{config.footerLeft}</span>
        <span className={`text-xs font-semibold ${config.footerRightColor}`}>{config.footerRight}</span>
      </div>
    </div>
  );
}
