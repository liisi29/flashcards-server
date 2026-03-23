import { Request, Response, Router } from "express";
const _connection = require("../db/conn");
const { ObjectId } = require("mongodb");

const _routes = Router();
const _collection = "subjects";

// GET /subjects?viewer=Liisi — all top-level subjects (no parentId)
_routes.get("/subjects", async (req: Request, res: Response) => {
  try {
    const db = _connection.getDb();
    const query: any = { parentId: null };
    const result = await db.collection(_collection).find(query).toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

// GET /topics?subjectId=123 — topics under a subject
_routes.get("/topics", async (req: Request, res: Response) => {
  try {
    const db = _connection.getDb();
    if (!req.query.subjectId) { res.json([]); return; }
    const result = await db
      .collection(_collection)
      .find({ parentId: req.query.subjectId })
      .toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch topics" });
  }
});

// POST /subjects — create subject or topic
// body: { label, parentId? }
_routes.post("/subjects", async (req: Request, res: Response) => {
  try {
    const db = _connection.getDb();
    const doc = {
      label: req.body.label,
      parentId: req.body.parentId || null,
    };
    const result = await db.collection(_collection).insertOne(doc);
    res.status(201).json({ _id: result.insertedId, ...doc });
  } catch (err) {
    res.status(500).json({ error: "Failed to create subject" });
  }
});

// PUT /subjects/:id — rename
_routes.put("/subjects/:id", async (req: Request, res: Response) => {
  try {
    const db = _connection.getDb();
    await db
      .collection(_collection)
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: { label: req.body.label } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update subject" });
  }
});

// DELETE /subjects/:id — delete subject and its topics
_routes.delete("/subjects/:id", async (req: Request, res: Response) => {
  try {
    const db = _connection.getDb();
    await db.collection(_collection).deleteMany({
      $or: [{ _id: new ObjectId(req.params.id) }, { parentId: req.params.id }],
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete subject" });
  }
});

module.exports = _routes;
