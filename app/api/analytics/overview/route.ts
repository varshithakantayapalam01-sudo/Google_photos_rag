import { NextResponse } from "next/server";
import { getOverviewStats } from "@/lib/db/queries/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getOverviewStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    console.error("Overview analytics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ANALYTICS_ERROR",
          message: error.message || "Failed to fetch overview analytics",
        },
      },
      { status: 500 }
    );
  }
}
