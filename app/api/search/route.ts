import { NextResponse } from "next/server";
import { captureException } from "@/lib/sentry";

export async function POST() {
  try {
    return NextResponse.json({ error: "Not implemented yet" }, { status: 501 });
  } catch (error) {
    captureException(error, { route: "/api/search" });
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
