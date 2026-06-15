import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: 'سیستم محاسبه پورسانت فروش',
    version: '3.0.0',
    apiEndpoints: {
      salesPersons: '/api/sales-persons',
      backup: '/api/backup',
      export: '/api/export?type=all|month&year=1405&month=3',
      import: '/api/import',
    },
    status: 'ok',
  });
}
