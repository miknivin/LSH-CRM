import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export interface ExtendedNextRequest extends NextRequest {
  validatedBody?: {
    name: string;
    email: string;
    phone: string;
    userId: string;
    notes?: string;
    businessName?:string;
    businessType?: 'B2B' | 'B2C';
    city?: string;
    tags?:[];
    stage?:string;
    source?: string;
    preferredVisitingTime?: string;
    numberOfPeople?: number | string;
    preferredNightsAndDays?: string;
  };
}

export async function validateContactRequest(req: ExtendedNextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, userId } = body;

    // Validate required fields
    if (!name || !email || !phone || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, phone, and userId are required" },
        { status: 400 }
      );
    }

    // Validate userId as ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid userId format" },
        { status: 400 }
      );
    }

    // Validate businessType enum (case-insensitive; normalized to uppercase)
    if (body.businessType) {
      const normalizedBusinessType = String(body.businessType).trim().toUpperCase();
      if (!["B2B", "B2C"].includes(normalizedBusinessType)) {
        return NextResponse.json(
          { error: "Invalid businessType: must be B2B or B2C" },
          { status: 400 }
        );
      }
      body.businessType = normalizedBusinessType;
    }

    // Attach validated body to request for use in handler
     req.validatedBody = body;
    return null; // Indicates validation passed
  } catch (error) {
    console.log(error);
    
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}