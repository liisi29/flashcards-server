import { Request, Response, Router } from "express";
const _connection = require("../db/conn");
const { ObjectId } = require("mongodb");

const GROUPS_COLLECTION = "groups";
const CARDS_COLLECTION = process.env.MONGO_COLLECTION || "flash1";
const CHUNK = 15;
const _routes = Router();

const isDupKey = (err: any) => err && (err.code === 11000 || err.code === 11001);

// One-time: a unique index on (tagId, number) so concurrent materialization
// can't create two "Group 1"s for the same tag — the loser's insert throws
// and we just re-read.
let _indexReady: Promise<void> | null = null;
function ensureIndex(db: any) {
  if (!_indexReady) {
    _indexReady = db
      .collection(GROUPS_COLLECTION)
      .createIndex({ tagId: 1, number: 1 }, { unique: true })
      .then(() => {})
      .catch((err: any) => {
        // leave it unset so a later call retries; log once
        _indexReady = null;
        console.error("groups unique index failed:", err.message);
      });
  }
  return _indexReady;
}

// ── helpers ──────────────────────────────────────────────────────────────

// cards that carry a given tag, in stable insertion order
async function tagCards(db: any, tagId: string) {
  return db
    .collection(CARDS_COLLECTION)
    .find({ tagIds: tagId })
    .toArray();
}

// Ensure a tag's groups exist and cover every current card.
// - <= CHUNK cards        -> no groups
// - > CHUNK, none yet     -> create ceil(N/CHUNK) groups, chunk cards in order
// - already grouped, new  -> append unassigned cards to the last group,
//   spilling into fresh groups every CHUNK cards
async function ensureGroups(db: any, tagId: string) {
  await ensureIndex(db);
  const read = () =>
    db
      .collection(GROUPS_COLLECTION)
      .find({ tagId })
      .sort({ number: 1 })
      .toArray();

  const cards = await tagCards(db, tagId);
  let groups = await read();

  if (cards.length <= CHUNK && groups.length === 0) return groups;

  const cardIds: string[] = cards.map((c: any) => String(c._id));

  if (groups.length === 0) {
    // first materialization
    const docs = [];
    for (let i = 0; i < cardIds.length; i += CHUNK) {
      docs.push({
        subjectId: cards[i].subjectId,
        topicId: cards[i].topicId,
        tagId,
        number: docs.length + 1,
        cardIds: cardIds.slice(i, i + CHUNK),
      });
    }
    if (docs.length) {
      try {
        await db
          .collection(GROUPS_COLLECTION)
          .insertMany(docs, { ordered: false });
      } catch (err) {
        // another request materialized this tag first — that's fine
        if (!isDupKey(err)) throw err;
      }
    }
    return read();
  }

  // existing groups — file any card that isn't in a group yet
  const assigned = new Set<string>();
  groups.forEach((g: any) => (g.cardIds || []).forEach((id: string) => assigned.add(id)));
  const orphans = cardIds.filter((id) => !assigned.has(id));
  if (orphans.length === 0) return groups;

  let last = groups[groups.length - 1];
  let bucket: string[] = [...(last.cardIds || [])];
  const ops: any[] = [];
  let nextNumber = last.number + 1;

  for (const id of orphans) {
    if (bucket.length >= CHUNK) {
      ops.push({ set: last._id, cardIds: bucket });
      // start a new group — upsert on (tagId, number) so a concurrent
      // request adding the same group can't duplicate it
      const number = nextNumber++;
      await db.collection(GROUPS_COLLECTION).updateOne(
        { tagId, number },
        {
          $setOnInsert: {
            subjectId: cards[0].subjectId,
            topicId: cards[0].topicId,
            tagId,
            number,
            cardIds: [] as string[],
          },
        },
        { upsert: true }
      );
      last = await db
        .collection(GROUPS_COLLECTION)
        .findOne({ tagId, number });
      bucket = [];
    }
    bucket.push(id);
  }
  ops.push({ set: last._id, cardIds: bucket });

  for (const op of ops) {
    await db
      .collection(GROUPS_COLLECTION)
      .updateOne({ _id: op.set }, { $set: { cardIds: op.cardIds } });
  }

  return read();
}

// ── routes ───────────────────────────────────────────────────────────────

// GET /groups?tagId=  (required) — lazily materializes on read
// GET /groups?subjectId=&topicId=  — every already-materialized group in scope
_routes.get("/groups", async (req: Request, res: Response) => {
  try {
    const db = _connection.getDb();
    if (req.query.tagId) {
      const groups = await ensureGroups(db, String(req.query.tagId));
      res.json(groups);
      return;
    }
    const query: any = {};
    if (req.query.subjectId) query.subjectId = req.query.subjectId;
    if (req.query.topicId) query.topicId = req.query.topicId;
    const result = await db
      .collection(GROUPS_COLLECTION)
      .find(query)
      .sort({ number: 1 })
      .toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

// PATCH /groups/:id/cards  { add?: string[], remove?: string[] }
// Manual rebalancing between existing groups of the same tag. Adding a card
// pulls it out of every other group under that tag.
_routes.patch("/groups/:id/cards", async (req: Request, res: Response) => {
  try {
    const db = _connection.getDb();
    const id = new ObjectId(req.params.id);
    const group = await db.collection(GROUPS_COLLECTION).findOne({ _id: id });
    if (!group) {
      res.status(404).json({ error: "group not found" });
      return;
    }
    const add: string[] = Array.isArray(req.body.add) ? req.body.add : [];
    const remove: string[] = Array.isArray(req.body.remove)
      ? req.body.remove
      : [];

    if (add.length) {
      await db
        .collection(GROUPS_COLLECTION)
        .updateMany(
          { tagId: group.tagId, _id: { $ne: id } },
          { $pull: { cardIds: { $in: add } } }
        );
    }

    const current: string[] = group.cardIds || [];
    const next = current
      .filter((c) => !remove.includes(c))
      .concat(add.filter((c) => !current.includes(c)));

    await db
      .collection(GROUPS_COLLECTION)
      .updateOne({ _id: id }, { $set: { cardIds: next } });

    // return the whole tag's groups so the client stays in sync
    const groups = await db
      .collection(GROUPS_COLLECTION)
      .find({ tagId: group.tagId })
      .sort({ number: 1 })
      .toArray();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: "Failed to update group cards" });
  }
});

module.exports = _routes;
