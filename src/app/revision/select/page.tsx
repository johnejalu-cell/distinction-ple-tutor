'use client'

import { useRouter } from 'next/navigation'

export default function RevisionSelectPage() {
  const router = useRouter()

  const subjects = [
    { code: 'mathematics', name: 'Mathematics', icon: '🔢', color: '#BA7517', bg: '#FAEEDA', desc: 'Word problems, fractions, ratio, geometry' },
    { code: 'english', name: 'English Language', icon: '📖', color: '#1D9E75', bg: '#E1F5EE', desc: 'Grammar, comprehension, vocabulary' },
    { code: 'science', name: 'Integrated Science', icon: '🔬', color: '#534AB7', bg: '#EEEDFE', desc: 'Living things, environment, matter' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="topbar">
        <button className="topbar-back" onClick={() => router.push('/dashboard')}>←</button>
        <div className="topbar-title">📖 Revision Mode</div>
      </div>

      <div style={{ flex: 1, padding: 16 }}>
        <div style={{ background: '#FAEEDA', borderRadius: 12, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#854F0B', marginBottom: 4 }}>
            Unlimited practice for exam preparation
          </div>
          <div style={{ fontSize: 13, color: '#854F0B', lineHeight: 1.6 }}>
            Choose a subject below. Questions keep coming until you decide to stop — perfect for serious exam revision.
          </div>
        </div>

        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: '#5F5E5A' }}>
          Choose a subject to revise
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {subjects.map(s => (
            <div
              key={s.code}
              onClick={() => router.push(`/revision?subject=${s.code}`)}
              style={{
                background: '#fff', border: '0.5px solid rgba(0,0,0,0.10)',
                borderRadius: 12, padding: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3, color: s.color }}>{s.name}</div>
                <div style={{ fontSize: 12, color: '#888780' }}>{s.desc}</div>
              </div>
              <div style={{ fontSize: 20, color: '#888780' }}>→</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

