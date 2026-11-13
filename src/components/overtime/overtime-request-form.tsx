"use client";

import { useActionState, useState, useEffect } from "react";
import { submitOvertimeRequest, type OvertimeActionState } from "@/app/actions/overtime";
import { CheckCircleIcon, InformationCircleIcon } from "@/components/ui/icons";
import {
  BASE_HOURLY_RATE,
  ENTERPRISE_TIER_LABEL,
  formatKes,
  parseOvertimeRecordMeta,
  type OvertimeMultiplier,
  type OvertimeRecord,
} from "@/lib/overtime/types";

const initialState: OvertimeActionState = {};

type Props = {
  currentUserEmail?: string;
  currentUserName?: string;
  prefillClaim?: OvertimeRecord | null;
  onClearPrefill?: () => void;
  onOpenVoucher?: (record: OvertimeRecord) => void;
};

const MULTIPLIER_OPTIONS: { value: OvertimeMultiplier; label: string; tag: string }[] = [
  { value: 1.5, label: "1.5x", tag: "Standard" },
  { value: 2.0, label: "2.0x", tag: "Weekend" },
  { value: 2.5, label: "2.5x", tag: "Holiday" },
];

export function OvertimeRequestForm({
  currentUserEmail = "",
  prefillClaim = null,
  onClearPrefill,
  onOpenVoucher,
}: Props) {
  const [state, action, pending] = useActionState(
    submitOvertimeRequest,
    initialState
  );

  const today = new Date().toISOString().slice(0, 10);
  const [hours, setHours] = useState("4.5");
  const [multiplier, setMultiplier] = useState<OvertimeMultiplier>(1.5);
  const [dateWorked, setDateWorked] = useState(today);
  const [taskSummary, setTaskSummary] = useState("Core Banking Migration Sprint");
  const [isPrefilled, setIsPrefilled] = useState(false);

  // Sync prefilled claim when user repeats a historical claim
  useEffect(() => {
    if (prefillClaim) {
      const meta = parseOvertimeRecordMeta(prefillClaim);
      const timer = setTimeout(() => {
        setHours(String(prefillClaim.hours));
        setMultiplier(meta.multiplier);
        setTaskSummary(meta.projectTitle);
        setDateWorked(today);
        setIsPrefilled(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [prefillClaim, today]);

  const parsedHours = Math.max(0, parseFloat(hours) || 0);
  const estimatedPayout = parsedHours * BASE_HOURLY_RATE * multiplier;

  function handleDismissPrefill() {
    setIsPrefilled(false);
    if (onClearPrefill) onClearPrefill();
  }

  function handleViewSubmittedVoucher() {
    if (!onOpenVoucher) return;
    const year = dateWorked.slice(0, 4) || String(new Date().getFullYear());
    const refId = `OT-${year}-${Math.floor(100 + Math.random() * 900)}`;
    const subtitle =
      multiplier === 2.5
        ? "Emergency Deployment"
        : multiplier === 2.0
        ? "Weekend Maintenance"
        : "Night Shift Support";

    onOpenVoucher({
      id: refId,
      user_id: "",
      user_email: currentUserEmail,
      overtime_date: dateWorked,
      hours: parsedHours,
      task_summary: `${taskSummary || "Core Banking Migration Sprint"}\n${subtitle} (${multiplier.toFixed(1)}x)`,
      ticket_ref: refId,
      compensatory_choice: "paid",
      status: "pending",
      reviewed_by: "Dr. Jane Wangari",
      reviewed_at: null,
      reviewer_note: null,
      created_at: new Date().toISOString(),
    });
  }

  return (
    <div
      id="overtime-claim-form-section"
      className="flex flex-col bg-surface-container-low rounded-xl p-6 lg:p-7 shadow-sm border border-surface-container-high/60"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-headline-md text-on-surface">Quick Overtime Log</h2>
          <p className="text-body-md text-on-surface-variant">
            Calculate and submit extra hours
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary-container/10 flex items-center justify-center text-primary shrink-0">
          {/* Calculate Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-[18px] h-[18px]"
          >
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-5.97 4.06L14.09 6l1.41 1.41L16.91 6l1.06 1.06-1.41 1.41 1.41 1.41-1.06 1.06-1.41-1.4-1.41 1.41-1.06-1.06 1.41-1.41-1.41-1.42Zm-6.78.66h5v1.5h-5v-1.5ZM11.5 16h-2v2H8v-2H6v-1.5h2v-2h1.5v2h2V16Zm6.5 1.25h-5v-1.5h5v1.5Zm0-2.5h-5v-1.5h5v1.5Z" />
          </svg>
        </div>
      </div>

      {/* Prefill Notification Banner */}
      {isPrefilled && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-primary/20 bg-primary-container/10 p-3 text-xs text-on-surface">
          <div className="flex items-center gap-2">
            <InformationCircleIcon className="h-4 w-4 text-primary shrink-0" />
            <span>
              <strong className="text-primary">Template Loaded:</strong> Adjust date or hours and submit.
            </span>
          </div>
          <button
            type="button"
            onClick={handleDismissPrefill}
            className="rounded-lg bg-surface px-2 py-0.5 text-[11px] font-semibold text-on-surface hover:bg-surface-container cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="multiplier" value={multiplier.toFixed(1)} />
        <input type="hidden" name="compensatory_choice" value="paid" />

        {/* Base Hourly Rate Indicator */}
        <div className="p-4 rounded-xl bg-surface-container flex items-center justify-between">
          <div>
            <div className="text-label-sm text-on-surface-variant uppercase tracking-wider">
              Base Rate
            </div>
            <div className="text-body-lg font-medium text-on-surface">
              KES {formatKes(BASE_HOURLY_RATE)} / hr
            </div>
          </div>
          <div className="text-right">
            <div className="text-label-sm text-on-surface-variant uppercase tracking-wider">
              Tier
            </div>
            <div className="text-body-md font-medium text-primary">
              {ENTERPRISE_TIER_LABEL}
            </div>
          </div>
        </div>

        {/* Hours Input */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="ot-hours"
            className="text-label-md font-medium text-on-surface"
          >
            Hours Worked
          </label>
          <div className="relative flex items-center">
            <input
              id="ot-hours"
              name="hours"
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              required
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Enter hours"
              className="ot-field w-full h-12 bg-surface-container px-4 pr-16 rounded-xl text-on-surface text-body-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white transition-all"
            />
            <span className="absolute right-4 text-on-surface-variant text-body-md pointer-events-none">
              Hours
            </span>
          </div>
        </div>

        {/* Multiplier Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-label-md font-medium text-on-surface">
            Overtime Multiplier Category
          </label>
          <div className="grid grid-cols-3 gap-2">
            {MULTIPLIER_OPTIONS.map((opt) => {
              const isSelected = multiplier === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMultiplier(opt.value)}
                  className={`py-3 px-2 rounded-xl text-body-sm font-medium transition-all text-center cursor-pointer ${
                    isSelected
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface-container text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  {opt.label}
                  <br />
                  <span
                    className={`text-[10px] ${
                      isSelected ? "opacity-80" : "opacity-60"
                    }`}
                  >
                    {opt.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Picker */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="overtime_date"
            className="text-label-md font-medium text-on-surface"
          >
            Date of Overtime
          </label>
          <input
            id="overtime_date"
            name="overtime_date"
            type="date"
            required
            value={dateWorked}
            onChange={(e) => setDateWorked(e.target.value)}
            className="ot-field w-full h-12 bg-surface-container px-4 rounded-xl text-on-surface text-body-md tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white transition-all"
          />
        </div>

        {/* Reason / Project Tag */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="task_summary"
            className="text-label-md font-medium text-on-surface"
          >
            Project / Task Reference
          </label>
          <input
            id="task_summary"
            name="task_summary"
            type="text"
            required
            value={taskSummary}
            onChange={(e) => setTaskSummary(e.target.value)}
            placeholder="e.g. Server Upgrade"
            className="ot-field w-full h-12 bg-surface-container px-4 rounded-xl text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white transition-all"
          />
        </div>

        {/* Instant Cash Payout Estimate Box */}
        <div className="p-4 rounded-xl bg-primary-container/10 flex flex-col gap-1.5 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
              Estimated Payout
            </span>
            <span className="text-label-sm text-primary font-semibold">
              Instant Calculation
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <span className="text-body-sm text-on-surface-variant tabular-nums">
              KES {formatKes(BASE_HOURLY_RATE)} × {parsedHours} hrs ×{" "}
              <span id="current-mult">{multiplier.toFixed(1)}</span>
            </span>
            <span
              className="font-headline-lg text-primary tabular-nums"
              id="payout-result"
            >
              KES {formatKes(estimatedPayout, true)}
            </span>
          </div>
        </div>

        {/* Error / Success Messages */}
        {state.error && (
          <div
            role="alert"
            className="rounded-xl border border-error/20 bg-error-container p-3 text-body-sm font-medium text-on-error-container"
          >
            {state.error}
          </div>
        )}

        {state.success && (
          <div
            role="status"
            className="rounded-xl border border-primary/20 bg-primary-container/15 p-3.5 text-body-sm text-on-surface"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium text-on-primary-container">
                  {state.success}
                </span>
              </div>
              {onOpenVoucher && (
                <button
                  type="button"
                  onClick={handleViewSubmittedVoucher}
                  className="text-label-sm font-semibold text-primary underline hover:opacity-80 cursor-pointer"
                >
                  View Voucher
                </button>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={pending || parsedHours <= 0}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-on-primary font-medium rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-1 cursor-pointer active:scale-[0.99] disabled:opacity-50"
        >
          {/* Send Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-[18px] h-[18px]"
          >
            <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
          <span>
            {pending ? "Submitting Claim…" : "Submit Overtime Claim"}
          </span>
        </button>
      </form>
    </div>
  );
}
