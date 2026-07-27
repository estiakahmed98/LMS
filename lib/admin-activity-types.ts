export type AuditSeverityValue = "INFO" | "NOTICE" | "WARNING" | "CRITICAL";

export interface AdminActivityEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  /** Actor's role at the time of the action, not their role today. */
  actorRole: string | null;
  /** Field-level before/after diff, when the action recorded one. */
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  severity: AuditSeverityValue;
  createdAt: string;
}

export interface AdminActivityFilters {
  entity?: string;
  action?: string;
  actorId?: string;
  severity?: AuditSeverityValue;
  from?: string;
  to?: string;
  query?: string;
  page: number;
  pageSize: number;
}

/** Distinct actor, for the "filter by person" control. */
export interface AdminActivityActor {
  id: string;
  name: string;
  email: string;
}

/** Headline counts for the current filter window. */
export interface AdminActivityStats {
  total: number;
  critical: number;
  warning: number;
  failedLogins: number;
  deletions: number;
  distinctActors: number;
}

export interface AdminActivityPage {
  entries: AdminActivityEntry[];
  total: number;
  page: number;
  pageSize: number;
  entities: string[];
  actions: string[];
  actors: AdminActivityActor[];
  stats: AdminActivityStats;
}
