import { NextResponse } from "next/server";
import { getEpisodeById } from "@/lib/db/queries/episodes";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_ID", message: "Episode ID is required" },
        },
        { status: 400 }
      );
    }

    const data = await getEpisodeById(id);
    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: `Episode ${id} not found` },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Episode detail error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EPISODE_ERROR",
          message: error.message || "Failed to fetch episode",
        },
      },
      { status: 500 }
    );
  }
}
