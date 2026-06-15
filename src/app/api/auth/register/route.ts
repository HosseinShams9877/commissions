import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ کاراکتر باشد"),
  username: z.string().min(3, "نام کاربری باید حداقل ۳ کاراکتر باشد").max(30, "نام کاربری نباید بیشتر از ۳۰ کاراکتر باشد"),
  password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد"),
  email: z.string().email("ایمیل نامعتبر است").optional().or(z.literal("")),
  role: z.enum(["ADMIN", "MANAGER", "USER"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check if username already exists
    const existingUser = await db.user.findUnique({
      where: { username: validatedData.username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "این نام کاربری قبلاً ثبت شده است" },
        { status: 409 }
      );
    }

    // Check if email already exists (if provided)
    if (validatedData.email) {
      const existingEmail = await db.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: "این ایمیل قبلاً ثبت شده است" },
          { status: 409 }
        );
      }
    }

    // Check if any users exist (first user can be admin)
    const userCount = await db.user.count();
    const isFirstUser = userCount === 0;

    // Determine role
    let role = validatedData.role || "USER";

    if (isFirstUser) {
      // First user automatically becomes admin
      role = "ADMIN";
    } else {
      // Subsequent users need admin permission to set roles
      const session = await getServerSession(authOptions);

      if (!session) {
        return NextResponse.json(
          { error: "برای ثبت کاربر جدید باید وارد شوید" },
          { status: 401 }
        );
      }

      if (session.user.role !== "ADMIN") {
        // Non-admin users can only create USER role accounts
        role = "USER";
      }
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 12);

    // Create user
    const user = await db.user.create({
      data: {
        name: validatedData.name,
        username: validatedData.username,
        password: hashedPassword,
        email: validatedData.email || null,
        role,
      },
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        message: isFirstUser
          ? "اولین کاربر با دسترسی مدیر سیستم ایجاد شد"
          : "کاربر با موفقیت ثبت شد",
        user: userWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues;
      const firstError = issues[0];
      return NextResponse.json(
        { error: firstError?.message || "داده‌های ورودی نامعتبر است" },
        { status: 400 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "خطا در ثبت کاربر. لطفاً دوباره تلاش کنید" },
      { status: 500 }
    );
  }
}
