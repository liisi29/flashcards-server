const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.ATLAS_URI;
const mongoDB = process.env.MONGO_DB || ""; // Use your database name

let _db: any; // Placeholder for the database connection

const client = new MongoClient(uri);

module.exports = {
  connectToServer: async function (callback: (err: any) => void) {
    try {
      await client.connect();
      _db = client.db(mongoDB);
      console.log(`Connected to database: ${mongoDB}`);
      return callback(null);
    } catch (err) {
      console.error("Error connecting to MongoDB:", err);
      return callback(err);
    }
  },

  getDb: function () {
    if (!_db) {
      console.error("No database connection available.");
      return null; // Return null if the database connection is not established
    }
    return _db; // Return the connected database instance
  },
};
