import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { 
  saveScheduledAttractionToSheet, 
  loadScheduledAttractionsFromSheet, 
  deleteScheduledAttractionFromSheet 
} from '@/lib/googleSheetsServer';

export async function GET() {
  try {
    const attractions = await loadScheduledAttractionsFromSheet();
    return NextResponse.json(attractions);
  } catch (error) {
    console.error('Failed to load scheduled attractions:', error);
    return NextResponse.json({ error: 'Failed to load scheduled attractions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await saveScheduledAttractionToSheet(body);
    revalidateTag('scheduled-attractions');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save scheduled attraction:', error);
    return NextResponse.json({ error: 'Failed to save scheduled attraction' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    await deleteScheduledAttractionFromSheet(id);
    revalidateTag('scheduled-attractions');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete scheduled attraction:', error);
    return NextResponse.json({ error: 'Failed to delete scheduled attraction' }, { status: 500 });
  }
}
