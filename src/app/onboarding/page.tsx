import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const client = await createInsForgeServerClient();
  const { data, error } = await client.auth.getCurrentUser();
  const user = data?.user;

  if (error || !user) redirect("/login");

  const membership = await client.database
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership.data) redirect("/dashboard");

  return <OnboardingForm email={user.email} />;
}
