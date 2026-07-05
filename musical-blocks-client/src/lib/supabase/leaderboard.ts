import { createClient } from './client';

export interface LeaderboardEntry {
  id: string;
  player_id: string;
  name: string;
  score: number;
  rounds: number;
  difficulty: string;
  speed: string;
  created_at: string;
}

export async function submitScore(entry: Omit<LeaderboardEntry, 'id' | 'created_at'>) {
  const supabase = createClient();
  const { error } = await supabase
    .from('sp_leaderboard')
    .insert(entry);
  if (error) console.warn('[Leaderboard] Error submitting score:', error.message);
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
