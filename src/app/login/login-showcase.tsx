"use client";

import { useEffect, useState } from "react";

export function LoginShowcase() {
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    const hour = new Date().getHours();
    const g =
      hour >= 5 && hour < 12
        ? "Good morning"
        : hour >= 12 && hour < 17
        ? "Good afternoon"
        : "Good evening";
    const timer = setTimeout(() => setGreeting(g), 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative hidden w-full lg:flex lg:w-1/2 xl:w-7/12 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#061e14] via-[#09291b] to-[#04120a] p-10 xl:p-14 text-white">
      {/* Ambient background glowing orbs */}
      <div
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 right-10 h-72 w-72 rounded-full bg-teal-500/10 blur-2xl"
        aria-hidden="true"
      />

      {/* Top Header: Safaricom Brand Identity */}
      <div className="relative z-10 flex items-center gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00a651] to-[#007a3d] shadow-lg shadow-emerald-950/40 ring-1 ring-white/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 32"
            width="24"
            height="24"
            className="text-white"
          >
            <path
              d="M21 11 C21 8.8 19 7 16 7 C12.7 7 10.5 8.8 10.5 11.5 C10.5 14.2 12.8 15.2 16 16 C19.2 16.8 21.5 17.8 21.5 20.5 C21.5 23.2 19.3 25 16 25 C12.5 25 10.5 23 10.5 20.8"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-white">
            Safaricom PLC
          </span>
        </div>
      </div>

      {/* Center Content: Creative Storytelling & Feature Cards */}
      <div className="relative z-10 my-auto py-8">
        {/* Dynamic Time Greeting Badge */}
        <div className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-950/50 px-3.5 py-1 text-xs text-emerald-300 backdrop-blur-md mb-4 shadow-inner">
          <span className="font-semibold">{greeting}, Team</span>
        </div>

        <h1 className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight max-w-lg">
          Workforce Flow, Precision Rostering &amp; Overtime Ledger.
        </h1>
        <p className="mt-3 text-sm text-emerald-100/75 leading-relaxed max-w-md">
          A unified operations suite engineered for Safaricom teams. Track leave allowances in real-time, submit verified shifts, and access automated approvals.
        </p>

        {/* Feature Cards */}
        <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-3 max-w-xl">
          {/* Card 1: Leave Radar */}
          <div className="group rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-emerald-400/30">
            <span className="inline-block text-[10px] font-semibold text-emerald-300 bg-emerald-900/50 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Live Radar
            </span>
            <h2 className="mt-2.5 text-xs font-bold text-white">Leave Allowance Radar</h2>
            <p className="mt-1 text-[11px] text-emerald-200/60 leading-normal">
              Stacked visual balance tracking, carried-forward sync, and automated duration calculations.
            </p>
          </div>

          {/* Card 2: Overtime Ledger */}
          <div className="group rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-emerald-400/30">
            <span className="inline-block text-[10px] font-semibold text-emerald-300 bg-emerald-900/50 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Tier-1 &amp; Tier-2
            </span>
            <h2 className="mt-2.5 text-xs font-bold text-white">Overtime Ledger</h2>
            <p className="mt-1 text-[11px] text-emerald-200/60 leading-normal">
              Rate calculations for normal shifts, night hours, weekend cover, and holiday standby.
            </p>
          </div>

          {/* Card 3: Team Roster */}
          <div className="group rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-emerald-400/30">
            <span className="inline-block text-[10px] font-semibold text-emerald-300 bg-emerald-900/50 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Zero Conflicts
            </span>
            <h2 className="mt-2.5 text-xs font-bold text-white">Team Calendar &amp; Roster</h2>
            <p className="mt-1 text-[11px] text-emerald-200/60 leading-normal">
              Unified team view with clash detection and manager shift scheduling.
            </p>
          </div>

          {/* Card 4: Executive Insights */}
          <div className="group rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-emerald-400/30">
            <span className="inline-block text-[10px] font-semibold text-emerald-300 bg-emerald-900/50 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Payroll Ready
            </span>
            <h2 className="mt-2.5 text-xs font-bold text-white">Payroll &amp; Admin Sync</h2>
            <p className="mt-1 text-[11px] text-emerald-200/60 leading-normal">
              One-click batch reconciliation and exportable audit trails for HR finance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
