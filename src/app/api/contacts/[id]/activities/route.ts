import { NextRequest, NextResponse } from "next/server";
import { PipelineStage, Types } from "mongoose";

import { authorizeRoles, isAuthenticatedUser } from "@/app/api/middlewares/auth";
import dbConnect from "@/app/lib/db/connection";
import { backfillActivityNames } from "@/app/lib/utils/backfillActivityNames";
import ActivityLog from "@/app/models/ActivityLog";
import Contact from "@/app/models/Contact";

// Merges two activity sources for a contact into one sorted, paginated feed:
// - the `ActivityLog` collection (Tasks, remarks, contact responses, ...)
// - the legacy `activities` array embedded on the Contact document itself
//   (contact/tag/note/pipeline events), capped at 500 entries there.
// Done via $unionWith so sorting/pagination happens in Mongo instead of
// pulling the (potentially unbounded) ActivityLog collection into memory.
function buildMergedActivityPipeline(contactId: Types.ObjectId): PipelineStage[] {
  return [
    { $match: { contactId } },
    {
      $project: {
        _id: 1,
        action: "$event",
        user: "$performedBy",
        details: {
          $mergeObjects: [{ description: "$description" }, { $ifNull: ["$metadata", {}] }],
        },
        createdAt: 1,
      },
    },
    {
      $unionWith: {
        coll: "contacts",
        pipeline: [
          { $match: { _id: contactId } },
          { $unwind: "$activities" },
          {
            $replaceRoot: {
              newRoot: {
                _id: "$activities._id",
                action: "$activities.action",
                user: "$activities.user",
                details: "$activities.details",
                createdAt: "$activities.createdAt",
              },
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDoc",
      },
    },
    { $unwind: { path: "$userDoc", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        action: 1,
        details: 1,
        createdAt: 1,
        user: { _id: "$userDoc._id", name: "$userDoc.name", email: "$userDoc.email" },
      },
    },
    { $sort: { createdAt: -1, _id: -1 } },
  ];
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, "admin", "team_member");

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
    }

    const contactExists = await Contact.exists({ _id: id });
    if (!contactExists) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 5), 1), 50);
    const skip = (page - 1) * limit;

    const contactId = new Types.ObjectId(id);
    const pipeline = buildMergedActivityPipeline(contactId);

    const [activities, countResult] = await Promise.all([
      ActivityLog.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
      ActivityLog.aggregate([...pipeline, { $count: "total" }]),
    ]);
    const total = countResult[0]?.total ?? 0;

    await backfillActivityNames(activities);

    return NextResponse.json(
      {
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error fetching contact activities:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("login") || err.message?.includes("Not allowed") ? 401 : 500 }
    );
  }
}
