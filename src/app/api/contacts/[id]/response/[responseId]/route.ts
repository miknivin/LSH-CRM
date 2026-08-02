import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";

import { authorizeRoles, isAuthenticatedUser } from "@/app/api/middlewares/auth";
import { logContactActivity } from "@/app/api/utils/activityLog";
import dbConnect from "@/app/lib/db/connection";
import "@/app/models/User"; // Registers "User" — required by the populate("createdBy") calls below
import ContactResponse, {
  ContactResponseActivity,
  contactResponseActivities,
  IContactResponse,
} from "@/app/models/ContactResponse";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string; responseId: string }> }
) {
  try {
    
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, "admin", "team_member");
    const userId = user._id?.toString();
    if (!userId) {
      return NextResponse.json({ error: "Invalid user data" }, { status: 401 });
    }

    const { id, responseId } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
    }
    if (!Types.ObjectId.isValid(responseId)) {
      return NextResponse.json({ error: "Invalid response ID" }, { status: 400 });
    }

    const body = await req.json();
    const activity = body.activity as ContactResponseActivity;
    if (!activity || !contactResponseActivities.includes(activity)) {
      return NextResponse.json({ error: "A valid activity type is required" }, { status: 400 });
    }

    if (body.note !== undefined && typeof body.note !== "string") {
      return NextResponse.json({ error: "Note must be a string" }, { status: 400 });
    }

    let meetingScheduledDate: Date | null = null;
    if (body.meetingScheduledDate) {
      const parsedDate = new Date(body.meetingScheduledDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: "Invalid meetingScheduledDate" }, { status: 400 });
      }
      meetingScheduledDate = parsedDate;
    }

    const session = await mongoose.startSession();
    let updated: IContactResponse | null = null;

    try {
      await session.withTransaction(async () => {
        updated = await ContactResponse.findOneAndUpdate(
          { _id: responseId, contact: id },
          {
            activity,
            note: body.note?.trim() || "",
            meetingScheduledDate,
          },
          { session, new: true, runValidators: true }
        );

        if (!updated) {
          throw new Error("Response not found or does not belong to this contact");
        }

        await logContactActivity({
          contactId: id,
          event: "CONTACT_RESPONSE_UPDATED",
          description: `Response updated: ${activity}`,
          performedBy: userId,
          metadata: {
            contactResponseId: responseId,
            activity,
            note: updated.note,
            meetingScheduledDate: meetingScheduledDate?.toISOString() ?? null,
          },
          session,
        });
      });
    } finally {
      await session.endSession();
    }

    const populatedResponse = await ContactResponse.findById(responseId)
      .populate("createdBy", "name email")
      .lean();

    return NextResponse.json(
      { message: "Response updated successfully", response: populatedResponse },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error updating contact response:", err);
    const status = err.message?.includes("login") || err.message?.includes("Not allowed")
      ? 401
      : err.message?.includes("not found")
        ? 404
        : 500;
    return NextResponse.json({ error: err.message || "Internal server error" }, { status });
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; responseId: string }> }
) {
  try {
    await dbConnect();
    await isAuthenticatedUser(req).then((user) => authorizeRoles(user, "admin", "team_member"));

    const { id, responseId } = await context.params;
    if (!Types.ObjectId.isValid(responseId)) {
      return NextResponse.json({ error: "Invalid response ID" }, { status: 400 });
    }

    const response = await ContactResponse.findOne({ _id: responseId, contact: id })
      .populate("createdBy", "name email")
      .lean();

    if (!response) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Response retrieved successfully", response }, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error fetching contact response:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("login") || err.message?.includes("Not allowed") ? 401 : 500 }
    );
  }
}
