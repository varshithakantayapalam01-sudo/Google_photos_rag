import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth/admin";
import { getGoldRecordById, deleteGoldRecord, saveGoldRecord } from "@/lib/validation/gold";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Admin access required" } },
      { status: 401 }
    );
  }

  try {
    const record = await getGoldRecordById(params.id);
    if (!record) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Gold record not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Admin access required" } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const existing = await getGoldRecordById(params.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Gold record not found" } },
        { status: 404 }
      );
    }

    const updated = await saveGoldRecord({
      record_id: existing.record_id,
      is_relevant: body.is_relevant ?? existing.is_relevant,
      dataset_split: body.dataset_split ?? existing.dataset_split,
      labeller_notes: body.labeller_notes ?? existing.labeller_notes,
      episodes: body.episodes,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Admin access required" } },
      { status: 401 }
    );
  }

  try {
    await deleteGoldRecord(params.id);
    return NextResponse.json({
      success: true,
      data: { deleted: true, id: params.id },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
