import { createClient } from './client';

export interface LeaderboardEntry {
  id: string;
  player_id: string;
  name: string;
  score: number;
  rounds: number;
  difficulty: string;
  speed: string;
  max_lives?: number;
  sudden_death?: string;
  blind_mode?: boolean;
  created_at: string;
}

export async function submitScore(
  entry: Omit<LeaderboardEntry, 'id' | 'created_at'> & {
    telemetry?: { startTime: number; rounds: Array<{ round: number; timestamp: number }> } | null;
  }
) {
  try {
    const res = await fetch('/api/leaderboard/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn('[Leaderboard] Error submitting score:', errText);
    }
  } catch (error) {
    console.error('[Leaderboard] Network error submitting score:', error);
  }
}

export async function fetchTopScores(limit = 10): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sp_leaderboard')
    .select('*')
    .order('score', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[Leaderboard] Error fetching top scores:', error.message);
    return [];
  }
  return data ?? [];
}

export async function fetchTopByDifficulty(
  difficulty: string,
  limit = 10
): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sp_leaderboard')
    .select('*')
    .eq('difficulty', difficulty)
    .order('score', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[Leaderboard] Error fetching top scores by difficulty:', error.message);
    return [];
  }
  return data ?? [];
}
