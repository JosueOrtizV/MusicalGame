import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('player_id') || 'anonymous';
    const startTime = Date.now();

    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'voxelrave-sp-secret-key';
    const token = crypto
      .createHmac('sha256', secret)
      .update(`${playerId}:${startTime}`)
      .digest('hex');

    return NextResponse.json({
      success: true,
      token,
      startTime,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
