import { NextRequest, NextResponse } from 'next/server'
import { generateChatCompletion } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const { fullTranscript, filename } = await request.json()

    if (!fullTranscript || fullTranscript.trim().length === 0) {
      return NextResponse.json({ error: 'Full transcript is required' }, { status: 400 })
    }

    // Limit transcript to first 15,000 characters to stay within token limits
    const truncatedTranscript = fullTranscript.slice(0, 15000)
    
    const systemMessage = `You are a wedding planning expert who analyzes wedding podcast transcripts to generate accurate metadata for a wedding planning knowledge base.

You will analyze the full transcript of a wedding podcast episode and extract relevant metadata that will help engaged couples find the right advice and information for their wedding planning.

Based on the transcript provided, generate metadata in this EXACT format:

Title: [Generate a clear, descriptive title for this podcast episode]
Author: [Host name(s) or "Wedding Planning Expert" if unclear]
Summary: [2-3 sentence summary of the main topics and key takeaways]
Tags: [Relevant wedding planning tags, comma-separated (e.g., "venues, budget, timeline, flowers, catering")]
Tone: [Tone of the content: conversational, professional, inspirational, practical, expert, casual]
Audience: [Target audience: engaged couples, brides-to-be, grooms-to-be, wedding planners, general]
Category: [Main category: venue planning, budget advice, vendor selection, timeline planning, decor ideas, etiquette, trends, real weddings, expert tips]

Guidelines:
- Focus on actionable wedding planning advice and information
- Include specific wedding-related keywords in tags
- Keep tone accurate to the actual speaking style in the transcript
- Make the summary helpful for couples searching for specific advice
- Choose the most relevant category that represents the main focus
- Extract the actual host/expert name if mentioned in the transcript`

    const userMessage = `Analyze this wedding podcast transcript and generate metadata:

TRANSCRIPT:
${truncatedTranscript}

FILENAME: ${filename || 'Wedding Podcast Episode'}

Generate the metadata following the exact format specified.`

    console.log('🎯 Generating wedding podcast metadata using GPT-4o-mini...')
    
    const response = await generateChatCompletion([
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ], 'gpt-4o-mini', 3000) // Increased token limit for detailed analysis

    // Parse response
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

      // Set fallback values if parsing fails
      if (!metadata.title) metadata.title = filename || 'Wedding Planning Podcast Episode'
      if (!metadata.author) metadata.author = 'Wedding Planning Expert'
      if (!metadata.summary) metadata.summary = 'Wedding planning advice and tips for engaged couples.'
      if (!metadata.tags) metadata.tags = 'wedding planning, advice, tips'
      if (!metadata.tone) metadata.tone = 'conversational'
      if (!metadata.audience) metadata.audience = 'engaged couples'
      if (!metadata.category) metadata.category = 'expert tips'

      console.log('✅ Wedding podcast metadata generated:', {
        title: metadata.title,
        author: metadata.author,
        category: metadata.category,
        tagsCount: metadata.tags.split(',').length
      })

    } catch (parseError) {
      console.error('Error parsing wedding metadata:', parseError)
      // Return fallback metadata with wedding focus
      return NextResponse.json({
        metadata: {
          title: filename || 'Wedding Planning Podcast Episode',
          author: 'Wedding Planning Expert',
          summary: 'Wedding planning advice and tips for engaged couples.',
          tags: 'wedding planning, advice, tips',
          tone: 'conversational',
          audience: 'engaged couples',
          category: 'expert tips'
        }
      })
    }

    return NextResponse.json({ 
      metadata,
      transcriptAnalyzed: true,
      transcriptLength: fullTranscript.length,
      truncated: fullTranscript.length > 15000
    })

  } catch (error) {
    console.error('Error generating wedding podcast metadata:', error)
    return NextResponse.json(
      { error: 'Failed to generate wedding podcast metadata' },
      { status: 500 }
    )
  }
} 