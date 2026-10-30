"use client";

import { useActionState } from "react";
import type { AllowedUser } from "@/lib/auth/allowed-users";
import {
  addTeamMember,
  updateTeamMemberRole,
  toggleTeamMemberStatus,
  removeTeamMember,
  type TeamActionState,
} from "@/app/actions/team";

const initialState: TeamActionState = {};

export function TeamManagement({
  currentUserEmail,
  members,
}: {
  currentUserEmail: string;
  members: AllowedUser[];
}) {
  const [state, action, pending] = useActionState(addTeamMember, initialState);

  return (
    <div className="space-y-8">
      {/* Add New Team Member Form */}
      <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Add New Team Member</h2>
          <p className="text-xs text-gray-500">
            Authorise a colleague to access the Leave &amp; Overtime system. They will be able to set their own password and sign in immediately.
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                System Role
              </label>
              <select
                id="role"
                name="role"
                defaultValue="staff"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
              >
                <option value="staff">Staff (Can apply for leave &amp; overtime)</option>
                <option value="approver">Approver (Can approve/reject claims &amp; manage team)</option>
              </select>
            </div>
          </div>

          {state.error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700"
            >
              {state.error}
            </p>
          )}

          {state.success && (
            <p
              role="status"
              className="rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-800"
            >
              {state.success}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-dark disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add Team Member"}
          </button>
        </form>
      </section>

      {/* Team Roster & Permissions Table */}
      <section className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-black/5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Team Directory &amp; Permissions</h2>
            <p className="text-xs text-gray-500">
              Manage system permissions, toggle access, or remove departed team members.
            </p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
            {members.length} Total Members
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-3 pr-4 font-semibold">Name &amp; Email</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member) => {
                const isSelf = member.email.toLowerCase() === currentUserEmail.toLowerCase();

                return (
                  <tr key={member.email} className={!member.is_active ? "opacity-60 bg-gray-50" : ""}>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {member.full_name || member.email}
                        </span>
                        {isSelf && (
                          <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
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
                          className={`rounded-md border text-xs px-2 py-1 font-semibold focus:outline-none ${
                            member.role === "approver"
                              ? "border-brand/40 bg-brand/10 text-brand-dark"
                              : "border-gray-200 bg-gray-50 text-gray-700"
                          }`}
                        >
                          <option value="staff">Staff</option>
                          <option value="approver">Approver</option>
                        </select>
                      </form>
                    </td>

                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          member.is_active
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {member.is_active ? "Active" : "Deactivated"}
                      </span>
                    </td>

                    <td className="px-3 py-3.5 text-right space-x-2">
                      {!isSelf && (
                        <>
                          <form action={toggleTeamMemberStatus} className="inline-block">
                            <input type="hidden" name="email" value={member.email} />
                            <input
                              type="hidden"
                              name="is_active"
                              value={member.is_active ? "false" : "true"}
                            />
                            <button
                              type="submit"
                              className="rounded border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100"
                            >
                              {member.is_active ? "Deactivate" : "Reactivate"}
                            </button>
                          </form>

                          <form action={removeTeamMember} className="inline-block">
                            <input type="hidden" name="email" value={member.email} />
                            <button
                              type="submit"
                              onClick={(e) => {
                                if (
                                  !confirm(
                                    `Are you sure you want to remove ${member.full_name || member.email}?`
                                  )
                                ) {
                                  e.preventDefault();
                                }
                              }}
                              className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100"
                            >
                              Remove
                            </button>
                          </form>
                        </>
                      )}
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
