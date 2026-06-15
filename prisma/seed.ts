import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 شروع ایجاد کاربر پیش‌فرض...");

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { username: "admin" },
  });

  if (existingAdmin) {
    console.log("✅ کاربر ادمین از قبل وجود دارد");
    return;
  }

  // Hash the default password
  const hashedPassword = await hash("admin123", 12);

  // Create default admin user
  const admin = await prisma.user.create({
    data: {
      name: "مدیر سیستم",
      username: "admin",
      password: hashedPassword,
      email: "admin@commission.local",
      role: "ADMIN",
      active: true,
    },
  });

  console.log("✅ کاربر ادمین با موفقیت ایجاد شد:");
  console.log(`   نام کاربری: ${admin.username}`);
  console.log(`   رمز عبور: admin123`);
  console.log(`   نقش: ${admin.role}`);
  console.log("⚠️  لطفاً پس از اولین ورود، رمز عبور را تغییر دهید");
}

main()
  .catch((e) => {
    console.error("❌ خطا در ایجاد کاربر پیش‌فرض:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
