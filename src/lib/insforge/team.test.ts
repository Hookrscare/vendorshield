import { describe, it, expect, vi } from "vitest";
import { InsForgeTeamRepository } from "./team";
import { TenantAuthContext } from "./context";
import { AuthorizationError } from "./repository";

function createMockContext(role: "owner" | "admin" | "member" | "viewer"): TenantAuthContext {
  return {
    user: { id: "user-1", email: "admin@example.com" },
    organization: { id: "org-1", name: "Acme", slug: "acme" },
    role,
    client: {
      database: {
        from: vi.fn((table: string) => {
          if (table === "organization_members") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [
                  { user_id: "user-1", role: "owner", created_at: "2026-01-01" },
                  { user_id: "user-2", role: "member", created_at: "2026-01-02" },
                ],
                error: null,
              }),
              delete: vi.fn().mockReturnThis(),
            };
          }
          if (table === "organization_invites") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "inv-1",
                    email: "invitee@example.com",
                    role: "viewer",
                    expires_at: "2026-02-01",
                    created_at: "2026-01-20",
                  },
                ],
                error: null,
              }),
              upsert: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "inv-2",
                  email: "new@example.com",
                  role: "member",
                  expires_at: "2026-02-10",
                  created_at: "2026-02-03",
                },
                error: null,
              }),
            };
          }
          return {} as any;
        }),
        rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      },
    } as any,
  };
}

describe("InsForgeTeamRepository (QA-107)", () => {
  it("fetches team roster and maps members and pending invites", async () => {
    const context = createMockContext("owner");
    const result = await InsForgeTeamRepository.getTeamRoster(context);

    expect(result.members).toHaveLength(2);
    expect(result.members[0].role).toBe("owner");
    expect(result.members[0].name).toBe("You");
    expect(result.invites).toHaveLength(1);
    expect(result.invites[0].email).toBe("invitee@example.com");
  });

  it("prohibits viewer and member roles from creating invitations", async () => {
    const viewerContext = createMockContext("viewer");
    await expect(
      InsForgeTeamRepository.inviteTeamMember(viewerContext, "test@example.com", "member")
    ).rejects.toThrowError(AuthorizationError);

    const memberContext = createMockContext("member");
    await expect(
      InsForgeTeamRepository.inviteTeamMember(memberContext, "test@example.com", "member")
    ).rejects.toThrowError(AuthorizationError);
  });

  it("validates invite email syntax", async () => {
    const adminContext = createMockContext("admin");
    await expect(
      InsForgeTeamRepository.inviteTeamMember(adminContext, "invalid-email", "member")
    ).rejects.toThrow("valid email");
  });

  it("allows admin to invite new members with valid roles", async () => {
    const adminContext = createMockContext("admin");
    const invite = await InsForgeTeamRepository.inviteTeamMember(
      adminContext,
      "developer@company.com",
      "member"
    );

    expect(invite).toBeDefined();
    expect(adminContext.client.database.rpc).toHaveBeenCalledWith(
      "create_team_invite",
      expect.objectContaining({
        invite_email: "developer@company.com",
        invite_role: "member",
      })
    );
  });

  it("prohibits viewer and member roles from removing members", async () => {
    const viewerContext = createMockContext("viewer");
    await expect(
      InsForgeTeamRepository.removeTeamMember(viewerContext, "user-2")
    ).rejects.toThrowError(AuthorizationError);
  });

  it("prevents owner from removing themselves", async () => {
    const ownerContext = createMockContext("owner");
    await expect(
      InsForgeTeamRepository.removeTeamMember(ownerContext, "user-1")
    ).rejects.toThrow("cannot remove themselves");
  });
});
