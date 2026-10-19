import { NextResponse } from "next/server";
import type { ApiErrorBody } from "@/types/api";

const noStore = { "Cache-Control": "no-store" };

export function jsonOk<T>(body: T, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

export function jsonError(
  error: string,
  status: number,
  extra?: Pick<ApiErrorBody, "fieldErrors" | "code">,
) {
  const body: ApiErrorBody = { error, ...extra };
  return NextResponse.json(body, { status, headers: noStore });
}
