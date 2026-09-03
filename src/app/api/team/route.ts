import { NextRequest, NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/insforge/context";
import { InsForgeTeamRepository } from "@/lib/insforge/team";
import { AuthorizationError } from "@/lib/insforge/repository";

export async function GET(request: NextRequest) {
  try {
    const authResult = await resolveTenantContext(request);

    // Fallback to demo roster if in demo mode
    if (!authResult.success) {
      return NextResponse.json({
        success: true,
        isDemo: true,
        data: {
          members: [
            {
              userId: "demo-owner-1",
              name: "Sarah Jenkins",
              email: "sarah@acme-saas.com",
              role: "owner",
              joinedAt: "2026-01-15T09:00:00Z",
            },
            {
              userId: "demo-admin-1",
              name: "Alex Rivera",
              email: "alex@acme-saas.com",
              role: "admin",
              joinedAt: "2026-02-01T14:30:00Z",
            },
            {
              userId: "demo-viewer-1",
              name: "External SOC 2 Auditor",
              email: "auditor@deloitte-audit.com",
              role: "viewer",
              joinedAt: "2026-03-01T10:00:00Z",
            },
          ],
          invites: [],
          role: "owner",
        },
      });
    }

    const roster = await InsForgeTeamRepository.getTeamRoster(authResult.context);

    return NextResponse.json({
      success: true,
      isDemo: false,
      data: {
        ...roster,
        role: authResult.context.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to load team roster" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await resolveTenantContext(request);

    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Team member invitations require an authenticated workspace account",
        },
        { status: 403 }
      );
    }

    const { email, role } = await request.json();
    if (!email || !role) {
      return NextResponse.json(
        { success: false, error: "Email and role are required" },
        { status: 400 }
      );
    }

    const invite = await InsForgeTeamRepository.inviteTeamMember(
      authResult.context,
      email,
      role
    );

    return NextResponse.json({
      success: true,
      data: invite,
      message: `Invitation sent to ${email}`,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to invite member",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await resolveTenantContext(request);

    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Removing members requires an authenticated workspace account",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Target userId is required" },
        { status: 400 }
      );
    }

    const removed = await InsForgeTeamRepository.removeTeamMember(
      authResult.context,
      userId
    );

    return NextResponse.json({
      success: true,
      removed,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to remove member",
      },
      { status: 500 }
    );
  }
}
