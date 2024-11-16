const _app = require("express");
// This will help us connect to the database
const _connection = require("../db/conn");
const ObjectId = require("mongodb").ObjectId;

const _collection = process.env.MONGO_COLLECTION || "";
const _routes = _app.Router();

_routes
  .route("/booking")
  .get(async function (
    req: any,
    res: { json: (arg0: any) => void; status: any }
  ) {
    let db_connect;
    try {
      db_connect = _connection.getDb();
      console.log("Database connection established");
    } catch (err) {
      console.error("Error connecting to the database:", err);
      return res
        .status(500)
        .json({ error: "Failed to connect to the database" });
    }

    try {
      const result = await db_connect
        .collection(_collection)
        .find({})
        .toArray();
      console.log("Bookings fetched:", result);
      res.json(result); // Send the result as JSON
    } catch (err) {
      console.error("Error fetching bookings:", err);
      res.status(500).json({ error: "Failed to fetch countries" });
    }
  });
_routes
  .route("/booking/add")
  .post(function (
    req: { body: IBooking },
    response: { json: (arg0: any) => void }
  ) {
    let db_connect = _connection.getDb();
    let myobj = { ...req.body };
    db_connect
      .collection(_collection)
      .insertOne(myobj, function (err: any, res: any) {
        if (err) throw err;
        response.json(res);
      });
  });

// This section will help you update a record by id.
/* countryRoutes.route("/country/update/:id").post(function (
  req: {
    body: { code: any; flagUrl: any; orderNumber: any };
    params: { id: any };
  },
  response: { json: (arg0: any) => void }
) {
  let db_connect = dbo.getDb();
  let myquery = { _id: ObjectId(req.params.id) };
  let newvalues = {
    $set: {
      code: req.body.code,
      flagUrl: req.body.flagUrl,
      orderNumber: req.body.orderNumber,
    },
  };
  db_connect
    .collection(process.env.MONGO_COLLECTION)
    .updateOne(myquery, newvalues, function (err: any, res: any) {
      if (err) throw err;
      response.json(res);
    });
});



// This section will help you get a single country by id
countryRoutes
  .route("/country/:id")
  .get(function (
    req: { params: { id: any } },
    res: { json: (arg0: any) => void }
  ) {
    let db_connect = dboCountry.getDb();
    let myquery = { _id: ObjectId(req.params.id) };
    db_connect
      .collection("countries")
      .findOne(myquery, function (err: any, result: any) {
        if (err) throw err;
        res.json(result);
      });
  });

countryRoutes
  .route("/country/delete/:id")
  .delete(
    (req: { params: { id: any } }, response: { json: (arg0: any) => void }) => {
      let db_connect = dboCountry.getDb();
      let myquery = { _id: ObjectId(req.params.id) };
      db_connect
        .collection(process.env.MONGO_COLLECTION)
        .deleteOne(myquery, function (err: any, obj: any) {
          if (err) throw err;
          response.json(obj);
        });
    }
  );


 */

module.exports = _routes;

interface IBooking {
  checkIn: string;
  checkOut: string;
  price: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  message?: string;
}
