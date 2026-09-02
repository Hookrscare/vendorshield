export type OrganizationRole = "owner" | "admin" | "member" | "viewer";
export type EntitlementStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired";

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMemberRow {
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  created_at: string;
}

export interface CompanySettingsRow {
  organization_id: string;
  website: string;
  logo_url: string | null;
  privacy_email: string;
  dpo_name: string;
  notification_email: string;
  last_audit_date: string | null;
  auto_sync_public_page: boolean;
  theme: "light" | "dark" | "system";
  created_at: string;
  updated_at: string;
}

export interface VendorRow {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  website: string;
  logo_url: string | null;
  data_processed: string[];
  data_location: string;
  dpa_url: string;
  dpa_status: "Signed" | "Under Review" | "Standard Terms" | "Missing";
  certifications: string[];
  risk_level: "Low" | "Medium" | "High";
  last_reviewed_date: string | null;
  next_review_date: string | null;
  notes: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AuditEventRow {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface EntitlementRow {
  id: string;
  organization_id: string;
  product_key: string;
  status: EntitlementStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_checkout_session_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}
