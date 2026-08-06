/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from "@/app/lib/db/connection";
import { NextRequest, NextResponse } from "next/server";
import Contact, { IContact } from "@/app/models/Contact";
import mongoose, { FilterQuery } from "mongoose";
import { authorizeRoles, isAuthenticatedUser } from "../../middlewares/auth";
import ContactResponse, { contactResponseActivities } from "@/app/models/ContactResponse";
import "@/app/models/User"; // Registers "User" — required by the populate("assignedTo.user") call below

interface FilterBody {
  assignedTo?: { userId: string; isNot: boolean }[];
  pipelineNames?: string[];
  tags?: string[];
  activities?: { value: string; isNot: boolean }[];
  source?: string;
  createdAt?: {
    startDate?: string;
    endDate?: string;
  };
  updatedAt?: {
    startDate?: string;
    endDate?: string;
  };
  stage?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const user = await isAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Need to login" },
        { status: 400 }
      );
    }

    // Authorize roles
    let isAdmin = false;
    try {
      authorizeRoles(user, "admin");
      isAdmin = true;
    } catch (error) {
      console.log("Admin authorization failed:", error);
      try {
        authorizeRoles(user, "team_member");
      } catch (error) {
        console.log("Team member authorization failed:", error);
        return NextResponse.json(
          { error: "User is neither admin nor team member" },
          { status: 401 }
        );
      }
    }

    await dbConnect();

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const keyword = searchParams.get("keyword") || "";

    // Parse filter body
    let filter: FilterBody;
    try {
      filter = await req.json();
    } catch (error) {
      console.error("Error parsing filter:", error);
      return NextResponse.json(
        { error: "Invalid filter format" },
        { status: 400 }
      );
    }

    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: "Invalid page or limit" },
        { status: 400 }
      );
    }

    // Build search query
    const searchQuery: FilterQuery<IContact> = {};

    // Restrict team_member to their own contacts
    if (!isAdmin) {
      searchQuery["assignedTo.user"] = user._id;
      if (filter.assignedTo && filter.assignedTo.length > 0) {
        return NextResponse.json(
          { error: "Team members can only view their own assigned contacts" },
          { status: 403 }
        );
      }
    } else if (filter.assignedTo && filter.assignedTo.length > 0) {
      const includeUsers = filter.assignedTo
        .filter((a) => !a.isNot && mongoose.Types.ObjectId.isValid(a.userId))
        .map((a) => new mongoose.Types.ObjectId(a.userId));
      const excludeUsers = filter.assignedTo
        .filter((a) => a.isNot && mongoose.Types.ObjectId.isValid(a.userId))
        .map((a) => new mongoose.Types.ObjectId(a.userId));

      if (includeUsers.length > 0 || excludeUsers.length > 0) {
        searchQuery["assignedTo.user"] = {};
        if (includeUsers.length > 0) {
          searchQuery["assignedTo.user"].$in = includeUsers;
        }
        if (excludeUsers.length > 0) {
          searchQuery["assignedTo.user"].$nin = excludeUsers;
        }
      }
    }

    // Keyword search
    if (keyword) {
      const regex = { $regex: keyword, $options: "i" };
      searchQuery.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { notes: regex },
      ];
    }

    // Pipeline names
    if (filter.pipelineNames?.length) {
      searchQuery["pipelinesActive.pipelineName"] = { $in: filter.pipelineNames };
    }

    // Tags
    if (filter.tags?.length) {
      searchQuery["tags.name"] = { $in: filter.tags };
    }

    // Source
    if (filter.source) {
      searchQuery.source = filter.source;
    }

    // === ACTIVITIES FILTERING (including NO_ACTIVITY_RECORDED) ===
    // "Activities" here means logged call-response outcomes (ContactResponse
    // docs — HAD_CONVERSATION, CALLED_NOT_PICKED, etc.), not the generic
    // ActivityLog/Contact.activities audit trail. Those are a different enum
    // entirely, so querying ActivityLog.event for these values always
    // returned zero matches — the filter could never work.
    if (filter.activities && filter.activities.length > 0) {
      const validActivities: string[] = [...contactResponseActivities, 'NO_ACTIVITY_RECORDED'];

      const invalidActivities = filter.activities.filter(
        (a) => !validActivities.includes(a.value)
      );
      if (invalidActivities.length > 0) {
        return NextResponse.json(
          { error: `Invalid activity values: ${invalidActivities.map(a => a.value).join(", ")}` },
          { status: 400 }
        );
      }

      // Separate NO_ACTIVITY_RECORDED logic
      const noActivityFilters = filter.activities.filter(a => a.value === 'NO_ACTIVITY_RECORDED');
      const regularActivityFilters = filter.activities.filter(a => a.value !== 'NO_ACTIVITY_RECORDED');

      // Handle "No activity recorded" (contacts with zero logged responses)
      if (noActivityFilters.length > 0) {
        const wantsNoActivity = noActivityFilters.some(a => !a.isNot);
        const wantsHasActivity = noActivityFilters.some(a => a.isNot);

        if (wantsNoActivity && wantsHasActivity) {
          // Contradictory: both "no activity" and "has activity" → impossible
          return NextResponse.json(
            { error: "Cannot combine 'No activity recorded' with 'Not No activity recorded'" },
            { status: 400 }
          );
        }

        const respondedContactIds = await ContactResponse.distinct('contact');
        const respondedIdSet = new Set(respondedContactIds.map((id) => id.toString()));

        if (wantsNoActivity) {
          searchQuery._id = searchQuery._id?.$in
            ? { $in: (searchQuery._id.$in as mongoose.Types.ObjectId[]).filter(id => !respondedIdSet.has(id.toString())) }
            : { $nin: respondedContactIds };
        } else if (wantsHasActivity) {
          searchQuery._id = searchQuery._id?.$in
            ? { $in: (searchQuery._id.$in as mongoose.Types.ObjectId[]).filter(id => respondedIdSet.has(id.toString())) }
            : { $in: respondedContactIds };
        }
      }

      // Handle specific call-response activities (HAD_CONVERSATION, etc.)
      if (regularActivityFilters.length > 0) {
        const includeActivities = regularActivityFilters
          .filter((a) => !a.isNot)
          .map((a) => a.value);
        const excludeActivities = regularActivityFilters
          .filter((a) => a.isNot)
          .map((a) => a.value);

        if (includeActivities.length > 0) {
          const includeContactIds = await ContactResponse.distinct('contact', { activity: { $in: includeActivities } });

          if (includeContactIds.length === 0) {
            searchQuery._id = { $in: [] }; // No matches → empty result
          } else {
            const includeIdSet = new Set(includeContactIds.map((id) => id.toString()));
            searchQuery._id = searchQuery._id?.$in
              ? { $in: (searchQuery._id.$in as mongoose.Types.ObjectId[]).filter(id => includeIdSet.has(id.toString())) }
              : { $in: includeContactIds };
          }
        }

        if (excludeActivities.length > 0) {
          const excludeContactIds = await ContactResponse.distinct('contact', { activity: { $in: excludeActivities } });

          if (excludeContactIds.length > 0) {
            const excludeIdSet = new Set(excludeContactIds.map((id) => id.toString()));
            if (searchQuery._id?.$in) {
              searchQuery._id.$in = (searchQuery._id.$in as mongoose.Types.ObjectId[]).filter(
                id => !excludeIdSet.has(id.toString())
              );
              if ((searchQuery._id.$in as any[]).length === 0) {
                searchQuery._id = { $in: [] };
              }
            } else {
              searchQuery._id = { $nin: excludeContactIds };
            }
          }
        }
      }
    }

    // Date filters (createdAt, updatedAt)
    if (filter.createdAt) {
      searchQuery.createdAt = {};
      if (filter.createdAt.startDate) {
        try {
          const startDate = new Date(filter.createdAt.startDate);
          startDate.setHours(0, 0, 0, 0);
          searchQuery.createdAt.$gte = startDate;
        } catch (error) {
          console.log(error);
          
          return NextResponse.json({ error: "Invalid startDate format" }, { status: 400 });
        }
      }
      if (filter.createdAt.endDate) {
        try {
          const endDate = new Date(filter.createdAt.endDate);
          endDate.setHours(23, 59, 59, 999);
          searchQuery.createdAt.$lte = endDate;
        } catch (error) {
          console.log(error);
          return NextResponse.json({ error: "Invalid endDate format" }, { status: 400 });
        }
      }
      if (Object.keys(searchQuery.createdAt).length === 0) delete searchQuery.createdAt;
    }

    if (filter.updatedAt) {
      searchQuery.updatedAt = {};
      if (filter.updatedAt.startDate) {
        try {
          const startDate = new Date(filter.updatedAt.startDate);
          startDate.setHours(0, 0, 0, 0);
          searchQuery.updatedAt.$gte = startDate;
        } catch (error) {
          console.log(error);
          return NextResponse.json({ error: "Invalid updatedAt startDate format" }, { status: 400 });
        }
      }
      if (filter.updatedAt.endDate) {
        try {
          const endDate = new Date(filter.updatedAt.endDate);
          endDate.setHours(23, 59, 59, 999);
          searchQuery.updatedAt.$lte = endDate;
        } catch (error) {
          console.log(error);
          return NextResponse.json({ error: "Invalid updatedAt endDate format" }, { status: 400 });
        }
      }
      if (Object.keys(searchQuery.updatedAt).length === 0) delete searchQuery.updatedAt;
    }

    // Stage filter
    if (filter.stage) {
      if (mongoose.Types.ObjectId.isValid(filter.stage)) {
        searchQuery["pipelinesActive.stage_id"] = new mongoose.Types.ObjectId(filter.stage);
      } else {
        return NextResponse.json({ error: "Invalid stage ID" }, { status: 400 });
      }
    }

    const skip = (page - 1) * limit;

    const [contacts, total] = await Promise.all([
      Contact.find(searchQuery)
        .select("-activities -uid")
        .populate("assignedTo.user", "name email")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Contact.countDocuments(searchQuery),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        message: "Contacts retrieved successfully",
        contacts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
