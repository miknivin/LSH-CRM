/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";

import { authorizeRoles, isAuthenticatedUser } from "@/app/api/middlewares/auth";
import { logContactActivity } from "@/app/api/utils/activityLog";
import { getPipelineStageNameMap } from "@/app/lib/utils/pipelineStageNames";
import dbConnect from "@/app/lib/db/connection";
import Contact from "@/app/models/Contact";

import { BatchUpdateItem, validateBatchUpdates } from "./validation";

interface BatchUpdateRequest {
  updates: BatchUpdateItem[];
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await isAuthenticatedUser(req);
    const userId = user._id?.toString();
    if (!userId) {
      return NextResponse.json({ error: "Invalid user data" }, { status: 401 });
    }
    authorizeRoles(user, "admin", "team_member");

    await dbConnect();

    let body: BatchUpdateRequest;
    try {
      body = (await req.json()) as BatchUpdateRequest;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const updates = body.updates ?? [];
    const { contactMap } = await validateBatchUpdates(updates);

    // Every contact on the board already has a pipelinesActive entry for
    // this pipeline (that's how it got fetched onto the board), so this is
    // always a same-pipeline stage move — one atomic array-element update,
    // no branching on whether the entry exists.
    const bulkOps: any[] = updates.map(({ contactId, pipelineId, stageId, order }) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(contactId) },
        update: {
          $set: {
            "pipelinesActive.$[elem].stage_id": new Types.ObjectId(stageId),
            "pipelinesActive.$[elem].order": order,
          },
          $currentDate: { updatedAt: true },
        },
        arrayFilters: [{ "elem.pipeline_id": new Types.ObjectId(pipelineId) }],
      },
    }));

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // bulkWrite with one op costs the same as a single updateOne — kept
        // as a batch because the drag-sync worker on the frontend can
        // legitimately flush several queued moves in one request (rapid
        // drags coalesced within its debounce window, or a backlog flushed
        // after coming back online), not just the common single-card case.
        await Contact.bulkWrite(bulkOps, { ordered: false, session });

        const { getPipelineName, getStageName } = await getPipelineStageNameMap(
          updates.map((update) => update.pipelineId),
          updates.flatMap((update) => [
            update.stageId,
            contactMap
              .get(update.contactId)
              ?.pipelinesActive?.find((pa: any) => pa.pipeline_id?.toString() === update.pipelineId)?.stage_id?.toString(),
          ])
        );

        await Promise.all(
          updates.map((update) => {
            const oldStageId = contactMap
              .get(update.contactId)
              ?.pipelinesActive?.find((pa: any) => pa.pipeline_id?.toString() === update.pipelineId)?.stage_id?.toString();

            if (oldStageId === update.stageId) return Promise.resolve();

            return logContactActivity({
              contactId: update.contactId,
              event: "PIPELINE_STAGE_CHANGED",
              description: "Pipeline stage changed",
              performedBy: userId,
              metadata: {
                pipelineName: getPipelineName(update.pipelineId),
                oldStageName: getStageName(oldStageId),
                newStageName: getStageName(update.stageId),
                order: update.order,
                updatedBy: user.name,
              },
              session,
            });
          })
        );
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ success: true, updated: bulkOps.length });
  } catch (error: any) {
    console.error("Error updating contacts pipeline:", error);

    if (error.name === "MongoServerError" && error.code === 11000) {
      return NextResponse.json(
        { error: `Duplicate key error for contact _id: ${error.keyValue?._id || "unknown"}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      {
        status:
          error.message?.includes("login") || error.message?.includes("Not allowed")
            ? 401
            : error.message?.includes("not found") || error.message?.includes("Invalid") || error.message?.includes("does not belong")
              ? 400
              : 500,
      }
    );
  }
}
