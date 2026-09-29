import { NextResponse } from "next/server";
import { computeResearchLimitations } from "@/lib/analysis/limitations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report = await computeResearchLimitations();
    return NextResponse.json({ success: true, data: report });
  } catch (error: any) {
    console.error("Limitations API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "LIMITATIONS_ERROR",
          message: error.message || "Failed to load research limitations report",
        },
      },
      { status: 500 }
    );
  }
}
