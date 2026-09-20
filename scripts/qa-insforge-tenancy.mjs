import { createAdminClient, createClient } from "@insforge/sdk";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(".insforge/project.json", "utf8"));
const appBase = process.env.QA_APP_URL || "https://vendorshield-blond.vercel.app";
const tag = Date.now().toString(36);
const password = `Qa-${randomBytes(18).toString("base64url")}!9`;
const organizationIds = [];
const checks = [];
const adminHeaders = {
  authorization: `Bearer ${config.api_key}`,
  "content-type": "application/json",
};

const admin = () =>
  createAdminClient({ baseUrl: config.oss_host, apiKey: config.api_key });

async function listUsers() {
  const response = await fetch(`${config.oss_host}/api/auth/users?limit=100`, {
    headers: adminHeaders,
  });
  const body = await response.json();
  return body.data || body.users || [];
}

async function createSyntheticUser(role) {
  const email = `qa-${role}-${tag}@example.com`;
  const creation = await admin().auth.signUp({
    email,
    password,
    name: `QA ${role}`,
    autoConfirm: true,
  });
  if (creation.error) throw new Error(`create ${role}: ${creation.error.message}`);

  const user = (await listUsers()).find((candidate) => candidate.email === email);
  if (!user) throw new Error(`create ${role}: user not listed`);

  const session = await createClient({ baseUrl: config.oss_host }).auth.signInWithPassword({
    email,
    password,
  });
  if (session.error || !session.data?.accessToken) {
    throw new Error(`sign in ${role}: ${session.error?.message || "missing session"}`);
  }

  return { id: user.id, token: session.data.accessToken };
}

async function appRequest(user, path, init = {}, organizationId) {
  const headers = new Headers(init.headers || {});
  headers.set("cookie", `insforge_access_token=${user.token}`);
  if (organizationId) headers.set("x-organization-id", organizationId);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(appBase + path, { ...init, headers });
  let body = null;
  try {
    body = await response.json();
  } catch {}
  return { status: response.status, body };
}

function expectStatus(name, response, expected) {
  const ok = expected.includes(response.status);
  checks.push({ name, status: response.status, expected: expected.join("|"), ok });
  if (!ok) {
    throw new Error(
      `${name}: expected ${expected.join("|")}, got ${response.status} ${JSON.stringify(response.body)}`
    );
  }
  return response.body;
}

try {
  const owner = await createSyntheticUser("owner");
  const adminUser = await createSyntheticUser("admin");
  const member = await createSyntheticUser("member");
  const viewer = await createSyntheticUser("viewer");
  const secondOwner = await createSyntheticUser("owner2");

  const alphaName = `QA Alpha ${tag}`;
  const betaName = `QA Beta ${tag}`;
  const alphaSlug = alphaName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const alpha = expectStatus(
    "owner onboarding",
    await appRequest(owner, "/api/onboarding", {
      method: "POST",
      body: JSON.stringify({ name: alphaName }),
    }),
    [201]
  );
  organizationIds.push(alpha.organizationId);

  const beta = expectStatus(
    "second tenant onboarding",
    await appRequest(secondOwner, "/api/onboarding", {
      method: "POST",
      body: JSON.stringify({ name: betaName }),
    }),
    [201]
  );
  organizationIds.push(beta.organizationId);

  const memberships = await admin().database.from("organization_members").insert([
    { organization_id: alpha.organizationId, user_id: adminUser.id, role: "admin" },
    { organization_id: alpha.organizationId, user_id: member.id, role: "member" },
    { organization_id: alpha.organizationId, user_id: viewer.id, role: "viewer" },
  ]);
  if (memberships.error) throw new Error(`membership setup: ${memberships.error.message}`);

  const alphaVendor = expectStatus(
    "owner creates vendor",
    await appRequest(
      owner,
      "/api/vendors",
      {
        method: "POST",
        body: JSON.stringify({
          name: "QA Alpha Vendor",
          category: "Cloud Infrastructure",
          website: "https://example.com",
          notes: "private qa note",
        }),
      },
      alpha.organizationId
    ),
    [201]
  );
  const alphaVendorId = alphaVendor.data?.id || alphaVendor.vendor?.id || alphaVendor.id;
  if (!alphaVendorId) throw new Error("owner vendor id missing");

  expectStatus(
    "member creates vendor",
    await appRequest(
      member,
      "/api/vendors",
      {
        method: "POST",
        body: JSON.stringify({
          name: "QA Member Vendor",
          category: "Analytics",
          website: "https://example.com",
        }),
      },
      alpha.organizationId
    ),
    [201]
  );
  expectStatus(
    "viewer reads vendors",
    await appRequest(viewer, "/api/vendors", {}, alpha.organizationId),
    [200]
  );
  expectStatus(
    "viewer blocked from vendor create",
    await appRequest(
      viewer,
      "/api/vendors",
      {
        method: "POST",
        body: JSON.stringify({ name: "Forbidden Viewer Vendor", category: "Other" }),
      },
      alpha.organizationId
    ),
    [403]
  );

  expectStatus(
    "admin updates company",
    await appRequest(
      adminUser,
      "/api/company",
      {
        method: "PUT",
        body: JSON.stringify({
          name: `QA Alpha Updated ${tag}`,
          privacyEmail: "privacy@example.com",
          autoSyncPublicPage: true,
        }),
      },
      alpha.organizationId
    ),
    [200]
  );
  expectStatus(
    "viewer blocked from company update",
    await appRequest(
      viewer,
      "/api/company",
      { method: "PUT", body: JSON.stringify({ name: "Forbidden Rename" }) },
      alpha.organizationId
    ),
    [403]
  );
  expectStatus(
    "admin creates invitation",
    await appRequest(
      adminUser,
      "/api/team",
      {
        method: "POST",
        body: JSON.stringify({ email: `qa-invite-${tag}@example.com`, role: "viewer" }),
      },
      alpha.organizationId
    ),
    [200]
  );
  expectStatus(
    "viewer blocked from invitation",
    await appRequest(
      viewer,
      "/api/team",
      {
        method: "POST",
        body: JSON.stringify({ email: `qa-forbidden-${tag}@example.com`, role: "viewer" }),
      },
      alpha.organizationId
    ),
    [403]
  );

  const betaVendor = expectStatus(
    "second tenant creates vendor",
    await appRequest(
      secondOwner,
      "/api/vendors",
      {
        method: "POST",
        body: JSON.stringify({
          name: "QA Beta Vendor",
          category: "Payments",
          website: "https://example.com",
        }),
      },
      beta.organizationId
    ),
    [201]
  );
  const betaVendorId = betaVendor.data?.id || betaVendor.vendor?.id || betaVendor.id;
  if (!betaVendorId) throw new Error("second vendor id missing");

  expectStatus(
    "cross-tenant vendor id is concealed",
    await appRequest(owner, `/api/vendors/${betaVendorId}`, {}, alpha.organizationId),
    [404]
  );
  expectStatus(
    "reverse cross-tenant vendor id is concealed",
    await appRequest(secondOwner, `/api/vendors/${alphaVendorId}`, {}, beta.organizationId),
    [404]
  );

  const publicResponse = await fetch(`${appBase}/api/public/${alphaSlug}`);
  const publicBody = await publicResponse.json();
  expectStatus(
    "public projection loads",
    { status: publicResponse.status, body: publicBody },
    [200]
  );
  const serialized = JSON.stringify(publicBody);
  const projectionSafe =
    !serialized.includes("private qa note") &&
    !serialized.includes("created_by") &&
    !serialized.includes("createdBy");
  checks.push({
    name: "public projection excludes private fields",
    status: projectionSafe ? 200 : 500,
    expected: "200",
    ok: projectionSafe,
  });
  if (!projectionSafe) throw new Error("public projection leaked a private field");

  const audit = await admin().database
    .from("audit_events")
    .select("action, entity_type")
    .eq("organization_id", alpha.organizationId);
  if (audit.error) throw new Error(`audit read: ${audit.error.message}`);
  const actions = new Set((audit.data || []).map((row) => row.action));
  const auditOk =
    actions.has("VENDOR_ADDED") && actions.has("COMPANY_SETTINGS_UPDATED");
  checks.push({
    name: "immutable audit triggers recorded writes",
    status: auditOk ? 200 : 500,
    expected: "200",
    ok: auditOk,
  });
  if (!auditOk) throw new Error("expected audit actions missing");

  console.log(JSON.stringify({ outcome: "passed", checks }, null, 2));
} finally {
  if (organizationIds.length) {
    const deletion = await admin().database
      .from("organizations")
      .delete()
      .in("id", organizationIds);
    if (deletion.error) console.error("cleanup organizations failed");
  }

  const syntheticIds = (await listUsers())
    .filter((user) => /^qa-.*@example\.com$/i.test(user.email || ""))
    .map((user) => user.id);
  if (syntheticIds.length) {
    const deletion = await fetch(`${config.oss_host}/api/auth/users`, {
      method: "DELETE",
      headers: adminHeaders,
      body: JSON.stringify({ userIds: syntheticIds }),
    });
    if (!deletion.ok) console.error(`cleanup users failed status=${deletion.status}`);
  }

  const organizationCount = await admin().database
    .from("organizations")
    .select("id", { count: "exact", head: true });
  const remainingSyntheticUsers = (await listUsers()).filter((user) =>
    /^qa-.*@example\.com$/i.test(user.email || "")
  ).length;
  console.log(
    JSON.stringify({
      cleanup: {
        organizationsRemaining: organizationCount.count ?? null,
        syntheticUsersRemaining: remainingSyntheticUsers,
      },
    })
  );
}
