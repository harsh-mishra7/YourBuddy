-- Formatting for entry bodies: bold, italic, underline.
--
-- Added alongside `body` rather than replacing it. `body` stays plain text and
-- remains what search matches on, what a voice transcript fills, and what any
-- later reader can rely on; `bodyRich` holds the same words with their marks,
-- as the HTML subset `src/lib/rich-text.ts` sanitizes to.
--
-- NULL means "nothing is formatted" — every existing entry, and every future
-- one written without pressing a mark. Nothing to backfill: a NULL rich copy
-- renders from `body`.

-- AlterTable
ALTER TABLE "Entry" ADD COLUMN "bodyRich" TEXT;
