"use client";

import { useState } from "react";
import type { LeaveRequest, LeaveType } from "@/lib/leave/types";
import type { AllowedUser } from "@/lib/auth/allowed-users";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, UsersIcon } from "@/components/ui/icons";

const COLOR_PALETTE = [
  { bg: "bg-emerald-100", text: "text-emerald-900", border: "border-emerald-300", dot: "bg-emerald-500" },
  { bg: "bg-blue-100", text: "text-blue-900", border: "border-blue-300", dot: "bg-blue-500" },
  { bg: "bg-purple-100", text: "text-purple-900", border: "border-purple-300", dot: "bg-purple-500" },
  { bg: "bg-amber-100", text: "text-amber-900", border: "border-amber-300", dot: "bg-amber-500" },
  { bg: "bg-rose-100", text: "text-rose-900", border: "border-rose-300", dot: "bg-rose-500" },
  { bg: "bg-indigo-100", text: "text-indigo-900", border: "border-indigo-300", dot: "bg-indigo-500" },
  { bg: "bg-teal-100", text: "text-teal-900", border: "border-teal-300", dot: "bg-teal-500" },
  { bg: "bg-orange-100", text: "text-orange-900", border: "border-orange-300", dot: "bg-orange-500" },
  { bg: "bg-cyan-100", text: "text-cyan-900", border: "border-cyan-300", dot: "bg-cyan-500" },
  { bg: "bg-violet-100", text: "text-violet-900", border: "border-violet-300", dot: "bg-violet-500" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-900", border: "border-fuchsia-300", dot: "bg-fuchsia-500" },
  { bg: "bg-lime-100", text: "text-lime-900", border: "border-lime-300", dot: "bg-lime-500" },
  { bg: "bg-sky-100", text: "text-sky-900", border: "border-sky-300", dot: "bg-sky-500" },
  { bg: "bg-yellow-100", text: "text-yellow-900", border: "border-yellow-300", dot: "bg-yellow-500" },
  { bg: "bg-slate-100", text: "text-slate-900", border: "border-slate-300", dot: "bg-slate-500" },
];

export function getUserColor(email: string, index: number) {
  // Deterministic color assignment based on index or hash
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

type Props = {
  teamMembers: AllowedUser[];
  leaveRequests: LeaveRequest[];
  leaveTypes: LeaveType[];
};

export function TeamCalendar({ teamMembers, leaveRequests, leaveTypes }: Props) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("all");
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    dateStr: string;
    events: { request: LeaveRequest; user: AllowedUser; typeName: string }[];
  } | null>(null);

  const activeMembers = teamMembers.filter((m) => m.is_active);
  const memberMap = new Map(teamMembers.map((m) => [m.email.toLowerCase(), m]));
  const leaveTypeMap = new Map(leaveTypes.map((t) => [t.code, t]));

  // Build color map for active members
  const userColorMap = new Map<string, (typeof COLOR_PALETTE)[0]>();
  teamMembers.forEach((member, i) => {
    userColorMap.set(member.email.toLowerCase(), getUserColor(member.email, i));
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of current month & total days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Day of week offset for Mon = 0, Sun = 6
  let startingDayOfWeek = firstDay.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // Days array
  type CalendarCell = {
    dayNumber: number;
    isCurrentMonth: boolean;
    dateStr: string;
    isToday: boolean;
    isWeekend: boolean;
  };

  const calendarDays: CalendarCell[] = [];

  // Trailing days from previous month
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const prevDate = new Date(year, month - 1, day);
    const dateStr = prevDate.toISOString().slice(0, 10);
    const dayOfWeek = prevDate.getDay();
    calendarDays.push({
      dayNumber: day,
      isCurrentMonth: false,
      dateStr,
      isToday: false,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // Days of current month
  const todayStr = new Date().toISOString().slice(0, 10);
  for (let d = 1; d <= daysInMonth; d++) {
    const dObj = new Date(year, month, d);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayOfWeek = dObj.getDay();
    calendarDays.push({
      dayNumber: d,
      isCurrentMonth: true,
      dateStr,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // Next month leading days to complete the 35 or 42 grid
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let n = 1; n <= remaining; n++) {
    const nextDate = new Date(year, month + 1, n);
    const dateStr = nextDate.toISOString().slice(0, 10);
    const dayOfWeek = nextDate.getDay();
    calendarDays.push({
      dayNumber: n,
      isCurrentMonth: false,
      dateStr,
      isToday: false,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // Approved leave requests
  const approvedLeaves = leaveRequests.filter(
    (r) => r.status === "approved" || r.status === "pending"
  );

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  return (
    <div className="space-y-6">
      {/* Calendar Header with Controls */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {monthName} {year}
            </h2>
            <p className="text-xs text-gray-500">
              Team leave roster and schedule
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter by team member */}
          <div className="flex items-center gap-2">
            <label htmlFor="member-filter" className="text-xs font-medium text-gray-600">
              Filter:
            </label>
            <select
              id="member-filter"
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 shadow-xs focus:border-brand focus:outline-none"
            >
              <option value="all">All Team Members ({activeMembers.length})</option>
              {activeMembers.map((m) => (
                <option key={m.email} value={m.email.toLowerCase()}>
                  {m.full_name || m.email}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
            <button
              onClick={prevMonth}
              className="rounded-lg border border-gray-300 p-1.5 text-gray-600 transition hover:bg-gray-50"
              title="Previous Month"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              onClick={goToday}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="rounded-lg border border-gray-300 p-1.5 text-gray-600 transition hover:bg-gray-50"
              title="Next Month"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Color Code Legend for all members */}
      <section className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
          <UsersIcon className="h-4 w-4 text-brand" />
          <span>Team Member Color Codes ({activeMembers.length})</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeMembers.map((member) => {
            const color = userColorMap.get(member.email.toLowerCase()) || COLOR_PALETTE[0];
            const isSelected = selectedUserFilter === member.email.toLowerCase();
            return (
              <button
                key={member.email}
                onClick={() =>
                  setSelectedUserFilter(
                    isSelected ? "all" : member.email.toLowerCase()
                  )
                }
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  isSelected
                    ? "ring-2 ring-brand ring-offset-1 " + color.bg + " " + color.text + " " + color.border
                    : color.bg + " " + color.text + " " + color.border + " hover:opacity-80"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                <span>{member.full_name || member.email}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Month Calendar Grid */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-black/5">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs font-semibold text-gray-700">
          <div className="py-2.5">Mon</div>
          <div className="py-2.5">Tue</div>
          <div className="py-2.5">Wed</div>
          <div className="py-2.5">Thu</div>
          <div className="py-2.5">Fri</div>
          <div className="py-2.5 text-gray-400">Sat</div>
          <div className="py-2.5 text-gray-400">Sun</div>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 bg-gray-100">
          {calendarDays.map((cell, idx) => {
            // Find approved or pending leaves covering this date
            const dayEvents = approvedLeaves
              .filter((r) => {
                if (selectedUserFilter !== "all" && r.user_email.toLowerCase() !== selectedUserFilter) {
                  return false;
                }
                return cell.dateStr >= r.start_date && cell.dateStr <= r.end_date;
              })
              .map((r) => {
                const user = memberMap.get(r.user_email.toLowerCase()) ?? {
                  email: r.user_email,
                  full_name: r.user_email.split("@")[0],
                  role: "staff" as const,
                  is_active: true,
                  created_at: "",
                };
                const typeName = leaveTypeMap.get(r.leave_type)?.name ?? r.leave_type;
                return { request: r, user, typeName };
              });

            return (
              <div
                key={idx}
                onClick={() => {
                  if (dayEvents.length > 0) {
                    setSelectedDayEvents({ dateStr: cell.dateStr, events: dayEvents });
                  }
                }}
                className={`min-h-[105px] p-2 transition ${
                  cell.isCurrentMonth ? "bg-white" : "bg-gray-50/60 text-gray-400"
                } ${cell.isToday ? "ring-2 ring-inset ring-brand" : ""} ${
                  dayEvents.length > 0 ? "cursor-pointer hover:bg-gray-50" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      cell.isToday
                        ? "bg-brand text-white"
                        : cell.isCurrentMonth
                        ? "text-gray-900"
                        : "text-gray-400"
                    }`}
                  >
                    {cell.dayNumber}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-bold text-gray-500">
                      {dayEvents.length} out
                    </span>
                  )}
                </div>

                {/* Event Pills */}
                <div className="mt-1.5 space-y-1">
                  {dayEvents.slice(0, 3).map(({ request, user, typeName }) => {
                    const color =
                      userColorMap.get(user.email.toLowerCase()) || COLOR_PALETTE[0];
                    return (
                      <div
                        key={request.id}
                        title={`${user.full_name} (${typeName}) - ${request.working_days} working day(s)`}
                        className={`truncate rounded border px-1.5 py-0.5 text-[11px] font-medium ${color.bg} ${color.text} ${color.border} ${
                          request.status === "pending" ? "border-dashed opacity-80" : ""
                        }`}
                      >
                        <span className="font-semibold">
                          {user.full_name?.split(" ")[0] || user.email.split("@")[0]}
                        </span>{" "}
                        • {typeName.slice(0, 4)}
                        {request.status === "pending" ? " (P)" : ""}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="block text-[10px] font-medium text-gray-500">
                      +{dayEvents.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Event Drawer / Modal */}
      {selectedDayEvents && (
        <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-brand/10 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Leaves Scheduled for {new Date(selectedDayEvents.dateStr).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </h3>
              <p className="text-xs text-gray-500">
                {selectedDayEvents.events.length} team member(s) absent or pending approval
              </p>
            </div>
            <button
              onClick={() => setSelectedDayEvents(null)}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {selectedDayEvents.events.map(({ request, user, typeName }) => {
              const color = userColorMap.get(user.email.toLowerCase()) || COLOR_PALETTE[0];
              const handoverUser = memberMap.get(
                request.handover_email?.toLowerCase() || ""
              );
              return (
                <div
                  key={request.id}
                  className={`rounded-xl border p-3.5 bg-white shadow-xs ${color.border}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{user.full_name || user.email}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        request.status === "approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {request.status === "approved" ? "Approved" : "Pending Approval"}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    <p>
                      <span className="font-semibold text-gray-700">Type:</span> {typeName}
                    </p>
                    <p>
                      <span className="font-semibold text-gray-700">Period:</span> {request.start_date} to {request.end_date} ({request.working_days} working days)
                    </p>
                    {request.handover_email && (
                      <p>
                        <span className="font-semibold text-gray-700">Relief / Handover:</span>{" "}
                        {handoverUser ? handoverUser.full_name : request.handover_email}
                      </p>
                    )}
                    {request.reason && (
                      <p className="italic text-gray-500">
                        &quot;{request.reason}&quot;
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
