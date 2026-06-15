import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';

// GET /api/settings — returns all settings as key-value map
export async function GET() {
  try {
    const settings = await db.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return NextResponse.json({ settings: map });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      { error: 'دریافت تنظیمات ناموفق بود' },
      { status: 500 }
    );
  }
}

// PUT /api/settings — update multiple settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings } = body as { settings: Record<string, string> };

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'داده تنظیمات نامعتبر است' }, { status: 400 });
    }

    // Upsert each setting
    const operations = Object.entries(settings).map(([key, value]) =>
      db.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );

    await Promise.all(operations);

    // Log the update
    logAudit('UPDATE', 'Setting', undefined, { updatedKeys: Object.keys(settings) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json(
      { error: 'به‌روزرسانی تنظیمات ناموفق بود' },
      { status: 500 }
    );
  }
}
