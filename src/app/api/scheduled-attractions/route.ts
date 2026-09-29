import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { 
  saveScheduledAttractionToSheet, 
  loadScheduledAttractionsFromSheet, 
  deleteScheduledAttractionFromSheet 
} from '@/lib/googleSheetsServer';
import { requireRole } from '@/lib/auth';
import { sanitizeObject } from '@/lib/sanitize';

const attractionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  start: z.string().min(1),
  end: z.string().optional(),
  university: z.string().min(1),
  goal: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export async function GET() {
  try {
    await requireRole('member'); // Member or admin can read
    const attractions = await loadScheduledAttractionsFromSheet();
    return NextResponse.json(attractions);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    console.error('Failed to load scheduled attractions:', error);
    return NextResponse.json({ error: 'Failed to load scheduled attractions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireRole('admin'); // Admin only
    const body = await request.json();
    
    // Validate with Zod
    const validated = attractionSchema.parse(body);
    
    // Sanitize
    const sanitized = sanitizeObject(validated, { notes: 500, title: 200 });
    
    await saveScheduledAttractionToSheet(sanitized);
    revalidateTag('scheduled-attractions', 'api/scheduled-attractions');
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Failed to save scheduled attraction:', error);
    return NextResponse.json({ error: 'Failed to save scheduled attraction' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole('admin'); // Admin only
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    // Validate with Zod
    const deleteSchema = z.object({ id: z.string().min(1) });
    deleteSchema.parse({ id });
    
    await deleteScheduledAttractionFromSheet(id!);
    revalidateTag('scheduled-attractions', 'api/scheduled-attractions');
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    console.error('Failed to delete scheduled attraction:', error);
    return NextResponse.json({ error: 'Failed to delete scheduled attraction' }, { status: 500 });
  }
}
