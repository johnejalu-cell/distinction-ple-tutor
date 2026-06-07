'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Message {
  role: 'user' | 'tutor'
  text: string
  imagePreview?: string
}

// Compress image before sending
async function compressImage(file: File, maxWidth = 800, quality = 0.6): Promise<{ base64: string; type: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas error')); return }
      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve({ base64: dataUrl.split(',')[1], type: 'image/jpeg' })
    }
    img.onerror = reject
    img.src = url
  })
}

const QUICK_PROMPTS = [
  'Can you explain this question to me?',
  'Please check my working and tell me where I went wrong',
  'How do I solve this step by step?',
  'What topic is this question testing?',
  'Give me a similar practice question',
]

const SUBJECT_HINTS = [
  { label: 'Maths', emoji: '🔢', prompt: 'This is a maths question. Please explain it step by step using simple language.' },
  { label: 'English', emoji: '📖', prompt: 'This is an English question. Please explain it clearly.' },
  { label: 'Science', emoji: '🔬', prompt: 'This is a science question. Please explain the concept simply.' },
]

export default function TutorPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedImageType, setUploadedImageType] = useState('image/jpeg')
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null)
  const [imageProcessing, setImageProcessing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadStudent() }, [])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadStudent() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: students } = await supabase
      .from('students').select('full_name').eq('parent_id', user.id).limit(1)
    if (students?.length) setStudentName(students[0].full_name.split(' ')[0])
    setPageLoading(false)
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageProcessing(true)
    try {
      const { base64, type } = await compressImage(file, 800, 0.6)
      setUploadedImage(base64)
      setUploadedImageType(type)
      setUploadedImagePreview(`data:${type};base64,${base64}`)
    } catch {
      alert('Could not process image. Please try a different photo.')
    } finally {
      setImageProcessing(false)
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function clearImage() {
    setUploadedImage(null)
    setUploadedImagePreview(null)
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function sendMessage(overrideText?: string) {
    const text = overrideText || inputText
    if (!text.trim() && !uploadedImage) return
    setLoading(true)

    const userMsg: Message = {
      role: 'user',
      text: text || '(Uploaded an image — please explain this question)',
      imagePreview: uploadedImagePreview || undefined,
    }
    setMessages(prev => [...prev, userMsg])
    setInputText('')

    const imageToSend = uploadedImage
    const imageTypeToSend = uploadedImageType
    clearImage()

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text || 'Please look at this image and explain the question shown.',
          studentQuestion: text || 'Can you explain this question to me?',
          subject: 'General PLE',
          difficulty: 'intermediate',
          imageBase64: imageToSend || undefined,
          imageType: imageTypeToSend,
        }),
      })
      const data = await res.json()
      const tutorMsg: Message = {
        role: 'tutor',
        text: data.error ? `Sorry, I had trouble with that. ${data.error}` : data.explanation,
      }
      setMessages(prev => [...prev, tutorMsg])
    } catch {
      setMessages(prev => [...prev, { role: 'tutor', text: 'Sorry, I could not connect. Please check your internet and try again.' }])
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 40 }}>🤖</div>
        <div style={{ fontSize: 15, color: '#888780' }}>Loading tutor...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F8F9FF' }}>
      {/* Top bar */}
      <div className="topbar" style={{ background: '#534AB7' }}>
        <button className="topbar-back" onClick={() => router.push('/dashboard')} style={{ color: '#fff' }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#fff' }}>🤖 AI Tutor</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Ask any PLE question — upload photos of your work</div>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>

        {/* Welcome message */}
        {messages.length === 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ background: '#EEEDFE', borderRadius: '4px 16px 16px 16px', padding: 14, marginBottom: 16, maxWidth: '85%' }}>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: '#3C3489' }}>
                Hello {studentName}! 👋 I am your PLE tutor. You can:
              </div>
              <div style={{ fontSize: 13, color: '#534AB7', marginTop: 8, lineHeight: 1.8 }}>
                📷 Take a photo of any question<br />
                📁 Upload from your gallery or files<br />
                ✏️ Type any question you need help with<br />
                🔍 Ask about maths, English or science
              </div>
            </div>

            {/* Subject quick select */}
            <div style={{ fontSize: 12, color: '#888780', marginBottom: 8 }}>Quick start — choose a subject:</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {SUBJECT_HINTS.map(s => (
                <button key={s.label} onClick={() => setInputText(s.prompt)}
                  style={{ padding: '7px 12px', background: '#fff', border: '1px solid rgba(83,74,183,0.3)', borderRadius: 20, fontSize: 12, color: '#534AB7', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>

            {/* Quick prompts */}
            <div style={{ fontSize: 12, color: '#888780', marginBottom: 8 }}>Or choose a question type:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {QUICK_PROMPTS.map(p => (
                <button key={p} onClick={() => sendMessage(p)}
                  style={{ padding: '9px 14px', background: '#fff', border: '1px solid rgba(83,74,183,0.2)', borderRadius: 10, fontSize: 13, color: '#534AB7', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message history */}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {/* Image preview in message */}
            {msg.imagePreview && (
              <img src={msg.imagePreview} alt="Uploaded"
                style={{ maxWidth: '70%', borderRadius: 10, marginBottom: 6, border: '1px solid rgba(0,0,0,0.1)', objectFit: 'cover', maxHeight: 160 }} />
            )}
            <div style={{
              maxWidth: '85%', padding: '11px 14px', borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              background: msg.role === 'user' ? '#534AB7' : '#fff',
              color: msg.role === 'user' ? '#fff' : '#1a1a2e',
              fontSize: 14, lineHeight: 1.6,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              border: msg.role === 'tutor' ? '0.5px solid rgba(83,74,183,0.15)' : 'none',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.role === 'tutor' && (
                <div style={{ fontSize: 11, fontWeight: 500, color: '#534AB7', marginBottom: 6 }}>🤖 AI Tutor</div>
              )}
              {msg.text}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ background: '#fff', border: '0.5px solid rgba(83,74,183,0.15)', borderRadius: '4px 16px 16px 16px', padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#534AB7', marginBottom: 6 }}>🤖 AI Tutor</div>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%', background: '#534AB7',
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    opacity: 0.6,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} style={{ height: 8 }} />
      </div>

      {/* Image preview above input */}
      {uploadedImagePreview && (
        <div style={{ padding: '8px 16px 0', position: 'relative', display: 'inline-block' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={uploadedImagePreview} alt="Ready to send"
              style={{ height: 70, width: 70, objectFit: 'cover', borderRadius: 8, border: '1.5px solid rgba(83,74,183,0.4)' }} />
            <button onClick={clearImage}
              style={{ position: 'absolute', top: -6, right: -6, background: '#A32D2D', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#534AB7', marginTop: 4 }}>Image ready to send</div>
        </div>
      )}

      {imageProcessing && (
        <div style={{ padding: '6px 16px', fontSize: 12, color: '#534AB7' }}>⏳ Processing image...</div>
      )}

      {/* Input bar */}
      <div style={{ background: '#fff', borderTop: '0.5px solid rgba(0,0,0,0.10)', padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        {/* Hidden file inputs */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} style={{ display: 'none' }} />
        <input ref={fileInputRef}   type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {/* Camera button */}
          <button onClick={() => cameraInputRef.current?.click()} disabled={imageProcessing}
            style={{ width: 38, height: 38, borderRadius: 10, background: '#EEEDFE', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            📷
          </button>

          {/* File button */}
          <button onClick={() => fileInputRef.current?.click()} disabled={imageProcessing}
            style={{ width: 38, height: 38, borderRadius: 10, background: '#EEEDFE', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            📁
          </button>

          {/* Text input */}
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Type your question..."
            rows={1}
            style={{
              flex: 1, padding: '10px 12px', border: '1.5px solid rgba(83,74,183,0.3)',
              borderRadius: 10, fontSize: 14, fontFamily: 'inherit', resize: 'none',
              outline: 'none', background: '#fff', color: '#1a1a2e',
              maxHeight: 100, overflowY: 'auto',
            }}
          />

          {/* Send button */}
          <button
            onClick={() => sendMessage()}
            disabled={loading || (!inputText.trim() && !uploadedImage) || imageProcessing}
            style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: loading || (!inputText.trim() && !uploadedImage) ? '#c5c0e8' : '#534AB7',
              border: 'none', cursor: 'pointer', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ➤
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
