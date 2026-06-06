import React, { useState } from 'react'

const randomCode = () => String(Math.floor(100000 + Math.random() * 900000))

export default function Lobby({ room }) {
  const { join, status, error, configured } = room
  const [nickname, setNickname] = useState('')
  const [code, setCode] = useState('')
  const [localErr, setLocalErr] = useState(null)
  const connecting = status === 'connecting'

  const onlyDigits = (v) => v.replace(/\D/g, '').slice(0, 6)

  const validate = (theCode) => {
    if (!nickname.trim()) return '닉네임을 입력해 주세요.'
    if (!/^\d{6}$/.test(theCode)) return '방 코드는 6자리 숫자예요.'
    return null
  }

  const enter = (theCode) => {
    const err = validate(theCode)
    if (err) {
      setLocalErr(err)
      return
    }
    setLocalErr(null)
    join({ nickname: nickname.trim(), code: theCode })
  }

  const makeRoom = () => {
    if (!nickname.trim()) {
      setLocalErr('먼저 닉네임을 입력해 주세요.')
      return
    }
    const c = randomCode()
    setCode(c)
    enter(c)
  }

  return (
    <div className="lobby">
      <header className="lobby-head">
        <div className="logo-mark" aria-hidden="true">
          <span className="logo-dot" />
        </div>
        <h1 className="title">깡톡</h1>
        <p className="subtitle">게임할 때 친구들이랑 단체로 통화해요</p>
      </header>

      {!configured && (
        <div className="banner warn">
          ⚠️ 서버 설정이 아직 안 됐어요. <code>.env</code> 파일에 Supabase 정보를 넣어주세요.
        </div>
      )}

      <div className="card">
        <label className="field">
          <span className="field-label">내 이름</span>
          <input
            className="input"
            type="text"
            inputMode="text"
            maxLength={12}
            placeholder="닉네임 (예: 깡이)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={connecting}
          />
        </label>

        <label className="field">
          <span className="field-label">방 코드</span>
          <div className="code-row">
            <input
              className="input code-input"
              type="text"
              inputMode="numeric"
              pattern="\d*"
              placeholder="6자리 숫자"
              value={code}
              onChange={(e) => setCode(onlyDigits(e.target.value))}
              disabled={connecting}
            />
            <button
              type="button"
              className="dice-btn"
              onClick={() => setCode(randomCode())}
              disabled={connecting}
              title="랜덤 코드"
            >
              🎲
            </button>
          </div>
        </label>

        {(localErr || error) && <div className="banner error">{localErr || error}</div>}

        <button className="btn-primary" onClick={() => enter(code)} disabled={connecting}>
          {connecting ? '연결 중…' : '입장하기'}
        </button>
        <button className="btn-ghost" onClick={makeRoom} disabled={connecting}>
          + 새 방 만들기
        </button>
      </div>

      <p className="hint">
        같은 방에 들어오려면 친구들에게 <b>방 코드</b>를 불러주세요.
        <br />
        입장하면 바로 마이크가 켜져요 🎤
      </p>
    </div>
  )
}
