"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AccessibleModal } from "@/components/ui/AccessibleModal";
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Eye,
  Mail,
  ArrowLeft,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface TeamMember {
  userId: string;
  name?: string;
  email?: string;
  role: "owner" | "admin" | "member" | "viewer";
  joinedAt: string;
}

interface TeamInvite {
  id: string;
  email: string;
  role: "admin" | "member" | "viewer";
  expiresAt: string;
  createdAt: string;
}

export default function TeamManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [userRole, setUserRole] = useState<string>("viewer");
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">(
    "member",
  );
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function loadTeam() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/team");
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error("Team unavailable");
      if (result.success && result.data) {
        setMembers(result.data.members || []);
        setInvites(result.data.invites || []);
        setUserRole(result.data.role || "viewer");
        setIsDemo(Boolean(result.isDemo));
      }
    } catch (err) {
      console.error(err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, []);

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setInviteMessage(null);

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setInviteMessage({
          type: "error",
          text: data.error || "Failed to create invitation",
        });
        return;
      }

      setInviteMessage({
        type: "success",
        text:
          data.message ||
          `Invitation created for ${inviteEmail}. Email was not sent.`,
      });
      setInviteEmail("");
      loadTeam();
      setTimeout(() => {
        setIsInviteOpen(false);
        setInviteMessage(null);
      }, 1500);
    } catch {
      setInviteMessage({
        type: "error",
        text: "Network error creating invitation",
      });
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Are you sure you want to remove this team member?")) return;

    try {
      const res = await fetch(
        `/api/team?userId=${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "Failed to remove member");
        return;
      }

      loadTeam();
    } catch {
      alert("Network error removing member");
    }
  }

  const canManageTeam =
    !isDemo && (userRole === "owner" || userRole === "admin");

  const roleColors: Record<string, { badge: string; icon: React.ReactNode }> = {
    owner: {
      badge: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />,
    },
    admin: {
      badge: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      icon: <Shield className="w-3.5 h-3.5 text-blue-400" />,
    },
    member: {
      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
    },
    viewer: {
      badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      icon: <Eye className="w-3.5 h-3.5 text-amber-400" />,
    },
  };

  if (loading)
    return (
      <div className="workspace-page">
        <header className="workspace-page-heading">
          <div>
            <p className="workspace-caption">04 / Team & access</p>
            <h1>People & permissions.</h1>
          </div>
        </header>
        <div className="workspace-loading" role="status">
          Loading team…
          <div />
          <div />
        </div>
      </div>
    );
  if (loadError)
    return (
      <div className="workspace-page workspace-empty" role="alert">
        <h2>Team couldn’t load.</h2>
        <p>Check your connection and try again.</p>
        <button className="ws-button" onClick={loadTeam}>
          Try again
        </button>
      </div>
    );
  return (
    <div className="workspace-secondary team-workspace">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Link
            href="/dashboard"
            className="hover:text-white flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Vendor register
          </Link>
          <span>/</span>
          <span className="text-gray-200">Team & access</span>
        </div>

        {/* Demo Notification */}
        {isDemo ? (
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-sm text-blue-100">
            <strong>Sample Workspace Roster:</strong> Viewing fictional ACME
            team members. Team seat invites and role management require an
            authenticated workspace account.
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100 flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>
              <strong>Your organization.</strong> Access is controlled by the
              roles below.
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-800">
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              04 / Team & access
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
              People &amp; permissions.
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Manage the people who can read and maintain your vendor records.
            </p>
          </div>

          <button
            onClick={() => setIsInviteOpen(true)}
            disabled={!canManageTeam}
            title={
              isDemo
                ? "Invites disabled in public demo"
                : !canManageTeam
                  ? "Only owners and admins can invite members"
                  : "Invite a new team member"
            }
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 hover:scale-[1.02] disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <UserPlus className="w-4 h-4" />
            {isDemo ? "Demo Roster" : "Invite Team Member"}
          </button>
        </div>

        {loading && (
          <div className="workspace-loading" role="status">
            Loading team…
            <div />
          </div>
        )}
        {loadError && (
          <div className="workspace-empty" role="alert">
            <h2>Team couldn’t load.</h2>
            <button className="ws-button" onClick={loadTeam}>
              Try again
            </button>
          </div>
        )}
        {/* Member roster */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-bold text-white">
                Active Members ({members.length})
              </h2>
            </div>
            <span className="text-xs text-gray-400">
              Role: <strong className="text-white uppercase">{userRole}</strong>
            </span>
          </div>

          <div className="overflow-x-auto border border-gray-800 rounded-xl">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-950 text-gray-400 uppercase font-semibold text-[10px] border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 bg-gray-950/40">
                {!loading &&
                  !loadError &&
                  members.map((member) => (
                    <tr key={member.userId}>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {member.name ||
                            (member.email
                              ? member.email.split("@")[0]
                              : "Team Member")}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {member.email || member.userId}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${
                            roleColors[member.role]?.badge ||
                            "bg-gray-800 text-gray-300"
                          }`}
                        >
                          {roleColors[member.role]?.icon}
                          <span className="capitalize">{member.role}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {new Date(member.joinedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canManageTeam && member.role !== "owner" ? (
                          <button
                            onClick={() => handleRemoveMember(member.userId)}
                            className="text-rose-400 hover:text-rose-300 transition-colors p-1"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-gray-600 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Invites (if any) */}
        {invites.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">
                Pending Invitations ({invites.length})
              </h2>
            </div>

            <div className="overflow-x-auto border border-gray-800 rounded-xl">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-950 text-gray-400 uppercase font-semibold text-[10px] border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-4">Invited Email</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 bg-gray-950/40">
                  {invites.map((invite) => (
                    <tr key={invite.id}>
                      <td className="py-3 px-4 font-semibold text-white">
                        {invite.email}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${
                            roleColors[invite.role]?.badge ||
                            "bg-gray-800 text-gray-300"
                          }`}
                        >
                          <span className="capitalize">{invite.role}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Role Permissions Reference */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3 text-xs text-gray-400">
          <h3 className="font-semibold text-white text-sm">
            Role Permissions Summary
          </h3>
          <div className="role-reference">
            <div className="space-y-1 bg-gray-950/60 p-3.5 rounded-xl border border-gray-800/80">
              <div className="font-bold text-blue-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Admin / Owner
              </div>
              <p>
                Full control: add/edit/delete vendors, company settings, and
                team invites.
              </p>
            </div>
            <div className="space-y-1 bg-gray-950/60 p-3.5 rounded-xl border border-gray-800/80">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Member
              </div>
              <p>
                Operational control: add and update sub-processor records and
                export compliance reports.
              </p>
            </div>
            <div className="space-y-1 bg-gray-950/60 p-3.5 rounded-xl border border-gray-800/80">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Viewer / Auditor
              </div>
              <p>
                Read-only access: inspect vendor registers and review recorded
                activity without editing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      <AccessibleModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite team member"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          <div>
            <label
              htmlFor="page-field-1"
              className="block text-xs font-semibold text-gray-300 mb-1.5"
            >
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
              <input
                aria-label="Work email address"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Access Role
            </label>
            <select
              id="page-field-1"
              aria-label="Access role"
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "admin" | "member" | "viewer")
              }
              className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="member">Member (Can add and edit vendors)</option>
              <option value="viewer">Viewer (Auditor read-only access)</option>
              <option value="admin">
                Admin (Can manage settings and team)
              </option>
            </select>
          </div>

          {inviteMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                inviteMessage.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
              }`}
            >
              {inviteMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{inviteMessage.text}</span>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="px-4 py-2 bg-gray-950 hover:bg-gray-800 border border-gray-800 text-gray-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviteLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5 disabled:bg-gray-800 disabled:text-gray-500"
            >
              {inviteLoading && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              Create Invitation
            </button>
          </div>
        </form>
      </AccessibleModal>
    </div>
  );
}
