"use client";

import { useState, useMemo } from "react";
import type { LeaveRequest, LeaveType } from "@/lib/leave/types";
import type { AllowedUser } from "@/lib/auth/allowed-users";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  UsersIcon,
  Squares2X2Icon,
  Bars3BottomLeftIcon,
  CalendarDaysIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@/components/ui/icons";

const COLOR_PALETTE = [
  { bg: "bg-emerald-100", text: "text-emerald-900", border: "border-emerald-300", dot: "bg-emerald-500", bar: "bg-emerald-500 text-white" },
  { bg: "bg-blue-100", text: "text-blue-900", border: "border-blue-300", dot: "bg-blue-500", bar: "bg-blue-500 text-white" },
  { bg: "bg-purple-100", text: "text-purple-900", border: "border-purple-300", dot: "bg-purple-500", bar: "bg-purple-500 text-white" },
  { bg: "bg-amber-100", text: "text-amber-900", border: "border-amber-300", dot: "bg-amber-500", bar: "bg-amber-500 text-white" },
  { bg: "bg-rose-100", text: "text-rose-900", border: "border-rose-300", dot: "bg-rose-500", bar: "bg-rose-500 text-white" },
  { bg: "bg-indigo-100", text: "text-indigo-900", border: "border-indigo-300", dot: "bg-indigo-500", bar: "bg-indigo-500 text-white" },
  { bg: "bg-teal-100", text: "text-teal-900", border: "border-teal-300", dot: "bg-teal-500", bar: "bg-teal-500 text-white" },
  { bg: "bg-orange-100", text: "text-orange-900", border: "border-orange-300", dot: "bg-orange-500", bar: "bg-orange-500 text-white" },
  { bg: "bg-cyan-100", text: "text-cyan-900", border: "border-cyan-300", dot: "bg-cyan-500", bar: "bg-cyan-500 text-white" },
  { bg: "bg-violet-100", text: "text-violet-900", border: "border-violet-300", dot: "bg-violet-500", bar: "bg-violet-500 text-white" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-900", border: "border-fuchsia-300", dot: "bg-fuchsia-500", bar: "bg-fuchsia-500 text-white" },
  { bg: "bg-lime-100", text: "text-lime-900", border: "border-lime-300", dot: "bg-lime-500", bar: "bg-lime-500 text-white" },
  { bg: "bg-sky-100", text: "text-sky-900", border: "border-sky-300", dot: "bg-sky-500", bar: "bg-sky-500 text-white" },
  { bg: "bg-yellow-100", text: "text-yellow-900", border: "border-yellow-300", dot: "bg-yellow-500", bar: "bg-yellow-500 text-white" },
  { bg: "bg-slate-100", text: "text-slate-900", border: "border-slate-300", dot: "bg-slate-500", bar: "bg-slate-500 text-white" },
];

export function getUserColor(email: string, index: number) {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

type Props = {
  teamMembers: AllowedUser[];
  leaveRequests: LeaveRequest[];
  leaveTypes: LeaveType[];
};

type ViewMode = "month" | "timeline" | "week";

export function TeamCalendar({ teamMembers, leaveRequests, leaveTypes }: Props) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    dateStr: string;
    events: { request: LeaveRequest; user: AllowedUser; typeName: string }[];
  } | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const activeMembers = useMemo(() => teamMembers.filter((m) => m.is_active), [teamMembers]);
  const memberMap = useMemo(() => new Map(teamMembers.map((m) => [m.email.toLowerCase(), m])), [teamMembers]);
  const leaveTypeMap = useMemo(() => new Map(leaveTypes.map((t) => [t.code, t])), [leaveTypes]);

  // Color mapping per member
  const userColorMap = useMemo(() => {
    const map = new Map<string, (typeof COLOR_PALETTE)[0]>();
    teamMembers.forEach((member, i) => {
      map.set(member.email.toLowerCase(), getUserColor(member.email, i));
    });
    return map;
  }, [teamMembers]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter approved leaves for display (plus pending if viewing all)
  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter((r) => {
      if (r.status !== "approved" && r.status !== "pending") return false;
      if (selectedUserFilter !== "all" && r.user_email.toLowerCase() !== selectedUserFilter) {
        return false;
      }
      if (selectedTypeFilter !== "all" && r.leave_type !== selectedTypeFilter) {
        return false;
      }
      return true;
    });
  }, [leaveRequests, selectedUserFilter, selectedTypeFilter]);

  // Total active team count
  const totalTeamCount = activeMembers.length;

  // Calculate Today's Coverage
  const todayLeaves = useMemo(() => {
    return leaveRequests.filter(
      (r) => r.status === "approved" && todayStr >= r.start_date && todayStr <= r.end_date
    );
  }, [leaveRequests, todayStr]);

  const onDutyToday = Math.max(0, totalTeamCount - todayLeaves.length);
  const todayCoveragePct = totalTeamCount > 0 ? Math.round((onDutyToday / totalTeamCount) * 100) : 100;

  // Month grid calculations
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let startingDayOfWeek = firstDay.getDay() - 1; // Mon=0, Sun=6
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  type CalendarCell = {
    dayNumber: number;
    isCurrentMonth: boolean;
    dateStr: string;
    isToday: boolean;
    isWeekend: boolean;
  };

  const calendarDays: CalendarCell[] = [];

  // Trailing previous month days
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

  // Current month days
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

  // Next month leading days to complete grid
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

  // Week Schedule Calculation
  const weekStart = new Date(currentDate);
  const currentDayOfWeek = weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1; // Mon = 0
  weekStart.setDate(weekStart.getDate() - currentDayOfWeek);

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const dateStr = day.toISOString().slice(0, 10);
    const dayOfWeek = day.getDay();
    return {
      dateStr,
      dayNumber: day.getDate(),
      dayName: day.toLocaleDateString("en-US", { weekday: "short" }),
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    };
  });

  // Navigation handlers
  function prevPeriod() {
    if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  }

  function nextPeriod() {
    if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  // 1-Click Export to Outlook / Google Calendar (.ics)
  function handleExportIcs() {
    const approvedOnly = leaveRequests.filter((r) => r.status === "approved");
    if (approvedOnly.length === 0) {
      setExportNotice("No approved leaves found to export.");
      setTimeout(() => setExportNotice(null), 3000);
      return;
    }

    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Safaricom PLC//Leave & Overtime Management//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Safaricom Team Leave Schedule",
      "X-WR-TIMEZONE:Africa/Nairobi",
    ];

    approvedOnly.forEach((req) => {
      const user = memberMap.get(req.user_email.toLowerCase());
      const userName = user?.full_name || req.user_email;
      const typeName = leaveTypeMap.get(req.leave_type)?.name || req.leave_type;
      const startDateClean = req.start_date.replace(/-/g, "");

      // DTEND in iCal for all-day events is exclusive (+1 day)
      const endDateObj = new Date(`${req.end_date}T00:00:00Z`);
      endDateObj.setUTCDate(endDateObj.getUTCDate() + 1);
      const endDateClean = endDateObj.toISOString().slice(0, 10).replace(/-/g, "");

      icsContent.push(
        "BEGIN:VEVENT",
        `UID:SAF-LEAVE-${req.id}@safaricom.co.ke`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
        `DTSTART;VALUE=DATE:${startDateClean}`,
        `DTEND;VALUE=DATE:${endDateClean}`,
        `SUMMARY:${userName} - ${typeName}`,
        `DESCRIPTION:Leave Type: ${typeName}\\nDuration: ${req.working_days} working days\\nRelief Colleague: ${req.handover_email || "Not specified"}\\nStatus: Approved`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      );
    });

    icsContent.push("END:VCALENDAR");

    const blob = new Blob([icsContent.join("\r\n")], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `safaricom_team_leave_schedule_${year}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice(`Exported ${approvedOnly.length} approved leave(s) to Outlook / iCal format.`);
    setTimeout(() => setExportNotice(null), 4000);
  }

  const periodTitle =
    viewMode === "week"
      ? `Week of ${weekDays[0].dayName}, ${weekDays[0].dateStr}`
      : `${currentDate.toLocaleString("default", { month: "long" })} ${year}`;

  return (
    <div className="space-y-6">
      {/* 1. Top Controls Bar: View Toggle, Filters, Period Controls */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {periodTitle}
              </h2>
              <p className="text-xs text-gray-500">
                Team leave roster, absence planning &amp; duty coverage
              </p>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                  viewMode === "month"
                    ? "bg-white text-gray-900 shadow-2xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Squares2X2Icon className="h-3.5 w-3.5" />
                <span>Month</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("timeline")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                  viewMode === "timeline"
                    ? "bg-white text-gray-900 shadow-2xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Bars3BottomLeftIcon className="h-3.5 w-3.5" />
                <span>Timeline</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                  viewMode === "week"
                    ? "bg-white text-gray-900 shadow-2xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <CalendarDaysIcon className="h-3.5 w-3.5" />
                <span>Weekly</span>
              </button>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={prevPeriod}
                className="rounded-lg border border-gray-300 p-1.5 text-gray-600 transition hover:bg-gray-50 active:scale-95"
                title="Previous Period"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                onClick={goToday}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-95"
              >
                Today
              </button>
              <button
                onClick={nextPeriod}
                className="rounded-lg border border-gray-300 p-1.5 text-gray-600 transition hover:bg-gray-50 active:scale-95"
                title="Next Period"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Export to Outlook */}
            <button
              type="button"
              onClick={handleExportIcs}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-2xs transition hover:bg-gray-50 active:scale-95"
              title="Download Outlook / iCal calendar file (.ics)"
            >
              <ArrowDownTrayIcon className="h-3.5 w-3.5 text-gray-500" />
              <span>Export .ics</span>
            </button>
          </div>
        </div>

        {/* Filter Selectors Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Member filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="calendar-member-filter" className="text-xs font-semibold text-gray-500">
                Colleague:
              </label>
              <select
                id="calendar-member-filter"
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-900 shadow-2xs focus:border-brand focus:outline-none"
              >
                <option value="all">All Members ({activeMembers.length})</option>
                {activeMembers.map((m) => (
                  <option key={m.email} value={m.email.toLowerCase()}>
                    {m.full_name || m.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Leave Type filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="calendar-type-filter" className="text-xs font-semibold text-gray-500">
                Category:
              </label>
              <select
                id="calendar-type-filter"
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-900 shadow-2xs focus:border-brand focus:outline-none"
              >
                <option value="all">All Leave Types</option>
                {leaveTypes.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Today's Team Duty Coverage Badge */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Today&apos;s Presence:</span>
            <span
              className={`rounded-full px-2.5 py-0.5 font-bold ${
                todayCoveragePct >= 80
                  ? "bg-emerald-100 text-emerald-800"
                  : todayCoveragePct >= 50
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {onDutyToday} of {totalTeamCount} on duty ({todayCoveragePct}%)
            </span>
          </div>
        </div>

        {exportNotice && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
            <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}
      </div>

      {/* 2. Team Member Color Codes Legend */}
      <section className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-black/5">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-600">
            <UsersIcon className="h-4 w-4 text-brand" />
            <span>Team Roster ({activeMembers.length})</span>
          </div>
          {selectedUserFilter !== "all" && (
            <button
              onClick={() => setSelectedUserFilter("all")}
              className="text-xs font-semibold text-brand hover:underline"
            >
              Reset Filter
            </button>
          )}
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
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all active:scale-95 ${
                  isSelected
                    ? "ring-2 ring-brand ring-offset-1 " + color.bg + " " + color.text + " " + color.border
                    : color.bg + " " + color.text + " " + color.border + " hover:opacity-85"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                <span>{member.full_name || member.email}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. VIEW MODE 1: MONTHLY GRID */}
      {viewMode === "month" && (
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
              const dayEvents = filteredLeaves
                .filter((r) => cell.dateStr >= r.start_date && cell.dateStr <= r.end_date)
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

              const isLowCoverage = cell.isCurrentMonth && !cell.isWeekend && dayEvents.length >= 2;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (dayEvents.length > 0) {
                      setSelectedDayEvents({ dateStr: cell.dateStr, events: dayEvents });
                    }
                  }}
                  className={`min-h-[110px] p-2 transition-all ${
                    cell.isCurrentMonth ? "bg-white" : "bg-gray-50/60 text-gray-400"
                  } ${cell.isToday ? "ring-2 ring-inset ring-brand bg-brand/5" : ""} ${
                    dayEvents.length > 0 ? "cursor-pointer hover:bg-gray-50/80" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
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
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                          isLowCoverage
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "text-gray-500"
                        }`}
                      >
                        {dayEvents.length} out
                      </span>
                    )}
                  </div>

                  {/* Event Badges */}
                  <div className="mt-1.5 space-y-1">
                    {dayEvents.slice(0, 3).map(({ request, user, typeName }) => {
                      const color =
                        userColorMap.get(user.email.toLowerCase()) || COLOR_PALETTE[0];
                      return (
                        <div
                          key={request.id}
                          title={`${user.full_name} (${typeName})`}
                          className={`truncate rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition ${color.bg} ${color.text} ${color.border} ${
                            request.status === "pending" ? "border-dashed opacity-80" : ""
                          }`}
                        >
                          <span className="font-bold">
                            {user.full_name?.split(" ")[0] || user.email.split("@")[0]}
                          </span>{" "}
                          • {typeName.slice(0, 4)}
                          {request.status === "pending" ? " (P)" : ""}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="block text-[10px] font-semibold text-gray-500">
                        +{dayEvents.length - 3} more absent
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. VIEW MODE 2: TIMELINE / GANTT VIEW */}
      {viewMode === "timeline" && (
        <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-xs ring-1 ring-black/5">
          <div className="min-w-[850px]">
            {/* Timeline Header with days of the month */}
            <div className="grid grid-cols-[180px_repeat(31,1fr)] border-b border-gray-200 pb-2 text-center text-[10px] font-bold text-gray-500">
              <div className="text-left pl-2 font-bold uppercase tracking-wider text-gray-700">
                Team Member
              </div>
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dObj = new Date(year, month, dayNum);
                const dayOfWeek = dObj.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const isToday = dateStr === todayStr;

                return (
                  <div
                    key={dayNum}
                    className={`py-1 ${
                      isToday
                        ? "bg-brand text-white rounded font-black"
                        : isWeekend
                        ? "text-gray-300 bg-gray-50/50"
                        : "text-gray-700"
                    }`}
                  >
                    {dayNum}
                  </div>
                );
              })}
            </div>

            {/* Member rows */}
            <div className="divide-y divide-gray-100">
              {activeMembers.map((member) => {
                const color = userColorMap.get(member.email.toLowerCase()) || COLOR_PALETTE[0];
                const memberLeaves = filteredLeaves.filter(
                  (r) => r.user_email.toLowerCase() === member.email.toLowerCase()
                );

                return (
                  <div
                    key={member.email}
                    className="grid grid-cols-[180px_repeat(31,1fr)] items-center py-2.5 hover:bg-gray-50/50"
                  >
                    <div className="text-xs font-semibold text-gray-900 truncate pl-2 flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${color.dot}`} />
                      <span className="truncate">{member.full_name || member.email}</span>
                    </div>

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                      const leaveOnDay = memberLeaves.find(
                        (r) => dateStr >= r.start_date && dateStr <= r.end_date
                      );
                      const dObj = new Date(year, month, dayNum);
                      const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;

                      return (
                        <div
                          key={dayNum}
                          className={`h-7 flex items-center justify-center p-0.5 ${
                            isWeekend ? "bg-gray-50/50" : ""
                          }`}
                        >
                          {leaveOnDay && (
                            <div
                              onClick={() => {
                                const typeName =
                                  leaveTypeMap.get(leaveOnDay.leave_type)?.name ||
                                  leaveOnDay.leave_type;
                                setSelectedDayEvents({
                                  dateStr,
                                  events: [{ request: leaveOnDay, user: member, typeName }],
                                });
                              }}
                              title={`${member.full_name}: ${leaveOnDay.leave_type} (${leaveOnDay.start_date} to ${leaveOnDay.end_date})`}
                              className={`h-5 w-full rounded-sm cursor-pointer shadow-2xs transition-all hover:scale-105 ${color.bar}`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. VIEW MODE 3: WEEKLY SCHEDULE */}
      {viewMode === "week" && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-black/5">
          <div className="grid grid-cols-1 divide-y divide-gray-200 sm:grid-cols-7 sm:divide-x sm:divide-y-0">
            {weekDays.map((day) => {
              const dayEvents = filteredLeaves
                .filter((r) => day.dateStr >= r.start_date && day.dateStr <= r.end_date)
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

              const isLowCoverage = !day.isWeekend && dayEvents.length >= 2;

              return (
                <div
                  key={day.dateStr}
                  className={`min-h-[220px] p-3 transition ${
                    day.isToday ? "bg-brand/5 ring-1 ring-inset ring-brand/30" : "bg-white"
                  } ${day.isWeekend ? "bg-gray-50/60" : ""}`}
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">
                        {day.dayName}
                      </span>
                      <span
                        className={`text-sm font-extrabold font-mono ${
                          day.isToday ? "text-brand" : "text-gray-900"
                        }`}
                      >
                        {day.dateStr}
                      </span>
                    </div>

                    {isLowCoverage && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                        Low Duty
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    {dayEvents.length === 0 ? (
                      <p className="text-[11px] text-gray-400 py-3 text-center">
                        {day.isWeekend ? "Weekend" : "Full team on duty"}
                      </p>
                    ) : (
                      dayEvents.map(({ request, user, typeName }) => {
                        const color =
                          userColorMap.get(user.email.toLowerCase()) || COLOR_PALETTE[0];
                        return (
                          <div
                            key={request.id}
                            onClick={() =>
                              setSelectedDayEvents({ dateStr: day.dateStr, events: dayEvents })
                            }
                            className={`rounded-xl border p-2.5 cursor-pointer shadow-2xs transition-all hover:shadow-xs ${color.bg} ${color.border}`}
                          >
                            <span className="font-bold text-xs block text-gray-900">
                              {user.full_name}
                            </span>
                            <span className="text-[10px] font-semibold text-gray-600 block">
                              {typeName}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono block mt-1">
                              {request.start_date.slice(5)} to {request.end_date.slice(5)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Selected Day Details Drawer */}
      {selectedDayEvents && (
        <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5 shadow-xs animate-in fade-in">
          <div className="flex items-center justify-between border-b border-brand/10 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Scheduled Leaves for {new Date(selectedDayEvents.dateStr).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </h3>
              <p className="text-xs text-gray-500">
                {selectedDayEvents.events.length} team member(s) absent or pending review
              </p>
            </div>
            <button
              onClick={() => setSelectedDayEvents(null)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 active:scale-95 transition"
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
                      <span className="font-semibold text-gray-700">Category:</span> {typeName}
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
                      <p className="italic text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
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
