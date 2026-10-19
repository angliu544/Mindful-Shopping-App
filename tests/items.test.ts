import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { decideItem, getHistory, getReviewQueue, undoDecision } from "@/lib/items";
import { Item } from "@/models/Item";
import { createItem, setupTestDatabase } from "./helpers/db";

setupTestDatabase();

const ALICE = "user_alice";
const BOB = "user_bob";
const HOUR = 60 * 60 * 1000;

describe("review queue", () => {
  it("returns only the user's pending items whose wait is over, oldest first", async () => {
    const older = await createItem(ALICE, { availableInMs: -2 * HOUR });
    const newer = await createItem(ALICE, { availableInMs: -HOUR });
    const future = await createItem(ALICE, { availableInMs: 5 * HOUR });
    await createItem(ALICE, { status: "reviewed", decision: "buy" });
    await createItem(BOB);

    const queue = await getReviewQueue(ALICE);
    expect(queue.items.map((i) => i.id)).toEqual([older.id, newer.id]);
    expect(queue.nextAvailableAt).toBe(future.availableAt.toISOString());
  });

  it("never sends userId or imagePublicId to the browser", async () => {
    await createItem(ALICE);
    const [item] = (await getReviewQueue(ALICE)).items;
    expect(item).not.toHaveProperty("userId");
    expect(item).not.toHaveProperty("imagePublicId");
  });
});

describe("decisions", () => {
  it("records a decision with status, decision and a UTC decidedAt", async () => {
    const item = await createItem(ALICE);
    const before = Date.now();
    const result = await decideItem(ALICE, item.id, "skip");

    expect(result.ok).toBe(true);
    const saved = await Item.findById(item.id).lean();
    expect(saved).toMatchObject({ status: "reviewed", decision: "skip" });
    expect(saved!.decidedAt!.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect((await getReviewQueue(ALICE)).items).toHaveLength(0);
  });

  it("does not let a user decide another user's item", async () => {
    const item = await createItem(ALICE);
    expect(await decideItem(BOB, item.id, "buy")).toEqual({ ok: false, reason: "not_found" });
    expect(await Item.findById(item.id).lean()).toMatchObject({ status: "pending", decision: null, decidedAt: null });
  });

  it("does not let a user undo another user's decision", async () => {
    const item = await createItem(ALICE, { status: "reviewed", decision: "buy" });
    expect(await undoDecision(BOB, item.id)).toEqual({ ok: false, reason: "not_found" });
    expect(await Item.findById(item.id).lean()).toMatchObject({ status: "reviewed", decision: "buy" });
  });

  it("rejects items that are not available yet", async () => {
    const item = await createItem(ALICE, { availableInMs: HOUR });
    expect(await decideItem(ALICE, item.id, "buy")).toEqual({ ok: false, reason: "not_ready" });
    expect((await Item.findById(item.id).lean())!.status).toBe("pending");
  });

  it("never overwrites an existing decision", async () => {
    const item = await createItem(ALICE);
    await decideItem(ALICE, item.id, "skip");
    expect(await decideItem(ALICE, item.id, "buy")).toEqual({ ok: false, reason: "already_reviewed" });
    expect((await Item.findById(item.id).lean())!.decision).toBe("skip");
  });

  it("lets exactly one of many simultaneous decisions win", async () => {
    const item = await createItem(ALICE);
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => decideItem(ALICE, item.id, i % 2 ? "buy" : "skip")),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("treats an unknown id as not found", async () => {
    const id = new mongoose.Types.ObjectId().toString();
    expect(await decideItem(ALICE, id, "buy")).toEqual({ ok: false, reason: "not_found" });
  });

  it("undo returns the item to the queue", async () => {
    const item = await createItem(ALICE);
    await decideItem(ALICE, item.id, "buy");
    expect((await undoDecision(ALICE, item.id)).ok).toBe(true);
    expect(await Item.findById(item.id).lean()).toMatchObject({ status: "pending", decision: null, decidedAt: null });
    expect((await getReviewQueue(ALICE)).items.map((i) => i.id)).toContain(item.id);
  });
});

describe("history", () => {
  it("totals only this user's decisions and sums skipped prices as savings", async () => {
    await createItem(ALICE, { status: "reviewed", decision: "skip", price: 89.99 });
    await createItem(ALICE, { status: "reviewed", decision: "skip", price: 0.02 });
    await createItem(ALICE, { status: "reviewed", decision: "buy", price: 40 });
    await createItem(ALICE, { price: 1000 }); // pending: not in history
    await createItem(BOB, { status: "reviewed", decision: "skip", price: 500 });

    const history = await getHistory(ALICE);
    expect(history.stats).toEqual({ reviewed: 3, bought: 1, skipped: 2, moneySaved: 90.01, moneySpent: 40 });
    expect(history.items).toHaveLength(3);
    expect(history.items.every((i) => i.status === "reviewed")).toBe(true);
    expect(history.truncated).toBe(false);
  });

  it("lists the most recent decision first", async () => {
    const first = await createItem(ALICE);
    const second = await createItem(ALICE);
    await decideItem(ALICE, first.id, "buy");
    await new Promise((r) => setTimeout(r, 5));
    await decideItem(ALICE, second.id, "skip");
    expect((await getHistory(ALICE)).items.map((i) => i.id)).toEqual([second.id, first.id]);
  });

  it("is empty for a new user", async () => {
    expect((await getHistory("user_new")).stats).toEqual({
      reviewed: 0,
      bought: 0,
      skipped: 0,
      moneySaved: 0,
      moneySpent: 0,
    });
  });
});
