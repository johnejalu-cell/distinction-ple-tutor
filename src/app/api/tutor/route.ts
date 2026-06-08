import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const DAILY_LIMIT_FREE = 0      // no AI tutor on free/expired plan
const DAILY_LIMIT_TRIAL = 20    // 20 per day during trial
const DAILY_LIMIT_PREMIUM = 50  // 50 per day for subscribers

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, studentQuestion, subject, difficulty, imageBase64, imageType } = body

    if (!question || !studentQuestion) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Tutor not configured.' }, { status: 500 })
    }

    // ── ACCESS & LIMIT CHECK ─────────────────────────────────
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to use the AI Tutor.' }, { status: 401 })
    }

    // Get profile — check subscription and trial status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_subscribed, trial_started_at, subscription_expires_at')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 401 })
    }

    const now = new Date()
    const trialStart = profile.trial_started_at ? new Date(profile.trial_started_at) : null
    const trialActive = trialStart ? (now.getTime() - trialStart.getTime()) < 24 * 60 * 60 * 1000 : false
    const subscriptionActive = profile.is_subscribed &&
      (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > now)

    // Determine daily limit
    let dailyLimit: number
    if (subscriptionActive) {
      dailyLimit = DAILY_LIMIT_PREMIUM
    } else if (trialActive) {
      dailyLimit = DAILY_LIMIT_TRIAL
    } else {
      // Trial expired, not subscribed
      return NextResponse.json({
        error: 'Your free trial has ended. Please subscribe to continue using the AI Tutor.',
        requiresSubscription: true,
      }, { status: 403 })
    }

    // Get student to check daily count
    const { data: student } = await supabase
      .from('students')
      .select('id, ai_interactions_today, ai_interactions_date')
      .eq('parent_id', user.id)
      .limit(1)
      .single()

    if (student) {
      const today = now.toISOString().split('T')[0]
      const lastDate = student.ai_interactions_date
      const todayCount = lastDate === today ? (student.ai_interactions_today || 0) : 0

      if (todayCount >= dailyLimit) {
        return NextResponse.json({
          error: `You have used all ${dailyLimit} AI Tutor interactions for today. Come back tomorrow — your limit resets at midnight! 🌙`,
          limitReached: true,
        }, { status: 429 })
      }

      // Increment counter
      await supabase
        .from('students')
        .update({
          ai_interactions_today: todayCount + 1,
          ai_interactions_date: today,
        })
        .eq('id', student.id)
    }

    // ── BUILD PROMPT ─────────────────────────────────────────
    const prompt = `You are a friendly and encouraging tutor helping a P7 student in Uganda prepare for their Primary Leaving Examination (PLE).

The student is studying ${subject || 'a PLE subject'} at ${difficulty || 'intermediate'} level.

The exam question is:
"${question}"

The student asks: "${studentQuestion}"

${imageBase64 ? 'The student has also uploaded an image — this may show their working, a diagram, or notes. Please look at it carefully and give specific feedback on what you can see.' : ''}

Please explain this clearly and simply, as if talking to an 11-13 year old Ugandan student. Use simple English. Use Ugandan examples where helpful (markets, farming, Lake Victoria, matoke, posho, shillings etc).

If it is a maths word problem, break it down step by step:
1. What is the story about?
2. What are the key numbers and words?
3. What operation do we use?
4. How do we solve it?

If the student uploaded their working, comment specifically on what they did correctly, where they went wrong, and how to fix it.

Be warm, encouraging and positive. End with a motivating phrase. Keep your response under 200 words.`

    // ── CALL ANTHROPIC ───────────────────────────────────────
    type ContentBlock =
      | { type: 'text'; text: string }
      | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

    const userContent: ContentBlock[] = []

    if (imageBase64) {
      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: imageType || 'image/jpeg', data: imageBase64 },
      })
    }

    userContent.push({ type: 'text', text: prompt })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 500,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Anthropic API error:', response.status, errorText)
      return NextResponse.json({ error: 'The tutor is unavailable right now. Please try again.' }, { status: 500 })
    }

    const data = await response.json()
    const explanation = data.content?.[0]?.text

    if (!explanation) {
      return NextResponse.json({ error: 'No response from tutor. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ explanation })

  } catch (error) {
    console.error('Tutor route error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
