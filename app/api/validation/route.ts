import { NextResponse } from "next/server";
import { getLatestValidationRun } from "@/lib/db/queries/gold";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const latestRun = await getLatestValidationRun();
    if (!latestRun) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No validation run recorded yet.",
      });
    }

    return NextResponse.json({
      success: true,
      data: latestRun,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
