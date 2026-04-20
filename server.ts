const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config({ path: "./.env" });
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(require("./routes/cards"));
app.use(require("./routes/subjects"));
app.use(require("./routes/tags"));

const dbo = require("./db/conn");

app.listen(port, () => {
  dbo.connectToServer(function (err: any) {
    if (err) {
      console.error("Server failed to connect to DB:", err);
    }
  });
  console.log(`Server is running on port: ${port}`);
});
