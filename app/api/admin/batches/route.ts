import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth/admin";
import { createCollectionBatch, getCollectionBatches } from "@/lib/db/queries/batches";

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Admin access required" } }, { status: 401 });
  }

  try {
    const batches = await getCollectionBatches();
    return NextResponse.json({ success: true, data: batches });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: err.message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Admin access required" } }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body.platform || !body.collection_method) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "platform and collection_method are required" } },
        { status: 400 }
      );
    }

    const batch = await createCollectionBatch({
      platform: body.platform,
      search_query: body.search_query || null,
      collection_date: body.collection_date || new Date().toISOString().split("T")[0],
      collection_method: body.collection_method,
      language: body.language || "en",
      date_range_start: body.date_range_start || null,
      date_range_end: body.date_range_end || null,
      records_found: body.records_found ? Number(body.records_found) : null,
      notes: body.notes || null,
    });

    return NextResponse.json({ success: true, data: batch }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: err.message } }, { status: 500 });
  }
}
