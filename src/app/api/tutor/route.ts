import Anthropic from '@anthropic-ai/sdk'

import { NextRequest, NextResponse } from 'next/server'


const client = new Anthropic({

  apiKey: process.env.ANTHROPIC_API_KEY,

})


export async function POST(request: NextRequest) {

  try {

    const { question, studentQuestion, subject, difficulty } = await request.json()


    if (!question || !studentQuestion) {

      return NextResponse.json(

        { error: 'Missing required fields' },

        { status: 400 }

      )

    }


    const message = await client.messages.create({

      model: 'claude-sonnet-4-20250514',

      max_tokens: 1024,

      messages: [

        {

          role: 'user',

          content: `You are a friendly and encouraging tutor helping a P7 student in Uganda prepare for their Primary Leaving Examination (PLE). 


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


Be warm, encouraging and positive. End with a motivating phrase like "You can do this!" or "Practice makes perfect — keep going!". Keep your response concise — no more than 150 words.`,

        },

      ],

    })


    const response = message.content[0]

    if (response.type !== 'text') {

      throw new Error('Unexpected response type')

    }


    return NextResponse.json({ explanation: response.text })

  } catch (error) {

    console.error('Tutor API error:', error)

    return NextResponse.json(

      { error: 'Failed to get explanation. Please try again.' },

      { status: 500 }

    )

  }

}


