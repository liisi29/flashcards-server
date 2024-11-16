import { IEvent } from "../models/dto";

const expressEvent = require("express");

// countryRoutes is an instance of the country_express router.
// We use it to define our countryRoutes.
// The router will be added as a middleware and will take control of requests starting with path /record.
const routesEvent = expressEvent.Router();

// This will help us connect to the database
const dboEvent = require("../db/conn");

// This help convert the id from string to country_ObjectId for the _id.
const obIdEvent = require("mongodb").ObjectId;

// This section will help you get a list of all the countries.
routesEvent
  .route("/events")
  .get(function (req: any, res: { json: (arg0: any) => void }) {
    let db_connect = dboEvent.getDb("history");
    db_connect
      .collection("events")
      .find({})
      .toArray(function (err: any, result: any) {
        if (err) throw err;
        res.json(result);
      });
  });

// This section will help you get a single country by id
routesEvent
  .route("/events/:id")
  .get(function (
    req: { params: { id: any } },
    res: { json: (arg0: any) => void }
  ) {
    let db_connect = dboEvent.getDb();
    let myquery = { _id: obIdEvent(req.params.id) };
    db_connect
      .collection("events")
      .findOne(myquery, function (err: any, result: any) {
        if (err) throw err;
        res.json(result);
      });
  });

// This section will help you create a new record.
routesEvent
  .route("/events/add")
  .post((req: { body: IEvent }, response: { json: (arg0: any) => void }) => {
    const db_connect = dboEvent.getDb();

    const myobj = {
      countryIds: req.body.countryIds || [],
      priority: req.body.priority || 1,
      type: req.body.type || 0,
      dates: req.body.dates || {
        startDate: "1970-01-01",
        halfCenturies: [[20, false, true]],
      },
      name: req.body.name || "",
      description: {
        name: req.body.description?.name || "",
        links: req.body.description?.links || [],
      },
    };
    if (req.body._id) {
      const myquery = { _id: obIdEvent(req.body._id) };
      const newvalues = { $set: myobj };
      db_connect
        .collection(`events`)
        .updateOne(myquery, newvalues, (err: any, res: any) => {
          if (err) {
            throw err;
          }
          response.json(res);
        });
    } else {
      db_connect.collection("events").insertOne(myobj, (err: any, res: any) => {
        if (err) {
          throw err;
        }
        response.json(res);
      });
    }
  });
routesEvent
  .route("/events/delete/:id")
  .delete(
    (req: { params: { id: any } }, response: { json: (arg0: any) => void }) => {
      let db_connect = dboEvent.getDb();
      let myquery = { _id: obIdEvent(req.params.id) };
      db_connect
        .collection("events")
        .deleteOne(myquery, function (err: any, obj: any) {
          if (err) throw err;
          response.json(obj);
        });
    }
  );

module.exports = routesEvent;
