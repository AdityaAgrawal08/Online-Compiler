import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "online_compiler";

if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable");
}

type GlobalMongo = typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

const globalMongo = globalThis as GlobalMongo;

const clientPromise =
  globalMongo._mongoClientPromise ||
  new MongoClient(uri, {
    appName: "online-compiler",
  }).connect();

if (process.env.NODE_ENV !== "production") {
  globalMongo._mongoClientPromise = clientPromise;
}

export async function getDatabase() {
  const client = await clientPromise;
  return client.db(dbName);
}
