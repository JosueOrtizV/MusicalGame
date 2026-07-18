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

export async function fetchStartToken(playerId: string): Promise<{ token: string; startTime: number } | null> {
  try {
    const res = await fetch(`/api/leaderboard/token?player_id=${encodeURIComponent(playerId)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return { token: data.token, startTime: data.startTime };
  } catch {
    return null;
  }
}

export async function submitScore(
  entry: Omit<LeaderboardEntry, 'id' | 'created_at'> & {
    telemetry?: { startTime: number; rounds: Array<{ round: number; timestamp: number }> } | null;
    token?: string | null;
  }
): Promise<{ success: boolean; globalRank?: number; diffRank?: number; error?: string }> {
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
      return { success: false, error: errText };
    }
    const data = await res.json();
    return {
      success: true,
      globalRank: data.globalRank,
      diffRank: data.diffRank,
    };
  } catch (error) {
    console.error('[Leaderboard] Network error submitting score:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
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
