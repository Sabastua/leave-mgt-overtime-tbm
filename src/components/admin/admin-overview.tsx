"use client";

import { useState } from "react";
import type { LeaveRequest, LeaveType } from "@/lib/leave/types";
import type { OvertimeRecord } from "@/lib/overtime/types";
import type { AllowedUser } from "@/lib/auth/allowed-users";
import { computeUserBalances } from "@/lib/leave/types";
import { reviewLeaveRequest } from "@/app/actions/leave";
import { reviewOvertimeRequest } from "@/app/actions/overtime";
import {
  UsersIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
} from "@/components/ui/icons";

type Props = {
  teamMembers: AllowedUser[];
  leaveRequests: LeaveRequest[];
  leaveTypes: LeaveType[];
  overtimeRecords: OvertimeRecord[];
  currentYear: number;
};

export function AdminOverview({
  teamMembers,
  leaveRequests,
  leaveTypes,
  overtimeRecords,
  currentYear,
}: Props) {
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const activeMembers = teamMembers.filter((m) => m.is_active);
  const memberMap = new Map(teamMembers.map((m) => [m.email.toLowerCase(), m]));
  const leaveTypeMap = new Map(leaveTypes.map((t) => [t.code, t]));

  // 1. Pending Approvals
  const pendingLeaves = leaveRequests.filter((r) => r.status === "pending");
  const pendingOvertime = overtimeRecords.filter((r) => r.status === "pending");
  const totalPending = pendingLeaves.length + pendingOvertime.length;

  // 2. Active leaves right now (today falls between start_date and end_date)
  const currentActiveLeaves = leaveRequests.filter(
    (r) => r.status === "approved" && r.start_date <= todayStr && r.end_date >= todayStr
  );

  // 3. Upcoming leaves in next 14 days
  const upcomingLeaves = leaveRequests.filter((r) => {
    if (r.status !== "approved") return false;
    return r.start_date > todayStr;
  });

  // 4. Calculate total team metrics for current year
  const approvedYearLeaves = leaveRequests.filter(
    (r) =>
      r.status === "approved" &&
      (r.start_date.startsWith(String(currentYear)) ||
        r.end_date.startsWith(String(currentYear)))
  );

  const totalLeaveDaysTaken = approvedYearLeaves.reduce(
    (sum, r) => sum + r.working_days,
    0
  );

  const approvedOvertime = overtimeRecords.filter((r) => r.status === "approved");
  const totalOvertimeHours = approvedOvertime.reduce(
    (sum, r) => sum + Number(r.hours),
    0
  );
  const paidOvertimeHours = approvedOvertime
    .filter((r) => r.compensatory_choice === "paid")
    .reduce((sum, r) => sum + Number(r.hours), 0);
  const toilOvertimeHours = approvedOvertime
    .filter((r) => r.compensatory_choice === "time_off_in_lieu")
    .reduce((sum, r) => sum + Number(r.hours), 0);

  // 5. Leave Type Distribution Breakdown
  const daysByType: Record<string, number> = {};
  leaveTypes.forEach((t) => {
    daysByType[t.code] = 0;
  });
  approvedYearLeaves.forEach((r) => {
    daysByType[r.leave_type] = (daysByType[r.leave_type] || 0) + r.working_days;
  });

  // 6. Monthly trend (months 1 to 12)
  const monthlyDays = Array(12).fill(0);
  approvedYearLeaves.forEach((r) => {
    const monthIndex = new Date(r.start_date).getMonth();
    if (monthIndex >= 0 && monthIndex < 12) {
      monthlyDays[monthIndex] += r.working_days;
    }
  });
  const maxMonthDays = Math.max(...monthlyDays, 1);

  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* On Leave Today */}
        <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              On Leave Today
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UsersIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900">
              {currentActiveLeaves.length}
            </span>
            <span className="text-xs text-gray-500">of {activeMembers.length} members</span>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            {currentActiveLeaves.length === 0
              ? "All team members are in office"
              : `${currentActiveLeaves.map((l) => memberMap.get(l.user_email.toLowerCase())?.full_name?.split(" ")[0] || l.user_email.split("@")[0]).join(", ")} out`}
          </p>
        </div>

        {/* Pending Approvals */}
        <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Pending Approvals
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ClockIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-700">
              {totalPending}
            </span>
            <span className="text-xs text-gray-500">requests</span>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            {pendingLeaves.length} leave, {pendingOvertime.length} overtime
          </p>
        </div>

        {/* Total Working Days Taken */}
        <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Days Taken ({currentYear})
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CalendarIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900">
              {totalLeaveDaysTaken}
            </span>
            <span className="text-xs text-gray-500">working days</span>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            Team leave total across all types
          </p>
        </div>

        {/* Overtime Logged */}
        <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Approved Overtime
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <ClockIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900">
              {totalOvertimeHours.toFixed(1)}
            </span>
            <span className="text-xs text-gray-500">hrs</span>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            {paidOvertimeHours.toFixed(1)}h Paid • {toilOvertimeHours.toFixed(1)}h TOIL
          </p>
        </div>
      </div>

      {/* Active & Ongoing Leaves with Duration Progress Bars */}
      <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Currently On Leave &amp; Duration Progress
            </h2>
            <p className="text-xs text-gray-500">
              Active leaves with elapsed time vs total approved leave duration
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {currentActiveLeaves.length} Active Now
          </span>
        </div>

        {currentActiveLeaves.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-500">
            No team members are currently away on leave today.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {currentActiveLeaves.map((leave) => {
              const member = memberMap.get(leave.user_email.toLowerCase());
              const type = leaveTypeMap.get(leave.leave_type);
              const handover = memberMap.get(leave.handover_email?.toLowerCase() || "");

              // Calculate elapsed calendar days
              const start = new Date(leave.start_date);
              const end = new Date(leave.end_date);
              const today = new Date(todayStr);

              const totalSpanMs = Math.max(end.getTime() - start.getTime(), 1);
              const elapsedSpanMs = Math.max(today.getTime() - start.getTime(), 0);
              const percentElapsed = Math.min(
                100,
                Math.max(0, Math.round((elapsedSpanMs / totalSpanMs) * 100))
              );

              return (
                <div
                  key={leave.id}
                  className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {member?.full_name || leave.user_email}
                      </h3>
                      <p className="text-xs text-gray-500">{leave.user_email}</p>
                    </div>
                    <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
                      {type?.name || leave.leave_type}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">
                        Leave Duration ({leave.working_days} working days)
                      </span>
                      <span className="font-bold text-brand">{percentElapsed}% elapsed</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-300"
                        style={{ width: `${percentElapsed}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-gray-500">
                      <span>Started: {leave.start_date}</span>
                      <span>Ends: {leave.end_date}</span>
                    </div>
                  </div>

                  {/* Relief / Handover */}
                  {leave.handover_email && (
                    <div className="mt-3 text-xs text-gray-600">
                      <span className="font-semibold text-gray-700">Relief Person:</span>{" "}
                      {handover ? handover.full_name : leave.handover_email}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Leave Days Taken Chart */}
        <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Monthly Leave Distribution ({currentYear})
              </h2>
              <p className="text-xs text-gray-500">Total working days taken per month</p>
            </div>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>

          <div className="mt-6 flex h-44 items-end gap-2 border-b border-gray-200 pb-2">
            {monthlyDays.map((days, idx) => {
              const heightPercent = Math.round((days / maxMonthDays) * 100);
              return (
                <div key={idx} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-gray-600">
                    {days > 0 ? days : ""}
                  </span>
                  <div className="w-full rounded-t bg-gray-100 h-28 flex items-end">
                    <div
                      className="w-full rounded-t bg-brand transition-all duration-500"
                      style={{ height: `${Math.max(heightPercent, days > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-gray-500">
                    {MONTH_NAMES[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Leave Type Breakdown & Overtime Ratio */}
        <section className="space-y-6">
          {/* Leave Type Distribution */}
          <div className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
            <h2 className="text-base font-bold text-gray-900">Leave Types Breakdown</h2>
            <p className="mb-4 text-xs text-gray-500">
              Proportion of leave days used by category
            </p>

            <div className="space-y-3">
              {leaveTypes.map((type) => {
                const days = daysByType[type.code] || 0;
                const percent =
                  totalLeaveDaysTaken > 0
                    ? Math.round((days / totalLeaveDaysTaken) * 100)
                    : 0;

                return (
                  <div key={type.code}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700">{type.name}</span>
                      <span className="font-mono text-gray-600">
                        {days} days ({percent}%)
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overtime Compensatory Ratio */}
          <div className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
            <h2 className="text-base font-bold text-gray-900">Overtime Compensation Choice</h2>
            <p className="mb-4 text-xs text-gray-500">Paid payout vs Time Off In Lieu (TOIL)</p>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                <span className="text-blue-700">
                  Paid: {paidOvertimeHours.toFixed(1)}h (
                  {totalOvertimeHours > 0
                    ? Math.round((paidOvertimeHours / totalOvertimeHours) * 100)
                    : 0}
                  %)
                </span>
                <span className="text-purple-700">
                  TOIL: {toilOvertimeHours.toFixed(1)}h (
                  {totalOvertimeHours > 0
                    ? Math.round((toilOvertimeHours / totalOvertimeHours) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="bg-blue-500"
                  style={{
                    width: `${
                      totalOvertimeHours > 0
                        ? (paidOvertimeHours / totalOvertimeHours) * 100
                        : 50
                    }%`,
                  }}
                />
                <div
                  className="bg-purple-500"
                  style={{
                    width: `${
                      totalOvertimeHours > 0
                        ? (toilOvertimeHours / totalOvertimeHours) * 100
                        : 50
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Team Entitlements & Balances Table with Progress Bars */}
      <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Team Leave Entitlements &amp; Remaining Days ({currentYear})
          </h2>
          <p className="text-xs text-gray-500">
            Comprehensive leave tracking and remaining allowances for all {activeMembers.length} team members
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <th className="py-3 pr-4">Team Member</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3 min-w-[160px]">Annual Leave (21d)</th>
                <th className="px-3 py-3 text-right">Sick (14d)</th>
                <th className="px-3 py-3 text-right">Compassionate (5d)</th>
                <th className="px-3 py-3 text-right">Study (5d)</th>
                <th className="px-3 py-3 text-right">Total Taken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeMembers.map((member) => {
                const bals = computeUserBalances(
                  leaveTypes,
                  leaveRequests,
                  member.email,
                  currentYear
                );

                const annualBal = bals.find((b) => b.leaveType.code === "annual");
                const annualRemaining = annualBal?.remaining ?? 21;
                const annualEntitled = annualBal?.entitled ?? 21;
                const annualPercent = Math.round(
                  (annualRemaining / annualEntitled) * 100
                );

                const sickBal = bals.find((b) => b.leaveType.code === "sick");
                const compassionateBal = bals.find(
                  (b) => b.leaveType.code === "compassionate"
                );
                const studyBal = bals.find((b) => b.leaveType.code === "study");

                const memberTotalTaken = bals.reduce((sum, b) => sum + b.approved, 0);

                return (
                  <tr key={member.email} className="hover:bg-gray-50/50">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-gray-900">
                        {member.full_name || member.email}
                      </div>
                      <div className="text-[11px] text-gray-400">{member.email}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          member.role === "approver"
                            ? "bg-brand/10 text-brand-dark"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {member.role === "approver" ? "Approver" : "Staff"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-gray-900">
                          {annualRemaining}{" "}
                          <span className="font-normal text-gray-400">
                            /{annualEntitled} left
                          </span>
                        </span>
                        <span className="text-gray-400">{annualPercent}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full ${
                            annualPercent > 50
                              ? "bg-emerald-500"
                              : annualPercent > 20
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${annualPercent}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold text-gray-800">
                      {sickBal?.remaining ?? 14}
                      <span className="font-normal text-gray-400">/14</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold text-gray-800">
                      {compassionateBal?.remaining ?? 5}
                      <span className="font-normal text-gray-400">/5</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold text-gray-800">
                      {studyBal?.remaining ?? 5}
                      <span className="font-normal text-gray-400">/5</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-gray-900">
                      {memberTotalTaken}d
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pending Approvals Management Queue */}
      <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Pending Approvals Queue ({totalPending})
            </h2>
            <p className="text-xs text-gray-500">
              Review and decision pending leave and overtime requests
            </p>
          </div>
        </div>

        {totalPending === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-500">
            All clear! No pending leave or overtime requests awaiting your review.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingLeaves.map((request) => {
              const requester = memberMap.get(request.user_email.toLowerCase());
              const type = leaveTypeMap.get(request.leave_type);
              const handover = memberMap.get(request.handover_email?.toLowerCase() || "");

              return (
                <div
                  key={request.id}
                  className="rounded-xl border border-amber-200 bg-amber-50/40 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">
                          {requester?.full_name || request.user_email}
                        </span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          Leave: {type?.name || request.leave_type}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">
                        {request.start_date} to {request.end_date} (
                        <strong>{request.working_days} working days</strong>)
                      </p>
                      {request.handover_email && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          Relief: {handover ? handover.full_name : request.handover_email}
                        </p>
                      )}
                      {request.reason && (
                        <p className="mt-1 text-xs italic text-gray-600">
                          &quot;{request.reason}&quot;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <form action={reviewLeaveRequest} className="inline-flex gap-2">
                        <input type="hidden" name="request_id" value={request.id} />
                        <input type="hidden" name="decision" value="approved" />
                        <button
                          type="submit"
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          Approve
                        </button>
                      </form>

                      <form action={reviewLeaveRequest} className="inline-flex gap-2">
                        <input type="hidden" name="request_id" value={request.id} />
                        <input type="hidden" name="decision" value="rejected" />
                        <button
                          type="submit"
                          className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700"
                        >
                          <XCircleIcon className="h-4 w-4" />
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}

            {pendingOvertime.map((record) => {
              const requester = memberMap.get(record.user_email.toLowerCase());

              return (
                <div
                  key={record.id}
                  className="rounded-xl border border-blue-200 bg-blue-50/40 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">
                          {requester?.full_name || record.user_email}
                        </span>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                          Overtime ({record.compensatory_choice.toUpperCase()})
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">
                        Date: {record.overtime_date} • <strong>{record.hours} hours</strong>
                        {record.ticket_ref && ` • Ref: ${record.ticket_ref}`}
                      </p>
                      <p className="mt-1 text-xs italic text-gray-600">
                        &quot;{record.task_summary}&quot;
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <form action={reviewOvertimeRequest} className="inline-flex gap-2">
                        <input type="hidden" name="record_id" value={record.id} />
                        <input type="hidden" name="decision" value="approved" />
                        <button
                          type="submit"
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          Approve
                        </button>
                      </form>

                      <form action={reviewOvertimeRequest} className="inline-flex gap-2">
                        <input type="hidden" name="record_id" value={record.id} />
                        <input type="hidden" name="decision" value="rejected" />
                        <button
                          type="submit"
                          className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700"
                        >
                          <XCircleIcon className="h-4 w-4" />
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
