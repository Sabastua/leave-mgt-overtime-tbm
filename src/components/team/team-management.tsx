"use client";

import { useActionState, useState } from "react";
import type { AllowedUser } from "@/lib/auth/allowed-users";
import {
  addTeamMember,
  resetTeamMemberPassword,
  updateTeamMemberRole,
  toggleTeamMemberStatus,
  removeTeamMember,
  type TeamActionState,
} from "@/app/actions/team";
import {
  UsersIcon,
  PlusIcon,
  KeyIcon,
  TrashIcon,
  ShieldCheckIcon,
} from "@/components/ui/icons";

const initialAddState: TeamActionState = {};
const initialResetState: TeamActionState = {};

export function TeamManagement({
  currentUserEmail,
  members,
}: {
  currentUserEmail: string;
  members: AllowedUser[];
}) {
  const [addState, addAction, addPending] = useActionState(addTeamMember, initialAddState);
  const [resetState, resetAction, resetPending] = useActionState(
    resetTeamMemberPassword,
    initialResetState
  );

  const [activePasswordResetEmail, setActivePasswordResetEmail] = useState<string | null>(
    null
  );

  return (
    <div className="space-y-8">
      {/* Add New Team Member Form */}
      <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PlusIcon className="h-5 w-5 text-brand" />
              <h2 className="text-lg font-bold text-gray-900">Add New Team Member</h2>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Create and provision credentials for a colleague. They can log in immediately with the assigned Safaricom email and password.
            </p>
          </div>
        </div>

        <form action={addAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="full_name"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                Full Name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                placeholder="e.g. Jane Doe"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                Safaricom Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="jdoe@safaricom.co.ke"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                Role
              </label>
              <select
                id="role"
                name="role"
                defaultValue="staff"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
              >
                <option value="staff">Staff (Leave &amp; Overtime)</option>
                <option value="approver">Approver / Manager</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                Initial Password
              </label>
              <input
                id="password"
                name="password"
                type="text"
                required
                minLength={6}
                placeholder="Min 6 characters"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
              />
            </div>
          </div>

          {addState.error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"
            >
              {addState.error}
            </div>
          )}

          {addState.success && (
            <div
              role="status"
              className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs font-medium text-green-700"
            >
              {addState.success}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={addPending}
              className="rounded-lg bg-brand px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-dark focus:ring-2 focus:ring-brand disabled:opacity-60"
            >
              {addPending ? "Provisioning..." : "Add & Provision Member"}
            </button>
          </div>
        </form>
      </section>

      {/* Password Reset Modal / Drawer */}
      {activePasswordResetEmail && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyIcon className="h-5 w-5 text-blue-700" />
              <h3 className="text-sm font-bold text-gray-900">
                Reset Password for {activePasswordResetEmail}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActivePasswordResetEmail(null)}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          <form action={resetAction} className="space-y-3">
            <input type="hidden" name="email" value={activePasswordResetEmail} />
            <div className="max-w-md">
              <label
                htmlFor="new_password"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                New Password (minimum 6 characters)
              </label>
              <input
                id="new_password"
                name="new_password"
                type="text"
                required
                minLength={6}
                placeholder="Enter new password"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:outline-none"
              />
            </div>

            {resetState.error && (
              <p className="text-xs text-red-600 font-medium">{resetState.error}</p>
            )}
            {resetState.success && (
              <p className="text-xs text-green-700 font-medium">{resetState.success}</p>
            )}

            <button
              type="submit"
              disabled={resetPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-60"
            >
              {resetPending ? "Updating Password..." : "Save New Password"}
            </button>
          </form>
        </section>
      )}

      {/* Team Roster Management Table */}
      <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-brand" />
            <h2 className="text-lg font-bold text-gray-900">
              Team Directory &amp; Credentials ({members.length})
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            {members.filter((m) => m.is_active).length} active members
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <th className="py-3 pr-4">Team Member</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member) => {
                const isSelf =
                  member.email.toLowerCase() === currentUserEmail.toLowerCase();

                return (
                  <tr key={member.email} className="hover:bg-gray-50/50">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {member.full_name || member.email}
                        </span>
                        {isSelf && (
                          <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400">{member.email}</div>
                    </td>

                    <td className="px-3 py-3.5">
                      <form action={updateTeamMemberRole} className="inline-block">
                        <input type="hidden" name="email" value={member.email} />
                        <select
                          name="role"
                          defaultValue={member.role}
                          onChange={(e) => e.target.form?.requestSubmit()}
                          disabled={isSelf}
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 shadow-2xs focus:border-brand focus:outline-none disabled:opacity-60"
                        >
                          <option value="staff">Staff</option>
                          <option value="approver">Approver</option>
                        </select>
                      </form>
                    </td>

                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          member.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            member.is_active ? "bg-emerald-500" : "bg-gray-400"
                          }`}
                        />
                        {member.is_active ? "Active" : "Deactivated"}
                      </span>
                    </td>

                    <td className="px-3 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {/* Reset Password Button */}
                        <button
                          type="button"
                          onClick={() => setActivePasswordResetEmail(member.email)}
                          className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                        >
                          <KeyIcon className="h-3.5 w-3.5 text-gray-500" />
                          <span>Reset Password</span>
                        </button>

                        {/* Toggle Active/Inactive */}
                        {!isSelf && (
                          <form action={toggleTeamMemberStatus} className="inline-block">
                            <input type="hidden" name="email" value={member.email} />
                            <input
                              type="hidden"
                              name="is_active"
                              value={member.is_active ? "false" : "true"}
                            />
                            <button
                              type="submit"
                              className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
                                member.is_active
                                  ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              }`}
                            >
                              {member.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </form>
                        )}

                        {/* Delete member */}
                        {!isSelf && (
                          <form
                            action={removeTeamMember}
                            onSubmit={(e) => {
                              if (
                                !confirm(
                                  `Are you sure you want to remove ${member.full_name || member.email}?`
                                )
                              ) {
                                e.preventDefault();
                              }
                            }}
                            className="inline-block"
                          >
                            <input type="hidden" name="email" value={member.email} />
                            <button
                              type="submit"
                              title="Delete member"
                              className="rounded-md border border-red-200 p-1 text-red-600 transition hover:bg-red-50"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
