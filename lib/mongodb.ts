import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // Survives module reloads in dev and warm invocations on Vercel.
  var mongooseCache: MongooseCache | undefined;
}

const DEFAULT_DB_NAME = "mindful-shopping";

const cache: MongooseCache = (globalThis.mongooseCache ??= {
  conn: null,
  promise: null,
});

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local.");
  }

  // Without a database in the URI, MongoDB silently falls back to "test".
  const uriHasDatabase = new URL(uri).pathname.length > 1;

  cache.promise ??= mongoose.connect(uri, {
    dbName: uriHasDatabase ? undefined : DEFAULT_DB_NAME,
    bufferCommands: false,
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 10,
    // Close idle connections quickly so suspended serverless instances don't hold them.
    maxIdleTimeMS: 5_000,
  }).then((conn) => {
    // On Vercel, keeps the function alive just long enough to release idle
    // connections cleanly. A no-op elsewhere.
    attachDatabasePool(conn.connection.getClient());
    return conn;
  });

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // Allow the next request to retry instead of reusing a rejected promise.
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}
