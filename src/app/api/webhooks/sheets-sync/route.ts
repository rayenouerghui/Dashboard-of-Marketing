import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

const WEBHOOK_SECRET = process.env.SHEETS_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get('authorization');
    const bodySecret = (await request.json()).secret;
    
    const providedSecret = authHeader?.replace('Bearer ', '') || bodySecret;
    
    if (!WEBHOOK_SECRET || providedSecret !== WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Revalidate cache tags for Google Sheets data
    revalidateTag('google-sheets-data', 'api/webhooks/sheets-sync');
    revalidateTag('digital-leads', 'api/webhooks/sheets-sync');
    revalidateTag('physical-leads', 'api/webhooks/sheets-sync');

    return NextResponse.json(
      { 
        success: true, 
        message: 'Cache invalidated successfully',
        revalidatedAt: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
