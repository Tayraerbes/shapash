import { NextRequest, NextResponse } from 'next/server'
import { generateChatCompletion } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const { fullTranscript, filename } = await request.json()

    if (!fullTranscript) {
      return NextResponse.json({ error: 'Full transcript is required' }, { status: 400 })
    }

    console.log('🎧 Generating wedding podcast metadata from transcript...')
    console.log(`📄 Processing ${fullTranscript.length} characters from ${filename || 'unknown file'}`)

    // Truncate transcript if too long (keep within token limits)
    const maxLength = 15000 // ~3000 tokens
    const truncatedTranscript = fullTranscript.length > maxLength 
      ? fullTranscript.substring(0, maxLength) + '...'
      : fullTranscript

    const systemPrompt = `You are an expert metadata generator for wedding-related podcast transcripts and documents. 

Analyze the provided transcript and generate accurate metadata that captures the content, tone, and target audience.

You must respond with EXACTLY this format (no additional text):

Title: [Clear, descriptive title based on content]
Author: [Author/speaker name if mentioned, or "Wedding Expert" if unclear]
Summary: [2-3 sentence summary of the main content and key points]
Tags: [5-7 relevant tags separated by commas - focus on topics, themes, wedding elements]
Tone: [Professional/Casual/Inspirational/Educational/Conversational]
Audience: [Target audience: Engaged Couples/Wedding Planners/Vendors/General]
Category: [Main category: Wedding Planning/Venue Selection/Budget/Vendors/Ceremony/Reception/etc.]

Base everything on the ACTUAL CONTENT of the transcript, not assumptions.`

    const userPrompt = `Analyze this wedding podcast transcript and generate metadata:

TRANSCRIPT:
${truncatedTranscript}

FILENAME: ${filename || 'Unknown'}

Generate accurate metadata based on the actual content above.`

    console.log('🤖 Calling AI to analyze transcript content...')
    const response = await generateChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ])

    console.log('🤖 AI response received:', response.substring(0, 200) + '...')

    // Parse the AI response
    const metadata: any = {}
    
    try {
      const lines = response.split('\n')
      for (const line of lines) {
        if (line.includes(':')) {
          const [key, ...valueParts] = line.split(':')
          const value = valueParts.join(':').trim()
          const cleanKey = key.toLowerCase().trim()
          
          switch (cleanKey) {
            case 'title':
              metadata.title = value
              break
            case 'author':
              metadata.author = value
              break
            case 'summary':
              metadata.summary = value
              break
            case 'tags':
              metadata.tags = value
              break
            case 'tone':
              metadata.tone = value
              break
            case 'audience':
              metadata.audience = value
              break
            case 'category':
              metadata.category = value
              break
          }
        }
      }

      // Provide fallback values if parsing fails
      if (!metadata.title) metadata.title = filename?.replace('.pdf', '') || 'Wedding Podcast'
      if (!metadata.author) metadata.author = 'Wedding Expert'
      if (!metadata.summary) metadata.summary = 'Wedding planning guidance and expert advice for couples.'
      if (!metadata.tags) metadata.tags = 'wedding planning, advice, couples, expert guidance'
      if (!metadata.tone) metadata.tone = 'Professional'
      if (!metadata.audience) metadata.audience = 'Engaged Couples'
      if (!metadata.category) metadata.category = 'Wedding Planning'

      console.log('✅ Generated metadata:', metadata)

      return NextResponse.json({
        success: true,
        metadata
      })

    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError)
      console.log('📄 Raw AI response:', response)
      
      // Return fallback metadata
      return NextResponse.json({
        success: true,
        metadata: {
          title: filename?.replace('.pdf', '') || 'Wedding Podcast',
          author: 'Wedding Expert',
          summary: 'Wedding planning guidance and expert advice for couples.',
          tags: 'wedding planning, advice, couples, expert guidance',
          tone: 'Professional',
          audience: 'Engaged Couples',
          category: 'Wedding Planning'
        }
      })
    }

  } catch (error) {
    console.error('❌ Error generating wedding podcast metadata:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate metadata',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 