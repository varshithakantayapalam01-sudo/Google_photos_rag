import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/utils/rate-limiter";
import { processResearchQuery } from "@/lib/ai/query-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Extract client IP
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = (forwardedFor ? forwardedFor.split(",")[0] : realIp) || "127.0.0.1";

  // Check rate limit: 10 req / minute
  const rateLimit = checkRateLimit(ip, 10, 60_000);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Rate limit exceeded. Maximum 10 requests per minute. Try again in ${Math.ceil(
            rateLimit.resetMs / 1000
          )} seconds.`,
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString(),
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { query } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "A non-empty 'query' string is required.",
          },
        },
        { status: 400 }
      );
    }

    const result = await processResearchQuery(query.trim());

    return NextResponse.json(
      { success: true, data: result },
      {
        status: 200,
        headers: {
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error("Ask-the-Research error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "QUERY_EXECUTION_ERROR",
          message: error.message || "Failed to process research query",
        },
      },
      { status: 500 }
    );
  }
}
