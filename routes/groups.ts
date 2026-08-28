import { Request, Response, Router } from "express";
const _connection = require("../db/conn");
const { ObjectId } = require("mongodb");

const GROUPS_COLLECTION = "groups";
const _routes = Router();

// GET /groups?subjectId=&topicId=&tagId=  (any subset; tagId narrows to one tag)
_routes.get("/groups", async (req: Request, res: Response) => {
  try {
    const db = _connection.getDb();
    const query: any = {};
    if (req.query.subjectId) query.subjectId = req.query.subjectId;
    if (req.query.topicId) query.topicId = req.query.topicId;
    if (req.query.tagId) query.tagId = req.query.tagId;
    const result = await db
      .collection(GROUPS_COLLECTION)
      .find(query)
      .sort({ order: 1 })
      .toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

// POST /groups  { name, subjectId, topicId, tagId, cardIds? }
// Groups always belong to a tag.
_routes.post("/groups", async (req: Request, res: Response) => {
  try {
    const { name, subjectId, topicId, tagId } = req.body;
    if (!name || !subjectId || !topicId || !tagId) {
      res
        .status(400)
        .json({ error: "name, subjectId, topicId, tagId required" });
      return;
    }
    const db = _connection.getDb();
    // next order value within this tag
    const last = await db
      .collection(GROUPS_COLLECTION)
      .find({ tagId })
      .sort({ order: -1 })
      .limit(1)
      .toArray();
    const order = last.length ? (last[0].order ?? 0) + 1 : 0;
    const doc = {
      name,
      subjectId,
      topicId,
      tagId,
      cardIds: Array.isArray(req.body.cardIds) ? req.body.cardIds : [],
      order,
    };
    const result = await db.collection(GROUPS_COLLECTION).insertOne(doc);
    const inserted = await db
      .collection(GROUPS_COLLECTION)
      .findOne({ _id: result.insertedId });
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: "Failed to create group" });
  }
});

// PUT /groups/:id  { name?, cardIds?, order? }  (tagId is fixed once created)
_routes.put("/groups/:id", async (req: Request, res: Response) => {
  try {
    const db = _connection.getDb();
    const set: any = {};
    if (typeof req.body.name === "string") set.name = req.body.name;
    if (Array.isArray(req.body.cardIds)) set.cardIds = req.body.cardIds;
    if (typeof req.body.order === "number") set.order = req.body.order;
    await db
      .collection(GROUPS_COLLECTION)
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: set });
    const updated = await db
      .collection(GROUPS_COLLECTION)
      .findOne({ _id: new ObjectId(req.params.id) });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update group" });
  }
});

// PATCH /groups/:id/cards  { add?: string[], remove?: string[] }
// Strips the added cards out of every other group with the SAME tag,
// enforcing "one group per card, per tag".
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
      // remove these cards from other groups under the same tag
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
    const updated = await db.collection(GROUPS_COLLECTION).findOne({ _id: id });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update group cards" });
  }
});

_routes.delete("/groups/:id", async (req: Request, res: Response) => {
  try {
    const db = _connection.getDb();
    await db
      .collection(GROUPS_COLLECTION)
      .deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete group" });
  }
});

module.exports = _routes;
