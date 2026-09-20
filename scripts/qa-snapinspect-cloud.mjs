import { createAdminClient, createClient } from "@insforge/sdk";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(".insforge/project.json", "utf8"));
const appBase = process.env.QA_APP_URL || "https://vendorshield-blond.vercel.app";
const tag = Date.now().toString(36);
const password = `Qa-${randomBytes(18).toString("base64url")}!9`;
const organizationIds = [];
const createdUserIds = [];
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

  createdUserIds.push(user.id);
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

const doc = {
 id: `qa-report-${tag}`, title: "QA private inspection", trade: "residential",
 inspectorName: "Synthetic Inspector", inspectorCompany: "QA", inspectorLicense: "", inspectorPhone: "", inspectorEmail: "qa@example.com",
 clientName: "Synthetic Client", clientEmail: "client@example.com", clientPhone: "", propertyAddress: "QA Test Property", inspectionDate: "2026-09-20",
 weatherConditions: "Test", scopeOfInspection: "Synthetic QA only", overallCondition: "Fair / Maintenance Required", executiveSummary: "Private QA notes", status: "draft", disclaimerAccepted: true,
 createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), defects: [{ id:"def-test",title:"QA defect",category:"Test",description:"QA finding",severity:"Minor / Cosmetic",location:"Test",actionRecommended:"Review",createdAt:new Date().toISOString(),photos:[{id:"qa-photo",caption:"Synthetic one-pixel fixture",timestamp:new Date().toISOString(),url:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF9sAAAAASUVORK5CYII="}] }]
};
const request = (user,path,body,organizationId) => appRequest(user,path,{method:"POST",body:JSON.stringify(body)},organizationId);
try {
 const owner=await createSyntheticUser("snap-owner");
 const viewer=await createSyntheticUser("snap-viewer");
 const outsider=await createSyntheticUser("snap-outsider");
 for (const [person,name] of [[owner,"Alpha"],[outsider,"Beta"]]) {
   const res=expectStatus(`${name} onboarding`,await request(person,"/api/onboarding",{name:`QA Snap ${name} ${tag}`}),[201]);
   organizationIds.push(res.organizationId);
 }
 const org=organizationIds[0];
 const memberSetup=await admin().database.from("organization_members").insert([{organization_id:org,user_id:viewer.id,role:"viewer"}]);
 if(memberSetup.error) throw Error(memberSetup.error.message);
 expectStatus("anonymous private list denied",await appRequest({token:""},"/api/snapinspect/inspections"),[401]);
 const saved=expectStatus("owner saves full inspection",await request(owner,"/api/snapinspect/inspections",{inspection:doc,revision:0,organizationId:org},org),[200]);
 if(saved.data.revision!==1) throw Error("revision not 1");
 const loaded=expectStatus("owner restores saved inspection",await appRequest(owner,`/api/snapinspect/inspections/${doc.id}`,{},org),[200]);
 if(JSON.stringify(loaded.inspection)!==JSON.stringify(doc)) throw Error("restored document differs");
 expectStatus("viewer can read own tenant",await appRequest(viewer,`/api/snapinspect/inspections/${doc.id}`,{},org),[200]);
 expectStatus("viewer save denied",await request(viewer,"/api/snapinspect/inspections",{inspection:doc,revision:1,organizationId:org},org),[403]);
 expectStatus("cross tenant read denied",await appRequest(outsider,`/api/snapinspect/inspections/${doc.id}`,{},organizationIds[1]),[404]);
 expectStatus("spoofed tenant header denied",await appRequest(outsider,`/api/snapinspect/inspections/${doc.id}`,{},org),[403]);
 const direct=createClient({baseUrl:config.oss_host,edgeFunctionToken:owner.token});
 // Use an explicitly authenticated client for direct RLS/RPC probes.
 direct.setAccessToken(owner.token);
 const bypass=await direct.database.from("inspections").update({title:"Forbidden direct mutation"}).eq("organization_id",org);
 if(!bypass.error) throw Error("direct mutation unexpectedly allowed");
 checks.push({name:"direct table writes denied",ok:true});
 const invalid=await direct.database.rpc("save_inspection_document",{target_org:org,target_client_id:doc.id,expected_revision:null,new_title:"Bypass",new_document_key:`${org}/${doc.id}/bad.json`,new_document_url:"unused"});
 if(!invalid.error) throw Error("null revision accepted");
 checks.push({name:"null revision RPC denied",ok:true});
 expectStatus("stale revision conflicts",await request(owner,"/api/snapinspect/inspections",{inspection:{...doc,title:"Stale"},revision:0,organizationId:org},org),[409]);
 const share=expectStatus("create report snapshot",await request(owner,`/api/snapinspect/inspections/${doc.id}/share`,{revision:1,organizationId:org,revoke:false},org),[200]);
 const shared=expectStatus("anonymous token holder reads snapshot",await request({token:""},"/api/snapinspect/report",{token:share.token}),[200]);
 if(shared.inspection.title!==doc.title) throw Error("share mismatch");
 expectStatus("invalid share denied",await request({token:""},"/api/snapinspect/report",{token:"A".repeat(43)}),[404]);
 expectStatus("viewer share denied",await request(viewer,`/api/snapinspect/inspections/${doc.id}/share`,{revision:1,organizationId:org,revoke:false},org),[403]);
 expectStatus("new revision saves",await request(owner,"/api/snapinspect/inspections",{inspection:{...doc,title:"Updated QA"},revision:1,organizationId:org},org),[200]);
 const snapshot=expectStatus("share remains frozen",await request({token:""},"/api/snapinspect/report",{token:share.token}),[200]);
 if(snapshot.inspection.title!==doc.title) throw Error("snapshot changed");
 const row=await admin().database.from("inspections").select("document_url").eq("organization_id",org).single();
 const directRead=await fetch(row.data.document_url);
 if(directRead.ok) throw Error("private blob publicly readable");
 checks.push({name:"private storage denies anonymous download",status:directRead.status,ok:true});
 expectStatus("revoke link",await request(owner,`/api/snapinspect/inspections/${doc.id}/share`,{revision:2,organizationId:org,revoke:true},org),[200]);
 expectStatus("revoked link denied",await request({token:""},"/api/snapinspect/report",{token:share.token}),[404]);
 const expiring=expectStatus("create replacement link",await request(owner,`/api/snapinspect/inspections/${doc.id}/share`,{revision:2,organizationId:org,revoke:false},org),[200]);
 await admin().database.from("inspections").update({share_expires_at:"2020-01-01T00:00:00Z"}).eq("organization_id",org);
 expectStatus("expired link denied",await request({token:""},"/api/snapinspect/report",{token:expiring.token}),[404]);
 console.log(JSON.stringify({outcome:"passed",checks},null,2));
} finally {
 // Scope all cleanup to identities and organizations created by THIS run.
 for (const organizationId of organizationIds) {
   const response=await admin().storage.from("snapinspect-documents").list({prefix:organizationId+"/",limit:100});
   if(response.error) throw Error("Could not list fixture blobs for cleanup");
   const objects=response.data?.objects || [];
   if(!Array.isArray(objects)) throw Error("Unexpected storage cleanup response");
   for(const object of objects) { if(object.key?.startsWith(organizationId+"/")) {const deletion=await admin().storage.from("snapinspect-documents").remove(object.key);if(deletion.error) throw Error("fixture blob cleanup failed");} }
 }
 if(organizationIds.length){const deletion=await admin().database.from("organizations").delete().in("id",organizationIds);if(deletion.error)throw Error("fixture organization cleanup failed");}
 if(createdUserIds.length){const deletion=await fetch(`${config.oss_host}/api/auth/users`,{method:"DELETE",headers:adminHeaders,body:JSON.stringify({userIds:createdUserIds})});if(!deletion.ok)throw Error("fixture user cleanup failed");}
 console.log(JSON.stringify({cleanup:"completed",organizations:organizationIds.length,users:createdUserIds.length}));
}
