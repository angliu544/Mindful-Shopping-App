import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { connectToDatabase } from "@/lib/mongodb";
import { Item } from "@/models/Item";
import { User } from "@/models/User";
import { UserSettings } from "@/models/UserSettings";

/** Starts an in-memory MongoDB for the current test file and clears it between tests. */
export function setupTestDatabase() {
  let server: MongoMemoryServer;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    process.env.MONGODB_URI = server.getUri("consider-test");
    await connectToDatabase();
    await Promise.all([Item.syncIndexes(), UserSettings.syncIndexes(), User.syncIndexes()]);
  });

  beforeEach(async () => {
    await Promise.all([Item.deleteMany({}), UserSettings.deleteMany({}), User.deleteMany({})]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    globalThis.mongooseCache = undefined;
    await server?.stop();
  });
}

const HOUR = 60 * 60 * 1000;

let counter = 0;

export function createItem(
  userId: string,
  overrides: Partial<{
    name: string;
    price: number;
    availableInMs: number;
    status: "pending" | "reviewed";
    decision: "buy" | "skip" | null;
  }> = {},
) {
  const { availableInMs = -HOUR, decision = null, ...rest } = overrides;
  counter += 1;
  return Item.create({
    userId,
    name: `Item ${counter}`,
    price: 10,
    imageUrl: "https://res.cloudinary.com/test/image/upload/x.png",
    imagePublicId: `mindful-shopping/${userId}/test-${counter}`,
    availableAt: new Date(Date.now() + availableInMs),
    decision,
    decidedAt: decision ? new Date() : null,
    ...rest,
  });
}
