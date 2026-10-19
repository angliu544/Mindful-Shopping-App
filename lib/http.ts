import { NextResponse } from "next/server";
import type { ApiErrorBody } from "@/types/api";

const noStore = { "Cache-Control": "no-store" };

export function jsonOk<T>(body: T, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

export function jsonError(error: string, status: number, fieldErrors?: Record<string, string>) {
  const body: ApiErrorBody = fieldErrors ? { error, fieldErrors } : { error };
  return NextResponse.json(body, { status, headers: noStore });
}
