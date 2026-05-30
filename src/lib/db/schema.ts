/**
 * Database Schema Reference (TypeScript types)
 * 
 * Ini adalah referensi schema database yang digunakan di Supabase.
 * Semua query menggunakan Supabase client (@supabase/supabase-js).
 * File ini hanya berisi TypeScript types untuk type-safety.
 */

// ==================== AUTH & ORGANIZATION ====================

export interface User {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  image: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  expires_at: string;
  token: string;
  created_at: string;
  updated_at: string;
  ip_address: string | null;
  user_agent: string | null;
  user_id: string;
}

export interface Account {
  id: string;
  account_id: string;
  provider_id: string;
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  id_token: string | null;
  access_token_expires_at: string | null;
  refresh_token_expires_at: string | null;
  scope: string | null;
  password: string | null;
  created_at: string;
  updated_at: string;
}

export interface Verification {
  id: string;
  identifier: string;
  value: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

// ==================== ORGANIZATIONS ====================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  owner_id: string;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: "owner" | "manager" | "supervisor" | "operator" | "viewer";
  joined_at: string;
}

// ==================== COOPS (KANDANG) ====================

export interface Coop {
  id: string;
  organization_id: string;
  name: string;
  capacity: number;
  location: string | null;
  status: "active" | "empty" | "harvest" | "inactive";
  created_at: string;
}

// ==================== FLOCKS (PERIODE PEMELIHARAAN) ====================

export interface Flock {
  id: string;
  coop_id: string;
  organization_id: string;
  start_date: string;
  doc_count: number;
  strain: "ross_308" | "cobb_500" | "arbor_acres" | "other";
  target_weight: number;
  target_days: number;
  status: "active" | "closed" | "harvest";
  notes: string | null;
  created_at: string;
}

// ==================== DAILY RECORDS ====================

export interface DailyRecord {
  id: string;
  flock_id: string;
  organization_id: string;
  date: string;
  day_number: number;
  dead_count: number;
  cull_count: number;
  remaining_population: number;
  avg_weight: number | null;
  sample_count: number | null;
  feed_type: "starter" | "grower" | "finisher" | null;
  feed_in: number;
  feed_remaining: number;
  feed_consumed: number;
  cumulative_feed: number;
  health_condition: "normal" | "warning" | "critical";
  medication: string | null;
  symptoms: string | null;
  temp_morning: number | null;
  temp_afternoon: number | null;
  temp_evening: number | null;
  humidity: number | null;
  fcr: number | null;
  adg: number | null;
  depletion: number | null;
  ip_score: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// ==================== NOTIFICATIONS ====================

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  type: "info" | "warning" | "critical";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ==================== INVITATIONS ====================

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: "manager" | "supervisor" | "operator" | "viewer";
  token: string;
  status: "pending" | "accepted" | "expired";
  assigned_coop_ids: string | null;
  invited_by: string;
  expires_at: string;
  created_at: string;
}

// ==================== COOP ASSIGNMENTS ====================

export interface CoopAssignment {
  id: string;
  user_id: string;
  coop_id: string;
  organization_id: string;
  assigned_at: string;
}

// ==================== FEED STOCK (Stok Pakan) ====================

export interface FeedStock {
  id: string;
  flock_id: string;
  organization_id: string;
  date: string;
  type: "incoming" | "used";
  amount_kg: number;
  bags: number | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

// ==================== ACTIVITY LOG ====================

export interface ActivityLog {
  id: string;
  user_id: string;
  organization_id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  description: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

// ==================== MEDICATION SCHEDULES ====================

export interface MedicationSchedule {
  id: string;
  flock_id: string;
  organization_id: string;
  day_number: number;
  name: string;
  dosage: string | null;
  method: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// ==================== MEDICATION EXECUTIONS ====================

export interface MedicationExecution {
  id: string;
  schedule_id: string | null;
  flock_id: string;
  organization_id: string;
  date: string;
  name: string;
  amount: string | null;
  executed_by: string | null;
  created_at: string;
}

// ==================== VISIT CHECK-INS ====================

export interface VisitCheckin {
  id: string;
  user_id: string;
  coop_id: string;
  organization_id: string;
  date: string;
  check_in_time: string;
  check_out_time: string | null;
  condition: "baik" | "perhatian" | "bermasalah";
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

// ==================== DATABASE TYPE MAP (for Supabase) ====================

export interface Database {
  public: {
    Tables: {
      users: { Row: User; Insert: Partial<User> & Pick<User, "id" | "name" | "email"> };
      sessions: { Row: Session; Insert: Partial<Session> & Pick<Session, "id" | "expires_at" | "token" | "user_id"> };
      accounts: { Row: Account; Insert: Partial<Account> & Pick<Account, "id" | "account_id" | "provider_id" | "user_id"> };
      verifications: { Row: Verification; Insert: Partial<Verification> & Pick<Verification, "id" | "identifier" | "value" | "expires_at"> };
      organizations: { Row: Organization; Insert: Partial<Organization> & Pick<Organization, "id" | "name" | "slug" | "owner_id"> };
      organization_members: { Row: OrganizationMember; Insert: Partial<OrganizationMember> & Pick<OrganizationMember, "id" | "user_id" | "organization_id" | "role"> };
      coops: { Row: Coop; Insert: Partial<Coop> & Pick<Coop, "id" | "organization_id" | "name" | "capacity"> };
      flocks: { Row: Flock; Insert: Partial<Flock> & Pick<Flock, "id" | "coop_id" | "organization_id" | "start_date" | "doc_count" | "strain" | "target_weight" | "target_days"> };
      daily_records: { Row: DailyRecord; Insert: Partial<DailyRecord> & Pick<DailyRecord, "id" | "flock_id" | "organization_id" | "date" | "day_number" | "remaining_population"> };
      notifications: { Row: Notification; Insert: Partial<Notification> & Pick<Notification, "id" | "user_id" | "organization_id" | "type" | "title" | "message"> };
      invitations: { Row: Invitation; Insert: Partial<Invitation> & Pick<Invitation, "id" | "organization_id" | "email" | "role" | "token" | "invited_by" | "expires_at"> };
      coop_assignments: { Row: CoopAssignment; Insert: Partial<CoopAssignment> & Pick<CoopAssignment, "id" | "user_id" | "coop_id" | "organization_id"> };
      feed_stock: { Row: FeedStock; Insert: Partial<FeedStock> & Pick<FeedStock, "id" | "flock_id" | "organization_id" | "date" | "type" | "amount_kg"> };
      activity_logs: { Row: ActivityLog; Insert: Partial<ActivityLog> & Pick<ActivityLog, "id" | "user_id" | "organization_id" | "action" | "entity" | "description"> };
      medication_schedules: { Row: MedicationSchedule; Insert: Partial<MedicationSchedule> & Pick<MedicationSchedule, "id" | "flock_id" | "organization_id" | "day_number" | "name"> };
      medication_executions: { Row: MedicationExecution; Insert: Partial<MedicationExecution> & Pick<MedicationExecution, "id" | "flock_id" | "organization_id" | "date" | "name"> };
      visit_checkins: { Row: VisitCheckin; Insert: Partial<VisitCheckin> & Pick<VisitCheckin, "id" | "user_id" | "coop_id" | "organization_id" | "date" | "check_in_time"> };
    };
  };
}
