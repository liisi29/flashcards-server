import { Request, Response, Router } from "express";
const _connection = require("../db/conn");

const USERSTATE_COLLECTION = "userstate";
const _routes = Router();

// GET /userstate/:user  -> { learntGroups: { <groupId>: true }, ... }
_routes.get("/userstate/:user", async (req: Request, res: Response) => {
  try {
    const db = _connection.getDb();
    const doc = await db
      .collection(USERSTATE_COLLECTION)
      .findOne({ _id: req.params.user });
    res.json(doc || { _id: req.params.user, learntGroups: {} });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user state" });
  }
});

// PUT /userstate/:user  { learntGroups } — replaces the whole blob
_routes.put("/userstate/:user", async (req: Request, res: Response) => {
  try {
    const db = _connection.getDb();
    const learntGroups =
      req.body && typeof req.body.learntGroups === "object"
        ? req.body.learntGroups
        : {};
    await db
      .collection(USERSTATE_COLLECTION)
      .updateOne(
        { _id: req.params.user },
        { $set: { learntGroups } },
        { upsert: true }
      );
    res.json({ _id: req.params.user, learntGroups });
  } catch (err) {
    res.status(500).json({ error: "Failed to save user state" });
  }
});

// PATCH /userstate/:user/learnt  { groupId, learnt: boolean }
_routes.patch(
  "/userstate/:user/learnt",
  async (req: Request, res: Response) => {
    try {
      const { groupId, learnt } = req.body;
      if (!groupId) {
        res.status(400).json({ error: "groupId required" });
        return;
      }
      const db = _connection.getDb();
      const update = learnt
        ? { $set: { [`learntGroups.${groupId}`]: true } }
        : { $unset: { [`learntGroups.${groupId}`]: "" } };
      await db
        .collection(USERSTATE_COLLECTION)
        .updateOne({ _id: req.params.user }, update, { upsert: true });
      const doc = await db
        .collection(USERSTATE_COLLECTION)
        .findOne({ _id: req.params.user });
      res.json(doc || { _id: req.params.user, learntGroups: {} });
    } catch (err) {
      res.status(500).json({ error: "Failed to update learnt state" });
    }
  }
);

module.exports = _routes;
