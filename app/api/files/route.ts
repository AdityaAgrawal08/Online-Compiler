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

type FileResponse = {
  id: string;
  name: string;
  language: string;
  code: string;
  updatedAt: Date;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDatabase();
  const docs = await db
    .collection<FileDocument>("code_files")
    .find({ userEmail: email })
    .sort({ updatedAt: -1 })
    .toArray();

  return NextResponse.json({
    files: docs.map((doc) => {
      const typedDoc = doc as FileDocument & { _id: { toString: () => string } };

      const file: FileResponse = {
        id: typedDoc._id.toString(),
        name: typedDoc.name,
        language: typedDoc.language,
        code: typedDoc.code,
        updatedAt: typedDoc.updatedAt,
      };

      return file;
    }),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    language?: string;
    code?: string;
  };

  const name = (body.name || "Untitled").trim().slice(0, 80);
  const language = (body.language || "").trim();
  const code = body.code || "";

  if (!language) {
    return NextResponse.json({ error: "Language is required" }, { status: 400 });
  }

  const now = new Date();
  const db = await getDatabase();

  const result = await db.collection<FileDocument>("code_files").insertOne({
    userEmail: email,
    name: name || "Untitled",
    language,
    code,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({
    file: {
      id: String(result.insertedId),
      name: name || "Untitled",
      language,
      code,
      updatedAt: now,
    },
  });
}
