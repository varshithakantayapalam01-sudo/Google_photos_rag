import { NextRequest, NextResponse } from "next/server";
import { authenticateAdminPassword } from "@/lib/auth/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_PASSWORD", message: "Password is required" } },
        { status: 400 }
      );
    }

    const token = authenticateAdminPassword(password);
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid admin password" } },
        { status: 401 }
      );
    }

    const res = NextResponse.json({
      success: true,
      data: {
        token,
        message: "Admin authentication successful",
      },
    });

    // Set secure HTTP-only cookie
    res.cookies.set({
      name: "admin_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 1 day
      path: "/",
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
