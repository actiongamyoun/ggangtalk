import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasSupabaseConfig = Boolean(url && anon)

// 통화 신호(시그널링)는 Supabase Realtime broadcast 채널만 사용한다.
// DB 테이블/RLS 설정이 전혀 필요 없음 — URL과 anon key만 있으면 끝.
export const supabase = hasSupabaseConfig
  ? createClient(url, anon, {
      realtime: { params: { eventsPerSecond: 30 } }
    })
  : null
