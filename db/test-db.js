const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.ATLAS_URI; // MongoDB connection string

const dbName = "sample_mflix"; // Database name from .env

async function connectMongo() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    console.log(`Connected to database: ${db}`);
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  } finally {
    await client.close();
  }
}

connectMongo();

// this is a test file to check if the connection is successful
// you run it with node server/db/test-db.js
// in the terminal
// if the connection is successful, you should see a message in the console
