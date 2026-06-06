import React from 'react'

const COLORS = ['#b8ff3a', '#38e8ff', '#ff8a3a', '#ff5a9e', '#a78bff', '#ffd23a', '#5affc4', '#ff5a6e']

function colorFor(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return COLORS[h % COLORS.length]
}

export default function Participant({ member, speaking, connState }) {
  const { id, nickname, muted, isMe } = member
  const color = colorFor(id)
  const connecting = !isMe && connState && connState !== 'connected'
  const initial = (nickname || '?').trim().charAt(0).toUpperCase()

  return (
    <div className={`tile ${speaking ? 'speaking' : ''}`}>
      <div className="avatar-wrap">
        <div className="avatar" style={{ background: color, color: '#0d1117' }}>
          {initial}
        </div>
        {speaking && <span className="ring" style={{ borderColor: color }} />}
      </div>
      <div className="tile-name">
        {nickname}
        {isMe && <span className="me-tag">나</span>}
      </div>
      <div className="tile-status">
        {muted ? (
          <span className="status muted">🔇 음소거</span>
        ) : connecting ? (
          <span className="status connecting">연결 중…</span>
        ) : (
          <span className="status live">🎤 통화 중</span>
        )}
      </div>
    </div>
  )
}
