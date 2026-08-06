/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from "mongoose";

import Contact from "@/app/models/Contact";
import Stage from "@/app/models/Stage";

export interface BatchUpdateItem {
  contactId: string;
  pipelineId: string;
  stageId: string;
  order: number;
}

interface ValidateBatchUpdatesResult {
  // pipelinesActive per contact, keyed by contactId — used to find each
  // contact's current stage_id in this pipeline (for the "old stage" name
  // logged on the activity) and as the arrayFilter target for the update.
  contactMap: Map<string, any>;
}

const isObjectId = (value: string) => Types.ObjectId.isValid(value);

export async function validateBatchUpdates(updates: BatchUpdateItem[]): Promise<ValidateBatchUpdatesResult> {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new Error("Updates must be a non-empty array");
  }

  const contactIds = new Set<string>();
  const stageIds = new Set<string>();

  for (const { contactId, pipelineId, stageId, order } of updates) {
    if (!isObjectId(contactId) || !isObjectId(pipelineId) || !isObjectId(stageId)) {
      throw new Error(`Invalid contactId, pipelineId, or stageId in update for contact ${contactId}`);
    }
    if (typeof order !== "number" || order < 0) {
      throw new Error(`Order must be a non-negative number in update for contact ${contactId}`);
    }
    contactIds.add(contactId);
    stageIds.add(stageId);
  }

  const [contacts, stages] = await Promise.all([
    Contact.find({ _id: { $in: [...contactIds].map((id) => new Types.ObjectId(id)) } })
      .select("_id pipelinesActive.pipeline_id pipelinesActive.stage_id")
      .lean(),
    Stage.find({ _id: { $in: [...stageIds].map((id) => new Types.ObjectId(id)) } })
      .select("_id pipeline_id")
      .lean(),
  ]);

  const contactMap = new Map<string, any>(contacts.map((contact: any) => [contact._id.toString(), contact]));
  for (const contactId of contactIds) {
    if (!contactMap.has(contactId)) throw new Error(`Contact not found: ${contactId}`);
  }

  const stageMap = new Map<string, any>(stages.map((stage: any) => [stage._id.toString(), stage]));
  for (const { stageId, pipelineId } of updates) {
    const stage = stageMap.get(stageId);
    if (!stage || stage.pipeline_id.toString() !== pipelineId) {
      throw new Error(`Stage ${stageId} does not belong to pipeline ${pipelineId}`);
    }
  }

  return { contactMap };
}
