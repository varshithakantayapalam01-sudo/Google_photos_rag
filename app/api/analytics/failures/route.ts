import { NextResponse } from "next/server";
import { getFailureAnalytics } from "@/lib/db/queries/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getFailureAnalytics();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Failure analytics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ANALYTICS_ERROR",
          message: error.message || "Failed to fetch failure analytics",
        },
      },
      { status: 500 }
    );
  }
}
