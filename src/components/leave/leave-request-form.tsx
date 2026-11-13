"use client";

import { useActionState, useState, useMemo, useEffect } from "react";
import { submitLeaveRequest, type ActionState } from "@/app/actions/leave";
import {
  type LeaveBalanceSummary,
  type LeaveType,
  type LeaveRequest,
} from "@/lib/leave/types";
import { calculateWorkingDaysDetailed } from "@/lib/leave/holidays";
import type { AllowedUser } from "@/lib/auth/allowed-users";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@/components/ui/icons";

const initialState: ActionState = {};

type Props = {
  currentUserEmail: string;
  leaveTypes: LeaveType[];
  balances: LeaveBalanceSummary[];
  teamMembers: AllowedUser[];
  existingRequests?: LeaveRequest[];
  externalSelectedType?: string | null;
};

export function LeaveRequestForm({
  currentUserEmail,
  leaveTypes,
  balances,
  teamMembers,
  existingRequests = [],
  externalSelectedType,
}: Props) {
  const [state, action, pending] = useActionState(submitLeaveRequest, initialState);

  const today = new Date().toISOString().slice(0, 10);
  const [selectedType, setSelectedType] = useState<string>(
    externalSelectedType || leaveTypes[0]?.code || "annual"
  );
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [selectedHandover, setSelectedHandover] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [emergencyReachable, setEmergencyReachable] = useState<boolean>(true);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);

  // Sync external selected leave type if user clicks a category card
  useEffect(() => {
    if (externalSelectedType) {
      const timer = setTimeout(() => setSelectedType(externalSelectedType), 0);
      return () => clearTimeout(timer);
    }
  }, [externalSelectedType]);

  // Load draft from localStorage on initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedDraft = localStorage.getItem("safaricom_leave_draft");
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          if (draft.selectedType) setSelectedType(draft.selectedType);
          if (draft.startDate) setStartDate(draft.startDate);
          if (draft.endDate) setEndDate(draft.endDate);
          if (draft.selectedHandover) setSelectedHandover(draft.selectedHandover);
          if (draft.reason) setReason(draft.reason);
        }
      } catch {
        // Ignore storage errors
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Detailed working days and holiday breakdown
  const breakdown = useMemo(() => {
    return calculateWorkingDaysDetailed(startDate, endDate);
  }, [startDate, endDate]);

  const { workingDays } = breakdown;

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
  function applySingleDayPreset() {
    setStartDate(today);
    setEndDate(today);
  }

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
    const daysUntilNextMon = ((8 - day) % 7) || 7;
    const nextMon = new Date(d);
    nextMon.setDate(d.getDate() + daysUntilNextMon);

    const nextFri = new Date(nextMon);
    nextFri.setDate(nextMon.getDate() + 4);

    setStartDate(nextMon.toISOString().slice(0, 10));
    setEndDate(nextFri.toISOString().slice(0, 10));
  }

  function handleSaveDraft() {
    try {
      const draft = {
        selectedType,
        startDate,
        endDate,
        selectedHandover,
        reason,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem("safaricom_leave_draft", JSON.stringify(draft));
      setDraftNotice("Draft saved successfully to local session");
      setTimeout(() => setDraftNotice(null), 3500);
    } catch {
      setDraftNotice("Unable to save draft locally");
    }
  }

  const selectedColleague = reliefOptions.find(
    (m) => m.email.toLowerCase() === selectedHandover.toLowerCase()
  );

  return (
    <div className="bg-surface-container-low p-6 lg:p-8 rounded-xl shadow-xs border border-surface-container-high sticky top-24">
      {/* Form Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-container-high">
        <div>
          <h2 className="font-headline-md text-on-surface tracking-tight">Apply for Leave</h2>
          <p className="text-body-sm text-on-surface-variant">Submit new request to line manager</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <CalendarDaysIcon className="h-5 w-5" />
        </div>
      </div>

      <form action={action} className="flex flex-col gap-space-md">
        {/* Quick Date Presets Bar */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <span className="text-label-sm text-on-surface-variant font-medium">Quick Presets:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={applySingleDayPreset}
              className="px-2.5 py-1 rounded-lg border border-outline-variant/40 bg-surface text-label-sm text-on-surface font-medium hover:bg-surface-container transition-all active:scale-95"
            >
              Today (1d)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(0, 1)}
              className="px-2.5 py-1 rounded-lg border border-outline-variant/40 bg-surface text-label-sm text-on-surface font-medium hover:bg-surface-container transition-all active:scale-95"
            >
              Tomorrow (1d)
            </button>
            <button
              type="button"
              onClick={applyNextWeekPreset}
              className="px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/10 text-label-sm text-primary font-semibold hover:bg-primary/20 transition-all active:scale-95"
            >
              Next Week (Mon–Fri)
            </button>
          </div>
        </div>

        {/* 1. Leave Category Selection */}
        <div className="flex flex-col gap-space-xs">
          <label htmlFor="leave_type" className="text-body-sm font-medium text-on-surface">
            Leave Category
          </label>
          <div className="relative">
            <select
              id="leave_type"
              name="leave_type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer border border-surface-container-high"
            >
              {leaveTypes.map((lt) => {
                const bal = balances.find((b) => b.leaveType.code === lt.code);
                const available = bal ? bal.remaining : lt.annual_days;
                return (
                  <option key={lt.code} value={lt.code}>
                    {lt.name} ({available} Days Available)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* 2. Date Range Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          <div className="flex flex-col gap-space-xs">
            <label htmlFor="start_date" className="text-body-sm font-medium text-on-surface">
              Start Date
            </label>
            <div className="relative">
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
                className="w-full h-12 px-4 rounded-xl bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer border border-surface-container-high"
              />
            </div>
          </div>

          <div className="flex flex-col gap-space-xs">
            <label htmlFor="end_date" className="text-body-sm font-medium text-on-surface">
              End Date
            </label>
            <div className="relative">
              <input
                id="end_date"
                name="end_date"
                type="date"
                required
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer border border-surface-container-high"
              />
            </div>
          </div>
        </div>

        {/* 3. Balance Simulation Banner */}
        <div
          className={`p-4 rounded-xl flex items-start gap-space-sm border transition-all ${
            exceedsBalance
              ? "bg-[#FFDAD6]/40 border-[#FFB2B9] text-[#93000A]"
              : "bg-primary-container/10 border-primary/20 text-on-surface"
          }`}
        >
          {exceedsBalance ? (
            <ExclamationTriangleIcon className="h-5 w-5 text-[#BA1A1A] shrink-0 mt-0.5" />
          ) : (
            <InformationCircleIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          )}
          <div className="text-body-sm leading-relaxed">
            {exceedsBalance ? (
              <span>
                <span className="font-semibold text-[#BA1A1A]">Insufficient Balance:</span> This request requires{" "}
                <strong className="font-bold">{workingDays} working days</strong>, but only{" "}
                <strong className="font-bold">{currentAvailable} days</strong> are available. Shortfall is{" "}
                <strong className="font-bold">{workingDays - currentAvailable} days</strong>.
              </span>
            ) : (
              <span>
                <span className="font-medium text-primary">Simulation:</span> This request will deduct{" "}
                <strong className="text-on-surface font-semibold">{workingDays} working days</strong>. Remaining
                balance will drop from {currentAvailable} to{" "}
                <strong className="text-on-surface font-semibold">{projectedRemaining} days</strong>.
              </span>
            )}
          </div>
        </div>

        {/* 4. Designated Relief Colleague */}
        <div className="flex flex-col gap-space-xs">
          <label htmlFor="handover_email" className="text-body-sm font-medium text-on-surface">
            Designated Relief Colleague
          </label>
          <div className="relative">
            <select
              id="handover_email"
              name="handover_email"
              value={selectedHandover}
              onChange={(e) => setSelectedHandover(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer border border-surface-container-high"
            >
              <option value="">Select covering team member...</option>
              {reliefOptions.map((member) => (
                <option key={member.email} value={member.email}>
                  {member.full_name || member.email} ({member.email})
                </option>
              ))}
            </select>
          </div>

          {/* Live Handover Availability Feedback */}
          {selectedHandover && (
            <div className="mt-1">
              {handoverClash ? (
                <div className="flex items-start gap-2 rounded-xl border border-[#FDE68A] bg-[#FEF3C7] p-3 text-xs text-[#92400E]">
                  <ExclamationTriangleIcon className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Relief Clash Alert: </span>
                    <span>
                      {handoverClash.colleagueName} has an {handoverClash.status} leave scheduled from{" "}
                      <strong>{handoverClash.startDate}</strong> to <strong>{handoverClash.endDate}</strong> during this period.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-[#C4ECD0] bg-[#C4ECD0]/30 px-3 py-2 text-xs text-[#003317]">
                  <CheckCircleIcon className="h-4 w-4 text-[#00A859] shrink-0" />
                  <span>
                    <strong>{selectedColleague?.full_name || selectedHandover}</strong> is available with no conflicting leave.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. Handover Brief & Notes Textarea */}
        <div className="flex flex-col gap-space-xs">
          <div className="flex justify-between items-center">
            <label htmlFor="reason" className="text-body-sm font-medium text-on-surface">
              Handover Brief &amp; Notes
            </label>
            <span className="text-label-sm text-on-surface-variant">
              {reason.length ? `${reason.length} / 300` : "Optional"}
            </span>
          </div>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Provide brief instructions or pending task references for your relief colleague..."
            className="w-full p-4 rounded-xl bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary resize-none border border-surface-container-high placeholder:text-outline"
          />
        </div>

        {/* 6. Emergency Reachability Checkbox */}
        <div className="flex items-center gap-3 pt-1">
          <input
            id="emergency"
            name="emergency_reachable"
            type="checkbox"
            checked={emergencyReachable}
            onChange={(e) => setEmergencyReachable(e.target.checked)}
            className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
          />
          <label htmlFor="emergency" className="text-body-sm text-on-surface select-none cursor-pointer">
            I can be reached via emergency phone number while away
          </label>
        </div>

        {/* Draft Notification */}
        {draftNotice && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-2.5 text-xs font-medium text-primary">
            <CheckCircleIcon className="h-4 w-4 shrink-0" />
            <span>{draftNotice}</span>
          </div>
        )}

        {/* Action Notifications */}
        {state.error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-[#FFB2B9] bg-[#FFDAD6] p-3.5 text-xs font-semibold text-[#93000A]"
          >
            <ExclamationTriangleIcon className="h-4 w-4 text-[#BA1A1A] shrink-0 mt-0.5" />
            <span>{state.error}</span>
          </div>
        )}

        {state.success && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-[#A8D0B5] bg-[#C4ECD0] p-3.5 text-xs font-semibold text-[#003317]"
          >
            <CheckCircleIcon className="h-4 w-4 text-[#006D38] shrink-0" />
            <span>{state.success}</span>
          </div>
        )}

        {/* 7. Action Buttons */}
        <div className="flex items-center gap-space-md pt-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="flex-1 py-3.5 px-5 rounded-xl border border-outline-variant text-on-surface font-medium hover:bg-surface-container transition-all active:scale-95 text-body-md"
          >
            Save as Draft
          </button>
          <button
            type="submit"
            disabled={pending || workingDays === 0 || exceedsBalance}
            className="flex-1 py-3.5 px-5 rounded-xl bg-primary text-on-primary font-medium hover:opacity-95 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-body-md"
          >
            {pending
              ? "Submitting Request…"
              : `Submit Request (${workingDays}d)`}
          </button>
        </div>
      </form>
    </div>
  );
}
