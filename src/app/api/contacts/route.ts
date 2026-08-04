/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from "@/app/lib/db/connection";
import { NextRequest, NextResponse } from "next/server";
import { ExtendedNextRequest, validateContactRequest } from "../middlewares/validateContactCreate";
import Contact from "@/app/models/Contact";
import Pipeline from "@/app/models/Pipeline";
import Stage from "@/app/models/Stage";
import mongoose from "mongoose";
import { isAuthenticatedUser } from "../middlewares/auth";
import { logContactActivity } from "../utils/activityLog";

export async function POST(req: NextRequest) {
  const validationResponse = await validateContactRequest(req as ExtendedNextRequest);
  if (validationResponse) {
    return validationResponse;
  }

  try {
     await dbConnect();
    
    
    const user = await isAuthenticatedUser(req);
 
    const {
      name,
      email,
      phone,
      notes,
      userId,
      tags = [],
      stage,
      businessName,
      preferredVisitingTime,
      numberOfPeople,
      preferredNightsAndDays,
    } = (req as ExtendedNextRequest).validatedBody!;

    const parsedNumberOfPeople =
      numberOfPeople !== undefined && numberOfPeople !== ""
        ? Number(String(numberOfPeople).replace(/[^\d.]/g, ""))
        : undefined;

    const tagSubdocuments = tags
      ? tags.map((tagName: string) => ({
          user: new mongoose.Types.ObjectId(userId),
          name: tagName,
        }))
      : [];

    // Prepare assignedTo based on user role
    const assignedTo = user.role === "team_member"
      ? [
          {
            user: new mongoose.Types.ObjectId(user._id),
            time: new Date(),
          },
        ]
      : [];

    // Prepare contact data
    const contactData = {
      name,
      email,
      phone,
      notes,
      user: new mongoose.Types.ObjectId(userId),
      businessName,
      tags: tagSubdocuments,
      assignedTo, // Include assignedTo in contactData
      ...(preferredVisitingTime ? { preferredVisitingTime } : {}),
      ...(parsedNumberOfPeople !== undefined && !Number.isNaN(parsedNumberOfPeople)
        ? { numberOfPeople: parsedNumberOfPeople }
        : {}),
      ...(preferredNightsAndDays ? { preferredNightsAndDays } : {}),
    };

    // Define pipeline and stage IDs
    const pipelineId = new mongoose.Types.ObjectId(process.env.DEFAULT_PIPELINE || "682da76cb5aab2e983c88634");
    let stageId = new mongoose.Types.ObjectId(process.env.DEFAULT_STAGE || "682da76db5aab2e983c88636");

    // If stage is provided in the request body, use it
    if (stage) {
      try {
        stageId = new mongoose.Types.ObjectId(stage);
      } catch (error) {
        console.log(error);
        
        return NextResponse.json(
          { error: "Invalid stage ID format" },
          { status: 400 }
        );
      }
    }

    // Validate pipeline existence
    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) {
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 }
      );
    }

    // Validate stage existence and ensure it belongs to the pipeline
    const stageDoc = await Stage.findOne({ _id: stageId, pipeline_id: pipelineId });
    if (!stageDoc) {
      return NextResponse.json(
        { error: "Stage not found or does not belong to the specified pipeline" },
        { status: 404 }
      );
    }

    const session = await mongoose.startSession();
    let contact;
    try {
      await session.withTransaction(async () => {
        const existingContact = await Contact.exists({ email }).session(session);
        contact = await Contact.upsertContact(
          {
            ...contactData,
            tags: new mongoose.Types.DocumentArray(tagSubdocuments),
            assignedTo: new mongoose.Types.DocumentArray(assignedTo),
          },
          new mongoose.Types.ObjectId(userId),
          session
        );

        if (!existingContact) {
          await logContactActivity({
            contactId: contact._id,
            event: "CONTACT_CREATED",
            description: `Contact created: ${contact.name}`,
            performedBy: userId,
            metadata: { name, email, phone },
            session,
          });
        }

        // Add contact to the pipeline's pipelinesActive array
        const pipelineActiveEntry = {
          pipeline_id: pipelineId,
          stage_id: stageId,
          order: 0, // Default order; adjust as needed
        };

        // Batch every mutation onto this document into local pushes, then a
        // single .save() — chaining separate .save()/.logActivity() calls
        // here previously raced Contact.upsertContact()'s own internal save
        // (and each other) into Mongoose VersionErrors, since every .save()
        // re-checks the document version against whatever's already in the
        // DB. One save means one version check.
        contact.pipelinesActive.push(pipelineActiveEntry);
        contact.activities.push({
          action: "PIPELINE_ADDED",
          user: new mongoose.Types.ObjectId(userId),
          details: { pipelineId: pipelineId.toString(), stageId: stageId.toString() },
          createdAt: new Date(),
        });

        if (user.role === "team_member") {
          contact.activities.push({
            action: "ASSIGNED_TO_UPDATED",
            user: new mongoose.Types.ObjectId(userId),
            details: { assignedUserId: user._id },
            createdAt: new Date(),
          });
        }

        if (tags && tags.length > 0) {
          for (const tagName of tags) {
            contact.activities.push({
              action: "TAG_ADDED",
              user: new mongoose.Types.ObjectId(userId),
              details: { tagName },
              createdAt: new Date(),
            });
          }
        }

        await contact.save({ session });
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json(
      {
        message: "Contact created/updated successfully and added to pipeline",
        contact,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating contact or adding to pipeline:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
