import { Request, Response, Router } from "express";
const _connection = require("../db/conn");

const USERSTATE_COLLECTION = "userstate";
const _routes = Router();

// GET /userstate/:user
//   -> { learntGroups: {...}, learnPos: {...}, settings: {...}, lastActive }
_routes.get("/userstate/:user", async (req: Request, res: Response) => {
  try {
    const db = _connection.getDb();
    const doc = await db
      .collection(USERSTATE_COLLECTION)
      .findOne({ _id: req.params.user });
    res.json(
      doc || {
        _id: req.params.user,
        learntGroups: {},
        learnPos: {},
        settings: {},
        lastActive: null,
      }
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user state" });
  }
});

// PATCH /userstate/:user/touch
// Stamps lastActive with the current time — called when a user opens
// the app, so the household can see who's been studying recently.
_routes.patch(
  "/userstate/:user/touch",
  async (req: Request, res: Response) => {
    try {
      const db = _connection.getDb();
      const lastActive = new Date();
      await db
        .collection(USERSTATE_COLLECTION)
        .updateOne(
          { _id: req.params.user },
          { $set: { lastActive } },
          { upsert: true }
        );
      res.json({ ok: true, lastActive });
    } catch (err) {
      res.status(500).json({ error: "Failed to update last active" });
    }
  }
);

// PATCH /userstate/:user/settings  { <key>: <value>, ... }
// Merges a partial settings object (card background, group size, start
// side, …) so preferences follow the user across devices.
const ALLOWED_SETTINGS = new Set([
  "cardBgS1",
  "cardBgS2",
  "groupSize",
  "startSide",
]);
_routes.patch(
  "/userstate/:user/settings",
  async (req: Request, res: Response) => {
    try {
      const patch = req.body && typeof req.body === "object" ? req.body : {};
      const $set: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch)) {
        if (ALLOWED_SETTINGS.has(k)) $set[`settings.${k}`] = v;
      }
      if (Object.keys($set).length === 0) {
        res.status(400).json({ error: "no valid settings keys" });
        return;
      }
      const db = _connection.getDb();
      await db
        .collection(USERSTATE_COLLECTION)
        .updateOne({ _id: req.params.user }, { $set }, { upsert: true });
      const doc = await db
        .collection(USERSTATE_COLLECTION)
        .findOne({ _id: req.params.user });
      res.json(doc?.settings || {});
    } catch (err) {
      res.status(500).json({ error: "Failed to save settings" });
    }
  }
);

// PATCH /userstate/:user/learnpos  { key: "<tagId>|<size>", group: number|null }
// Remembers which runtime group the user last practised, per (tag, group size),
// so learning resumes in the same place across devices.
_routes.patch(
  "/userstate/:user/learnpos",
  async (req: Request, res: Response) => {
    try {
      const { key, group } = req.body;
      if (!key || typeof key !== "string") {
        res.status(400).json({ error: "key required" });
        return;
      }
      const db = _connection.getDb();
      const update =
        group == null
          ? { $unset: { [`learnPos.${key}`]: "" } }
          : { $set: { [`learnPos.${key}`]: Number(group) } };
      await db
        .collection(USERSTATE_COLLECTION)
        .updateOne({ _id: req.params.user }, update, { upsert: true });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to save learn position" });
    }
  }
);

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
