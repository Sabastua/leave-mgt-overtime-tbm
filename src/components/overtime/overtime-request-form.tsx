"use client";

import { useActionState, useState } from "react";
import { submitOvertimeRequest, type OvertimeActionState } from "@/app/actions/overtime";

const initialState: OvertimeActionState = {};

export function OvertimeRequestForm() {
  const [state, action, pending] = useActionState(
    submitOvertimeRequest,
    initialState
  );

  const today = new Date().toISOString().slice(0, 10);
  const [hours, setHours] = useState("2.0");

  return (
    <form
      action={action}
      className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5"
    >
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Log Overtime</h2>
        <p className="text-xs text-gray-500">
          Claim extra hours worked for projects, system maintenance, or on-call duties.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="hours"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
            >
              Hours Worked
            </label>
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
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
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
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
          >
            <option value="paid">Paid Overtime</option>
            <option value="time_off_in_lieu">Time Off in Lieu (TOIL / Compensatory Leave)</option>
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
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="task_summary"
            className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
          >
            Work / Activity Description
          </label>
          <textarea
            id="task_summary"
            name="task_summary"
            rows={3}
            required
            placeholder="Describe the activities performed during the overtime hours..."
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
          />
        </div>

        {state.error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700"
          >
            {state.error}
          </p>
        )}

        {state.success && (
          <p
            role="status"
            className="rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-800"
          >
            {state.success}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit Overtime Claim"}
        </button>
      </div>
    </form>
  );
}
