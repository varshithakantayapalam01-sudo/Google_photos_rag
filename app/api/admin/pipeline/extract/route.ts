import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth/admin";
import { runExtractionStage } from "@/lib/pipeline/orchestrator";

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Admin access required" } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { batch_id, record_id, limit } = body;

    const summary = await runExtractionStage({
      batchId: batch_id,
      recordId: record_id,
      limit: limit ? Number(limit) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "EXTRACTION_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
