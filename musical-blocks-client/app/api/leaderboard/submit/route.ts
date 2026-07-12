import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Timing configurations matching ClientGameLoop.ts
const PHASE_DURATIONS = {
  STARTING: 4_000,
  ELIMINATING: 2_000,
  ROUND_END: 2_500,
};

function getRoundDurationMs(round: number, speed: string): number {
  let announceS = 0;
  let danceS = 0;

  if (round <= 10) {
    const t = (round - 1) / 9;
    if (speed === 'CHILL') {
      announceS = 8.0 + t * (3.0 - 8.0);
      danceS = 17.0 + t * (4.0 - 17.0);
    } else if (speed === 'TURBO') {
      announceS = 4.0 + t * (1.5 - 4.0);
      danceS = 8.0 + t * (2.0 - 8.0);
    } else {
      announceS = 7.0 + t * (2.0 - 7.0);
      danceS = 18.0 + t * (3.0 - 18.0);
    }
  } else {
    const t = Math.min(1.0, (round - 10) / 90);
    if (speed === 'CHILL') {
      announceS = 3.0 + t * (2.2 - 3.0);
      danceS = 4.0 + t * (2.8 - 4.0);
    } else if (speed === 'TURBO') {
      announceS = 1.5 + t * (1.2 - 1.5);
      danceS = 2.0 + t * (1.3 - 2.0);
    } else {
      announceS = 2.0 + t * (1.5 - 2.0);
      danceS = 3.0 + t * (1.7 - 3.0);
    }
  }

  return (danceS + announceS) * 1000 + PHASE_DURATIONS.ELIMINATING + PHASE_DURATIONS.ROUND_END;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      player_id,
      name,
      score,
      rounds,
      difficulty,
      speed,
      max_lives,
      sudden_death,
      blind_mode,
      telemetry,
    } = body;

    // 1. Basic validation
    if (!player_id || !name || typeof score !== 'number' || typeof rounds !== 'number') {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 2. Calculate expected maximum score
    let colorMult = 1.5;
    if (difficulty === 'easy') colorMult = 1.0;
    else if (difficulty === 'normal') colorMult = 1.5;
    else if (difficulty === 'hard') colorMult = 2.0;
    else if (difficulty === 'expert') colorMult = 3.0;

    let speedMult = 1.0;
    if (speed === 'CHILL') speedMult = 0.8;
    else if (speed === 'TURBO') speedMult = 2.0;

    let sdMult = 1.0;
    if (sudden_death === 'OFF') sdMult = 0.5;
    else if (sudden_death === 'CHAOS') sdMult = 2.0;

    const blindMult = blind_mode ? 2.0 : 1.0;

    let livesMult = 1.0;
    if (max_lives === 1) livesMult = 1.5;
    else if (max_lives === 2) livesMult = 1.2;
    else if (max_lives === 3) livesMult = 1.0;
    else if (max_lives === 4) livesMult = 0.9;
    else if (max_lives === 5) livesMult = 0.8;

    const totalMult = colorMult * speedMult * sdMult * blindMult * livesMult;

    let calculatedMaxScore = 0;
    for (let r = 1; r < rounds; r++) {
      calculatedMaxScore += Math.round(r * 10 * totalMult);
    }

    // Allow a tiny rounding tolerance (e.g. +5 points)
    if (score > calculatedMaxScore + 5) {
      console.warn(`[Anti-Cheat] Score validation failed. Score: ${score}, Max Allowed: ${calculatedMaxScore}`);
      return NextResponse.json({ error: 'Invalid score payload (Score exceeds physical maximum)' }, { status: 400 });
    }

    // 3. Telemetry and Timing Validation
    if (!telemetry || !telemetry.startTime || !Array.isArray(telemetry.rounds)) {
      console.warn('[Anti-Cheat] Missing telemetry data');
      return NextResponse.json({ error: 'Security verification failed (Missing telemetry)' }, { status: 400 });
    }

    const { startTime, rounds: telemetryRounds } = telemetry;
    const now = Date.now();

    // Verify game duration matches the amount of rounds
    let expectedTotalMs = PHASE_DURATIONS.STARTING;
    for (let r = 1; r < rounds; r++) {
      expectedTotalMs += getRoundDurationMs(r, speed);
    }

    const actualGameTimeMs = now - startTime;
    // Allow 70% threshold for lagging/fast-timers, but no less
    if (actualGameTimeMs < expectedTotalMs * 0.7) {
      console.warn(`[Anti-Cheat] Time-warp check failed. Played: ${actualGameTimeMs}ms, Expected Min: ${expectedTotalMs * 0.7}ms`);
      return NextResponse.json({ error: 'Security verification failed (Time-warp detected)' }, { status: 400 });
    }

    // Validate intervals between consecutive rounds in telemetry
    for (let i = 1; i < telemetryRounds.length; i++) {
      const prev = telemetryRounds[i - 1];
      const curr = telemetryRounds[i];
      const elapsed = curr.timestamp - prev.timestamp;
      const expected = getRoundDurationMs(prev.round, speed);

      // Verify each round had time to run
      if (elapsed < expected * 0.7) {
        console.warn(`[Anti-Cheat] Round transition too fast. Round: ${prev.round}, Elapsed: ${elapsed}ms, Expected Min: ${expected * 0.7}ms`);
        return NextResponse.json({ error: 'Security verification failed (Simulation detected)' }, { status: 400 });
      }
    }

    // 4. Submit to Supabase using Admin service role key (or fallback if key is missing in development)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase URL or Key is not configured on the server' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.from('sp_leaderboard').insert({
      player_id,
      name,
      score,
      rounds,
      difficulty,
      speed,
      max_lives,
      sudden_death,
      blind_mode,
    });

    if (error) {
      console.error('[Leaderboard API] DB Insertion error:', error.message);
      return NextResponse.json({ error: 'Error inserting score into database' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Leaderboard API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
