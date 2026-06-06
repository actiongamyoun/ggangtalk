import React from 'react'
import { useVoiceRoom } from './hooks/useVoiceRoom'
import Lobby from './components/Lobby'
import Room from './components/Room'

export default function App() {
  const room = useVoiceRoom()
  const inRoom = room.status === 'joined'

  return (
    <div className="app">
      <div className="bg-glow" aria-hidden="true" />
      {inRoom ? <Room room={room} /> : <Lobby room={room} />}
    </div>
  )
}
