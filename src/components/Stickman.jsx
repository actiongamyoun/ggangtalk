import React from 'react'

// 8개 캐릭터: 색 + 이름 + 포즈
export const CHARACTERS = [
  { color: '#25c26a', name: '기본' },
  { color: '#2e9bff', name: '인사' },
  { color: '#ff9f43', name: '점프' },
  { color: '#ff6b9d', name: '질주' },
  { color: '#a06bff', name: '만세' },
  { color: '#16c2c2', name: '멋짐' },
  { color: '#ff5b5b', name: '댄스' },
  { color: '#ffcf3a', name: '게이머' }
]

const INK = '#22303f'

// index별 포즈(머리 + 몸 + 팔다리)
function Pose({ i }) {
  const s = {
    stroke: INK,
    strokeWidth: 3.2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none'
  }
  switch (i) {
    case 1: // 인사 (한 손 흔들기)
      return (
        <>
          <circle cx="24" cy="14" r="5.5" fill={INK} />
          <path d="M24 19.5 V30" {...s} />
          <path d="M24 22 L33 14 M24 22 L16 28" {...s} />
          <path d="M24 30 L18 41 M24 30 L30 41" {...s} />
        </>
      )
    case 2: // 점프
      return (
        <>
          <circle cx="24" cy="13" r="5.5" fill={INK} />
          <path d="M24 18 V28" {...s} />
          <path d="M24 21 L15 14 M24 21 L33 14" {...s} />
          <path d="M24 28 L16 39 M24 28 L32 39" {...s} />
        </>
      )
    case 3: // 질주 (달리기)
      return (
        <>
          <circle cx="24" cy="14" r="5.5" fill={INK} />
          <path d="M24 19.5 V30" {...s} />
          <path d="M24 22 L16 18 M24 22 L32 26" {...s} />
          <path d="M24 30 L18 40 M24 30 L32 36" {...s} />
        </>
      )
    case 4: // 만세 (두 손 번쩍)
      return (
        <>
          <circle cx="24" cy="14" r="5.5" fill={INK} />
          <path d="M24 19.5 V30" {...s} />
          <path d="M24 21 L18 11 M24 21 L30 11" {...s} />
          <path d="M24 30 L18 41 M24 30 L30 41" {...s} />
        </>
      )
    case 5: // 멋짐 (한 손 허리)
      return (
        <>
          <circle cx="24" cy="14" r="5.5" fill={INK} />
          <path d="M24 19.5 V30" {...s} />
          <path d="M24 22 L33 27 M24 23 L18 26 L22 30" {...s} />
          <path d="M24 30 L18 41 M24 30 L30 41" {...s} />
        </>
      )
    case 6: // 댄스
      return (
        <>
          <circle cx="24" cy="14" r="5.5" fill={INK} />
          <path d="M24 19.5 V30" {...s} />
          <path d="M24 22 L33 15 M24 22 L16 29" {...s} />
          <path d="M24 30 L29 41 M24 30 L20 39" {...s} />
        </>
      )
    case 7: // 게이머 (패드 잡기)
      return (
        <>
          <circle cx="24" cy="14" r="5.5" fill={INK} />
          <path d="M24 19.5 V30" {...s} />
          <path d="M24 24 L18 29 M24 24 L30 29" {...s} />
          <rect x="17" y="28" width="14" height="6" rx="2.5" {...s} />
          <path d="M24 31 L18 41 M24 31 L30 41" {...s} />
        </>
      )
    default: // 0 기본 (서있기)
      return (
        <>
          <circle cx="24" cy="14" r="5.5" fill={INK} />
          <path d="M24 19.5 V30" {...s} />
          <path d="M24 22 L16 28 M24 22 L32 28" {...s} />
          <path d="M24 30 L18 41 M24 30 L30 41" {...s} />
        </>
      )
  }
}

export default function Stickman({ index = 0, size = 64 }) {
  const c = CHARACTERS[index] || CHARACTERS[0]
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill={c.color} />
      <Pose i={index} />
    </svg>
  )
}
