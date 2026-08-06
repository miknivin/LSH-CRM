/* eslint-disable @typescript-eslint/no-explicit-any */
// `details`/`metadata` is Schema.Types.Mixed on the model — genuinely
// untyped, arbitrary JSON — so this file deals in `any` by design rather
// than fighting the type system over a defensive, best-effort backfill.
import Pipeline from "@/app/models/Pipeline";
import Stage from "@/app/models/Stage";
import User from "@/app/models/User";

// Historical activity-log entries (written before pipeline/stage/user names
// were resolved at write time) still have raw ObjectIds sitting in their
// `details`. Rather than a one-off migration touching audit-trail documents,
// this resolves those ids to names on read, batched into one query per
// collection across the whole page of activities being served. New entries
// already carry names and skip straight through untouched.
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const asObjectIdString = (value: unknown): string | undefined => {
  if (typeof value === "string" && OBJECT_ID_RE.test(value)) return value;
  if (value && typeof value === "object" && "toString" in value) {
    const str = String(value);
    if (OBJECT_ID_RE.test(str)) return str;
  }
  return undefined;
};

const asIdStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const ids = value.map(asObjectIdString);
  return ids.every((id): id is string => Boolean(id)) ? (ids as string[]) : undefined;
};

interface ActivityLike {
  details?: Record<string, any>;
}

export async function backfillActivityNames<T extends ActivityLike>(activities: T[]): Promise<T[]> {
  const pipelineIds = new Set<string>();
  const stageIds = new Set<string>();
  const userIds = new Set<string>();
  const addIf = (value: unknown, set: Set<string>) => {
    const id = asObjectIdString(value);
    if (id) set.add(id);
  };
  const addManyIf = (value: unknown, set: Set<string>) => {
    const ids = asIdStringArray(value);
    ids?.forEach((id) => set.add(id));
  };

  for (const { details: d } of activities) {
    if (!d) continue;
    if (!d.pipelineName) { addIf(d.pipelineId, pipelineIds); addIf(d.pipeline_id, pipelineIds); }
    if (!d.oldStageName) { addIf(d.oldStage, stageIds); addIf(d.oldStageId, stageIds); }
    if (!d.newStageName) { addIf(d.newStage, stageIds); addIf(d.newStageId, stageIds); }
    if (!d.stageName) { addIf(d.stageId, stageIds); addIf(d.stage_id, stageIds); }
    if (!d.assignedUserNames) {
      addIf(d.assignedUserId, userIds);
      addManyIf(d.userIds, userIds);
    }
    addManyIf(d.oldValues?.assignedTo, userIds);
    addManyIf(d.updatedFields?.assignedTo, userIds);
  }

  if (pipelineIds.size === 0 && stageIds.size === 0 && userIds.size === 0) {
    return activities;
  }

  const [pipelines, stages, users] = await Promise.all([
    pipelineIds.size ? Pipeline.find({ _id: { $in: [...pipelineIds] } }).select("name").lean() : [],
    stageIds.size ? Stage.find({ _id: { $in: [...stageIds] } }).select("name").lean() : [],
    userIds.size ? User.find({ _id: { $in: [...userIds] } }).select("name").lean() : [],
  ]);

  const pipelineNameById = new Map(pipelines.map((p: any) => [String(p._id), p.name as string]));
  const stageNameById = new Map(stages.map((s: any) => [String(s._id), s.name as string]));
  const userNameById = new Map(users.map((u: any) => [String(u._id), u.name as string]));

  const namePipeline = (id?: unknown) => {
    const objId = asObjectIdString(id);
    return objId ? pipelineNameById.get(objId) ?? objId : undefined;
  };
  const nameStage = (id?: unknown) => {
    const objId = asObjectIdString(id);
    return objId ? stageNameById.get(objId) ?? objId : undefined;
  };
  const nameUser = (id: string) => userNameById.get(id) ?? id;
  const nameUsers = (ids: string[]) => ids.map(nameUser);

  // Legacy CONTACT_CREATED/CONTACT_UPDATED dumps embedded whole nested
  // subdocuments (user/tags/pipelinesActive refs) — those aren't worth
  // resolving one field at a time, so they're dropped; a flat assignedTo
  // id array (Task's shape) gets resolved to names instead of dropped.
  const cleanNestedFields = (obj: unknown) => {
    if (!obj || typeof obj !== "object") return obj;
    const rest: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
    delete rest.user;
    delete rest.tags;
    delete rest.pipelinesActive;
    const assignedToIds = asIdStringArray(rest.assignedTo);
    if (assignedToIds) {
      rest.assignedTo = nameUsers(assignedToIds);
    } else {
      delete rest.assignedTo;
    }
    return rest;
  };

  for (const { details: d } of activities) {
    if (!d) continue;

    if (!d.pipelineName) {
      const resolved = namePipeline(d.pipelineId) ?? namePipeline(d.pipeline_id);
      if (resolved) d.pipelineName = resolved;
    }
    delete d.pipelineId;
    delete d.pipeline_id;

    if (!d.oldStageName) {
      const resolved = nameStage(d.oldStage) ?? nameStage(d.oldStageId);
      if (resolved) d.oldStageName = resolved;
    }
    delete d.oldStage;
    delete d.oldStageId;

    if (!d.newStageName) {
      const resolved = nameStage(d.newStage) ?? nameStage(d.newStageId);
      if (resolved) d.newStageName = resolved;
    }
    delete d.newStage;
    delete d.newStageId;

    if (!d.stageName) {
      const resolved = nameStage(d.stageId) ?? nameStage(d.stage_id);
      if (resolved) d.stageName = resolved;
    }
    delete d.stageId;
    delete d.stage_id;

    if (!d.assignedUserNames) {
      const singleId = asObjectIdString(d.assignedUserId);
      const manyIds = asIdStringArray(d.userIds);
      if (singleId) d.assignedUserNames = [nameUser(singleId)];
      else if (manyIds) d.assignedUserNames = nameUsers(manyIds);
    }
    delete d.assignedUserId;
    delete d.userIds;

    if (d.oldValues) d.oldValues = cleanNestedFields(d.oldValues);
    if (d.updatedFields) d.updatedFields = cleanNestedFields(d.updatedFields);
  }

  return activities;
}
