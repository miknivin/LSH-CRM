import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";

import { authorizeRoles, isAuthenticatedUser } from "@/app/api/middlewares/auth";
import { logContactActivity } from "@/app/api/utils/activityLog";
import dbConnect from "@/app/lib/db/connection";
import Contact from "@/app/models/Contact";
import CalendarEvent from "@/app/models/CalendarEvents";
import "@/app/models/User"; // Registers "User" — required by the populate("createdBy") calls below
import ContactResponse, {
  ContactResponseActivity,
  contactResponseActivities,
  meetingContactResponseActivities,
} from "@/app/models/ContactResponse";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, "admin", "team_member");
    const userId = user._id?.toString();
    if (!userId) {
      return NextResponse.json({ error: "Invalid user data" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
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

    const isMeetingActivity = meetingContactResponseActivities.includes(activity);
    const shouldAddToCalendar = Boolean(body.addToCalendar) && isMeetingActivity && Boolean(meetingScheduledDate);

    const contactExists = await Contact.exists({ _id: id });
    if (!contactExists) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const session = await mongoose.startSession();
    let responseId: Types.ObjectId | undefined;

    try {
      await session.withTransaction(async () => {
        const [contactResponse] = await ContactResponse.create(
          [
            {
              contact: new Types.ObjectId(id),
              activity,
              note: body.note?.trim() || "",
              meetingScheduledDate,
              createdBy: new Types.ObjectId(userId),
            },
          ],
          { session }
        );
        responseId = contactResponse._id as Types.ObjectId;

        await logContactActivity({
          contactId: id,
          event: "CONTACT_RESPONSE_ADDED",
          description: `Response logged: ${activity}`,
          performedBy: userId,
          metadata: {
            contactResponseId: contactResponse._id,
            activity,
            note: contactResponse.note,
            meetingScheduledDate: meetingScheduledDate?.toISOString() ?? null,
          },
          session,
        });

        if (shouldAddToCalendar && meetingScheduledDate) {
          await CalendarEvent.create(
            [
              {
                title: activity,
                start: meetingScheduledDate.toISOString(),
                end: meetingScheduledDate.toISOString(),
                allDay: false,
                extendedProps: { calendar: "Primary" },
                contact: new Types.ObjectId(id),
                contactResponse: contactResponse._id,
                user: new Types.ObjectId(userId),
              },
            ],
            { session }
          );
        }
      });
    } finally {
      await session.endSession();
    }

    const populatedResponse = await ContactResponse.findById(responseId)
      .populate("createdBy", "name email")
      .lean();

    return NextResponse.json(
      { message: "Response added successfully", response: populatedResponse },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error creating contact response:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("login") || err.message?.includes("Not allowed") ? 401 : 500 }
    );
  }
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
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 20), 1), 100);
    const skip = (page - 1) * limit;

    const [responses, total] = await Promise.all([
      ContactResponse.find({ contact: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email")
        .lean(),
      ContactResponse.countDocuments({ contact: id }),
    ]);

    return NextResponse.json(
      {
        responses,
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
    console.error("Error fetching contact responses:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("login") || err.message?.includes("Not allowed") ? 401 : 500 }
    );
  }
}
