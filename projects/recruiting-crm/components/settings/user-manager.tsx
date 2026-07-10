"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
  isManager: boolean;
  createdAt: Date;
};

type Role = "basic" | "manager" | "admin";

interface Props {
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
  isManager: boolean;
}

function getRoleLabel(user: { isAdmin: boolean; isManager: boolean }): string {
  if (user.isAdmin) return "System Admin";
  if (user.isManager) return "Manager";
  return "Basic User";
}

function getRoleBadgeClass(user: { isAdmin: boolean; isManager: boolean }): string {
  if (user.isAdmin) return "bg-blue-50 text-blue-700 border-blue-200";
  if (user.isManager) return "bg-violet-50 text-violet-700 border-violet-200";
  return "bg-slate-50 text-slate-500 border-slate-200";
}

function getUserRole(user: { isAdmin: boolean; isManager: boolean }): Role {
  if (user.isAdmin) return "admin";
  if (user.isManager) return "manager";
  return "basic";
}

export function UserManager({ users: initialUsers, currentUserId, isAdmin, isManager }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [showAdd, setShowAdd] = useState(false);
  const [addError, setAddError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [roleState, setRoleState] = useState<Record<string, string>>({});

  const canManage = isAdmin || isManager;

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: (fd.get("name") as string).trim(),
        email: (fd.get("email") as string).trim(),
        password: fd.get("password") as string,
      }),
    });
    if (res.ok) {
      const newUser = await res.json();
      setUsers((prev) => [...prev, newUser]);
      setShowAdd(false);
      (e.target as HTMLFormElement).reset();
    } else {
      const data = await res.json().catch(() => ({}));
      setAddError(data.error ?? "Failed to add user.");
    }
  }

  async function patch(id: string, payload: { isActive?: boolean; password?: string }) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
    }
  }

  function handleToggle(user: User) {
    const action = user.isActive ? "deactivate" : "reactivate";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.name}?`)) return;
    startTransition(() => patch(user.id, { isActive: !user.isActive }));
  }

  function handleResetPassword(user: User) {
    const newPassword = prompt(`Enter new password for ${user.name} (min 8 characters):`);
    if (!newPassword) return;
    if (newPassword.length < 8) { alert("Password must be at least 8 characters."); return; }
    startTransition(() => patch(user.id, { password: newPassword }));
  }

  async function handleRoleChange(user: User, targetRole: Role) {
    setRoleState((prev) => ({ ...prev, [user.id]: "saving" }));
    const res = await fetch(`/api/users/${user.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: targetRole }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
      setRoleState((prev) => { const next = { ...prev }; delete next[user.id]; return next; });
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setRoleState((prev) => ({ ...prev, [user.id]: `error:${data.error ?? "Failed to update role."}` }));
    }
  }

  function availableRoles(user: User): Role[] {
    const current = getUserRole(user);
    if (isAdmin) return (["basic", "manager", "admin"] as Role[]).filter((r) => r !== current);
    if (isManager && !user.isAdmin) return (["basic", "manager"] as Role[]).filter((r) => r !== current);
    return [];
  }

  const adminCount = users.filter((u) => u.isAdmin && u.isActive).length;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="divide-y divide-slate-100 rounded border border-slate-200">
        {users.map((user) => {
          const rs = roleState[user.id] ?? "";
          const isSaving = rs === "saving";
          const errorMsg = rs.startsWith("error:") ? rs.slice(6) : "";
          const pendingRole = rs.startsWith("confirm:") ? (rs.slice(8) as Role) : null;
          const isLastAdmin = user.isAdmin && adminCount <= 1;
          const isSelf = user.id === currentUserId;
          const roles = availableRoles(user);
          const canChangeThisUser = canManage && roles.length > 0 && !(isLastAdmin && isSelf);

          return (
            <div key={user.id} className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-800">{user.name}</p>
                    {isSelf && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">you</span>
                    )}
                    {!user.isActive && (
                      <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">
                        Deactivated
                      </span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${getRoleBadgeClass(user)}`}>
                      {getRoleLabel(user)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                </div>

                {canManage && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleResetPassword(user)}
                      disabled={isPending || isSaving}
                      className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Reset password
                    </button>

                    {canChangeThisUser && (
                      <div className="flex items-center gap-1">
                        {isSaving ? (
                          <span className="text-xs text-slate-400 px-2 py-1">Saving…</span>
                        ) : pendingRole ? (
                          <>
                            <span className="text-xs text-amber-700">
                              Set to {pendingRole === "admin" ? "System Admin" : pendingRole === "manager" ? "Manager" : "Basic User"}?
                            </span>
                            <button
                              onClick={() => handleRoleChange(user, pendingRole)}
                              className="text-xs font-medium px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setRoleState((prev) => { const next = { ...prev }; delete next[user.id]; return next; })}
                              className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                setRoleState((prev) => ({ ...prev, [user.id]: `confirm:${e.target.value}` }));
                              }
                            }}
                            className="text-xs text-slate-500 border border-slate-200 rounded px-2 py-1 bg-white hover:bg-slate-50 cursor-pointer"
                          >
                            <option value="">Change role…</option>
                            {roles.map((r) => (
                              <option key={r} value={r}>
                                {r === "admin" ? "System Admin" : r === "manager" ? "Manager" : "Basic User"}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {!isSelf && (
                      <button
                        onClick={() => handleToggle(user)}
                        disabled={isPending || isSaving}
                        className={`text-xs rounded px-2 py-1 border disabled:opacity-50 ${
                          user.isActive
                            ? "text-red-600 border-red-200 hover:bg-red-50"
                            : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        }`}
                      >
                        {user.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
            </div>
          );
        })}
      </div>

      {canManage && showAdd ? (
        <form onSubmit={handleAdd} className="space-y-3 rounded border border-slate-200 p-4 bg-slate-50">
          <p className="text-sm font-medium text-slate-800">Add team member</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Full name</label>
              <input name="name" required className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input name="email" type="email" required className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Temporary password <span className="text-slate-400 font-normal">(min 8 characters — they can change it in Settings)</span>
            </label>
            <input name="password" type="password" required minLength={8} className="w-64 h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          {addError && <p className="text-sm text-red-600">{addError}</p>}
          <div className="flex gap-2">
            <button type="submit" className="h-8 px-4 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-700">Add member</button>
            <button type="button" onClick={() => { setShowAdd(false); setAddError(""); }} className="h-8 px-3 text-sm border border-slate-300 rounded hover:bg-slate-100">Cancel</button>
          </div>
        </form>
      ) : canManage ? (
        <button onClick={() => setShowAdd(true)} className="h-9 px-4 text-sm font-medium border border-slate-300 rounded hover:bg-slate-50 text-slate-700">
          + Add team member
        </button>
      ) : null}
    </div>
  );
}
