-- =====================================================
-- VOICE SESSIONS DEBUG QUERIES
-- Run these in Supabase SQL Editor to diagnose issues
-- Replace the placeholder values with actual IDs
-- =====================================================

-- Set your test values here:
-- Replace these with actual values you want to investigate
DO $$
BEGIN
  RAISE NOTICE 'Replace p_guild_id, p_user_a, and p_user_b below with actual values';
END $$;

-- =====================================================
-- 1. CHECK FOR UNCLOSED SESSIONS (left_at is NULL)
-- These are "active" sessions - if old, they indicate a bug
-- =====================================================
SELECT
  user_id,
  channel_id,
  joined_at,
  NOW() - joined_at as "time_since_join",
  EXTRACT(EPOCH FROM (NOW() - joined_at)) / 3600 as "hours_if_still_active"
FROM voice_sessions
WHERE guild_id = 'YOUR_GUILD_ID'
  AND left_at IS NULL
ORDER BY joined_at ASC;


-- =====================================================
-- 2. VIEW ALL SESSIONS BETWEEN TWO SPECIFIC USERS
-- See their raw session data side by side
-- =====================================================
SELECT
  user_id,
  channel_id,
  joined_at,
  left_at,
  duration_seconds,
  ROUND(duration_seconds / 3600.0, 2) as "hours"
FROM voice_sessions
WHERE guild_id = 'YOUR_GUILD_ID'
  AND user_id IN ('USER_A_ID', 'USER_B_ID')
ORDER BY joined_at DESC
LIMIT 100;


-- =====================================================
-- 3. FIND OVERLAPPING SESSIONS BETWEEN TWO USERS
-- This shows the actual overlaps being calculated
-- =====================================================
SELECT
  s1.user_id as user_a,
  s2.user_id as user_b,
  s1.channel_id,
  s1.joined_at as a_joined,
  s1.left_at as a_left,
  s2.joined_at as b_joined,
  s2.left_at as b_left,
  -- Calculate overlap
  GREATEST(s1.joined_at, s2.joined_at) as overlap_start,
  LEAST(COALESCE(s1.left_at, NOW()), COALESCE(s2.left_at, NOW())) as overlap_end,
  EXTRACT(EPOCH FROM (
    LEAST(COALESCE(s1.left_at, NOW()), COALESCE(s2.left_at, NOW())) -
    GREATEST(s1.joined_at, s2.joined_at)
  )) / 60 as overlap_minutes
FROM voice_sessions s1
JOIN voice_sessions s2 ON
  s1.guild_id = s2.guild_id AND
  s1.channel_id = s2.channel_id AND
  s1.user_id < s2.user_id AND
  s1.joined_at < COALESCE(s2.left_at, NOW()) AND
  s2.joined_at < COALESCE(s1.left_at, NOW())
WHERE s1.guild_id = 'YOUR_GUILD_ID'
  AND s1.user_id = 'USER_A_ID'
  AND s2.user_id = 'USER_B_ID'
ORDER BY s1.joined_at DESC;


-- =====================================================
-- 4. COMPARE: Total individual time vs shared time
-- =====================================================
WITH user_totals AS (
  SELECT
    user_id,
    SUM(COALESCE(duration_seconds, EXTRACT(EPOCH FROM (NOW() - joined_at)))) as total_seconds
  FROM voice_sessions
  WHERE guild_id = 'YOUR_GUILD_ID'
    AND user_id IN ('USER_A_ID', 'USER_B_ID')
  GROUP BY user_id
),
shared_total AS (
  SELECT
    SUM(
      EXTRACT(EPOCH FROM (
        LEAST(COALESCE(s1.left_at, NOW()), COALESCE(s2.left_at, NOW())) -
        GREATEST(s1.joined_at, s2.joined_at)
      ))
    ) as shared_seconds
  FROM voice_sessions s1
  JOIN voice_sessions s2 ON
    s1.guild_id = s2.guild_id AND
    s1.channel_id = s2.channel_id AND
    s1.user_id < s2.user_id AND
    s1.joined_at < COALESCE(s2.left_at, NOW()) AND
    s2.joined_at < COALESCE(s1.left_at, NOW())
  WHERE s1.guild_id = 'YOUR_GUILD_ID'
    AND s1.user_id = 'USER_A_ID'
    AND s2.user_id = 'USER_B_ID'
)
SELECT
  'User A total' as metric,
  ROUND(total_seconds / 3600.0, 2) as hours
FROM user_totals WHERE user_id = 'USER_A_ID'
UNION ALL
SELECT
  'User B total' as metric,
  ROUND(total_seconds / 3600.0, 2) as hours
FROM user_totals WHERE user_id = 'USER_B_ID'
UNION ALL
SELECT
  'Shared time (same channel overlap)' as metric,
  ROUND(shared_seconds / 3600.0, 2) as hours
FROM shared_total;


-- =====================================================
-- 5. CHECK CACHED VALUE vs FRESH CALCULATION
-- Compare what's stored vs what should be calculated
-- =====================================================
SELECT
  'Cached value' as source,
  shared_seconds,
  ROUND(shared_seconds / 3600.0, 2) as hours,
  session_count,
  calculated_at
FROM voice_connections
WHERE guild_id = 'YOUR_GUILD_ID'
  AND time_range = 'all'
  AND (
    (user_id_1 = 'USER_A_ID' AND user_id_2 = 'USER_B_ID') OR
    (user_id_1 = 'USER_B_ID' AND user_id_2 = 'USER_A_ID')
  );


-- =====================================================
-- 6. LOOK FOR SESSION GAPS (potential missed recordings)
-- Shows gaps between sessions for a user in a channel
-- =====================================================
WITH ordered_sessions AS (
  SELECT
    user_id,
    channel_id,
    joined_at,
    left_at,
    LAG(left_at) OVER (PARTITION BY user_id, channel_id ORDER BY joined_at) as prev_left_at
  FROM voice_sessions
  WHERE guild_id = 'YOUR_GUILD_ID'
    AND user_id IN ('USER_A_ID', 'USER_B_ID')
    AND joined_at > NOW() - INTERVAL '7 days'
)
SELECT
  user_id,
  channel_id,
  prev_left_at as "previous_session_ended",
  joined_at as "new_session_started",
  EXTRACT(EPOCH FROM (joined_at - prev_left_at)) / 60 as "gap_minutes"
FROM ordered_sessions
WHERE prev_left_at IS NOT NULL
  AND joined_at - prev_left_at < INTERVAL '5 minutes'  -- Small gaps might indicate reconnects
ORDER BY joined_at DESC;


-- =====================================================
-- 7. RECENT SESSION SUMMARY (last 7 days)
-- Quick overview of recent voice activity
-- =====================================================
SELECT
  user_id,
  COUNT(*) as session_count,
  SUM(COALESCE(duration_seconds, 0)) / 3600.0 as total_hours,
  COUNT(*) FILTER (WHERE left_at IS NULL) as unclosed_sessions,
  MIN(joined_at) as earliest_session,
  MAX(COALESCE(left_at, NOW())) as latest_activity
FROM voice_sessions
WHERE guild_id = 'YOUR_GUILD_ID'
  AND user_id IN ('USER_A_ID', 'USER_B_ID')
  AND joined_at > NOW() - INTERVAL '7 days'
GROUP BY user_id;
