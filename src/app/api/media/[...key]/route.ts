import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { storage } from "@/lib/storage";

/**
 * Serves user media from the storage adapter.
 *
 * The lookup goes through the attachment table rather than straight to disk,
 * so a key has to belong to the current user before a single byte is read —
 * which is what keeps this honest once the app is more than one person.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const storageKey = key.map(decodeURIComponent).join("/");

  const userId = await getCurrentUserId();
  const attachment = await prisma.attachment.findFirst({
    where: { storageKey, userId },
  });

  if (!attachment) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const bytes = await storage.read(storageKey);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          attachment.fileName ?? "file",
        )}"`,
      },
    });
  } catch {
    return new NextResponse("File missing from storage", { status: 404 });
  }
}
