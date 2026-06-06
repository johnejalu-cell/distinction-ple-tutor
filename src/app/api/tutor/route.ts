import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { question, studentQuestion, subject, difficulty } = await request.json()

    if (!question || !studentQuestion) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Tutor not configured. Please contact support.' },
        { status: 500 }
      )
    }

    const prompt = `You are a friendly and encouraging tutor helping a P7 student in Uganda prepare for their Primary Leaving Examination (PLE).

The student is studying ${subject || 'a PLE subject'} at ${difficulty || 'intermediate'} level.

The exam question is:
"${question}"

The student asks: "${studentQuestion}"

Please explain this clearly and simply, as if talking to an 11-13 year old Ugandan student. Use simple English. Use Ugandan examples where helpful (markets, farming, Lake Victoria, matoke, posho, shillings etc).

If it is a maths word problem, break it down step by step:
1. What is the story about?
2. What are the key numbers and words?
3. What operation do we use?
4. How do we solve it?

Be warm, encouraging and positive. End with a motivating phrase like "You can do this!" or "Practice makes perfect — keep going!". Keep your response under 150 words.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Anthropic API error:', response.status, errorText)
      return NextResponse.json(
        { error: 'The tutor is unavailable right now. Please try again.' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const explanation = data.content?.[0]?.text

    if (!explanation) {
      return NextResponse.json(
        { error: 'No response from tutor. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ explanation })
  } catch (error) {
    console.error('Tutor route error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
