"use client";

import { useActionState, useState } from "react";
import { submitOvertimeRequest, type OvertimeActionState } from "@/app/actions/overtime";
import { OvertimeCalculator } from "@/components/overtime/overtime-calculator";
import { OvertimeReceiptModal } from "@/components/overtime/overtime-receipt-modal";
import { ClockIcon, CheckCircleIcon, ArrowDownTrayIcon } from "@/components/ui/icons";
import type { OvertimeRecord } from "@/lib/overtime/types";

const initialState: OvertimeActionState = {};

type Props = {
  currentUserEmail?: string;
  currentUserName?: string;
};

export function OvertimeRequestForm({
  currentUserEmail = "",
  currentUserName = "",
}: Props) {
  const [state, action, pending] = useActionState(
    submitOvertimeRequest,
    initialState
  );

  const today = new Date().toISOString().slice(0, 10);
  const [hours, setHours] = useState("2.0");
  const [taskSummary, setTaskSummary] = useState("");
  const [showCalculator, setShowCalculator] = useState(false);
  const [receiptRecord, setReceiptRecord] = useState<OvertimeRecord | null>(null);

  function handleApplyCalculatedHours(calcHours: number, note?: string) {
    setHours(String(calcHours));
    if (note) {
      setTaskSummary((prev) => (prev ? `${prev}\nShift: ${note}` : `Shift: ${note}`));
    }
    setShowCalculator(false);
  }

  function handleOpenLastReceipt() {
    setReceiptRecord({
      id: "REC-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
      user_id: "",
      user_email: currentUserEmail,
      overtime_date: today,
      hours: Number(hours),
      task_summary: taskSummary || "System support & overtime duties",
      ticket_ref: null,
      compensatory_choice: "paid",
      status: "pending",
      reviewed_by: "F. Mbuthia (Manager)",
      reviewed_at: null,
      reviewer_note: null,
      created_at: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-4">
      {/* Interactive Hours Calculator Section */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowCalculator((s) => !s)}
          className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 shadow-2xs transition-all duration-200 hover:bg-blue-100 hover:-translate-y-0.5 hover:shadow-xs active:scale-95"
        >
          <ClockIcon className="h-4 w-4" />
          <span>{showCalculator ? "Hide Calculator" : "Open Hours Calculator"}</span>
        </button>
      </div>

      {showCalculator && (
        <div className="transition-all duration-300 animate-in fade-in slide-in-from-top-2">
          <OvertimeCalculator onApplyHours={handleApplyCalculatedHours} />
        </div>
      )}

      {/* Main Form */}
      <form
        action={action}
        className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5 transition-all duration-300 hover:shadow-md"
      >
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Log Overtime Claim</h2>
          <p className="text-xs text-gray-500">
            Submit extra hours worked for approval by Manager (F. Mbuthia).
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="overtime_date"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                Date Worked
              </label>
              <input
                id="overtime_date"
                name="overtime_date"
                type="date"
                required
                defaultValue={today}
                max={today}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="hours"
                  className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
                >
                  Hours Worked
                </label>
                <button
                  type="button"
                  onClick={() => setShowCalculator(true)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition"
                >
                  Use Calculator
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
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 font-mono font-bold shadow-xs transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="compensatory_choice"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
            >
              Compensation Preference
            </label>
            <select
              id="compensatory_choice"
              name="compensatory_choice"
              defaultValue="paid"
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
            >
              <option value="paid">Paid Overtime Payout</option>
              <option value="time_off_in_lieu">
                Time Off in Lieu (TOIL / Compensatory Leave Credit)
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="ticket_ref"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
            >
              Ticket / Change Reference (Optional)
            </label>
            <input
              id="ticket_ref"
              name="ticket_ref"
              type="text"
              placeholder="e.g. CR-89421 or INC-10294"
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 font-mono shadow-xs transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="task_summary"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
            >
              Work &amp; Operational Task Summary
            </label>
            <textarea
              id="task_summary"
              name="task_summary"
              rows={3}
              required
              value={taskSummary}
              onChange={(e) => setTaskSummary(e.target.value)}
              placeholder="Describe the activities performed during the overtime hours..."
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
            />
          </div>

          {state.error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 animate-in fade-in"
            >
              {state.error}
            </div>
          )}

          {state.success && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-600 shrink-0" />
                  <p className="text-xs font-bold text-emerald-900">
                    {state.success}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenLastReceipt}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition-all duration-200 hover:bg-emerald-800 hover:-translate-y-0.5 active:scale-95"
                >
                  <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                  <span>Print Claim Receipt</span>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-all duration-200 hover:bg-brand-dark hover:shadow-md hover:-translate-y-0.5 active:scale-98 disabled:opacity-50"
          >
            {pending ? "Submitting Claim…" : "Submit Overtime Claim"}
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
