"use client";

import { useActionState, useState } from "react";
import { updateMyPassword, type PasswordUpdateState } from "@/app/login/actions";
import { KeyIcon, XCircleIcon } from "@/components/ui/icons";

const initialState: PasswordUpdateState = {};

export function ChangePasswordModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(updateMyPassword, initialState);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <KeyIcon className="h-5 w-5 text-brand" />
            <h3 className="text-base font-bold text-gray-900">Change Password</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>

        <form action={action} className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="modal_new_password"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
              >
                New Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="text-[11px] text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="modal_new_password"
              name="new_password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="modal_confirm_password"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
            >
              Confirm Password
            </label>
            <input
              id="modal_confirm_password"
              name="confirm_password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              placeholder="Re-enter new password"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
            />
          </div>

          {state.error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700"
            >
              {state.error}
            </div>
          )}

          {state.success && (
            <div
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800"
            >
              {state.success}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              {state.success ? "Done" : "Cancel"}
            </button>
            {!state.success && (
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-brand px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-dark disabled:opacity-60"
              >
                {pending ? "Saving..." : "Update Password"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
