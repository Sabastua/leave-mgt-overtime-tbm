"use client";

import { useState, useMemo, useEffect } from "react";
import type { LeaveType, LeaveRequest, LeaveBalanceSummary } from "@/lib/leave/types";
import type { OvertimeRecord, OvertimeStats } from "@/lib/overtime/types";
import type { AllowedUser } from "@/lib/auth/allowed-users";
import { LeaveRequestForm } from "@/components/leave/leave-request-form";
import { OvertimeRequestForm } from "@/components/overtime/overtime-request-form";
import { TeamCalendar } from "@/components/calendar/team-calendar";
import { AdminOverview } from "@/components/admin/admin-overview";
import { TeamManagement } from "@/components/team/team-management";
import { ChangePasswordModal } from "@/components/dashboard/change-password-modal";
import { LeaveRadialStackedCard } from "@/components/dashboard/leave-radial-stacked";
import { OvertimeReceiptModal } from "@/components/overtime/overtime-receipt-modal";
import { cancelLeaveRequest } from "@/app/actions/leave";
import { cancelOvertimeRequest } from "@/app/actions/overtime";
import { signOut } from "@/app/login/actions";
import { getKenyanHolidays } from "@/lib/leave/holidays";
import {
  CalendarIcon,
  CalendarDaysIcon,
  ClockIcon,
  UsersIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  KeyIcon,
  BellIcon,
  TrashIcon,
  FirstAidIcon,
  HeartIcon,
  AcademicCapIcon,
} from "@/components/ui/icons";

function formatLeaveDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]",
  approved: "bg-[#C4ECD0] text-[#003317] border border-[#A8D0B5]",
  rejected: "bg-[#FFDAD6] text-[#93000A] border border-[#FFB2B9]",
  cancelled: "bg-[#E2E2E2] text-[#3D4A3F] border border-[#BCCABC]",
};

type Props = {
  currentUserEmail: string;
  currentMember: AllowedUser;
  isApprover: boolean;
  teamMembers: AllowedUser[];
  leaveTypes: LeaveType[];
  allLeaveRequests: LeaveRequest[];
  allOvertimeRecords: OvertimeRecord[];
  myBalances: LeaveBalanceSummary[];
  myOvertimeStats: OvertimeStats;
  currentYear: number;
  schemaReady: boolean;
};

export function DashboardShell({
  currentUserEmail,
  currentMember,
  isApprover,
  teamMembers,
  leaveTypes,
  allLeaveRequests,
  allOvertimeRecords,
  myBalances,
  myOvertimeStats,
  currentYear,
  schemaReady,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "leave" | "overtime" | "calendar" | "admin" | "team"
  >("leave");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [selectedReceiptRecord, setSelectedReceiptRecord] = useState<OvertimeRecord | null>(null);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>("all");
  const [overtimeStatusFilter, setOvertimeStatusFilter] = useState<string>("all");
  const [expandedLeaveId, setExpandedLeaveId] = useState<string | null>(null);
  const [leaveSearchQuery, setLeaveSearchQuery] = useState("");
  const [expandedOvertimeId, setExpandedOvertimeId] = useState<string | null>(null);
  const [overtimeSearchQuery, setOvertimeSearchQuery] = useState("");
  const [prefillOvertimeClaim, setPrefillOvertimeClaim] = useState<OvertimeRecord | null>(null);
  const [selectedLeaveCategory, setSelectedLeaveCategory] = useState<string | null>(null);

  const nextPublicHoliday = useMemo(() => {
    try {
      const year = new Date().getFullYear();
      const holidaysMap = getKenyanHolidays(year);
      const todayStr = new Date().toISOString().slice(0, 10);
      const sortedDates = Array.from(holidaysMap.keys()).sort();
      const upcoming = sortedDates.find((d) => d >= todayStr);
      if (upcoming) {
        const name = holidaysMap.get(upcoming);
        const [y, m, d] = upcoming.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        const formatted = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return `${name} (${formatted})`;
      }
      const nextYearHolidays = getKenyanHolidays(year + 1);
      const nextYearSorted = Array.from(nextYearHolidays.keys()).sort();
      if (nextYearSorted.length > 0) {
        const first = nextYearSorted[0];
        const name = nextYearHolidays.get(first);
        const [y, m, d] = first.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        const formatted = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return `${name} (${formatted})`;
      }
    } catch {
      // fallback
    }
    return "Madaraka Day (Jun 1)";
  }, []);

  const memberMap = useMemo(() => new Map(teamMembers.map((m) => [m.email.toLowerCase(), m])), [teamMembers]);
  const leaveTypeMap = useMemo(() => new Map(leaveTypes.map((t) => [t.code, t])), [leaveTypes]);

  const myLeaveRequests = useMemo(
    () => allLeaveRequests.filter((r) => r.user_email.toLowerCase() === currentUserEmail),
    [allLeaveRequests, currentUserEmail]
  );
  const filteredLeaveRequests = myLeaveRequests.filter((r) => {
    if (leaveStatusFilter !== "all" && r.status !== leaveStatusFilter) return false;
    if (leaveSearchQuery.trim()) {
      const q = leaveSearchQuery.toLowerCase();
      const type = leaveTypeMap.get(r.leave_type)?.name.toLowerCase() || "";
      const matchesType = type.includes(q) || r.leave_type.toLowerCase().includes(q);
      const matchesDates = r.start_date.includes(q) || r.end_date.includes(q);
      const matchesReason = (r.reason || "").toLowerCase().includes(q);
      const matchesRelief = (r.handover_email || "").toLowerCase().includes(q);
      return matchesType || matchesDates || matchesReason || matchesRelief;
    }
    return true;
  });
  const pendingLeaveApprovals = allLeaveRequests.filter((r) => r.status === "pending");

  const myOvertimeRecords = useMemo(
    () => allOvertimeRecords.filter((r) => r.user_email.toLowerCase() === currentUserEmail),
    [allOvertimeRecords, currentUserEmail]
  );
  const filteredOvertimeRecords = myOvertimeRecords.filter((r) => {
    if (overtimeStatusFilter !== "all" && r.status !== overtimeStatusFilter) return false;
    if (overtimeSearchQuery.trim()) {
      const q = overtimeSearchQuery.toLowerCase();
      const matchesDate = r.overtime_date.includes(q);
      const matchesTask = r.task_summary.toLowerCase().includes(q);
      const matchesTicket = (r.ticket_ref || "").toLowerCase().includes(q);
      const matchesPref = r.compensatory_choice.toLowerCase().includes(q);
      return matchesDate || matchesTask || matchesTicket || matchesPref;
    }
    return true;
  });
  const pendingOvertimeApprovals = allOvertimeRecords.filter((r) => r.status === "pending");

  // User Notification Center State
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [trashedNoticeIds, setTrashedNoticeIds] = useState<string[]>([]);

  // Load trashed notices from localStorage on client mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(`leave_trashed_notices_${currentUserEmail}`);
        if (stored) {
          setTrashedNoticeIds(JSON.parse(stored));
        }
      } catch {
        // Fallback silently if localStorage is restricted
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [currentUserEmail]);

  function trashNotice(id: string) {
    setTrashedNoticeIds((prev) => {
      const updated = Array.from(new Set([...prev, id]));
      try {
        localStorage.setItem(`leave_trashed_notices_${currentUserEmail}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }

  function trashAllNotices() {
    const allIds = allStaffNotices.map((n) => n.id);
    setTrashedNoticeIds((prev) => {
      const updated = Array.from(new Set([...prev, ...allIds]));
      try {
        localStorage.setItem(`leave_trashed_notices_${currentUserEmail}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }

  // Active notifications sent to the user
  const leaveNotices = myLeaveRequests
    .filter((r) => (r.status === "approved" || r.status === "rejected") && r.reviewed_at)
    .map((r) => ({
      id: `leave-${r.id}`,
      type: "Leave" as const,
      status: r.status as "approved" | "rejected",
      title: `${leaveTypeMap.get(r.leave_type)?.name || r.leave_type} (${r.start_date} to ${r.end_date})`,
      detail: `${r.working_days} working day(s)`,
      reviewedBy: r.reviewed_by || "Line Manager",
      reviewedAt: r.reviewed_at || "",
      note: r.reviewer_note || (r.status === "approved" ? "Approved by manager." : "Declined by manager."),
    }));

  const overtimeNotices = myOvertimeRecords
    .filter((r) => (r.status === "approved" || r.status === "rejected") && r.reviewed_at)
    .map((r) => ({
      id: `ot-${r.id}`,
      type: "Overtime" as const,
      status: r.status as "approved" | "rejected",
      title: `Overtime on ${r.overtime_date} (${r.task_summary})`,
      detail: `${r.hours} hours • ${r.compensatory_choice.toUpperCase()}`,
      reviewedBy: r.reviewed_by || "Line Manager",
      reviewedAt: r.reviewed_at || "",
      note: r.reviewer_note || (r.status === "approved" ? "Approved by manager." : "Declined by manager."),
    }));

  const allStaffNotices = [...leaveNotices, ...overtimeNotices]
    .filter((n) => !trashedNoticeIds.includes(n.id))
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));

  const unreadCount = allStaffNotices.length;

  return (
    <div className="flex flex-1 flex-col">
      {/* Top Header */}
      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00A859] font-bold text-white shadow-xs">
              <svg
                viewBox="0 0 32 32"
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11 C21 8.8 19 7 16 7 C12.7 7 10.5 8.8 10.5 11.5 C10.5 14.2 12.8 15.2 16 16 C19.2 16.8 21.5 17.8 21.5 20.5 C21.5 23.2 19.3 25 16 25 C12.5 25 10.5 23 10.5 20.8" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-[#1A1C1C]">Leave &amp; Overtime Management</span>
              <span className="ml-2 rounded-md bg-[#C4ECD0] px-2 py-0.5 text-xs font-medium text-[#003317]">
                {currentMember.role === "approver" ? "Approver / Manager" : "Team Member"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Bell Button with Animated Badge */}
            <button
              type="button"
              onClick={() => setIsNotificationCenterOpen(true)}
              className="relative flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F4F4F4] text-[#3D4A3F] transition hover:bg-[#E8E8E8] hover:border-[#BCCABC] active:scale-95 cursor-pointer"
              title={unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} waiting` : "Notifications"}
            >
              <BellIcon className={`h-4.5 w-4.5 ${unreadCount > 0 ? "text-[#00A859]" : "text-[#3D4A3F]"}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#1A1C1C] ring-1 ring-black/10 shadow-xs animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Profile Button with Animated Notification Dot */}
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="relative flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F4F4F4] px-2.5 py-1.5 transition hover:bg-[#E8E8E8] hover:border-[#BCCABC] cursor-pointer"
              title="View your profile, entitlements & approver details"
            >
              <div className="relative flex h-6.5 w-6.5 items-center justify-center rounded-md bg-[#00A859] font-bold text-xs text-white">
                {(currentMember.full_name || currentUserEmail)[0].toUpperCase()}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-white text-[9px] font-bold text-[#1A1C1C] ring-1 ring-black/10 shadow-xs animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="text-left hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-[#1A1C1C] leading-tight">
                    {currentMember.full_name || currentUserEmail}
                  </p>
                  {unreadCount > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white ring-1 ring-[#6D7B6E] animate-ping" />
                  )}
                </div>
                <p className="text-[10px] text-[#3D4A3F] leading-tight">{currentUserEmail}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs font-medium text-[#3D4A3F] transition hover:bg-[#E8E8E8] cursor-pointer"
              title="Change your password"
            >
              Password
            </button>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-[#3D4A3F] transition hover:bg-[#E8E8E8] cursor-pointer"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mx-auto max-w-6xl px-4">
          <nav className="-mb-px flex flex-wrap space-x-6 text-sm font-medium">
            {/* Tab 1: Leave Requests */}
            <button
              onClick={() => setActiveTab("leave")}
              className={`flex items-center gap-2 border-b-2 py-3 px-1 transition ${
                activeTab === "leave"
                  ? "border-[#00A859] text-[#00A859] font-semibold"
                  : "border-transparent text-[#3D4A3F] hover:border-[#BCCABC] hover:text-[#1A1C1C]"
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              <span>Leave Requests</span>
              {pendingLeaveApprovals.length > 0 && isApprover && (
                <span className="ml-1 rounded-md bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-2 py-0.5 text-[11px] font-bold">
                  {pendingLeaveApprovals.length}
                </span>
              )}
            </button>

            {/* Tab 2: Overtime Claims */}
            <button
              onClick={() => setActiveTab("overtime")}
              className={`flex items-center gap-2 border-b-2 py-3 px-1 transition ${
                activeTab === "overtime"
                  ? "border-[#00A859] text-[#00A859] font-semibold"
                  : "border-transparent text-[#3D4A3F] hover:border-[#BCCABC] hover:text-[#1A1C1C]"
              }`}
            >
              <ClockIcon className="h-4 w-4" />
              <span>Overtime Claims</span>
              {pendingOvertimeApprovals.length > 0 && isApprover && (
                <span className="ml-1 rounded-md bg-[#C4ECD0] text-[#003317] border border-[#A8D0B5] px-2 py-0.5 text-[11px] font-bold">
                  {pendingOvertimeApprovals.length}
                </span>
              )}
            </button>

            {/* Tab 3: Team Calendar */}
            <button
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center gap-2 border-b-2 py-3 px-1 transition ${
                activeTab === "calendar"
                  ? "border-[#00A859] text-[#00A859] font-semibold"
                  : "border-transparent text-[#3D4A3F] hover:border-[#BCCABC] hover:text-[#1A1C1C]"
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              <span>Team Calendar</span>
            </button>

            {/* Tab 4: Admin & Analytics (Approvers only) */}
            {isApprover && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`flex items-center gap-2 border-b-2 py-3 px-1 transition ${
                  activeTab === "admin"
                    ? "border-[#00A859] text-[#00A859] font-semibold"
                  : "border-transparent text-[#3D4A3F] hover:border-[#BCCABC] hover:text-[#1A1C1C]"
                }`}
              >
                <ChartBarIcon className="h-4 w-4" />
                <span>Admin &amp; Metrics</span>
                {(pendingLeaveApprovals.length > 0 || pendingOvertimeApprovals.length > 0) && (
                  <span className="ml-1 rounded-md bg-[#C4ECD0] text-[#003317] border border-[#A8D0B5] px-2 py-0.5 text-[11px] font-bold">
                    {pendingLeaveApprovals.length + pendingOvertimeApprovals.length}
                  </span>
                )}
              </button>
            )}

            {/* Tab 5: Team Management (Approvers only) */}
            {isApprover && (
              <button
                onClick={() => setActiveTab("team")}
                className={`flex items-center gap-2 border-b-2 py-3 px-1 transition ${
                  activeTab === "team"
                    ? "border-[#00A859] text-[#00A859] font-semibold"
                    : "border-transparent text-[#3D4A3F] hover:border-[#BCCABC] hover:text-[#1A1C1C]"
                }`}
              >
                <UsersIcon className="h-4 w-4" />
                <span>Team Management</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 sm:px-6 lg:px-8 py-8">
        {!schemaReady && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Notice: Database Setup</p>
            <p className="mt-1 text-xs text-amber-800">
              Run <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">0006_secure_admin_provisioning.sql</code> in your Supabase SQL Editor.
            </p>
          </div>
        )}

        {/* TAB 1: LEAVE REQUESTS */}
        {activeTab === "leave" && (
          <div className="flex flex-col w-full">
            {/* Top Stats Bar / Welcome Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-space-xl gap-space-md">
              <div>
                <div className="text-label-sm uppercase tracking-wider text-on-surface-variant font-medium mb-1">
                  Employee Self-Service &bull; FY {currentYear}/{currentYear + 1}
                </div>
                <h1 className="font-headline-xl text-on-surface tracking-tight">
                  Leave Dashboard &amp; Request Portal
                </h1>
              </div>
              {nextPublicHoliday && (
                <div className="flex items-center gap-space-sm">
                  <div className="bg-surface-container-high px-space-md py-3 rounded-xl flex items-center gap-space-xs border border-surface-container-highest">
                    <CalendarDaysIcon className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-body-md font-medium text-on-surface">
                      Next Public Holiday: {nextPublicHoliday}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Main Grid: Two-Column Airy Layout (7 cols / 5 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
              {/* LEFT COLUMN: Circular Leave Balance Widgets (7 Columns) */}
              <div className="lg:col-span-7 flex flex-col gap-space-lg">
                {/* Section Header */}
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="font-headline-md text-on-surface">Available Balances</h2>
                    <p className="text-body-md text-on-surface-variant">Real-time quota tracking across enterprise categories</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("leave-history-section");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="text-body-sm font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Accrual History</span>
                    <ChevronDownIcon className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Balance Cards Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  {myBalances.map(({ leaveType, entitled, baseEntitled, carriedForward, approved, pending, remaining }, idx) => {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    const activeLeave = myLeaveRequests.find(
                      (r) =>
                        r.status === "approved" &&
                        r.leave_type === leaveType.code &&
                        r.start_date <= todayStr &&
                        r.end_date >= todayStr
                    );
                    const upcomingLeave = myLeaveRequests
                      .filter(
                        (r) =>
                          (r.status === "approved" || r.status === "pending") &&
                          r.leave_type === leaveType.code &&
                          r.end_date >= todayStr
                      )
                      .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

                    return (
                      <LeaveRadialStackedCard
                        key={leaveType.code}
                        categoryIndex={idx + 1}
                        leaveType={leaveType}
                        entitled={entitled}
                        baseEntitled={baseEntitled}
                        carriedForward={carriedForward}
                        approved={approved}
                        pending={pending}
                        remaining={remaining}
                        activeLeaveRequest={activeLeave}
                        upcomingLeaveRequest={upcomingLeave}
                        onSelectType={(code) => setSelectedLeaveCategory(code)}
                      />
                    );
                  })}
                </div>

                {/* Recent Requests History Preview */}
                <div className="bg-surface-container-low p-6 lg:p-7 rounded-xl shadow-xs border border-surface-container-high mt-space-sm">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="font-headline-sm text-on-surface">Recent Leave Activity</h3>
                    <span className="text-label-sm bg-surface-container px-3 py-1 rounded-full text-on-surface-variant font-medium">
                      Showing Last {Math.min(3, myLeaveRequests.length)} Requests
                    </span>
                  </div>

                  {myLeaveRequests.length === 0 ? (
                    <p className="text-body-sm text-on-surface-variant py-4 text-center">
                      You have not submitted any leave requests yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {myLeaveRequests.slice(0, 3).map((r) => {
                        const type = leaveTypeMap.get(r.leave_type);
                        const isApproved = r.status === "approved";
                        const isPending = r.status === "pending";
                        const isRejected = r.status === "rejected";

                        return (
                          <div
                            key={r.id}
                            className="flex items-center justify-between p-4 bg-surface rounded-xl border border-surface-container-high hover:border-outline-variant/40 transition-colors"
                          >
                            <div className="flex items-center gap-3.5">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                  r.leave_type.toLowerCase().includes("sick")
                                    ? "bg-secondary-container text-on-secondary-container"
                                    : r.leave_type.toLowerCase().includes("compassionate")
                                    ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                                    : r.leave_type.toLowerCase().includes("study")
                                    ? "bg-primary-fixed text-on-primary-fixed"
                                    : "bg-primary-container/20 text-primary"
                                }`}
                              >
                                {r.leave_type.toLowerCase().includes("sick") ? (
                                  <FirstAidIcon className="h-5 w-5" />
                                ) : r.leave_type.toLowerCase().includes("compassionate") ? (
                                  <HeartIcon className="h-5 w-5" />
                                ) : r.leave_type.toLowerCase().includes("study") ? (
                                  <AcademicCapIcon className="h-5 w-5" />
                                ) : (
                                  <CalendarDaysIcon className="h-5 w-5" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-body-md text-on-surface">
                                  {type?.name || r.leave_type} ({r.working_days} Day{r.working_days === 1 ? "" : "s"})
                                </div>
                                <div className="text-body-sm text-on-surface-variant">
                                  {formatLeaveDate(r.start_date)} &ndash; {formatLeaveDate(r.end_date)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span
                                className={`px-3 py-1 rounded-full text-label-sm font-semibold ${
                                  isApproved
                                    ? "bg-[#C4ECD0] text-[#003317]"
                                    : isPending
                                    ? "bg-[#FEF3C7] text-[#92400E]"
                                    : isRejected
                                    ? "bg-[#FFDAD6] text-[#93000A]"
                                    : "bg-surface-container-high text-on-surface-variant"
                                }`}
                              >
                                {r.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* My Full Leave History Table with Search & Status Filters */}
                <section
                  id="leave-history-section"
                  className="bg-surface-container-low p-6 lg:p-7 rounded-xl shadow-xs border border-surface-container-high"
                >
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-headline-sm text-on-surface">My Leave History</h2>
                      <p className="text-body-sm text-on-surface-variant">Track status, handover details, and manager reviews.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant" />
                        <input
                          type="text"
                          placeholder="Search leaves…"
                          value={leaveSearchQuery}
                          onChange={(e) => setLeaveSearchQuery(e.target.value)}
                          className="rounded-lg border border-surface-container-high bg-surface py-1.5 pl-8 pr-3 text-xs text-on-surface shadow-2xs transition focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        {(["all", "pending", "approved", "rejected"] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setLeaveStatusFilter(status)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                              leaveStatusFilter === status
                                ? "bg-primary text-on-primary shadow-2xs"
                                : "border border-outline-variant/30 bg-surface text-on-surface-variant hover:bg-surface-container"
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {filteredLeaveRequests.length === 0 ? (
                    <p className="py-8 text-center text-body-sm text-on-surface-variant">
                      {leaveStatusFilter === "all" && !leaveSearchQuery
                        ? "You have not submitted any leave requests yet."
                        : "No leave requests match your search or filter."}
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-surface-container-high bg-surface">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-surface-container-high text-on-surface-variant uppercase tracking-wider font-semibold bg-surface-container-low/60">
                            <th className="py-2.5 pr-2 pl-3 w-6"></th>
                            <th className="py-2.5 pr-4">Type</th>
                            <th className="px-3 py-2.5">Start</th>
                            <th className="px-3 py-2.5">End</th>
                            <th className="px-3 py-2.5">Working Days</th>
                            <th className="px-3 py-2.5">Relief Colleague</th>
                            <th className="px-3 py-2.5">Status</th>
                            <th className="px-3 py-2.5 text-right pr-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container-high">
                          {filteredLeaveRequests.map((r) => {
                            const type = leaveTypeMap.get(r.leave_type);
                            const handover = memberMap.get(r.handover_email?.toLowerCase() || "");
                            const isExpanded = expandedLeaveId === r.id;

                            return (
                              <tr key={r.id} className="group">
                                <td colSpan={8} className="p-0">
                                  <div className="hover:bg-surface-container-low/50 transition flex flex-col">
                                    <div className="flex items-center w-full px-3 py-3">
                                      <div className="w-6 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => setExpandedLeaveId(isExpanded ? null : r.id)}
                                          className="rounded p-1 text-on-surface-variant hover:text-on-surface transition cursor-pointer"
                                          title={isExpanded ? "Collapse details" : "Expand details"}
                                        >
                                          {isExpanded ? (
                                            <ChevronUpIcon className="h-3.5 w-3.5" />
                                          ) : (
                                            <ChevronDownIcon className="h-3.5 w-3.5" />
                                          )}
                                        </button>
                                      </div>

                                      <div className="w-1/3 pr-4">
                                        <span className="font-semibold text-on-surface block">
                                          {type?.name ?? r.leave_type}
                                        </span>
                                        {r.reviewer_note && (r.status === "approved" || r.status === "rejected") && (
                                          <p
                                            className={`mt-0.5 text-[11px] leading-tight truncate ${
                                              r.status === "approved"
                                                ? "text-primary font-medium"
                                                : "text-[#BA1A1A] font-medium"
                                            }`}
                                            title={r.reviewer_note}
                                          >
                                            <span className="font-bold">Note: </span>
                                            {r.reviewer_note}
                                          </p>
                                        )}
                                      </div>

                                      <div className="w-24 px-3 tabular-nums font-medium text-on-surface-variant">
                                        {r.start_date}
                                      </div>
                                      <div className="w-24 px-3 tabular-nums font-medium text-on-surface-variant">
                                        {r.end_date}
                                      </div>
                                      <div className="w-24 px-3 font-semibold tabular-nums text-on-surface">
                                        {r.working_days}d
                                      </div>

                                      <div className="flex-1 px-3 text-on-surface-variant truncate">
                                        {handover ? handover.full_name : r.handover_email || "—"}
                                      </div>

                                      <div className="w-28 px-3">
                                        <span
                                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                            STATUS_BADGE[r.status] ?? "bg-surface-container text-on-surface"
                                          }`}
                                        >
                                          {r.status.toUpperCase()}
                                        </span>
                                      </div>

                                      <div className="w-20 px-3 text-right pr-4">
                                        {r.status === "pending" && (
                                          <form action={cancelLeaveRequest} className="inline">
                                            <input type="hidden" name="request_id" value={r.id} />
                                            <button
                                              type="submit"
                                              className="text-xs text-[#BA1A1A] hover:underline font-semibold active:scale-95 transition cursor-pointer"
                                            >
                                              Cancel
                                            </button>
                                          </form>
                                        )}
                                      </div>
                                    </div>

                                    {/* Expanded Detailed View */}
                                    {isExpanded && (
                                      <div className="bg-surface-container-low/80 px-8 py-3.5 border-t border-surface-container-high text-xs">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <div>
                                            <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-0.5">
                                              Reason &amp; Handover Brief:
                                            </span>
                                            <p className="text-on-surface bg-surface p-2.5 rounded-lg border border-surface-container-high">
                                              {r.reason || "No specific handover notes recorded."}
                                            </p>
                                          </div>

                                          <div>
                                            <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-0.5">
                                              Manager Authorization &amp; Remarks:
                                            </span>
                                            <div className="bg-surface p-2.5 rounded-lg border border-surface-container-high space-y-1">
                                              <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-on-surface-variant">Reviewer:</span>
                                                <span className="font-semibold text-on-surface">
                                                  {r.reviewed_by || "Line Manager"}
                                                </span>
                                              </div>
                                              {r.reviewed_at && (
                                                <div className="flex items-center justify-between text-[11px]">
                                                  <span className="text-on-surface-variant">Decision Date:</span>
                                                  <span className="tabular-nums text-on-surface-variant">
                                                    {r.reviewed_at.slice(0, 10)}
                                                  </span>
                                                </div>
                                              )}
                                              {r.reviewer_note && (
                                                <div className="pt-1 border-t border-surface-container-high text-on-surface">
                                                  <span className="font-semibold text-on-surface">Remarks: </span>
                                                  <span>{r.reviewer_note}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="mt-2 text-[10px] text-on-surface-variant text-right">
                                          Submitted: {r.created_at ? r.created_at.slice(0, 19).replace("T", " ") : "—"}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>

              {/* RIGHT COLUMN: Intuitive 'Apply for Leave' Form (5 Columns) */}
              <div className="lg:col-span-5">
                <LeaveRequestForm
                  currentUserEmail={currentUserEmail}
                  leaveTypes={leaveTypes}
                  balances={myBalances}
                  teamMembers={teamMembers}
                  existingRequests={allLeaveRequests}
                  externalSelectedType={selectedLeaveCategory}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: OVERTIME CLAIMS */}
        {activeTab === "overtime" && (
          <div className="space-y-8">
            {/* My Overtime Summary with Progress Bars */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Approved Hours ({currentYear})
                </span>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {myOvertimeStats.totalHoursApproved.toFixed(1)} <span className="text-sm font-normal text-gray-500">hrs</span>
                </p>
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-gray-600 mb-1">
                    <span className="font-semibold text-blue-700">{myOvertimeStats.paidHoursApproved.toFixed(1)}h Paid</span>
                    <span className="font-semibold text-purple-700">{myOvertimeStats.toilHoursApproved.toFixed(1)}h TOIL</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 flex">
                    <div
                      className="bg-blue-500"
                      style={{
                        width: `${
                          myOvertimeStats.totalHoursApproved > 0
                            ? (myOvertimeStats.paidHoursApproved / myOvertimeStats.totalHoursApproved) * 100
                            : 50
                        }%`,
                      }}
                    />
                    <div
                      className="bg-purple-500"
                      style={{
                        width: `${
                          myOvertimeStats.totalHoursApproved > 0
                            ? (myOvertimeStats.toilHoursApproved / myOvertimeStats.totalHoursApproved) * 100
                            : 50
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Pending Claim Hours
                </span>
                <p className="mt-2 text-3xl font-bold text-amber-700">
                  {myOvertimeStats.totalHoursPending.toFixed(1)} <span className="text-sm font-normal text-gray-500">hrs</span>
                </p>
                <p className="mt-2 text-xs text-gray-500">Awaiting approver review</p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-black/5 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  TOIL Accumulated
                </span>
                <p className="mt-2 text-3xl font-bold text-purple-700">
                  {(myOvertimeStats.toilHoursApproved / 8).toFixed(1)}{" "}
                  <span className="text-sm font-normal text-gray-500">days equivalent</span>
                </p>
                <p className="mt-2 text-xs text-gray-500">Calculated as 8 working hours = 1 day</p>
              </div>
            </section>

            {/* Overtime Request Form with Smart Calculator & Shift Templates */}
            <OvertimeRequestForm
              currentUserEmail={currentUserEmail}
              currentUserName={currentMember.full_name || currentUserEmail}
              prefillClaim={prefillOvertimeClaim}
              onClearPrefill={() => setPrefillOvertimeClaim(null)}
            />

            {/* My Overtime Claims History Table */}
            <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">My Overtime Claims</h2>
                  <p className="text-xs text-gray-500">Track approved hours, printable vouchers, and manager authorizations.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search claims or ticket ref…"
                      value={overtimeSearchQuery}
                      onChange={(e) => setOvertimeSearchQuery(e.target.value)}
                      className="rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-900 shadow-2xs transition focus:border-brand focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    {(["all", "pending", "approved", "rejected"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setOvertimeStatusFilter(status)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                          overtimeStatusFilter === status
                            ? "bg-brand text-white shadow-2xs"
                            : "border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredOvertimeRecords.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  {overtimeStatusFilter === "all" && !overtimeSearchQuery
                    ? "You have not logged any overtime claims yet."
                    : "No overtime claims match your search or status filter."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 pr-2 w-6"></th>
                        <th className="py-2.5 pr-4">Date Worked</th>
                        <th className="px-3 py-2.5">Hours</th>
                        <th className="px-3 py-2.5">Preference</th>
                        <th className="px-3 py-2.5">Task &amp; Reference</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredOvertimeRecords.map((record) => {
                        const isExpanded = expandedOvertimeId === record.id;

                        return (
                          <tr key={record.id} className="group">
                            <td colSpan={7} className="p-0">
                              <div className="hover:bg-gray-50/60 transition flex flex-col">
                                <div className="flex items-center w-full px-2 py-3">
                                  <div className="w-6 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedOvertimeId(isExpanded ? null : record.id)}
                                      className="rounded p-1 text-gray-400 hover:text-gray-700 transition"
                                      title={isExpanded ? "Collapse shift details" : "Expand shift details"}
                                    >
                                      {isExpanded ? (
                                        <ChevronUpIcon className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronDownIcon className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </div>

                                  <div className="w-28 pr-4 tabular-nums font-medium text-gray-900">
                                    {record.overtime_date}
                                  </div>

                                  <div className="w-20 px-3 font-semibold tabular-nums text-gray-900">
                                    {record.hours}h
                                  </div>

                                  <div className="w-28 px-3">
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                        record.compensatory_choice === "paid"
                                          ? "bg-blue-50 text-blue-800"
                                          : "bg-purple-50 text-purple-800"
                                      }`}
                                    >
                                      {record.compensatory_choice === "paid" ? "PAID" : "TOIL"}
                                    </span>
                                  </div>

                                  <div className="flex-1 px-3 truncate">
                                    <span className="font-medium text-gray-900">
                                      {record.task_summary.split("\n")[0]}
                                    </span>
                                    {record.ticket_ref && (
                                      <span className="ml-2 tabular-nums text-[11px] text-gray-400">
                                        Ref: {record.ticket_ref}
                                      </span>
                                    )}
                                    {record.reviewer_note && (record.status === "approved" || record.status === "rejected") && (
                                      <p className={`mt-0.5 text-[11px] leading-tight truncate ${
                                        record.status === "approved" ? "text-emerald-700 font-medium" : "text-red-600 font-medium"
                                      }`} title={record.reviewer_note}>
                                        <span className="font-bold">Note: </span>
                                        {record.reviewer_note}
                                      </p>
                                    )}
                                  </div>

                                  <div className="w-28 px-3">
                                    <span
                                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                        STATUS_BADGE[record.status] ?? "bg-gray-100 text-gray-700"
                                      }`}
                                    >
                                      {record.status.toUpperCase()}
                                    </span>
                                  </div>

                                  <div className="w-36 px-3 text-right">
                                    <div className="inline-flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPrefillOvertimeClaim(record);
                                          document.getElementById("overtime-claim-form-section")?.scrollIntoView({ behavior: "smooth" });
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition active:scale-95"
                                        title="Repeat claim using this template"
                                      >
                                        Repeat
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedReceiptRecord(record)}
                                        className="text-xs text-brand hover:text-brand-dark font-semibold transition active:scale-95"
                                      >
                                        Receipt
                                      </button>
                                      {record.status === "pending" && (
                                        <form action={cancelOvertimeRequest} className="inline">
                                          <input type="hidden" name="record_id" value={record.id} />
                                          <button
                                            type="submit"
                                            className="text-xs text-red-600 hover:text-red-800 font-semibold active:scale-95 transition"
                                          >
                                            Cancel
                                          </button>
                                        </form>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Expanded Shift Detail View */}
                                {isExpanded && (
                                  <div className="bg-gray-50/80 px-8 py-3.5 border-t border-gray-100 text-xs animate-in fade-in">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div>
                                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                                          Detailed Shift &amp; Task Notes:
                                        </span>
                                        <div className="text-gray-800 bg-white p-2.5 rounded-lg border border-gray-200 whitespace-pre-wrap text-[11px]">
                                          {record.task_summary}
                                        </div>
                                      </div>

                                      <div>
                                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                                          Manager Review &amp; Payroll Authorization:
                                        </span>
                                        <div className="bg-white p-2.5 rounded-lg border border-gray-200 space-y-1">
                                          <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-gray-500">Reviewer:</span>
                                            <span className="font-semibold text-gray-900">
                                              {record.reviewed_by || "Pending Review (F. Mbuthia)"}
                                            </span>
                                          </div>
                                          {record.reviewed_at && (
                                            <div className="flex items-center justify-between text-[11px]">
                                              <span className="text-gray-500">Authorization Date:</span>
                                              <span className="tabular-nums text-gray-700">{record.reviewed_at.slice(0, 10)}</span>
                                            </div>
                                          )}
                                          {record.reviewer_note && (
                                            <div className="pt-1 border-t border-gray-100 text-gray-700">
                                              <span className="font-semibold text-gray-800">Remarks: </span>
                                              <span>{record.reviewer_note}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-2 text-[10px] text-gray-400 text-right">
                                      Claim ID: SAF-OT-{record.id.slice(0, 8).toUpperCase()} • Submitted: {record.created_at ? record.created_at.slice(0, 19).replace("T", " ") : "—"}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 3: TEAM CALENDAR */}
        {activeTab === "calendar" && (
          <TeamCalendar
            teamMembers={teamMembers}
            leaveRequests={allLeaveRequests}
            leaveTypes={leaveTypes}
          />
        )}

        {/* TAB 4: ADMIN & METRICS (APPROVERS ONLY) */}
        {activeTab === "admin" && isApprover && (
          <AdminOverview
            teamMembers={teamMembers}
            leaveRequests={allLeaveRequests}
            leaveTypes={leaveTypes}
            overtimeRecords={allOvertimeRecords}
            currentYear={currentYear}
          />
        )}

        {/* TAB 5: TEAM MANAGEMENT (APPROVERS ONLY) */}
        {activeTab === "team" && isApprover && (
          <TeamManagement
            currentUserEmail={currentUserEmail}
            members={teamMembers}
          />
        )}

        {/* Change Password Modal */}
        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
        />

        {/* Printable Overtime Receipt Modal */}
        {selectedReceiptRecord && (
          <OvertimeReceiptModal
            record={selectedReceiptRecord}
            employeeName={currentMember.full_name || currentUserEmail}
            onClose={() => setSelectedReceiptRecord(null)}
          />
        )}

        {/* Notification Center Modal */}
        {isNotificationCenterOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs animate-in fade-in">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 border border-[#E5E7EB] shadow-lg flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C4ECD0] text-[#003317]">
                    <BellIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900">Notifications</h3>
                      {allStaffNotices.length > 0 && (
                        <span className="rounded-md bg-white border border-[#E5E7EB] text-[#1A1C1C] text-[10px] font-bold px-2 py-0.5 shadow-2xs">
                          {allStaffNotices.length} active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Manager decisions, authorization notes, and approval messages
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {allStaffNotices.length > 0 && (
                    <button
                      type="button"
                      onClick={trashAllNotices}
                      className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Clear all notifications"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      <span>Trash All</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsNotificationCenterOpen(false)}
                    className="rounded-xl p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                  >
                    <XCircleIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content List */}
              <div className="mt-4 overflow-y-auto space-y-3 flex-1 pr-1">
                {allStaffNotices.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-500 space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 border border-gray-100">
                      <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
                    </div>
                    <p className="font-bold text-gray-800 text-sm">All caught up</p>
                    <p className="text-gray-400 max-w-xs mx-auto">
                      No active decision messages. You have cleared all manager notifications.
                    </p>
                  </div>
                ) : (
                  allStaffNotices.map((n) => (
                    <div
                      key={n.id}
                      className={`rounded-2xl p-4 border transition-all ${
                        n.status === "approved"
                          ? "bg-emerald-50/60 border-emerald-200/80 text-emerald-950"
                          : "bg-rose-50/60 border-rose-200/80 text-rose-950"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            n.status === "approved"
                              ? "bg-emerald-600 text-white"
                              : "bg-rose-600 text-white"
                          }`}>
                            {n.status === "approved" ? "Approved" : "Declined"}
                          </span>
                          <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-gray-700 border border-gray-200">
                            {n.type}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {n.reviewedAt ? n.reviewedAt.slice(0, 10) : ""}
                          </span>
                        </div>

                        {/* Trash Button */}
                        <button
                          type="button"
                          onClick={() => trashNotice(n.id)}
                          className="rounded-lg p-1.5 text-gray-400 hover:text-rose-600 hover:bg-white/80 transition cursor-pointer"
                          title="Trash this notification"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="mt-2 text-xs font-bold text-gray-900">
                        {n.title}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {n.detail} &bull; Reviewed by {n.reviewedBy}
                      </p>

                      {/* Manager message body */}
                      <div className="mt-2.5 rounded-xl bg-white p-3 border border-black/5 text-xs">
                        <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                          Manager Message:
                        </span>
                        <p className="text-gray-800 font-medium leading-relaxed">
                          {n.note}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <span>Permanent records remain in your request tables</span>
                <button
                  type="button"
                  onClick={() => setIsNotificationCenterOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Self-Service Profile Modal */}
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs animate-in fade-in">
            <div className="w-full max-w-md rounded-xl bg-white p-6 border border-[#E5E7EB] shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-[#00A859]" />
                  <h3 className="text-base font-bold text-[#1A1C1C]">My Profile &amp; Entitlements</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="text-[#6D7B6E] hover:text-[#1A1C1C] transition cursor-pointer"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                {/* Identity Card */}
                <div className="flex items-center gap-3 rounded-lg bg-[#F4F4F4] p-4 border border-[#E5E7EB]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#00A859] text-xl font-bold text-white shadow-xs shrink-0">
                    {(currentMember.full_name || currentUserEmail)[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1C1C] text-sm">
                      {currentMember.full_name || currentUserEmail}
                    </h4>
                    <p className="text-[#3D4A3F] text-[11px]">{currentUserEmail}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded-md bg-[#C4ECD0] px-2 py-0.5 text-[10px] font-medium text-[#003317] border border-[#A8D0B5]">
                        {currentMember.role === "approver" ? "Approver / Manager" : "Team Member (Staff)"}
                      </span>
                      <span className="rounded-md bg-[#C4ECD0] px-2 py-0.5 text-[10px] font-medium text-[#003317] border border-[#A8D0B5]">
                        Active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Department & Governance Details */}
                <div className="rounded-lg border border-[#E5E7EB] p-3.5 space-y-2 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Department:</span>
                    <span className="text-gray-900 font-semibold">Safaricom Technology Team</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Current Year Cycle:</span>
                    <span className="text-gray-900 font-bold">{currentYear}</span>
                  </div>
                </div>

                {/* Balances Quick Snapshot */}
                <div className="rounded-xl border border-gray-100 p-3.5 bg-gray-50/50 space-y-2">
                  <p className="font-bold text-gray-700">Leave Entitlements Summary</p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {myBalances.map((b) => (
                      <div key={b.leaveType.code} className="rounded-lg bg-white p-2 border border-gray-100">
                        <span className="text-gray-500 block text-[10px]">{b.leaveType.name}</span>
                        <strong className="text-gray-900 tabular-nums text-sm">{b.remaining}d</strong>
                        <span className="text-gray-400 text-[10px]"> /{b.entitled}d</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overtime Snapshot */}
                <div className="rounded-xl border border-gray-100 p-3.5 bg-white space-y-1">
                  <p className="font-bold text-gray-700">Overtime Summary ({currentYear})</p>
                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-gray-500">Total Approved Hours:</span>
                    <strong className="tabular-nums text-gray-900">{myOvertimeStats.totalHoursApproved.toFixed(1)}h</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Paid Payroll Hours:</span>
                    <strong className="tabular-nums text-blue-700">{myOvertimeStats.paidHoursApproved.toFixed(1)}h</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">TOIL Rest Days Banked:</span>
                    <strong className="tabular-nums text-purple-700">~{(myOvertimeStats.toilHoursApproved / 8).toFixed(1)} days</strong>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileModalOpen(false);
                        setIsNotificationCenterOpen(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                    >
                      <BellIcon className="h-4 w-4 text-gray-500" />
                      <span>Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileModalOpen(false);
                        setIsPasswordModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                    >
                      <KeyIcon className="h-4 w-4 text-gray-500" />
                      <span>Change Password</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(false)}
                    className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-black transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
