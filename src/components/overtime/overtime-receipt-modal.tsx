"use client";

import { useRef } from "react";
import type { OvertimeRecord } from "@/lib/overtime/types";
import { CheckCircleIcon, XCircleIcon } from "@/components/ui/icons";

type Props = {
  record: OvertimeRecord | null;
  employeeName: string;
  onClose: () => void;
};

export function OvertimeReceiptModal({ record, employeeName, onClose }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!record) return null;

  function handlePrint() {
    window.print();
  }

  const isApproved = record.status === "approved";
  const voucherNumber = `SAF-OT-${record.id.slice(0, 8).toUpperCase()}`;
  const printDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 print:max-h-none print:w-full print:max-w-none print:shadow-none print:ring-0">
        {/* Modal Controls Bar (hidden during print) */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-6 py-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Official Overtime Claim Voucher
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-brand-dark"
            >
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-500 hover:text-gray-800"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Body */}
        <div
          ref={receiptRef}
          className="overflow-y-auto p-8 font-sans print:p-8 print:overflow-visible"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-brand pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand font-black text-white text-sm">
                  S
                </div>
                <div>
                  <span className="text-base font-extrabold tracking-tight text-gray-900">
                    SAFARICOM PLC
                  </span>
                  <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                    Technology &amp; Operations Division
                  </span>
                </div>
              </div>
              <h2 className="mt-3 text-lg font-black text-gray-900">
                OVERTIME CLAIM VOUCHER
              </h2>
            </div>

            <div className="text-right">
              <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs font-bold text-gray-800">
                {voucherNumber}
              </span>
              <p className="mt-1 text-[11px] text-gray-500">Issued: {printDate}</p>
              <div className="mt-2">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    isApproved
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}
                >
                  {isApproved ? "VERIFIED & APPROVED" : "PENDING APPROVAL"}
                </span>
              </div>
            </div>
          </div>

          {/* Employee & Record Information */}
          <div className="mt-6 grid grid-cols-2 gap-4 text-xs border-b border-gray-100 pb-5">
            <div>
              <span className="text-gray-400 uppercase font-semibold text-[10px] block">
                Employee Name
              </span>
              <span className="font-bold text-gray-900 text-sm">{employeeName}</span>
              <span className="block text-gray-600 mt-0.5">{record.user_email}</span>
            </div>

            <div>
              <span className="text-gray-400 uppercase font-semibold text-[10px] block">
                Date Worked
              </span>
              <span className="font-bold text-gray-900 text-sm font-mono">
                {record.overtime_date}
              </span>
            </div>

            <div>
              <span className="text-gray-400 uppercase font-semibold text-[10px] block">
                Overtime Duration
              </span>
              <span className="font-bold text-gray-900 text-base font-mono">
                {record.hours} Hours
              </span>
            </div>

            <div>
              <span className="text-gray-400 uppercase font-semibold text-[10px] block">
                Compensation Mode
              </span>
              <span className="font-bold text-gray-900 capitalize">
                {record.compensatory_choice === "paid"
                  ? "Paid Overtime Payout"
                  : "Time Off In Lieu (TOIL Leave Credit)"}
              </span>
            </div>

            {record.ticket_ref && (
              <div className="col-span-2">
                <span className="text-gray-400 uppercase font-semibold text-[10px] block">
                  Change / Ticket Reference
                </span>
                <span className="font-mono font-semibold text-gray-800">
                  {record.ticket_ref}
                </span>
              </div>
            )}
          </div>

          {/* Task Description */}
          <div className="mt-4 border-b border-gray-100 pb-5 text-xs">
            <span className="text-gray-400 uppercase font-semibold text-[10px] block mb-1">
              Work &amp; Operational Task Summary
            </span>
            <div className="rounded-lg bg-gray-50 p-3 text-gray-800 leading-relaxed font-mono text-[11px]">
              {record.task_summary}
            </div>
          </div>

          {/* Authorization & Signature Section */}
          <div className="mt-6 grid grid-cols-2 gap-6 pt-2 text-xs">
            <div>
              <span className="text-gray-400 uppercase font-semibold text-[10px] block">
                Employee Signature
              </span>
              <div className="mt-4 border-b border-gray-300 pb-1">
                <span className="font-serif italic text-gray-700">{employeeName}</span>
              </div>
              <span className="text-[10px] text-gray-400 block mt-1">
                Electronically submitted via portal
              </span>
            </div>

            <div>
              <span className="text-gray-400 uppercase font-semibold text-[10px] block">
                Manager Authorization
              </span>
              <div className="mt-4 border-b border-gray-300 pb-1">
                <span className="font-serif italic font-bold text-gray-900">
                  {record.reviewed_by || "F. Mbuthia (Manager)"}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
                <span>Status: {record.status.toUpperCase()}</span>
                {record.reviewed_at && <span>{record.reviewed_at.slice(0, 10)}</span>}
              </div>
            </div>
          </div>

          {/* Verification Footer */}
          <div className="mt-8 border-t border-dashed border-gray-200 pt-4 text-center text-[10px] text-gray-400">
            Safaricom Leave &amp; Overtime Management System • Digital Audit Copy • All Rights Reserved
          </div>
        </div>
      </div>
    </div>
  );
}
