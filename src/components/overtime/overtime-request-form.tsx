"use client";

import { useActionState, useState, useEffect } from "react";
import { submitOvertimeRequest, type OvertimeActionState } from "@/app/actions/overtime";
import { OvertimeCalculator } from "@/components/overtime/overtime-calculator";
import { OvertimeReceiptModal } from "@/components/overtime/overtime-receipt-modal";
import { ClockIcon, CheckCircleIcon, ArrowDownTrayIcon, InformationCircleIcon } from "@/components/ui/icons";
import type { OvertimeRecord, OvertimeCompensatoryChoice } from "@/lib/overtime/types";

const initialState: OvertimeActionState = {};

type Props = {
  currentUserEmail?: string;
  currentUserName?: string;
  prefillClaim?: OvertimeRecord | null;
  onClearPrefill?: () => void;
};

export function OvertimeRequestForm({
  currentUserEmail = "",
  currentUserName = "",
  prefillClaim = null,
  onClearPrefill,
}: Props) {
  const [state, action, pending] = useActionState(
    submitOvertimeRequest,
    initialState
  );

  const today = new Date().toISOString().slice(0, 10);
  const [dateWorked, setDateWorked] = useState(today);
  const [hours, setHours] = useState("2.0");
  const [taskSummary, setTaskSummary] = useState("");
  const [ticketRef, setTicketRef] = useState("");
  const [compensatoryChoice, setCompensatoryChoice] = useState<OvertimeCompensatoryChoice>("paid");
  const [showCalculator, setShowCalculator] = useState(false);
  const [receiptRecord, setReceiptRecord] = useState<OvertimeRecord | null>(null);
  const [isPrefilled, setIsPrefilled] = useState(false);

  // When a user repeats/duplicates a historical claim
  useEffect(() => {
    if (prefillClaim) {
      setHours(String(prefillClaim.hours));
      setTaskSummary(prefillClaim.task_summary);
      setTicketRef(prefillClaim.ticket_ref || "");
      setCompensatoryChoice(prefillClaim.compensatory_choice);
      setIsPrefilled(true);
      // Auto-focus worked date to today
      setDateWorked(today);
    }
  }, [prefillClaim, today]);

  function handleApplyCalculatedHours(
    calcHours: number,
    note?: string,
    pref?: "paid" | "time_off_in_lieu"
  ) {
    setHours(String(calcHours));
    if (note) {
      setTaskSummary((prev) => (prev ? `${prev}\nShift: ${note}` : `Shift: ${note}`));
    }
    if (pref) {
      setCompensatoryChoice(pref);
    }
    setShowCalculator(false);
  }

  function handleDismissPrefill() {
    setIsPrefilled(false);
    if (onClearPrefill) onClearPrefill();
  }

  function handleOpenLastReceipt() {
    setReceiptRecord({
      id: "REC-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
      user_id: "",
      user_email: currentUserEmail,
      overtime_date: dateWorked,
      hours: Number(hours),
      task_summary: taskSummary || "System support & overtime duties",
      ticket_ref: ticketRef || null,
      compensatory_choice: compensatoryChoice,
      status: "pending",
      reviewed_by: "F. Mbuthia (Manager)",
      reviewed_at: null,
      reviewer_note: null,
      created_at: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-4" id="overtime-claim-form-section">
      {/* Prefill Notification Banner */}
      {isPrefilled && (
        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/90 p-3.5 text-xs text-blue-900 animate-in fade-in">
          <div className="flex items-center gap-2">
            <InformationCircleIcon className="h-4 w-4 text-blue-700 shrink-0" />
            <span>
              <strong>Claim Template Pre-filled:</strong> Values loaded from previous claim. Set your worked date and submit.
            </span>
          </div>
          <button
            type="button"
            onClick={handleDismissPrefill}
            className="rounded bg-blue-200/70 px-2 py-0.5 text-[11px] font-bold text-blue-800 hover:bg-blue-300"
          >
            Clear Template
          </button>
        </div>
      )}

      {/* Interactive Hours Calculator Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500">
          Need help calculating hours or shift multipliers?
        </span>
        <button
          type="button"
          onClick={() => setShowCalculator((s) => !s)}
          className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 shadow-2xs transition-all duration-200 hover:bg-blue-100 hover:-translate-y-0.5 hover:shadow-xs active:scale-95"
        >
          <ClockIcon className="h-4 w-4" />
          <span>{showCalculator ? "Close Calculator" : "Open Hours Calculator"}</span>
        </button>
      </div>

      {showCalculator && (
        <div className="transition-all duration-300 animate-in fade-in slide-in-from-top-2">
          <OvertimeCalculator onApplyHours={handleApplyCalculatedHours} />
        </div>
      )}

      {/* Main Claim Submission Form */}
      <form
        action={action}
        className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5 transition-all duration-300 hover:shadow-md"
      >
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Log Overtime Claim</h2>
          <p className="text-xs text-gray-500">
            Submit extra hours worked for review and authorization by Manager F. Mbuthia.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="overtime_date"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1"
              >
                Date Worked
              </label>
              <input
                id="overtime_date"
                name="overtime_date"
                type="date"
                required
                value={dateWorked}
                onChange={(e) => setDateWorked(e.target.value)}
                max={today}
                className="block w-full rounded-2xl border border-black/10 bg-[#F2F2F7] px-4 py-2.5 text-sm text-gray-900 font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:bg-[#EBEBF0] focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="hours"
                  className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
                >
                  Net Hours Worked
                </label>
                <button
                  type="button"
                  onClick={() => setShowCalculator(true)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition"
                >
                  Use Smart Calculator
                </button>
              </div>
              <input
                id="hours"
                name="hours"
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                required
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g. 3.5"
                className="block w-full rounded-2xl border border-black/10 bg-[#F2F2F7] px-4 py-2.5 text-sm text-gray-900 font-mono font-bold shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:bg-[#EBEBF0] focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="compensatory_choice"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1"
            >
              Compensation Mode Preference
            </label>
            <select
              id="compensatory_choice"
              name="compensatory_choice"
              value={compensatoryChoice}
              onChange={(e) => setCompensatoryChoice(e.target.value as OvertimeCompensatoryChoice)}
              className="block w-full rounded-2xl border border-black/10 bg-[#F2F2F7] px-4 py-3 text-sm text-gray-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:bg-[#EBEBF0] focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15 focus:outline-none"
            >
              <option value="paid">Paid Overtime Payout (Cash Payout via Payroll)</option>
              <option value="time_off_in_lieu">
                Time Off in Lieu (TOIL / Compensatory Leave Credit)
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="ticket_ref"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1"
            >
              Ticket / Incident / Change Reference (Optional)
            </label>
            <input
              id="ticket_ref"
              name="ticket_ref"
              type="text"
              value={ticketRef}
              onChange={(e) => setTicketRef(e.target.value)}
              placeholder="e.g. CR-89421 or INC-10294"
              className="block w-full rounded-2xl border border-black/10 bg-[#F2F2F7] px-4 py-2.5 text-sm text-gray-900 font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:bg-[#EBEBF0] focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="task_summary"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                Work &amp; Operational Task Summary
              </label>
              <span className="text-[11px] text-gray-400">
                {taskSummary.length} chars
              </span>
            </div>
            <textarea
              id="task_summary"
              name="task_summary"
              rows={3}
              required
              value={taskSummary}
              onChange={(e) => setTaskSummary(e.target.value)}
              placeholder="Describe the operational support, maintenance, or incident triage activities performed…"
              className="block w-full rounded-2xl border border-black/10 bg-[#F2F2F7] p-4 text-sm text-gray-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 placeholder:text-gray-400 hover:bg-[#EBEBF0] focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15 focus:outline-none"
            />
          </div>

          {state.error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 animate-in fade-in"
            >
              {state.error}
            </div>
          )}

          {state.success && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 animate-in fade-in"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-600 shrink-0" />
                  <p className="text-xs font-bold text-emerald-900">
                    {state.success}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenLastReceipt}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-all duration-200 hover:bg-emerald-800 hover:-translate-y-0.5 active:scale-95"
                >
                  <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                  <span>Print Claim Receipt</span>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={pending || Number(hours) <= 0}
            className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-xs transition-all duration-200 hover:bg-brand-dark hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
          >
            {pending ? "Submitting Overtime Claim…" : `Submit Overtime Claim (${hours} Hours)`}
          </button>
        </div>
      </form>

      {/* Printable Receipt Modal */}
      <OvertimeReceiptModal
        record={receiptRecord}
        employeeName={currentUserName || currentUserEmail}
        onClose={() => setReceiptRecord(null)}
      />
    </div>
  );
}
