import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail, type AllowedUser } from "@/lib/auth/allowed-users";
import {
  computeUserBalances,
  DEFAULT_LEAVE_TYPES,
  type LeaveRequest,
  type LeaveType,
} from "@/lib/leave/types";
import {
  computeOvertimeStats,
  type OvertimeRecord,
} from "@/lib/overtime/types";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col bg-[#f4f7f5]">
      <Suspense fallback={<DashboardSkeleton />}>
        <LeaveDashboard />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-bold text-white">
              L
            </div>
            <span className="font-bold text-gray-900">
              Safaricom Leave &amp; Overtime Management
            </span>
          </div>
          <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-white p-5 shadow-xs"
            />
          ))}
        </div>
      </main>
    </div>
  );
}

async function LeaveDashboard() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const email =
    typeof claimsData?.claims?.email === "string"
      ? claimsData.claims.email.toLowerCase()
      : null;

  if (!email || !isAllowedEmail(email)) {
    redirect("/login");
  }

  // Fetch Team Members, Leave Types, Leave Requests, and Overtime Records concurrently
  const [
    { data: dbMembers },
    { data: dbLeaveTypes },
    { data: dbRequests, error: requestsError },
    { data: dbOvertime, error: overtimeError },
  ] = await Promise.all([
    supabase
      .from("allowed_users")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("leave_types")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("leave_requests")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("overtime_records")
      .select("*")
      .order("overtime_date", { ascending: false }),
  ]);

  const teamMembers: AllowedUser[] = (dbMembers as AllowedUser[]) ?? [];
  const currentMember = teamMembers.find(
    (m) => m.email.toLowerCase() === email
  ) ?? {
    email,
    full_name: email.split("@")[0],
    role: "staff",
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const isApprover = currentMember.role === "approver";
  const schemaReady = !requestsError && !overtimeError;
  const leaveTypes: LeaveType[] =
    dbLeaveTypes && dbLeaveTypes.length > 0
      ? (dbLeaveTypes as LeaveType[])
      : DEFAULT_LEAVE_TYPES;

  const allRequests: LeaveRequest[] = (dbRequests as LeaveRequest[]) ?? [];
  const allOvertime: OvertimeRecord[] = (dbOvertime as OvertimeRecord[]) ?? [];
  const currentYear = new Date().getFullYear();

  const myBalances = computeUserBalances(
    leaveTypes,
    allRequests,
    email,
    currentYear
  );

  const myOvertimeStats = computeOvertimeStats(allOvertime, email);

  return (
    <DashboardShell
      currentUserEmail={email}
      currentMember={currentMember}
      isApprover={isApprover}
      teamMembers={teamMembers}
      leaveTypes={leaveTypes}
      allLeaveRequests={allRequests}
      allOvertimeRecords={allOvertime}
      myBalances={myBalances}
      myOvertimeStats={myOvertimeStats}
      currentYear={currentYear}
      schemaReady={schemaReady}
    />
  );
}
