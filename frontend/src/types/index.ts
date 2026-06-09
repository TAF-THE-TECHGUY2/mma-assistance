// ===== Canonical union types =====

export type Role = 'booking' | 'operations' | 'billing' | 'admin' | 'owner';

export type CaseType = 'inpatient' | 'outpatient' | 'laboratory';

export type CaseStatus =
  | 'booked'
  | 'in_progress'
  | 'admin_review'
  | 'billing'
  | 'closed';

export type WorkflowStage =
  | 'operations'
  | 'admin_review'
  | 'billing'
  | 'closed';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type InvoiceStatus = 'pending' | 'invoiced' | 'paid';

export type DocumentStatus = 'pending' | 'approved' | 'rejected';

export type BillingStatus = 'pending' | 'submitted' | 'completed';

export interface UserPreferences {
  emailNotifications: boolean;
  desktopNotifications: boolean;
  compactTables: boolean;
}

// ===== Entity interfaces =====

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null;
  role: Role;
  preferences?: UserPreferences | null;
  created_at?: string;
  updated_at?: string;
}

export interface Patient {
  id: number;
  first_name: string;
  surname: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email?: string | null;
  id_number: string;
  mma_file_number: string;
  area: string;
  treating_doctor: string;
  date_registered: string;
  address?: string | null;
  emergency_contact?: string | null;
  medical_aid_number?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MedicalCase {
  id: number;
  case_number: string;
  file_number?: string | null;
  patient_id: number;
  case_type: CaseType;
  treating_doctor?: string | null;
  notes?: string | null;
  case_status: CaseStatus;
  workflow_stage: WorkflowStage;
  priority: Priority;
  assigned_department?: string | null;
  created_by?: number | null;
  date_opened: string;
  due_date?: string | null;
  created_at?: string;
  updated_at?: string;
  // Optional eager-loaded relations
  patient?: Patient;
  inpatient_detail?: InpatientDetail | null;
  outpatient_detail?: OutpatientDetail | null;
  laboratory_detail?: LaboratoryDetail | null;
  creator?: User | null;
  documents?: Document[];
  audit_logs?: AuditLog[];
  billings?: Billing[];
  admin_reviews?: AdminReview[];
}

export interface InpatientDetail {
  id: number;
  case_id: number;
  file_number?: string | null;
  admission_date?: string | null;
  discharge_date?: string | null;
  date_to_admin?: string | null;
  mr_requested: boolean;
  mr_received: boolean;
  admin_closure_date?: string | null;
  submission_date?: string | null;
  date_pastel?: string | null;
  case_status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OutpatientDetail {
  id: number;
  case_id: number;
  file_date?: string | null;
  file_number?: string | null;
  consult_date?: string | null;
  followup_date?: string | null;
  ongoing_treatment: boolean;
  date_to_admin?: string | null;
  mr_requested: boolean;
  mr_received: boolean;
  admin_closure_date?: string | null;
  submission_date?: string | null;
  date_pastel?: string | null;
  case_status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LaboratoryDetail {
  id: number;
  case_id: number;
  appointment_date?: string | null;
  treating_doctor?: string | null;
  area?: string | null;
  date_registered?: string | null;
  invoice_status: InvoiceStatus;
  lab_type?: string | null;
  case_status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Document {
  id: number;
  name: string;
  patient_id?: number | null;
  case_id?: number | null;
  upload_date: string;
  document_type?: string | null;
  file_url: string;
  uploaded_by?: number | null;
  document_status: DocumentStatus;
  document_category?: string | null;
  created_at?: string;
  updated_at?: string;
  patient?: Patient | null;
  uploader?: User | null;
}

export interface Billing {
  id: number;
  case_id: number;
  billing_status: BillingStatus;
  submission_date?: string | null;
  date_pastel?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  case?: MedicalCase;
}

export interface AdminReview {
  id: number;
  case_id: number;
  admin_closure_date?: string | null;
  review_notes?: string | null;
  reviewed_by?: number | null;
  created_at?: string;
  updated_at?: string;
  case?: MedicalCase;
  reviewer?: User | null;
}

export interface AuditLog {
  id: number;
  user_id?: number | null;
  action: string;
  auditable_type?: string | null;
  auditable_id?: number | null;
  changes?: Record<string, unknown> | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  user?: User | null;
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  case_id?: number | null;
  user_id?: number | null;
  read: boolean;
  created_at?: string;
  updated_at?: string;
  case?: MedicalCase | null;
}

export interface DashboardStats {
  total_patients: number;
  total_cases: number;
  open_cases: number;
  closed_cases: number;
  cases_by_status: Record<CaseStatus, number>;
  cases_by_type: Record<CaseType, number>;
  cases_by_stage: Record<WorkflowStage, number>;
  pending_billing: number;
  pending_admin_review: number;
  pending_documents: number;
  overdue_cases: number;
  due_this_week: number;
  recent_cases: MedicalCase[];
}

// ===== Notification settings (Settings page) =====

export type NotificationEvent =
  | 'case_created'
  | 'lab_request_created'
  | 'sent_to_operations'
  | 'sent_to_admin_review'
  | 'sent_to_billing'
  | 'case_closed'
  | 'document_uploaded';

export interface NotificationSettings {
  owner_email: string;
  owner_receives_all: boolean;
  department_emails: {
    operations: string;
    admin: string;
    billing: string;
    laboratory: string;
  };
  events: Record<NotificationEvent, boolean>;
}

// ===== Shared API envelope helpers =====

export interface ListMeta {
  current_page?: number;
  from?: number | null;
  last_page?: number;
  per_page?: number;
  to?: number | null;
  total?: number;
  [key: string]: unknown;
}

export interface ListResponse<T> {
  data: T[];
  meta: ListMeta;
}

export interface SingleResponse<T> {
  data: T;
}
