import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth/admin";
import { getCollectionBatchById, updateCollectionBatchCounts } from "@/lib/db/queries/batches";
import { getSupabaseAdminClient } from "@/lib/db/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Admin access required" } }, { status: 401 });
  }

  try {
    const batch = await getCollectionBatchById(params.id);
    if (!batch) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Batch not found" } }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: batch });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: err.message } }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Admin access required" } }, { status: 401 });
  }

  try {
    const body = await req.json();
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("collection_batches")
      .update(body)
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: err.message } }, { status: 500 });
  }
}
