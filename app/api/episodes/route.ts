import { NextResponse } from "next/server";
import { listEpisodes } from "@/lib/db/queries/episodes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const visual_item_type = searchParams.get("visual_item_type") || undefined;
    const outcome = searchParams.get("outcome") || undefined;
    const platform = searchParams.get("platform") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const limit = Math.min(Math.max(pageSize, 1), 100);
    const offset = (Math.max(page, 1) - 1) * limit;

    const { episodes, total } = await listEpisodes({
      visual_item_type,
      outcome,
      platform,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: {
        episodes,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Episodes list error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EPISODES_ERROR",
          message: error.message || "Failed to list episodes",
        },
      },
      { status: 500 }
    );
  }
}
