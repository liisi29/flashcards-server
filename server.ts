const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config({ path: "./.env" });
const port = process.env.PORT || 5000;
// Middleware
app.use(cors());
app.use(express.json());
app.use(require("./routes/booking"));
app.use(require("./routes/prices"));
// Import database connection and connect to MongoDB
const dbo = require("./db/conn");

app.listen(port, () => {
  // perform a database connection when server starts
  dbo.connectToServer(function (err: any) {
    if (err) console.error(err);
  });
  console.log(`Server is running on port: ${port}`);
});
