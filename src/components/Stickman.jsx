import React from 'react'
import c0 from '../assets/chars/char_0.png'
import c1 from '../assets/chars/char_1.png'
import c2 from '../assets/chars/char_2.png'
import c3 from '../assets/chars/char_3.png'
import c4 from '../assets/chars/char_4.png'
import c5 from '../assets/chars/char_5.png'
import c6 from '../assets/chars/char_6.png'
import c7 from '../assets/chars/char_7.png'

// 직접 그린 8 캐릭터 (색 + 이름 + 이미지)
export const CHARACTERS = [
  { color: '#25c26a', name: '기본', img: c0 },
  { color: '#2e9bff', name: '포마드', img: c1 },
  { color: '#ff9f43', name: '사이드머리', img: c2 },
  { color: '#ff6b9d', name: '모자', img: c3 },
  { color: '#a06bff', name: '곱슬', img: c4 },
  { color: '#16c2c2', name: '긴머리', img: c5 },
  { color: '#ff5b5b', name: '단발', img: c6 },
  { color: '#ffcf3a', name: '베레모', img: c7 }
]

export default function Stickman({ index = 0, size = 64 }) {
  const c = CHARACTERS[index] || CHARACTERS[0]
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: c.color,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        boxShadow: '0 4px 9px rgba(31,52,74,0.2)'
      }}
    >
      <img
        src={c.img}
        alt={c.name}
        draggable={false}
        style={{ width: '86%', height: '86%', objectFit: 'contain', pointerEvents: 'none' }}
      />
    </div>
  )
}
