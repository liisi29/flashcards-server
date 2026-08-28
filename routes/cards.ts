import { Request, Response, Router } from "express";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
const _connection = require("../db/conn");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

const _collection = process.env.MONGO_COLLECTION || "flash1";
const _routes = Router();

_routes.post("/upload", upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file provided" }); return; }
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "flashcards" },
        (err, result) => err ? reject(err) : resolve(result)
      );
      stream.end(req.file!.buffer);
    });
    res.json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});

// GET /cards?viewer=Liisi&subjectId=123&topicId=456
_routes.get("/cards", async (req: Request, res: Response) => {
  try {
    const db = _connection.getDb();
    const query: any = {};
    if (req.query.viewer) query.viewers = req.query.viewer;
    if (req.query.subjectId) query.subjectId = req.query.subjectId;
    if (req.query.topicId) query.topicId = req.query.topicId;
    const result = await db.collection(_collection).find(query).toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch cards" });
  }
});


_routes.post("/cards/add", async (req: Request, res: Response) => {
  try {
    const db = _connection.getDb();
    const result = await db.collection(_collection).insertOne(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to add card" });
  }
});

_routes.put("/cards/:id", async (req: Request, res: Response) => {
  try {
    const { ObjectId } = require("mongodb");
    const db = _connection.getDb();
    const result = await db
      .collection(_collection)
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to update card" });
  }
});

// PATCH /cards/bulk-move — move many cards to a subject/topic and set their tags
// body: { cardIds: string[], subjectId, topicId, tagIds: string[] }
_routes.patch("/cards/bulk-move", async (req: Request, res: Response) => {
  try {
    const { ObjectId } = require("mongodb");
    const { cardIds, subjectId, topicId, tagIds } = req.body;
    if (!Array.isArray(cardIds) || !cardIds.length || !subjectId || !topicId) {
      res
        .status(400)
        .json({ error: "cardIds, subjectId, topicId required" });
      return;
    }
    const db = _connection.getDb();
    const ids = cardIds.map((id: string) => new ObjectId(id));
    const result = await db.collection(_collection).updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          subjectId,
          topicId,
          tagIds: Array.isArray(tagIds) ? tagIds : [],
        },
      }
    );
    // moved cards leave any group they were in
    await db
      .collection("groups")
      .updateMany({ cardIds: { $in: cardIds } }, {
        $pull: { cardIds: { $in: cardIds } },
      });
    res.json({ moved: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to move cards" });
  }
});

// PATCH /cards/:id/progress — update one person's progress color
_routes.patch("/cards/:id/progress", async (req: Request, res: Response) => {
  try {
    const { ObjectId } = require("mongodb");
    const { name, color } = req.body; // color: "red" | "yellow" | "green"
    const db = _connection.getDb();
    const result = await db
      .collection(_collection)
      .updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { [`progress.${name}`]: color } }
      );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to update progress" });
  }
});

_routes.delete("/cards/:id", async (req: Request, res: Response) => {
  try {
    const { ObjectId } = require("mongodb");
    const db = _connection.getDb();
    const result = await db
      .collection(_collection)
      .deleteOne({ _id: new ObjectId(req.params.id) });
    // drop the card from any group it was in
    await db
      .collection("groups")
      .updateMany(
        { cardIds: req.params.id },
        { $pull: { cardIds: req.params.id } }
      );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete card" });
  }
});

module.exports = _routes;
