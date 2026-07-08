export interface AdminActivityEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  changes: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminActivityFilters {
  entity?: string;
  action?: string;
  actorId?: string;
  from?: string;
  to?: string;
  query?: string;
  page: number;
  pageSize: number;
}

export interface AdminActivityPage {
  entries: AdminActivityEntry[];
  total: number;
  page: number;
  pageSize: number;
  entities: string[];
  actions: string[];
}
