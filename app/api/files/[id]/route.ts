import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";

type FileDocument = {
  userEmail: string;
  name: string;
  language: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await request.json()) as {
    name?: string;
    language?: string;
    code?: string;
  };

  const nextName = (body.name || "Untitled").trim().slice(0, 80);
  const nextLanguage = (body.language || "").trim();
  const nextCode = body.code || "";

  if (!nextLanguage) {
    return NextResponse.json({ error: "Language is required" }, { status: 400 });
  }

  const now = new Date();
  const db = await getDatabase();

  const result = await db.collection<FileDocument>("code_files").findOneAndUpdate(
    {
      _id: new ObjectId(id),
      userEmail: email,
    },
    {
      $set: {
        name: nextName || "Untitled",
        language: nextLanguage,
        code: nextCode,
        updatedAt: now,
      },
    },
    { returnDocument: "after" }
  );

  if (!result) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json({
    file: {
      id,
      name: result.name,
      language: result.language,
      code: result.code,
      updatedAt: result.updatedAt,
    },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const db = await getDatabase();
  const result = await db.collection<FileDocument>("code_files").deleteOne({
    _id: new ObjectId(id),
    userEmail: email,
  });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
