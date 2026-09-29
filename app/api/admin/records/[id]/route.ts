import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth/admin";
import { getSupabaseAdminClient } from "@/lib/db/client";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Admin access required" } }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("raw_records").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Record deleted successfully" });
}
