"use client";

import { useActionState, useState } from "react";
import { submitLeaveRequest, type ActionState } from "@/app/actions/leave";
import {
  calculateWorkingDays,
  type LeaveBalanceSummary,
  type LeaveType,
} from "@/lib/leave/types";
import { ALLOWED_EMAILS, TEAM_MEMBERS } from "@/lib/auth/allowed-users";

const initialState: ActionState = {};

export function LeaveRequestForm({
  currentUserEmail,
  leaveTypes,
  balances,
}: {
  currentUserEmail: string;
  leaveTypes: LeaveType[];
  balances: LeaveBalanceSummary[];
}) {
  const [state, action, pending] = useActionState(
    submitLeaveRequest,
    initialState,
  );

  const today = new Date().toISOString().slice(0, 10);
  const [selectedType, setSelectedType] = useState<string>(
    leaveTypes[0]?.code ?? "annual",
  );
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);

  const workingDays = calculateWorkingDays(startDate, endDate);
  const selectedBalance = balances.find(
    (b) => b.leaveType.code === selectedType,
  );
  const exceedsBalance =
    selectedBalance !== undefined && workingDays > selectedBalance.remaining;

  const reliefOptions = ALLOWED_EMAILS.filter(
    (e) => e !== currentUserEmail.toLowerCase(),
  );

  return (
    <form
      action={action}
      className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
    >
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Apply for Leave</h2>
        <p className="text-xs text-gray-500">
          Weekends (Sat &amp; Sun) are automatically excluded from working days.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="leave_type"
            className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
          >
            Leave Type
          </label>
          <select
            id="leave_type"
            name="leave_type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
          >
            {leaveTypes.map((lt) => {
              const bal = balances.find((b) => b.leaveType.code === lt.code);
              return (
                <option key={lt.code} value={lt.code}>
                  {lt.name} ({bal ? `${bal.remaining} days remaining` : `${lt.annual_days} days`})
                </option>
              );
            })}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="start_date"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
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
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="end_date"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
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
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
            />
          </div>
        </div>

        {/* Live working-days preview */}
        <div
          className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${
            workingDays === 0
              ? "bg-amber-50 text-amber-800"
              : exceedsBalance
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-800"
          }`}
        >
          <span>Calculated duration:</span>
          <span className="font-bold">
            {workingDays} working {workingDays === 1 ? "day" : "days"}
            {exceedsBalance && selectedBalance
              ? ` (exceeds ${selectedBalance.remaining} available)`
              : ""}
          </span>
        </div>

        <div>
          <label
            htmlFor="handover_email"
            className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
          >
            Handover / Relief Person
          </label>
          <select
            id="handover_email"
            name="handover_email"
            defaultValue=""
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
          >
            <option value="">— Optional: select team member —</option>
            {reliefOptions.map((email) => (
              <option key={email} value={email}>
                {TEAM_MEMBERS[email].fullName} ({email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="reason"
            className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
          >
            Reason / Handover Notes
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            placeholder="Brief note or key handover tasks while away…"
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
          disabled={pending || workingDays === 0}
          className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit Leave Request"}
        </button>
      </div>
    </form>
  );
}
