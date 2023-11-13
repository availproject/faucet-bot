import { MongoClient } from "mongodb";

const mongoUrl = "mongodb://localhost:27017";
// Database name
const dbName = "userdata";
const dbName2 = "usermap";
const dbName3 = "addressmap";
const dbName4 = "bannedmap";

// Connect to the MongoDB database
const dbclient = new MongoClient(mongoUrl);
dbclient.connect();
const db = dbclient.db(dbName);
const db2 = dbclient.db(dbName2);
const db3 = dbclient.db(dbName3);
const db4 = dbclient.db(dbName4);

export { db, db2, db3, db4 };
