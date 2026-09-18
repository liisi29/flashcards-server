import { Request, Response, Router } from "express";
const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const _connection = require("../db/conn");

const _collection = process.env.MONGO_COLLECTION || "flash1";
const _routes = Router();

const SHARES_COLLECTION = "shares";
const SUBJECTS_COLLECTION = "subjects";
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// POST /share — mint a new token for a topic
// body: { subjectId, topicId }
_routes.post("/share", async (req: Request, res: Response) => {
  try {
    const { subjectId, topicId } = req.body;
    if (!subjectId || !topicId) {
      res.status(400).json({ error: "subjectId, topicId required" });
      return;
    }
    const token = crypto.randomBytes(9).toString("base64url");
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + EXPIRY_MS);
    const db = _connection.getDb();
    await db
      .collection(SHARES_COLLECTION)
      .insertOne({ _id: token, subjectId, topicId, createdAt, expiresAt });
    res.status(201).json({ token, expiresAt });
  } catch (err) {
    res.status(500).json({ error: "Failed to create share" });
  }
});

// GET /share/:token — read-only topic label + cards (front/back only)
_routes.get("/share/:token", async (req: Request, res: Response) => {
  try {
    const db = _connection.getDb();
    const share = await db
      .collection(SHARES_COLLECTION)
      .findOne({ _id: req.params.token });
    if (!share || share.expiresAt < new Date()) {
      res.status(404).json({ error: "Share not found" });
      return;
    }
    const topic = await db
      .collection(SUBJECTS_COLLECTION)
      .findOne({ _id: new ObjectId(share.topicId) });
    const cards = await db
      .collection(_collection)
      .find({ topicId: share.topicId })
      .project({ s1: 1, s2: 1 })
      .toArray();
    res.json({ topicLabel: topic?.label ?? "", cards });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch share" });
  }
});

module.exports = _routes;
