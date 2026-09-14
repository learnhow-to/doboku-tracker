export type UserRole = 'worker' | 'foreman' | 'office' | 'admin';

export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'APPROVED';

export type PhotoStage = 'before' | 'during' | 'after' | 'other';

export interface AuthenticatedUser {
  id: string;
  authId: string;
  email: string;
  displayName: string;
  organizationId: string;
  orgRole: UserRole;
  projectRoles: Record<string, UserRole>; // projectId -> role in project
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  location?: string;
  mainContractor?: string;
  status: 'active' | 'completed' | 'archived';
}

export interface DailyReport {
  id: string;
  projectId: string;
  organizationId: string;
  workDate: string; // YYYY-MM-DD
  weather: string;
  reporterId: string;
  reporterName: string;
  status: ReportStatus;
  version: number;
  siteStartTime?: string;
  siteEndTime?: string;
  breakMinutes: number;
  handoverNotes?: string;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportWorker {
  id: string;
  reportId: string;
  name: string;
  company: string;
  trade: string;
  workHours: number;
  overtimeHours: number;
}

export interface WorkItem {
  id: string;
  reportId: string;
  workType: string; // 工種
  description: string; // 作業内容
  locationSta?: string;
  quantity: number;
  unit: string;
  calculationDetails?: {
    formula?: string;
    dimensions?: Record<string, number>;
    rounding?: string;
  };
}

export interface EquipmentEntry {
  id: string;
  reportId: string;
  name: string;
  vendor: string;
  quantity: number;
  unit: string;
  operatingHours?: number;
  dieselLiters?: number;
  notes?: string;
}

export interface MaterialEntry {
  id: string;
  reportId: string;
  name: string;
  vendor: string;
  quantity: number;
  unit: string;
  isPurchased: boolean;
  notes?: string;
}

export interface KYRecord {
  id: string;
  reportId: string;
  meetingTime?: string;
  attendeesCount: number;
  specificHazards: string;
  countermeasures: string;
  supervisorName: string;
  isChecked: boolean;
}

export interface PhotoRecord {
  id: string;
  reportId: string;
  projectId: string;
  fileName: string;
  filePath: string;
  fileHash: string;
  fileSize: number;
  mimeType: string;
  stage: PhotoStage;
  locationSta?: string;
  workType?: string;
  caption?: string;
  uploadedBy: string;
  createdAt: string;
  signedUrl?: string;
}
