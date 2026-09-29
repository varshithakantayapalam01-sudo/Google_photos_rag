import { NextResponse } from "next/server";
import { generateResearchSynthesis } from "@/lib/analysis/synthesis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const synthesis = await generateResearchSynthesis();
    return NextResponse.json({ success: true, data: synthesis });
  } catch (error: any) {
    console.error("Synthesis analytics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SYNTHESIS_ERROR",
          message: error.message || "Failed to generate research synthesis",
        },
      },
      { status: 500 }
    );
  }
}
