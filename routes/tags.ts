import { Request, Response, Router } from "express";
const _connection = require("../db/conn");

const TAGS_COLLECTION = "tags";
const _routes = Router();

// GET /tags?subjectId=&topicId=
_routes.get("/tags", async (req: Request, res: Response) => {
  try {
    const db = _connection.getDb();
    const query: any = {};
    if (req.query.subjectId) query.subjectId = req.query.subjectId;
    if (req.query.topicId) query.topicId = req.query.topicId;
    const result = await db.collection(TAGS_COLLECTION).find(query).toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

_routes.post("/tags", async (req: Request, res: Response) => {
  try {
    const { name, color, subjectId, topicId } = req.body;
    if (!name) { res.status(400).json({ error: "name required" }); return; }
    const db = _connection.getDb();
    const result = await db.collection(TAGS_COLLECTION).insertOne({ name, color: color || "#94a3b8", subjectId, topicId });
    const inserted = await db.collection(TAGS_COLLECTION).findOne({ _id: result.insertedId });
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: "Failed to create tag" });
  }
});

_routes.put("/tags/:id", async (req: Request, res: Response) => {
  try {
    const { ObjectId } = require("mongodb");
    const { name, color } = req.body;
    const db = _connection.getDb();
    await db.collection(TAGS_COLLECTION).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, color } }
    );
    const updated = await db.collection(TAGS_COLLECTION).findOne({ _id: new ObjectId(req.params.id) });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update tag" });
  }
});

_routes.delete("/tags/:id", async (req: Request, res: Response) => {
  try {
    const { ObjectId } = require("mongodb");
    const db = _connection.getDb();
    await db.collection(TAGS_COLLECTION).deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete tag" });
  }
});

module.exports = _routes;
