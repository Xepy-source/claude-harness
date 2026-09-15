import { useEffect, useState } from 'react'
import './App.css'

type Health = 'loading' | 'ok' | 'error'

function App() {
  const [health, setHealth] = useState<Health>('loading')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((data: { status: string }) => setHealth(data.status === 'ok' ? 'ok' : 'error'))
      .catch(() => setHealth('error'))
  }, [])

  return (
    <main>
      <h1>claude_harness</h1>
      <p>Backend: {health}</p>
    </main>
  )
}

export default App
