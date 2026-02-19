// İstifadəçi
export interface User {
  id: string;
  email: string;
  fullName: string;
  full_name?: string;
  role: UserRole;
  department?: string;
  position?: string;
  last_login?: string;
}

export type UserRole = 'admin' | 'risk_manager' | 'asset_owner' | 'incident_coordinator' | 'auditor' | 'dxeit_rep';

// Auth
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Aktiv — Modul 1
export interface Asset {
  id: string;
  asset_code: string;
  name: string;
  category: 'əsas' | 'dəstəkləyici';
  sub_category: 'informasiya' | 'hardware' | 'software' | 'şəbəkə' | 'insan' | 'fiziki';
  owner_id?: string;
  value: number;
  criticality: SeverityLaw;
  location: string;
  description?: string;
  status: 'aktiv' | 'planlaşdırılan' | 'köhnəlmiş' | 'ləğv_edilmiş';
  last_review: string;
  created_at: string;
  updated_at: string;
}

// Təhdid — Modul 2
export interface Threat {
  id: string;
  threat_code: string;
  name: string;
  category: 'texniki' | 'fiziki' | 'insani' | 'prosessual' | 'xarici';
  source: 'kənardan' | 'daxildən' | 'hər_ikisi';
  purpose: string[];
  target_type: string;
  intentionality: 'qərəzli' | 'təsadüfi' | 'axın_üzrə';
  severity: SeverityLaw;
  probability: number;
  severity_law: SeverityLaw;
  probability_band_law: ProbabilityBand;
  violated_requirement_id?: string;
  is_external: boolean;
  created_at: string;
}

// Boşluq — Modul 3
export interface Vulnerability {
  id: string;
  vuln_code: string;
  name: string;
  type: 'boşluq' | 'nəzarətsizlik' | 'zəiflik' | 'uyğunsuzluq';
  cve_ref?: string;
  asset_id?: string;
  severity_internal: string;
  severity_law: SeverityLaw;
  detection_date: string;
  detection_method: string;
  exploitation_status: string;
  status: 'açıq' | 'işdə' | 'həll_edilib' | 'risk_kimi_qəbul_edilib';
  created_at: string;
}

// Risk — Modul 4
export interface Risk {
  id: string;
  risk_code: string;
  name: string;
  category: 'strateji' | 'operativ' | 'texniki' | 'uyğunluq' | 'reputasiya' | 'fiziki';
  description?: string;
  asset_value?: number;
  probability_factor: number;
  statistical_probability?: number;
  technical_impact: number;
  business_impact: number;
  qualitative_score?: number;
  quantitative_value?: number;
  priority?: 'aşağı' | 'orta' | 'yüksək' | 'kritik';
  treatment_option?: string;
  inherent_risk_score?: number;
  residual_risk_score?: number;
  appetite_threshold?: number;
  status: 'açıq' | 'emalda' | 'həll_edilib' | 'qəbul_edilib' | 'bağlı';
  created_at: string;
}

// İnsident — Modul 5
export interface Incident {
  id: string;
  incident_code: string;
  risk_id?: string;
  title: string;
  type: string;
  severity: 'P1_kritik' | 'P2_yüksək' | 'P3_orta' | 'P4_aşağı';
  impact_law?: SeverityLaw;
  detection_datetime: string;
  description: string;
  response_option?: string;
  status: string;
  created_at: string;
}

// Həll — Modul 6
export interface Solution {
  id: string;
  solution_code: string;
  name: string;
  type: 'qabaqlayıcı' | 'nəzarətedici' | 'təshihedici' | 'bərpaedici';
  solution_kind: 'texniki' | 'təşkilati';
  technology?: string;
  is_ai: boolean;
  effectiveness?: number;
  is_certified: boolean;
  source: string;
  description?: string;
}

// Tələb — Modul 7
export interface Requirement {
  id: string;
  req_code: string;
  req_title: string;
  req_category: string;
  req_description: string;
  source_type: string;
  source_ref: string;
  activity_area: string[];
  status: 'draft' | 'aktiv' | 'köhnəlmiş';
}

// Audit Log
export interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changed_fields?: any;
  reason?: string;
  actor_user_id?: string;
  actor_name?: string;
  actor_role?: string;
  ip_address?: string;
  created_at: string;
}

// Shared enums
export type SeverityLaw = 'çox_aşağı' | 'aşağı' | 'orta' | 'yüksək' | 'kritik';
export type ProbabilityBand = 'p01_20' | 'p21_40' | 'p41_60' | 'p61_80' | 'p81_100';

// Dashboard
export interface DashboardStats {
  risks: { byPriority: any[]; total: number };
  incidents: { byStatus: any[]; recent: any[] };
  assets: { activeCount: number };
  vulnerabilities: { openCount: number };
  threats: { totalCount: number };
  heatMap: any[];
}

export interface KpiData {
  kpi1: { value: number | null; percentage: number | null; exceeding: number; total: number };
  kpi2: { value: number | null; percentage: number | null; inconsistent: number; total: number };
}
