"use client";

import { useActionState, useState } from "react";
import { updateMyPassword, type PasswordUpdateState } from "@/app/login/actions";
import { KeyIcon, XCircleIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from "@/components/ui/icons";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs animate-in fade-in">
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
            </div>
            <div className="relative mt-1">
              <input
                id="modal_new_password"
                name="new_password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                className="block w-full rounded-xl border border-gray-300 px-3.5 pr-10 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="modal_confirm_password"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
            >
              Confirm Password
            </label>
            <div className="relative mt-1">
              <input
                id="modal_confirm_password"
                name="confirm_password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="Re-enter new password"
                className="block w-full rounded-xl border border-gray-300 px-3.5 pr-10 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
              />
            </div>
          </div>

          {state.error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700"
            >
              {state.error}
            </div>
          )}

          {state.success && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800 flex items-center gap-1.5"
            >
              <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
              <span>{state.success}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-brand-dark focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:outline-none disabled:opacity-60"
            >
              {pending ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
