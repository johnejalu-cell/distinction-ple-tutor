import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, studentQuestion, subject, difficulty, imageBase64, imageType } = body

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

${imageBase64 ? 'The student has also uploaded an image — this may show their working, a diagram, or notes. Please look at it carefully and give specific feedback on what you can see.' : ''}

Please explain this clearly and simply, as if talking to an 11-13 year old Ugandan student. Use simple English. Use Ugandan examples where helpful (markets, farming, Lake Victoria, matoke, posho, shillings etc).

If it is a maths word problem, break it down step by step:
1. What is the story about?
2. What are the key numbers and words?
3. What operation do we use?
4. How do we solve it?

If the student uploaded their working, comment specifically on:
- What they did correctly
- Where they went wrong (if anywhere)
- How to fix it

Be warm, encouraging and positive. End with a motivating phrase. Keep your response under 200 words.`

    // Build message content — text only or text + image
    type ContentBlock =
      | { type: 'text'; text: string }
      | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

    const userContent: ContentBlock[] = []

    if (imageBase64) {
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: imageType || 'image/jpeg',
          data: imageBase64,
        },
      })
    }

    userContent.push({
      type: 'text',
      text: prompt,
    })

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
        messages: [
          {
            role: 'user',
            content: userContent,
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
