-- Drop Entry.kind (JOURNAL | THOUGHT).
--
-- It was only ever a badge colour. Nothing branched on it: the shelf split is
-- `entryDate IS NULL`, search covers title/body/transcripts, and no query
-- filtered or ordered by kind. Worse, it encoded the same axis as the shelves
-- ("date is meaningful" vs "date is incidental") in a second place that could
-- contradict them — a dated thought meant nothing.
--
-- Discards 4 values (3 JOURNAL, 1 THOUGHT) that carried no meaning.

-- AlterTable
ALTER TABLE "Entry" DROP COLUMN "kind";

-- DropEnum
DROP TYPE "EntryKind";
