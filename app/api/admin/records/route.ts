import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth/admin";
import { getSupabaseAdminClient } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Admin access required" } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("batch_id");
  const platform = searchParams.get("platform");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const supabase = getSupabaseAdminClient();
  let query = supabase.from("raw_records").select("*, collection_batches(platform, search_query)", { count: "exact" });

  if (batchId) query = query.eq("batch_id", batchId);
  if (platform) query = query.eq("platform", platform);

  query = query.order("imported_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: error.message } }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      records: data || [],
      total: count || 0,
      limit,
      offset,
    },
  });
}
