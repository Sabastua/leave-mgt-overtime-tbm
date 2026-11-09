"use client";

import { useActionState, useState, useMemo } from "react";
import { submitLeaveRequest, type ActionState } from "@/app/actions/leave";
import {
  type LeaveBalanceSummary,
  type LeaveType,
  type LeaveRequest,
} from "@/lib/leave/types";
import { calculateWorkingDaysDetailed } from "@/lib/leave/holidays";
import type { AllowedUser } from "@/lib/auth/allowed-users";
import {
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  UserIcon,
} from "@/components/ui/icons";

const initialState: ActionState = {};

type Props = {
  currentUserEmail: string;
  leaveTypes: LeaveType[];
  balances: LeaveBalanceSummary[];
  teamMembers: AllowedUser[];
  existingRequests?: LeaveRequest[];
};

export function LeaveRequestForm({
  currentUserEmail,
  leaveTypes,
  balances,
  teamMembers,
  existingRequests = [],
}: Props) {
  const [state, action, pending] = useActionState(submitLeaveRequest, initialState);

  const today = new Date().toISOString().slice(0, 10);
  const [selectedType, setSelectedType] = useState<string>(
    leaveTypes[0]?.code ?? "annual"
  );
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [selectedHandover, setSelectedHandover] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  // Detailed working days and holiday breakdown
  const breakdown = useMemo(() => {
    return calculateWorkingDaysDetailed(startDate, endDate);
  }, [startDate, endDate]);

  const { workingDays, calendarDays, weekendDays, holidays } = breakdown;

  // Selected leave type balance
  const selectedBalance = balances.find((b) => b.leaveType.code === selectedType);
  const currentAvailable = selectedBalance ? selectedBalance.remaining : 0;
  const projectedRemaining = currentAvailable - workingDays;
  const exceedsBalance = selectedBalance !== undefined && workingDays > currentAvailable;

  // Relief colleagues options
  const reliefOptions = teamMembers.filter(
    (m) => m.email.toLowerCase() !== currentUserEmail.toLowerCase() && m.is_active
  );

  // Live handover colleague availability & clash check
  const handoverClash = useMemo(() => {
    if (!selectedHandover || !startDate || !endDate) return null;
    const lowerHandover = selectedHandover.toLowerCase();

    // Check if the colleague has approved leaves that overlap with [startDate, endDate]
    const overlapping = existingRequests.find((r) => {
      if (r.user_email.toLowerCase() !== lowerHandover) return false;
      if (r.status !== "approved" && r.status !== "pending") return false;
      return r.start_date <= endDate && r.end_date >= startDate;
    });

    if (overlapping) {
      const colleague = reliefOptions.find((m) => m.email.toLowerCase() === lowerHandover);
      return {
        colleagueName: colleague?.full_name || selectedHandover,
        status: overlapping.status,
        startDate: overlapping.start_date,
        endDate: overlapping.end_date,
      };
    }
    return null;
  }, [selectedHandover, startDate, endDate, existingRequests, reliefOptions]);

  // Quick Date Presets Handlers
  function applyPreset(daysToAdd: number, startOffset = 0) {
    const base = new Date();
    base.setDate(base.getDate() + startOffset);
    const startStr = base.toISOString().slice(0, 10);

    const end = new Date(base);
    end.setDate(end.getDate() + daysToAdd);
    const endStr = end.toISOString().slice(0, 10);

    setStartDate(startStr);
    setEndDate(endStr);
  }

  function applyNextWeekPreset() {
    const d = new Date();
    const day = d.getDay();
    // Days until next Monday
    const daysUntilNextMon = ((8 - day) % 7) || 7;
    const nextMon = new Date(d);
    nextMon.setDate(d.getDate() + daysUntilNextMon);

    const nextFri = new Date(nextMon);
    nextFri.setDate(nextMon.getDate() + 4);

    setStartDate(nextMon.toISOString().slice(0, 10));
    setEndDate(nextFri.toISOString().slice(0, 10));
  }

  function applySingleDayPreset() {
    setStartDate(today);
    setEndDate(today);
  }

  const selectedColleague = reliefOptions.find(
    (m) => m.email.toLowerCase() === selectedHandover.toLowerCase()
  );

  return (
    <form
      action={action}
      className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5 transition-all duration-300 hover:shadow-md"
    >
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Apply for Leave</h2>
          <p className="text-xs text-gray-500">
            Submit request for Manager review. Working days automatically exclude weekends and statutory public holidays.
          </p>
        </div>

        {/* Quick Date Presets Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:pt-0">
          <button
            type="button"
            onClick={applySingleDayPreset}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-100 active:scale-95"
          >
            Today (1d)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(0, 1)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-100 active:scale-95"
          >
            Tomorrow (1d)
          </button>
          <button
            type="button"
            onClick={applyNextWeekPreset}
            className="rounded-lg border border-brand/30 bg-brand/5 px-2.5 py-1 text-[11px] font-semibold text-brand-dark transition hover:bg-brand/10 active:scale-95"
          >
            Next Week (Mon–Fri)
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* 1. Leave Type Selector */}
        <div>
          <label
            htmlFor="leave_type"
            className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
          >
            Leave Category
          </label>
          <select
            id="leave_type"
            name="leave_type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="block w-full rounded-2xl border border-black/10 bg-[#F2F2F7] px-4 py-3 text-sm font-semibold text-gray-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:bg-[#EBEBF0] focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15 focus:outline-none"
          >
            {leaveTypes.map((lt) => {
              const bal = balances.find((b) => b.leaveType.code === lt.code);
              const carriedNote = bal && bal.carriedForward > 0 ? ` (incl. +${bal.carriedForward}d carried)` : "";
              return (
                <option key={lt.code} value={lt.code}>
                  {lt.name} — {bal ? `${bal.remaining} days available${carriedNote}` : `${lt.annual_days} days entitlement`}
                </option>
              );
            })}
          </select>
        </div>

        {/* 2. Date Pickers Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="start_date"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
            >
              Start Date
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              required
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (endDate < e.target.value) {
                  setEndDate(e.target.value);
                }
              }}
              className="block w-full rounded-2xl border border-black/10 bg-[#F2F2F7] px-4 py-2.5 text-sm text-gray-900 font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:bg-[#EBEBF0] focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="end_date"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
            >
              End Date
            </label>
            <input
              id="end_date"
              name="end_date"
              type="date"
              required
              min={startDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full rounded-2xl border border-black/10 bg-[#F2F2F7] px-4 py-2.5 text-sm text-gray-900 font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:bg-[#EBEBF0] focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15 focus:outline-none"
            />
          </div>
        </div>

        {/* 3. Live Duration & Holiday Breakdown Widget */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-brand shrink-0" />
              <span className="text-xs font-bold text-gray-800">
                Calculated Working Duration:
              </span>
              <span className="text-sm font-extrabold text-brand-dark font-mono">
                {workingDays} {workingDays === 1 ? "day" : "days"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
              <span>{calendarDays} calendar days</span>
              <span>•</span>
              <span>{weekendDays} weekend days</span>
              {holidays.length > 0 && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-purple-700">
                    {holidays.length} holiday{holidays.length > 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* List excluded holidays if any fall in range */}
          {holidays.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-200/60">
              <span className="text-[10px] uppercase font-semibold text-gray-400">
                Statutory Holidays Excluded:
              </span>
              {holidays.map((h) => (
                <span
                  key={h.date}
                  className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800"
                >
                  {h.name} ({h.date})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 4. Live Leave Balance Simulator */}
        {selectedBalance && (
          <div
            className={`rounded-xl border p-4 transition-all duration-200 ${
              exceedsBalance
                ? "border-red-300 bg-red-50/60"
                : "border-emerald-200 bg-emerald-50/40"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-gray-800">
                Balance Simulation ({selectedBalance.leaveType.name})
                {selectedBalance.carriedForward > 0 && (
                  <span className="ml-1.5 font-normal text-emerald-700 text-[11px]">
                    (includes +{selectedBalance.carriedForward}d carried over)
                  </span>
                )}
              </span>
              {exceedsBalance ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-red-700">
                  <ExclamationTriangleIcon className="h-3.5 w-3.5 text-red-600" />
                  Shortfall: {workingDays - currentAvailable} days
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                  <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
                  Sufficient Balance
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-white p-2.5 border border-gray-200/70 shadow-2xs">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                  Current
                </span>
                <span className="text-base font-extrabold text-gray-900 font-mono">
                  {currentAvailable}d
                </span>
              </div>

              <div className="rounded-lg bg-white p-2.5 border border-gray-200/70 shadow-2xs">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                  Deduction
                </span>
                <span className="text-base font-extrabold text-brand-dark font-mono">
                  -{workingDays}d
                </span>
              </div>

              <div
                className={`rounded-lg p-2.5 border shadow-2xs ${
                  exceedsBalance
                    ? "bg-red-100/60 border-red-200 text-red-900"
                    : "bg-white border-gray-200/70 text-emerald-800"
                }`}
              >
                <span className="text-[10px] uppercase font-semibold block opacity-70">
                  Projected
                </span>
                <span className="text-base font-extrabold font-mono">
                  {projectedRemaining}d
                </span>
              </div>
            </div>

            {/* Visual Balance Bar */}
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    exceedsBalance ? "bg-red-500" : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        (projectedRemaining / selectedBalance.entitled) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. Handover / Relief Colleague Selector with Live Clash Checking */}
        <div>
          <label
            htmlFor="handover_email"
            className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
          >
            Handover / Relief Colleague
          </label>
          <div className="relative">
            <select
              id="handover_email"
              name="handover_email"
              value={selectedHandover}
              onChange={(e) => setSelectedHandover(e.target.value)}
              className="block w-full rounded-2xl border border-black/10 bg-[#F2F2F7] px-4 py-3 text-sm text-gray-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:bg-[#EBEBF0] focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15 focus:outline-none"
            >
              <option value="">— Optional: select team relief colleague —</option>
              {reliefOptions.map((member) => (
                <option key={member.email} value={member.email}>
                  {member.full_name || member.email} ({member.email})
                </option>
              ))}
            </select>
          </div>

          {/* Live Handover Availability Feedback */}
          {selectedHandover && (
            <div className="mt-2">
              {handoverClash ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 animate-in fade-in">
                  <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Relief Clash Alert: </span>
                    <span>
                      {handoverClash.colleagueName} has an {handoverClash.status} leave scheduled from{" "}
                      <strong>{handoverClash.startDate}</strong> to <strong>{handoverClash.endDate}</strong> during this period.
                    </span>
                    <span className="block text-[11px] text-amber-700 mt-0.5">
                      Consider coordinating coverage or choosing an alternate relief colleague.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800 animate-in fade-in">
                  <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>{selectedColleague?.full_name || selectedHandover}</strong> is active with no conflicting leave during these dates.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6. Reason / Handover Notes */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="reason"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-600"
            >
              Reason / Handover Brief
            </label>
            <span className="text-[11px] text-gray-400">
              {reason.length} / 300 chars
            </span>
          </div>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Brief reason or critical operational items delegated to relief colleague…"
            className="block w-full rounded-2xl border border-black/10 bg-[#F2F2F7] p-4 text-sm text-gray-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 placeholder:text-gray-400 hover:bg-[#EBEBF0] focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15 focus:outline-none"
          />
        </div>

        {/* 7. Action Notifications */}
        {state.error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700 animate-in fade-in"
          >
            <ExclamationTriangleIcon className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <span>{state.error}</span>
          </div>
        )}

        {state.success && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 animate-in fade-in"
          >
            <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{state.success}</span>
          </div>
        )}

        {/* 8. Submit Button */}
        <button
          type="submit"
          disabled={pending || workingDays === 0 || exceedsBalance}
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-xs transition-all duration-200 hover:bg-brand-dark hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          {pending
            ? "Submitting Leave Request…"
            : `Submit Request (${workingDays} Working Day${workingDays === 1 ? "" : "s"})`}
        </button>
      </div>
    </form>
  );
}
