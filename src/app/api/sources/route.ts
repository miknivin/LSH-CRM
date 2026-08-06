import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/app/lib/db/connection";
import Source from "@/app/models/Source";
import { authorizeRoles, isAuthenticatedUser } from "@/app/api/middlewares/auth";

const DEFAULT_SOURCES = ["Facebook", "SEO"];

// Self-heals an empty Source collection the first time anyone hits this
// route, in any environment (dev, production) — so the two default sources
// don't depend on someone remembering to run the seed script by hand there.
async function ensureDefaultSources() {
  const count = await Source.estimatedDocumentCount();
  if (count > 0) return;

  await Source.insertMany(
    DEFAULT_SOURCES.map((title) => ({ title })),
    { ordered: false }
  ).catch(() => {
    // Ignore duplicate-key races from a concurrent first request.
  });
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, "admin", "team_member");

    await ensureDefaultSources();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 20), 1), 50);

    const query = search ? { title: { $regex: search, $options: "i" } } : {};

    const sources = await Source.find(query).sort({ title: 1 }).limit(limit).lean();

    return NextResponse.json({ sources }, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.message?.includes("login") || err.message?.includes("Not allowed") ? 401 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const user = await isAuthenticatedUser(req);
    authorizeRoles(user, "admin", "team_member");

    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Source title is required" }, { status: 400 });
    }
    if (title.length > 100) {
      return NextResponse.json({ error: "Source title cannot exceed 100 characters" }, { status: 400 });
    }

    // Case-insensitive existing match wins over creating a near-duplicate
    // ("facebook" typed after "Facebook" already exists just selects it).
    const existing = await Source.findOne({ title: { $regex: `^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
    if (existing) {
      return NextResponse.json({ message: "Source already exists", source: existing }, { status: 200 });
    }

    const source = await Source.create({ title });
    return NextResponse.json({ message: "Source created successfully", source }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    const status = err.message?.includes("login") || err.message?.includes("Not allowed") ? 401 : 500;
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "Source already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || "Internal server error" }, { status });
  }
}
