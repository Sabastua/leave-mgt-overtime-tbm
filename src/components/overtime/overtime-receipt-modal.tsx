"use client";

import { useEffect, useId, useRef } from "react";
import {
  formatKes,
  parseOvertimeRecordMeta,
  PAYE_WITHHOLDING_RATE,
  type OvertimeRecord,
} from "@/lib/overtime/types";

type Props = {
  record: OvertimeRecord | null;
  allRecords?: OvertimeRecord[];
  employeeName: string;
  onClose: () => void;
};

export function OvertimeReceiptModal({
  record,
  allRecords = [],
  employeeName,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (record) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [record]);

  // Fallback for browsers that do not yet support closedby="any" on <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !record) return;

    const handleNativeClose = () => {
      dialog.returnValue = "";
      onClose();
    };

    dialog.addEventListener("close", handleNativeClose);

    let cleanupFallback: (() => void) | undefined;
    if (
      typeof HTMLDialogElement !== "undefined" &&
      !("closedBy" in HTMLDialogElement.prototype)
    ) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const rect = dialog.getBoundingClientRect();
        return (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        );
      };
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) {
          dialog.close();
        }
      };
      dialog.addEventListener("pointerdown", onPointerDown);
      dialog.addEventListener("pointerup", onPointerUp);
      cleanupFallback = () => {
        dialog.removeEventListener("pointerdown", onPointerDown);
        dialog.removeEventListener("pointerup", onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener("close", handleNativeClose);
      cleanupFallback?.();
    };
  }, [record, onClose]);

  if (!record) return null;

  const selectedMeta = parseOvertimeRecordMeta(record);

  // Build itemized breakdown: include approved/disbursed records so the voucher shows the full batch breakdown (matching the design), ensuring the selected record is included
  const approvedList = allRecords.filter((r) => r.status === "approved");
  const itemizedRecords =
    approvedList.length > 0 && record.status === "approved"
      ? approvedList.some((r) => r.id === record.id)
        ? approvedList
        : [record, ...approvedList]
      : [record];

  const itemizedRows = itemizedRecords.map((r) => ({
    record: r,
    meta: parseOvertimeRecordMeta(r),
  }));

  const grossTotal = itemizedRows.reduce((sum, item) => sum + item.meta.payoutKes, 0);
  const withholdingTax = Math.round(grossTotal * PAYE_WITHHOLDING_RATE * 100) / 100;
  const netDisbursed = Math.round((grossTotal - withholdingTax) * 100) / 100;

  const displayEmployeeName =
    employeeName && !employeeName.includes("@") ? employeeName : "Alex Kiprop";

  function handleCloseClick() {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    } else {
      onClose();
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: "any" } as Record<string, unknown>)}
      className="m-auto w-[calc(100%-2rem)] max-w-3xl rounded-2xl bg-surface-container-lowest p-0 text-on-surface shadow-2xl border border-outline-variant/30 open:flex open:flex-col max-h-[90vh] overflow-hidden print:max-h-none print:w-full print:max-w-none print:shadow-none print:border-0"
    >
      {/* Modal Header with Safaricom Green Accent */}
      <div className="bg-primary text-on-primary px-6 py-4 flex items-center justify-between relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-headline-sm">
            S
          </div>
          <div>
            <h3 id={titleId} className="text-headline-sm font-bold tracking-tight">
              Safaricom PLC Enterprise
            </h3>
            <p className="text-label-sm text-primary-fixed-dim uppercase tracking-wider font-medium">
              Official Remittance Advice &amp; Payment Voucher
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCloseClick}
          aria-label="Close voucher modal"
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer print:hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      {/* Modal Scrollable Body */}
      <div className="p-6 overflow-y-auto flex flex-col gap-6">
        {/* Voucher Metadata & Employee Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-xl">
          <div className="flex flex-col gap-1">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              Employee Details
            </span>
            <div className="text-body-lg font-bold text-on-surface mt-1">
              {displayEmployeeName}
            </div>
            <div className="text-body-sm text-on-surface-variant">
              Staff ID: <span className="font-medium text-on-surface">SC-40921</span>
            </div>
            <div className="text-body-sm text-on-surface-variant">
              Department:{" "}
              <span className="font-medium text-on-surface">
                Enterprise Technology
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1 md:text-right">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              Voucher Information
            </span>
            <div className="text-body-md font-medium text-primary mt-1">
              Ref: <span id="modal-ref-id">{selectedMeta.refCode}</span>
            </div>
            <div className="text-body-sm text-on-surface-variant">
              Issue Date: Oct 24, 2023
            </div>
            <div className="text-body-sm text-on-surface-variant">
              Payment Cycle: August Payroll Batch B
            </div>
          </div>
        </div>

        {/* Itemized Overtime Table */}
        <div className="flex flex-col gap-2">
          <h4 className="text-label-md font-semibold text-on-surface uppercase tracking-wider">
            Itemized Overtime Breakdown
          </h4>
          <div className="border border-surface-container rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-body-sm">
              <thead>
                <tr className="bg-surface-container text-label-sm text-on-surface-variant uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Reference</th>
                  <th className="py-3 px-4 font-semibold">Project / Task</th>
                  <th className="py-3 px-4 font-semibold text-center">Hours</th>
                  <th className="py-3 px-4 font-semibold text-center">Rate</th>
                  <th className="py-3 px-4 font-semibold text-right">
                    Amount (KES)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {itemizedRows.map(({ record: itemRec, meta }) => {
                  const isSelectedRow = itemRec.id === record.id;
                  return (
                    <tr
                      key={itemRec.id}
                      className={
                        isSelectedRow && itemizedRows.length > 1
                          ? "bg-primary-container/5"
                          : undefined
                      }
                    >
                      <td className="py-3 px-4 font-medium text-on-surface">
                        {meta.refCode}
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant">
                        {meta.projectTitle}
                      </td>
                      <td className="py-3 px-4 text-center tabular-nums">
                        {Number(itemRec.hours).toFixed(1)} hrs
                      </td>
                      <td className="py-3 px-4 text-center tabular-nums">
                        {meta.multiplier.toFixed(1)}x
                      </td>
                      <td className="py-3 px-4 text-right font-medium tabular-nums">
                        {formatKes(meta.payoutKes, true)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary & Totals */}
        <div className="flex flex-col bg-surface-container-low p-4 rounded-xl gap-2">
          <div className="flex justify-between text-body-sm text-on-surface-variant">
            <span>Gross Overtime Payout</span>
            <span className="font-medium text-on-surface tabular-nums">
              KES {formatKes(grossTotal, true)}
            </span>
          </div>
          <div className="flex justify-between text-body-sm text-on-surface-variant">
            <span>Payroll Withholding Tax (PAYE 30%)</span>
            <span className="font-medium text-error tabular-nums">
              - KES {formatKes(withholdingTax, true)}
            </span>
          </div>
          <div className="border-t border-surface-container my-1" />
          <div className="flex justify-between items-baseline">
            <span className="text-body-md font-bold text-on-surface">
              Net Disbursed Amount
            </span>
            <span className="font-headline-md text-primary tabular-nums">
              KES {formatKes(netDisbursed, true)}
            </span>
          </div>
        </div>

        {/* Authorization & Audit Trail */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2 border-t border-surface-container text-body-sm text-on-surface-variant">
          <div>
            <div className="font-medium text-on-surface">
              Authorized by: Dr. Jane Wangari
            </div>
            <div>Head of HR Operations, Safaricom Enterprise</div>
            <div className="text-label-sm text-outline mt-1">
              Audit Trail ID: SAF-SEC-2023-998421
            </div>
          </div>
          <div className="flex items-center gap-2 bg-primary-container/10 px-3 py-2 rounded-xl text-primary font-medium text-label-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4 shrink-0"
            >
              <path d="m23 12-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-12.91 4.72-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z" />
            </svg>
            <span>Verified &amp; Disbursed via M-Pesa Bulk</span>
          </div>
        </div>
      </div>

      {/* Modal Footer Actions */}
      <div className="bg-surface-container px-6 py-4 flex items-center justify-between gap-3 border-t border-outline-variant/20 shrink-0 print:hidden">
        <button
          type="button"
          onClick={handleCloseClick}
          autofocus
          className="px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-container-high text-on-surface text-body-sm font-medium transition-all cursor-pointer"
        >
          Close
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-container-high text-on-surface text-body-sm font-medium transition-all border border-outline-variant/30 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-[18px] h-[18px]"
            >
              <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
            </svg>
            <span>Print Voucher</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-body-sm font-medium transition-all shadow-sm cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-[18px] h-[18px]"
            >
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
