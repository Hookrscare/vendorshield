import { TenantAuthContext } from "@/lib/insforge/context";
import { AuthorizationError } from "@/lib/insforge/repository";
import { OrganizationRole } from "@/lib/insforge/database.types";

export interface TeamMember {
  userId: string;
  email?: string;
  name?: string;
  role: OrganizationRole;
  joinedAt: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: "admin" | "member" | "viewer";
  expiresAt: string;
  createdAt: string;
}

export const InsForgeTeamRepository = {
  async getTeamRoster(context: TenantAuthContext): Promise<{
    members: TeamMember[];
    invites: TeamInvite[];
  }> {
    const [membersRes, invitesRes] = await Promise.all([
      context.client.database
        .from("organization_members")
        .select("user_id, role, created_at")
        .eq("organization_id", context.organization.id)
        .order("created_at", { ascending: true }),
      context.client.database
        .from("organization_invites")
        .select("id, email, role, expires_at, created_at")
        .eq("organization_id", context.organization.id)
        .order("created_at", { ascending: false }),
    ]);

    if (membersRes.error) {
      throw new Error(`Failed to load team members: ${membersRes.error.message}`);
    }

    const memberRows = membersRes.data as unknown as Array<{
      user_id: string;
      role: OrganizationRole;
      created_at: string;
    }>;

    const members: TeamMember[] = memberRows.map((m) => ({
      userId: m.user_id,
      role: m.role,
      joinedAt: m.created_at,
      name: m.user_id === context.user.id ? "You" : undefined,
      email: m.user_id === context.user.id ? context.user.email : undefined,
    }));

    const inviteRows = (invitesRes.data as unknown as Array<{
      id: string;
      email: string;
      role: "admin" | "member" | "viewer";
      expires_at: string;
      created_at: string;
    }>) || [];

    const invites: TeamInvite[] = inviteRows.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      expiresAt: i.expires_at,
      createdAt: i.created_at,
    }));

    return { members, invites };
  },

  async inviteTeamMember(
    context: TenantAuthContext,
    email: string,
    role: "admin" | "member" | "viewer"
  ): Promise<TeamInvite> {
    if (context.role !== "owner" && context.role !== "admin") {
      throw new AuthorizationError(
        "Only organization owners and admins can invite team members",
        403
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error("Enter a valid email address");
    }

    if (!["admin", "member", "viewer"].includes(role)) {
      throw new Error("Invalid role specified");
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

    const { data, error } = await context.client.database.rpc("create_team_invite", {
      target_org_id: context.organization.id,
      invite_email: normalizedEmail,
      invite_role: role,
      invite_token: token,
      invite_expires_at: expiresAt,
    });

    if (error) {
      // Fallback to table insert if RPC unapplied
      const { data: insertData, error: insertError } = await context.client.database
        .from("organization_invites")
        .upsert([
          {
            organization_id: context.organization.id,
            email: normalizedEmail,
            role,
            invited_by: context.user.id,
            token,
            expires_at: expiresAt,
          },
        ])
        .select("id, email, role, expires_at, created_at")
        .single();

      if (insertError || !insertData) {
        throw new Error(
          `Failed to create invite: ${insertError?.message || error.message}`
        );
      }

      return {
        id: insertData.id,
        email: insertData.email,
        role: insertData.role,
        expiresAt: insertData.expires_at,
        createdAt: insertData.created_at,
      };
    }

    const invite = data as unknown as {
      id: string;
      email: string;
      role: "admin" | "member" | "viewer";
      expiresAt: string;
      createdAt: string;
    };

    return invite;
  },

  async removeTeamMember(
    context: TenantAuthContext,
    targetUserId: string
  ): Promise<boolean> {
    if (context.role !== "owner" && context.role !== "admin") {
      throw new AuthorizationError(
        "Only organization owners and admins can remove team members",
        403
      );
    }

    if (targetUserId === context.user.id && context.role === "owner") {
      throw new Error("Organization owners cannot remove themselves");
    }

    const { data, error } = await context.client.database.rpc("remove_team_member", {
      target_org_id: context.organization.id,
      target_user_id: targetUserId,
    });

    if (error) {
      // Fallback to direct delete if RPC not applied
      const { error: deleteError } = await context.client.database
        .from("organization_members")
        .delete()
        .eq("organization_id", context.organization.id)
        .eq("user_id", targetUserId);

      if (deleteError) {
        throw new Error(`Failed to remove team member: ${deleteError.message}`);
      }

      return true;
    }

    return Boolean(data);
  },
};
