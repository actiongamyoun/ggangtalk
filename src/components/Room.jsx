import React, { useState } from 'react'
import Participant from './Participant'

export default function Room({ room }) {
  const { roomCode, members, speakingIds, connStates, failedIds, levelsRef, muted, myId, toggleMute, leave } = room
  const [copied, setCopied] = useState(false)

  const list = Object.values(members).sort((a, b) => {
    if (a.isMe) return -1
    if (b.isMe) return 1
    return a.nickname.localeCompare(b.nickname)
  })

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="room">
      <header className="room-head">
        <button className="leave-btn" onClick={leave} title="나가기">
          ← 나가기
        </button>
        <button className="code-pill" onClick={copyCode} title="코드 복사">
          <span className="code-label">방 코드</span>
          <span className="code-value">{roomCode}</span>
          <span className="copy-ic">{copied ? '✅' : '📋'}</span>
        </button>
      </header>

      <div className="count-row">
        <span className="count-badge">👥 {list.length}명 통화 중</span>
      </div>

      <div className="grid">
        {list.map((m) => (
          <Participant
            key={m.id}
            member={m}
            speaking={speakingIds.has(m.id)}
            connState={connStates[m.id]}
            failed={failedIds.has(m.id)}
            levelsRef={levelsRef}
          />
        ))}
      </div>

      {list.length === 1 && (
        <p className="empty-hint">
          아직 혼자예요. 친구에게 <b>{roomCode}</b> 코드를 알려주세요!
        </p>
      )}

      <div className="dock">
        <button
          className={`mic-btn ${muted ? 'off' : 'on'}`}
          onClick={toggleMute}
          aria-pressed={muted}
        >
          <span className="mic-ic">{muted ? '🔇' : '🎤'}</span>
          <span className="mic-text">{muted ? '음소거 해제' : '음소거'}</span>
        </button>
      </div>
    </div>
  )
}
