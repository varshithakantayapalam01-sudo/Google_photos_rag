import { NextResponse } from "next/server";
import { getMemoryAnalytics } from "@/lib/db/queries/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getMemoryAnalytics();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Memory analytics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ANALYTICS_ERROR",
          message: error.message || "Failed to fetch memory analytics",
        },
      },
      { status: 500 }
    );
  }
}
