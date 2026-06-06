import React, { useEffect, useRef } from 'react'
import Stickman, { CHARACTERS } from './Stickman'

// 실시간 음량으로 출렁이는 이퀄라이저 막대 (렌더 밖에서 rAF로 직접 DOM 조작)
function Equalizer({ levelsRef, id }) {
  const barsRef = useRef([])
  const valsRef = useRef([0.12, 0.12, 0.12, 0.12, 0.12])

  useEffect(() => {
    let raf
    const weights = [0.55, 0.85, 1.0, 0.8, 0.5]
    const tick = () => {
      const lvl = (levelsRef?.current?.[id]) || 0
      for (let k = 0; k < 5; k++) {
        let target
        if (lvl < 0.04) {
          target = 0.12 // 조용할 땐 잔잔하게
        } else {
          const jitter = 0.75 + Math.random() * 0.5
          target = Math.max(0.12, Math.min(1, lvl * weights[k] * jitter))
        }
        valsRef.current[k] += (target - valsRef.current[k]) * 0.45
        const el = barsRef.current[k]
        if (el) el.style.transform = `scaleY(${valsRef.current[k].toFixed(3)})`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [levelsRef, id])

  return (
    <span className="eq" aria-label="통화 중">
      {[0, 1, 2, 3, 4].map((k) => (
        <i key={k} ref={(el) => (barsRef.current[k] = el)} className="eq-bar" />
      ))}
    </span>
  )
}

export default function Participant({ member, speaking, connState, failed, levelsRef }) {
  const { id, nickname, muted, char, isMe } = member
  const color = (CHARACTERS[char] || CHARACTERS[0]).color
  const connecting = !isMe && !failed && connState !== 'connected'
  const live = !muted && !failed && !connecting

  return (
    <div className={`tile ${speaking && live ? 'speaking' : ''}`}>
      <div className="avatar-wrap">
        <div className="avatar">
          <Stickman index={char || 0} size={64} />
        </div>
        {speaking && live && <span className="ring" style={{ borderColor: color }} />}
      </div>

      <div className="tile-name">
        {nickname}
        {isMe && <span className="me-tag">나</span>}
      </div>

      <div className="tile-status">
        {failed ? (
          <span className="status failed">⚠️ 연결 실패</span>
        ) : muted ? (
          <span className="status muted">🔇 음소거</span>
        ) : connecting ? (
          <span className="status connecting">연결 중…</span>
        ) : (
          <Equalizer levelsRef={levelsRef} id={id} />
        )}
      </div>
    </div>
  )
}
