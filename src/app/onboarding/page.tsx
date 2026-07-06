'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const AVATARS = ['👦', '👧', '🧒', '👨‍🎓', '👩‍🎓', '🦁', '🐯', '⭐']

export default function OnboardingPage() {
  const [fullName, setFullName] = useState('')
  const [pleYear, setPleYear] = useState(new Date().getFullYear())
  const [school, setSchool] = useState('')
  const [district, setDistrict] = useState('')
  const [avatar, setAvatar] = useState('👦')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleCreate() {
    if (!fullName.trim()) {
      setError('Please enter your child\'s name')
      return
    }
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase
      .from('students')
      .insert({
        parent_id: user.id,
        full_name: fullName.trim(),
        ple_year: pleYear,
        school_name: school.trim() || null,
        district: district.trim() || null,
        avatar_emoji: avatar,
      })

    if (error) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: '#534AB7', padding: '32px 24px 28px',
        color: '#fff', textAlign: 'center', position: 'relative',
      }}>
        <button onClick={handleSignOut}
          style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 12, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit' }}>
          Sign out
        </button>
        <div style={{ fontSize: 40, marginBottom: 10 }}>👨‍👩‍👧</div>
        <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 6 }}>Add your child</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          Set up your P7 student&apos;s profile to get started
        </div>
      </div>

      <div style={{ padding: '24px 20px', flex: 1 }}>

        {/* Avatar picker */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: '#5F5E5A', marginBottom: 10, fontWeight: 500 }}>
            Choose an avatar
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                style={{
                  width: 48, height: 48, fontSize: 24,
                  border: avatar === a ? '2px solid #534AB7' : '1.5px solid rgba(0,0,0,0.12)',
                  borderRadius: 12, background: avatar === a ? '#EEEDFE' : '#fff',
                  cursor: 'pointer',
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>
            Child&apos;s full name <span style={{ color: '#A32D2D' }}>*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="e.g. Amara Nakato"
            style={{
              width: '100%', padding: '12px 14px',
              border: '1.5px solid rgba(0,0,0,0.12)',
              borderRadius: 10, fontSize: 15, fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>

        {/* PLE Year */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>
            PLE exam year
          </label>
          <select
            value={pleYear}
            onChange={e => setPleYear(Number(e.target.value))}
            style={{
              width: '100%', padding: '12px 14px',
              border: '1.5px solid rgba(0,0,0,0.12)',
              borderRadius: 10, fontSize: 15, fontFamily: 'inherit',
              background: '#fff', outline: 'none',
            }}
          >
            {[0, 1, 2].map(offset => {
              const y = new Date().getFullYear() + offset
              return <option key={y} value={y}>{y}</option>
            })}
          </select>
        </div>

        {/* School */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>
            School name <span style={{ color: '#888780' }}>(optional)</span>
          </label>
          <input
            type="text"
            value={school}
            onChange={e => setSchool(e.target.value)}
            placeholder="e.g. St. Mary's Primary School"
            style={{
              width: '100%', padding: '12px 14px',
              border: '1.5px solid rgba(0,0,0,0.12)',
              borderRadius: 10, fontSize: 15, fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>

        {/* District */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, color: '#5F5E5A', display: 'block', marginBottom: 6 }}>
            District <span style={{ color: '#888780' }}>(optional)</span>
          </label>
          <input
            type="text"
            value={district}
            onChange={e => setDistrict(e.target.value)}
            placeholder="e.g. Kampala, Wakiso, Mukono"
            style={{
              width: '100%', padding: '12px 14px',
              border: '1.5px solid rgba(0,0,0,0.12)',
              borderRadius: 10, fontSize: 15, fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>

        {error && (
          <div style={{
            background: '#FCEBEB', border: '0.5px solid rgba(163,45,45,0.3)',
            borderRadius: 10, padding: '12px 14px',
            fontSize: 13, color: '#A32D2D', marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleCreate}
          disabled={loading || !fullName.trim()}
        >
          {loading ? 'Creating profile...' : `Create ${avatar} ${fullName || 'student'}'s profile`}
        </button>

        <div style={{
          marginTop: 20, padding: 14,
          background: '#FAEEDA', borderRadius: 12,
          fontSize: 13, color: '#854F0B', lineHeight: 1.6,
        }}>
          💡 You can add more children later from your parent dashboard.
        </div>
      </div>
    </div>
  )
}
