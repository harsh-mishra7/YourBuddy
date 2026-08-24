import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/user";
import { storage } from "@/lib/storage";

/**
 * Serves user media from the storage adapter.
 *
 * The lookup goes through the attachment table rather than straight to disk,
 * so a key has to belong to the *requesting* user before a single byte is
 * read. That check was written when there was one account and nothing to
 * protect; it is now the only thing standing between one person's voice notes
 * and anyone who can guess a URL.
 *
 * `getSessionUser` rather than `requireUser`: this is fetched by <img> and
 * <audio> tags, and redirecting those to an HTML login page produces a broken
 * image instead of an error anyone can act on.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const storageKey = key.map(decodeURIComponent).join("/");

  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const attachment = await prisma.attachment.findFirst({
    where: { storageKey, userId: user.id },
  });

  // 404 rather than 403 for someone else's file — a distinguishable "exists
  // but isn't yours" would confirm which keys are real.
  if (!attachment) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const bytes = await storage.read(storageKey);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(bytes.byteLength),
        // Stored objects never change, so they stay cacheable — but only in
        // the requesting browser's own cache. "private" matters more than it
        // used to: a shared cache holding this would be holding one specific
        // person's journal. (Caveat worth knowing: on a browser profile shared
        // by two accounts, a cached file survives the account switch for
        // anyone who still has the exact URL.)
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
