const _app = require("express");
// This will help us connect to the database
const _connection = require("../db/conn");
const ObjectId = require("mongodb").ObjectId;

const _collection = process.env.MONGO_COLLECTION || "";
console.log("mongo collection", _collection);
const _routes = _app.Router();

import { EmailParams, MailerSend, Recipient, Sender } from "mailersend";

const mailersend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || "", // Store your MailerSend API key securely
});

_routes
  .route("/bookings")
  .get(async function (
    req: any,
    res: { json: (arg0: any) => void; status: any }
  ) {
    let db_connect;
    try {
      db_connect = _connection.getDb();
      console.log("Database connection established", db_connect);
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
      res.json(result); // Send the result as JSON
    } catch (err) {
      console.error("Error fetching bookings:", err);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });
_routes
  .route("/bookings:id")
  .get(function (
    req: { params: { id: any } },
    res: { json: (arg0: any) => void }
  ) {
    let db_connect = _connection.getDb();
    let myquery = { _id: ObjectId(req.params.id) };
    db_connect
      .collection(_collection)
      .findOne(myquery, function (err: any, result: any) {
        if (err) throw err;
        res.json(result);
      });
  });

_routes
  .route("/booking/add")
  .post(async function (
    req: { body: IBooking },
    response: { json: (arg0: any) => void; status: any }
  ) {
    let db_connect = _connection.getDb();
    let myobj = { ...req.body };

    try {
      const res = await db_connect.collection(_collection).insertOne(myobj);

      const sentFrom = new Sender(
        "info@trial-0p7kx4xjxyvl9yjr.mlsender.net",
        "Liisi"
      );

      const recipients1 = [new Recipient(myobj.email || "", "You")];
      const recipients2 = [new Recipient("liisi.raidaru@gmail.com", "You")];

      const html = `<div><p><strong>Booking Confirmation</strong></p><p>We have received your request. We will contact you shortly.</p><div><p><strong>Check-In:</strong> ${
        myobj.checkIn
      }</p><p><strong>Check-Out:</strong>  ${
        myobj.checkOut
      }</p>           <p><strong>Price:</strong>  ${
        myobj.price
      }</p>       <p><strong>First Name:</strong> ${
        myobj.firstName
      }</p>        <p><strong>Last Name:</strong> ${
        myobj.lastName
      }</p>        <p><strong>Email:</strong>${myobj.email}</p>        ${
        !!myobj.message
          ? `<p><strong>Message:</strong>${myobj.message}</p>`
          : ""
      }</div>
        `;

      const text = `Booking Confirmation. We have received your request. We will contact you shortly. Details: - Check-In: ${
        myobj.checkIn
      } - Check-Out:  ${myobj.checkOut} - Price: ${myobj.price} - First Name: ${
        myobj.firstName
      } - Last Name: ${myobj.lastName} - Email: ${myobj.email} ${
        !!myobj.message ? `- Message: ${myobj.message}` : ""
      }`;

      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients1)
        .setReplyTo(sentFrom)
        .setSubject("Ocean One Booking Confirmation")
        .setHtml(html)
        .setText(text);
      const emailParams2 = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients2)
        .setReplyTo(sentFrom)
        .setSubject("Ocean One Booking Happened")
        .setText(text);
      // Send the email
      await mailersend.email
        .send(emailParams)
        .then((response: any) => {
          console.log("Email sent successfully:", response);
        })
        .catch((error: any) => {
          console.error("Failed to send email:", error);
        });
      await mailersend.email
        .send(emailParams2)
        .then((response: any) => {
          console.log("Confirmation sent successfully:", response);
        })
        .catch((error: any) => {
          console.error("Failed to send confirmation:", error);
        });

      response.status(201).json({ message: "success", res });
    } catch (err) {
      console.error("Error adding booking:", err);
      response.status(500).json({ error: err });
    }
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
  email: string;
  message?: string;
}
