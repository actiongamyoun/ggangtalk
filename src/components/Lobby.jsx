import React, { useRef, useState } from 'react'
import Stickman, { CHARACTERS } from './Stickman'

// 코드는 무조건 자동 8자리 (사용자가 직접 못 정함 → 123456 충돌 방지)
const make8 = () => String(Math.floor(10000000 + Math.random() * 90000000))

export default function Lobby({ room }) {
  const { join, status, error, configured } = room
  const [nickname, setNickname] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [char, setChar] = useState(0)
  const [localErr, setLocalErr] = useState(null)
  const [rolling, setRolling] = useState(false)
  const [rolledCode, setRolledCode] = useState('')
  const [settled, setSettled] = useState(false)
  const ivRef = useRef(null)

  const connecting = status === 'connecting'
  const busy = connecting || rolling
  const onlyDigits = (v) => v.replace(/\D/g, '').slice(0, 8)

  // 주사위 굴리기 → 8자리 자동 생성 → 입장
  const makeRoom = () => {
    if (!nickname.trim()) {
      setLocalErr('먼저 닉네임을 입력해 주세요.')
      return
    }
    setLocalErr(null)
    setSettled(false)
    setRolling(true)
    const start = Date.now()
    ivRef.current = setInterval(() => {
      setRolledCode(make8())
      if (Date.now() - start > 900) {
        clearInterval(ivRef.current)
        const finalCode = make8()
        setRolledCode(finalCode)
        setRolling(false)
        setSettled(true)
        // 굴려서 나온 코드 잠깐 보여주고 입장
        setTimeout(() => join({ nickname: nickname.trim(), code: finalCode, char }), 450)
      }
    }, 60)
  }

  // 친구가 준 코드로 입장
  const enterByCode = () => {
    if (!nickname.trim()) {
      setLocalErr('닉네임을 입력해 주세요.')
      return
    }
    if (!/^\d{8}$/.test(joinCode)) {
      setLocalErr('방 코드는 8자리 숫자예요.')
      return
    }
    setLocalErr(null)
    join({ nickname: nickname.trim(), code: joinCode, char })
  }

  return (
    <div className="lobby">
      <header className="lobby-head">
        <div className="logo-mark" aria-hidden="true" />
        <h1 className="title">깡톡</h1>
        <p className="subtitle">게임할 때 친구들이랑 단체로 통화해요</p>
      </header>

      {!configured && (
        <div className="banner warn">
          ⚠️ 서버 설정이 아직 안 됐어요. <code>.env</code> 파일에 Supabase 정보를 넣어주세요.
        </div>
      )}

      <div className="card">
        <div className="field">
          <span className="field-label">내 캐릭터</span>
          <div className="char-grid">
            {CHARACTERS.map((c, i) => (
              <button
                key={i}
                type="button"
                className={`char-cell ${char === i ? 'sel' : ''}`}
                onClick={() => setChar(i)}
                disabled={busy}
                aria-label={c.name}
                title={c.name}
              >
                <Stickman index={i} size={52} />
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="field-label">내 이름</span>
          <input
            className="input"
            type="text"
            maxLength={12}
            placeholder="닉네임 (예: 깡이)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={busy}
          />
        </label>

        {(rolling || settled) && (
          <div className={`roll-box ${settled ? 'settled' : ''}`}>
            <span className={`dice ${rolling ? 'spin' : ''}`}>🎲</span>
            <span className="roll-code">{rolledCode}</span>
          </div>
        )}

        {(localErr || error) && <div className="banner error">{localErr || error}</div>}

        <button className="btn-primary" onClick={makeRoom} disabled={busy}>
          {rolling ? '코드 굴리는 중…' : connecting ? '입장 중…' : '🎲 새 방 만들기'}
        </button>

        <div className="divider"><span>또는 친구가 준 코드로</span></div>

        <div className="code-row">
          <input
            className="input code-input"
            type="text"
            inputMode="numeric"
            pattern="\d*"
            placeholder="8자리 코드"
            value={joinCode}
            onChange={(e) => setJoinCode(onlyDigits(e.target.value))}
            disabled={busy}
          />
          <button className="btn-join" onClick={enterByCode} disabled={busy}>
            입장
          </button>
        </div>
      </div>

      <p className="hint">
        방을 만들면 <b>8자리 코드</b>가 자동으로 만들어져요.
        <br />
        친구들에게 그 코드를 불러주면 같이 입장돼요 🎤
      </p>
    </div>
  )
}
