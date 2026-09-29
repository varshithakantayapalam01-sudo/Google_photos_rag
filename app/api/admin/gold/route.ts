import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth/admin";
import { listGoldRecords, saveGoldRecord } from "@/lib/validation/gold";
import { seedGoldDataset } from "@/lib/validation/seed";
import { DatasetSplit } from "@/types/database";

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Admin access required" } },
      { status: 401 }
    );
  }

  try {
    const url = new URL(req.url);
    const split = url.searchParams.get("split") as DatasetSplit | null;

    const records = await listGoldRecords(split || undefined);
    return NextResponse.json({
      success: true,
      data: records,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Admin access required" } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    // Check if seeder was requested
    if (body.action === "seed") {
      const seedResult = await seedGoldDataset();
      return NextResponse.json({
        success: true,
        data: seedResult,
        message: `Successfully seeded ${seedResult.seeded} gold benchmark records`,
      });
    }

    const { record_id, is_relevant, dataset_split, labeller_notes, episodes } = body;
    if (!record_id) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "record_id is required" } },
        { status: 400 }
      );
    }

    const saved = await saveGoldRecord({
      record_id,
      is_relevant: Boolean(is_relevant),
      dataset_split: dataset_split || "development",
      labeller_notes,
      episodes,
    });

    return NextResponse.json({
      success: true,
      data: saved,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "SAVE_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
