export interface Tag {
  user: string;
  name: string;
}

export interface Contact {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  probability?: number;
  assignedTo?: Array<{ user: { _id: string; name: string; email: string }; time: string }>;
  tags?: Tag[];
}

export interface Stage {
  _id: string;
  name: string;
  order: number;
  probability: number;
  isSuccess?: boolean;
}

export interface BatchUpdate {
  contactId: string;
  pipelineId: string;
  stageId: string;
  order: number;
}

export interface StageMeta {
  totalCount: number;
  loadedCount: number;
  page: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

export interface DragSyncUpdate {
  contactId: string;
  pipelineId: string;
  stageId: string;
  order: number;
}

export interface DragSyncSnapshot {
  contactsByStage: Record<string, Contact[]>;
  stageMetaById: Record<string, StageMeta>;
}

export interface DragSyncEvent {
  opId: string;
  update: DragSyncUpdate;
  createdAt: number;
  // Every stage touched by the drag action this event came from (source +
  // destination), regardless of whether that particular stage ended up with
  // an order-changed contact. Needed for cache invalidation scoping — a
  // stage can lose its last contact without any remaining contact's index
  // shifting, which would otherwise leave it out of the update list entirely.
  affectedStageIds: string[];
}

export interface BoardState {
  stages: Stage[];
  contactsByStage: Record<string, Contact[]>;
  stageMetaById: Record<string, StageMeta>;
  activeDragContactId: string | null;
  pendingSyncQueue: DragSyncEvent[];
  rollbackByOpId: Record<string, DragSyncSnapshot>;
  syncStatus: "idle" | "syncing" | "retrying" | "error";
  lastSyncError?: string;
}
