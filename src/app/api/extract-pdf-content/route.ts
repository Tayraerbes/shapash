import { NextRequest, NextResponse } from 'next/server'
import { parsePDF, ParserType } from '@/lib/pdf-parsers'

export async function POST(request: NextRequest) {
  try {
    console.log('📄 PDF content extraction API called')
    
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    console.log(`📄 Extracting content from: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract PDF content using the PDF parser
    console.log('🔍 Parsing PDF content...')
    const pdfResult = await parsePDF(buffer, {
      parser: 'pdf-parse' as ParserType,
      fallbackToMock: process.env.NODE_ENV === 'development'
    })

    const content = pdfResult.text
    console.log(`📝 Extracted ${content.length} characters from ${file.name}`)

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ 
        error: 'No text content could be extracted from this PDF' 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      content: content.trim(),
      metadata: {
        filename: file.name,
        fileSize: file.size,
        extractedLength: content.length,
        parserUsed: pdfResult.parserUsed,
        parseTime: pdfResult.parseTime
      }
    })

  } catch (error) {
    console.error('❌ Error extracting PDF content:', error)
    return NextResponse.json(
      { 
        error: 'Failed to extract PDF content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 