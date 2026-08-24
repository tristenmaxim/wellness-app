import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState('loading...')

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setStatus(d.status))
      .catch(() => setStatus('backend unreachable'))
  }, [])

  const inTelegram = Boolean((window as any).Telegram?.WebApp?.initData)

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>Wellness</h1>
      <p>backend: {status}</p>
      <p>telegram context: {inTelegram ? 'yes' : 'no'}</p>
    </div>
  )
}

export default App
