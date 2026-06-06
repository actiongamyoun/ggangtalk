import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, hasSupabaseConfig } from '../lib/supabase'

// 구글 무료 STUN + Open Relay 무료 TURN (계정 불필요, best-effort).
// 직접연결(P2P)이 안 되는 모바일망에서는 TURN이 음성을 중계해 줌.
// 만약 그래도 안 붙으면 Cloudflare/Metered 무료 TURN으로 교체하면 됨.
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
]

const SPEAKING_THRESHOLD = 8 // 0~255 기준, 말하는 중 판정 임계값

const randId = () => Math.random().toString(36).slice(2, 10)

// 닉네임 비교용 정규화 (대소문자/공백 무시)
const normName = (s) => (s || '').trim().toLowerCase()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function useVoiceRoom() {
  const [status, setStatus] = useState('idle') // idle | connecting | joined | error
  const [error, setError] = useState(null)
  const [roomCode, setRoomCode] = useState(null)
  const [muted, setMuted] = useState(false)
  const [members, setMembers] = useState({}) // id -> { id, nickname, muted, isMe }
  const [connStates, setConnStates] = useState({}) // id -> RTCPeerConnectionState
  const [failedIds, setFailedIds] = useState(() => new Set()) // 연결 실패한 피어
  const [speakingIds, setSpeakingIds] = useState(() => new Set())

  const myIdRef = useRef(null)
  const nicknameRef = useRef('')
  const charRef = useRef(0)
  const mutedRef = useRef(false)
  const channelRef = useRef(null)
  const localStreamRef = useRef(null)
  const pcsRef = useRef({}) // id -> RTCPeerConnection
  const pendingIceRef = useRef({}) // id -> [candidate]
  const audioElsRef = useRef({}) // id -> <audio>
  const metersRef = useRef({}) // id -> { source, analyser, interval }
  const levelsRef = useRef({}) // id -> 0..1 실시간 음량 (렌더 밖에서 직접 읽음)
  const watchdogsRef = useRef({}) // id -> { restart, fail } 타이머
  const audioCtxRef = useRef(null)
  const unloadHandlerRef = useRef(null)
  const okToReconcileRef = useRef(false) // 닉네임 확인 끝나고 입장 확정되면 true

  // ---- 말하는 사람 감지 (볼륨 미터) ----
  const updateSpeaking = useCallback((id, speaking) => {
    setSpeakingIds((prev) => {
      if (prev.has(id) === speaking) return prev
      const next = new Set(prev)
      if (speaking) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const attachMeter = useCallback(
    (id, stream) => {
      try {
        if (!audioCtxRef.current) {
          const Ctx = window.AudioContext || window.webkitAudioContext
          audioCtxRef.current = new Ctx()
        }
        const ctx = audioCtxRef.current
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        source.connect(analyser) // destination에는 연결 안 함 → 에코 없음
        const data = new Uint8Array(analyser.frequencyBinCount)
        const interval = setInterval(() => {
          analyser.getByteTimeDomainData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) {
            const v = data[i] - 128
            sum += v * v
          }
          const rms = Math.sqrt(sum / data.length)
          const isMeMuted = id === myIdRef.current && mutedRef.current
          // 0~1 정규화 레벨 (이퀄라이저 게이지용). rms 약 0~50 → 0~1
          const level = isMeMuted ? 0 : Math.min(1, rms / 32)
          levelsRef.current[id] = level
          updateSpeaking(id, rms > SPEAKING_THRESHOLD && !isMeMuted)
        }, 90)
        metersRef.current[id] = { source, analyser, interval }
      } catch (e) {
        console.warn('볼륨 미터 실패', e)
      }
    },
    [updateSpeaking]
  )

  const detachMeter = useCallback((id) => {
    const m = metersRef.current[id]
    if (m) {
      clearInterval(m.interval)
      try { m.source.disconnect() } catch {}
      delete metersRef.current[id]
    }
    delete levelsRef.current[id]
  }, [])

  // ---- 시그널링 전송 ----
  const sendSignal = useCallback((payload) => {
    channelRef.current?.send({ type: 'broadcast', event: 'signal', payload })
  }, [])

  // ---- 원격 오디오 붙이기 ----
  const attachRemoteAudio = useCallback(
    (id, stream) => {
      let el = audioElsRef.current[id]
      if (!el) {
        el = document.createElement('audio')
        el.autoplay = true
        el.setAttribute('playsinline', '')
        el.style.display = 'none'
        document.body.appendChild(el)
        audioElsRef.current[id] = el
      }
      el.srcObject = stream
      el.play().catch(() => {})
      attachMeter(id, stream)
    },
    [attachMeter]
  )

  // ---- 워치독(연결 감시) ----
  const clearWatchdog = useCallback((id) => {
    const w = watchdogsRef.current[id]
    if (w) {
      clearTimeout(w.restart)
      clearTimeout(w.fail)
      delete watchdogsRef.current[id]
    }
  }, [])

  const setFailed = useCallback((id, val) => {
    setFailedIds((prev) => {
      if (prev.has(id) === val) return prev
      const next = new Set(prev)
      if (val) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  // ---- 피어 연결 정리 ----
  const cleanupPeer = useCallback(
    (id) => {
      const pc = pcsRef.current[id]
      if (pc) {
        try { pc.close() } catch {}
        delete pcsRef.current[id]
      }
      const el = audioElsRef.current[id]
      if (el) {
        el.srcObject = null
        el.remove()
        delete audioElsRef.current[id]
      }
      detachMeter(id)
      clearWatchdog(id)
      setFailed(id, false)
      delete pendingIceRef.current[id]
      setConnStates((p) => {
        const n = { ...p }
        delete n[id]
        return n
      })
      updateSpeaking(id, false)
    },
    [detachMeter, updateSpeaking, clearWatchdog, setFailed]
  )

  // ---- 피어 연결 생성 ----
  const createPeer = useCallback(
    (peerId, initiator) => {
      if (pcsRef.current[peerId]) return pcsRef.current[peerId]
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pc._initiator = initiator
      pcsRef.current[peerId] = pc

      localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current))

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendSignal({ kind: 'ice', to: peerId, from: myIdRef.current, candidate: e.candidate.toJSON() })
        }
      }
      pc.ontrack = (e) => attachRemoteAudio(peerId, e.streams[0])

      const doIceRestart = () => {
        if (!pc._initiator || pc.connectionState === 'connected') return
        pc.createOffer({ iceRestart: true })
          .then((o) => pc.setLocalDescription(o))
          .then(() =>
            sendSignal({ kind: 'offer', to: peerId, from: myIdRef.current, sdp: pc.localDescription })
          )
          .catch(() => {})
      }

      pc.onconnectionstatechange = () => {
        const s = pc.connectionState
        setConnStates((p) => ({ ...p, [peerId]: s }))
        if (s === 'connected') {
          clearWatchdog(peerId)
          setFailed(peerId, false)
        } else if (s === 'failed') {
          doIceRestart()
        }
      }

      // 워치독: 12초 안에 연결 안 되면 ICE 재시작, 25초까지 안 되면 '연결 실패' 표시
      watchdogsRef.current[peerId] = {
        restart: setTimeout(doIceRestart, 12000),
        fail: setTimeout(() => {
          if (pcsRef.current[peerId]?.connectionState !== 'connected') setFailed(peerId, true)
        }, 25000)
      }

      if (initiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            sendSignal({ kind: 'offer', to: peerId, from: myIdRef.current, sdp: pc.localDescription })
          })
          .catch((e) => console.warn('offer 실패', e))
      }
      return pc
    },
    [attachRemoteAudio, sendSignal, clearWatchdog, setFailed]
  )

  const flushIce = useCallback(async (id, pc) => {
    const list = pendingIceRef.current[id] || []
    for (const c of list) {
      try { await pc.addIceCandidate(c) } catch {}
    }
    pendingIceRef.current[id] = []
  }, [])

  // ---- 시그널 수신 처리 ----
  const handleSignal = useCallback(
    async (p) => {
      if (!p || p.to !== myIdRef.current) return
      const from = p.from
      try {
        if (p.kind === 'offer') {
          const pc = pcsRef.current[from] || createPeer(from, false)
          await pc.setRemoteDescription(p.sdp)
          await flushIce(from, pc)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          sendSignal({ kind: 'answer', to: from, from: myIdRef.current, sdp: pc.localDescription })
        } else if (p.kind === 'answer') {
          const pc = pcsRef.current[from]
          if (pc && pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(p.sdp)
            await flushIce(from, pc)
          }
        } else if (p.kind === 'ice') {
          const pc = pcsRef.current[from]
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try { await pc.addIceCandidate(p.candidate) } catch {}
          } else {
            ;(pendingIceRef.current[from] ||= []).push(p.candidate)
          }
        }
      } catch (e) {
        console.warn('시그널 처리 실패', e)
      }
    },
    [createPeer, flushIce, sendSignal]
  )

  // ---- presence 동기화 → 연결 맺기/끊기 ----
  const reconcile = useCallback(
    (state) => {
      const myId = myIdRef.current
      const ids = Object.keys(state)
      const others = ids.filter((id) => id !== myId)

      const m = {}
      ids.forEach((id) => {
        const meta = state[id]?.[0] || {}
        m[id] = {
          id,
          nickname: meta.nickname || '친구',
          muted: !!meta.muted,
          char: Number.isInteger(meta.char) ? meta.char : 0,
          isMe: id === myId
        }
      })
      setMembers(m)

      // 새로 들어온 사람과 연결
      others.forEach((id) => {
        if (!pcsRef.current[id]) {
          // 한 쌍에서 딱 한 명만 offer를 보내도록 결정 (id 비교)
          const initiator = myId > id
          createPeer(id, initiator)
        }
      })
      // 나간 사람 정리
      Object.keys(pcsRef.current).forEach((id) => {
        if (!others.includes(id)) cleanupPeer(id)
      })
    },
    [createPeer, cleanupPeer]
  )

  // ---- 입장 ----
  const join = useCallback(
    async ({ nickname, code, char = 0 }) => {
      if (!hasSupabaseConfig || !supabase) {
        setError('서버 설정이 안 돼 있어요. .env에 Supabase 정보를 넣어주세요.')
        setStatus('error')
        return
      }
      setError(null)
      setStatus('connecting')
      try {
        const myId = randId()
        myIdRef.current = myId
        nicknameRef.current = nickname
        charRef.current = char
        mutedRef.current = false
        okToReconcileRef.current = false
        setMuted(false)
        setRoomCode(code)

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false
        })
        localStreamRef.current = stream
        attachMeter(myId, stream)

        // 사용자 탭으로 진입했으니 오디오 컨텍스트 재개 (모바일 자동재생 정책)
        audioCtxRef.current?.resume?.()

        const channel = supabase.channel(`gtt-room:${code}`, {
          config: { presence: { key: myId }, broadcast: { self: false } }
        })
        channelRef.current = channel

        // 탭을 닫거나 앱을 나가면 즉시 presence에서 빠지게 (= 다른 사람 화면에서 바로 사라짐)
        const onHide = () => {
          try { channel.untrack() } catch {}
        }
        window.addEventListener('pagehide', onHide)
        window.addEventListener('beforeunload', onHide)
        unloadHandlerRef.current = onHide

        channel.on('broadcast', { event: 'signal' }, ({ payload }) => handleSignal(payload))
        channel.on('presence', { event: 'sync' }, () => {
          if (okToReconcileRef.current) reconcile(channel.presenceState())
        })

        channel.subscribe(async (st) => {
          if (st === 'SUBSCRIBED') {
            // presence 스냅샷이 도착할 시간을 잠깐 준 뒤 닉네임 중복 검사
            await sleep(500)
            const state = channel.presenceState()
            const taken = Object.entries(state)
              .filter(([id]) => id !== myId)
              .some(([, arr]) => normName(arr?.[0]?.nickname) === normName(nickname))

            if (taken) {
              // 입장 취소 — 같은 이름이 이미 방에 있음
              try { supabase.removeChannel(channel) } catch {}
              channelRef.current = null
              detachMeter(myId)
              localStreamRef.current?.getTracks().forEach((t) => t.stop())
              localStreamRef.current = null
              setError(`"${nickname}" 이름은 이미 방에 있어요. 다른 이름으로 들어와 주세요.`)
              setStatus('error')
              return
            }

            await channel.track({ nickname, muted: false, char })
            okToReconcileRef.current = true
            reconcile(channel.presenceState())
            setStatus('joined')
          } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') {
            setError('연결에 실패했어요. 잠시 후 다시 시도해 주세요.')
            setStatus('error')
          }
        })
      } catch (e) {
        if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
          setError('마이크 권한이 필요해요. 브라우저에서 마이크를 허용해 주세요.')
        } else if (e?.name === 'NotFoundError') {
          setError('마이크를 찾을 수 없어요. 기기에 마이크가 있는지 확인해 주세요.')
        } else {
          setError('마이크를 켤 수 없어요: ' + (e?.message || e))
        }
        setStatus('error')
      }
    },
    [attachMeter, detachMeter, handleSignal, reconcile]
  )

  // ---- 음소거 토글 ----
  const toggleMute = useCallback(() => {
    const next = !mutedRef.current
    mutedRef.current = next
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next))
    setMuted(next)
    channelRef.current?.track({ nickname: nicknameRef.current, muted: next, char: charRef.current })
    if (next) updateSpeaking(myIdRef.current, false)
  }, [updateSpeaking])

  // ---- 나가기 ----
  const leave = useCallback(() => {
    if (unloadHandlerRef.current) {
      window.removeEventListener('pagehide', unloadHandlerRef.current)
      window.removeEventListener('beforeunload', unloadHandlerRef.current)
      unloadHandlerRef.current = null
    }
    const ch = channelRef.current
    if (ch) {
      try { ch.untrack() } catch {}
      try { supabase?.removeChannel(ch) } catch {}
    }
    channelRef.current = null
    okToReconcileRef.current = false
    Object.keys(pcsRef.current).forEach((id) => cleanupPeer(id))
    detachMeter(myIdRef.current)
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    setMembers({})
    setConnStates({})
    setFailedIds(new Set())
    setSpeakingIds(new Set())
    setMuted(false)
    mutedRef.current = false
    setRoomCode(null)
    setStatus('idle')
    setError(null)
  }, [cleanupPeer, detachMeter])

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      try { leave() } catch {}
      try { audioCtxRef.current?.close() } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    status,
    error,
    roomCode,
    myId: myIdRef.current,
    muted,
    members,
    connStates,
    failedIds,
    speakingIds,
    levelsRef,
    configured: hasSupabaseConfig,
    join,
    leave,
    toggleMute
  }
}
