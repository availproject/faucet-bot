import { MongoClient } from "mongodb";

const mongoUrl = "mongodb://localhost:27017";
// Database name
const dbName = "userdata";
const dbName2 = "usermap";
const dbName3 = "addressmap";
const dbName4 = "bannedmap";
const dbName5 = "tokenmap";

// Connect to the MongoDB database
const dbclient = new MongoClient(mongoUrl);
dbclient.connect();
const db = dbclient.db(dbName);
const db2 = dbclient.db(dbName2);
const db3 = dbclient.db(dbName3);
const db4 = dbclient.db(dbName4);
const db5 = dbclient.db(dbName5);

const dispence_array = [5, 3, 2, 1];

export { db, db2, db3, db4, db5, dispence_array };
