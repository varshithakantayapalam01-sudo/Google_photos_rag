import { NextRequest, NextResponse } from "next/server";
import { getOpportunities, getOpportunityById } from "@/lib/db/queries/opportunities";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const opportunity = await getOpportunityById(id);
      if (!opportunity) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "NOT_FOUND", message: `Opportunity ${id} not found` },
          },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: opportunity });
    }

    const opportunities = await getOpportunities();
    return NextResponse.json({ success: true, data: opportunities });
  } catch (error: any) {
    console.error("Opportunities analytics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ANALYTICS_ERROR",
          message: error.message || "Failed to fetch opportunities",
        },
      },
      { status: 500 }
    );
  }
}
