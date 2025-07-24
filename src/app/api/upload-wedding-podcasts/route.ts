import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'
import { parsePDF, ParserType } from '@/lib/pdf-parsers'
import { RecursiveCharacterTextSplitter, CharacterTextSplitter } from 'langchain/text_splitter'

export async function POST(request: NextRequest) {
  try {
    console.log('🎙️ Wedding podcast upload API called')
    
    // Get server-side Supabase client
    const supabase = createServerSupabaseClient()
    
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const splitterType = formData.get('splitterType') as string || 'recursive'
    const chunkSize = parseInt(formData.get('chunkSize') as string) || 5000
    const chunkOverlap = parseInt(formData.get('chunkOverlap') as string) || 500
    const pdfParser = formData.get('pdfParser') as ParserType || 'pdf-parse'

    console.log('🎙️ Wedding podcast upload request:', {
      fileCount: files.length,
      splitterType,
      chunkSize,
      chunkOverlap,
      fileSizes: files.map(f => `${f.name}: ${(f.size / 1024 / 1024).toFixed(1)}MB`)
    })

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    console.log('🎙️ Processing wedding podcast files...')

    let totalChunks = 0
    let documentsCount = 0

    // Initialize text splitter
    let textSplitter
    if (splitterType === 'recursive') {
      textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
      })
    } else {
      textSplitter = new CharacterTextSplitter({
        chunkSize,
        chunkOverlap,
      })
    }

    // Process each file individually
    for (const file of files) {
      try {
        console.log(`🎙️ Processing wedding podcast file: ${file.name}`)
        
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Parse PDF to extract full transcript
        console.log(`🔍 Extracting transcript from ${file.name}...`)
        const pdfResult = await parsePDF(buffer, {
          parser: pdfParser,
          fallbackToMock: process.env.NODE_ENV === 'development'
        })

        const fullTranscript = pdfResult.text
        console.log(`📝 Extracted ${fullTranscript.length} characters from ${file.name}`)

        if (!fullTranscript || fullTranscript.trim().length === 0) {
          console.warn(`⚠️ No text extracted from ${file.name}`)
          continue
        }

        // Generate AI-powered wedding metadata from full transcript
        console.log('🤖 Generating wedding metadata from transcript...')
        const metadataResponse = await fetch(new URL('/api/generate-wedding-podcast-metadata', request.url), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            fullTranscript: fullTranscript,
            filename: file.name
          })
        })

        if (!metadataResponse.ok) {
          throw new Error(`Failed to generate metadata for ${file.name}`)
        }

        const { metadata: aiMetadata } = await metadataResponse.json()
        console.log('✅ AI metadata generated:', {
          title: aiMetadata.title,
          author: aiMetadata.author,
          category: aiMetadata.category
        })

        // Split transcript into chunks
        console.log('✂️ Splitting transcript into chunks...')
        const chunks = await textSplitter.splitText(fullTranscript)
        console.log(`✅ Created ${chunks.length} chunks from ${file.name}`)

        if (chunks.length === 0) {
          console.warn(`⚠️ No chunks created from ${file.name}`)
          continue
        }

        // Generate document ID for all chunks
        const documentId = `wedding_podcast_${Date.now()}_${Math.random().toString(36).substring(2)}`

        // Process chunks in batches
        const BATCH_SIZE = 20
        let fileChunksStored = 0

        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
          const batchChunks = chunks.slice(i, i + BATCH_SIZE)
          const batchPromises = batchChunks.map(async (chunk, batchIndex) => {
            const chunkIndex = i + batchIndex
            try {
              // Create context-enhanced text for wedding content
              const contextEnhancedText = `
Wedding Podcast: ${aiMetadata.title}
Host/Expert: ${aiMetadata.author}
Category: ${aiMetadata.category}
Audience: ${aiMetadata.audience}
Content: ${chunk}
              `.trim()
              
              const embedding = await generateEmbedding(contextEnhancedText)

              const { error: chunkError } = await supabase
                .from('documents_enhanced')
                .insert({
                  content: chunk,
                  metadata: {
                    ...aiMetadata,
                    chunk_index: chunkIndex,
                    total_chunks: chunks.length,
                    filename: file.name,
                    parser_used: pdfResult.parserUsed,
                    parse_time: pdfResult.parseTime,
                    pdf_metadata: pdfResult.metadata,
                    ai_generated: true,
                    transcript_length: fullTranscript.length
                  },
                  embedding: embedding,
                  title: aiMetadata.title,
                  author: aiMetadata.author,
                  doc_type: 'Wedding Podcast',
                  genre: 'Wedding Planning',
                  topic: aiMetadata.category,
                  difficulty: 'General',
                  tags: aiMetadata.tags,
                  source_type: 'pdf_podcasts', // This matches our database schema
                  summary: aiMetadata.summary,
                  chunk_id: chunkIndex + 1,
                  total_chunks: chunks.length,
                  source: file.name,
                  category: aiMetadata.category // Store wedding category
                })

              if (chunkError) {
                console.error(`❌ Error storing chunk ${chunkIndex}:`, chunkError)
                return false
              }
              return true
            } catch (error) {
              console.error(`❌ Error processing chunk ${chunkIndex}:`, error)
              return false
            }
          })

          const batchResults = await Promise.all(batchPromises)
          fileChunksStored += batchResults.filter(Boolean).length
        }

        // Store main document record
        try {
          const { error: docError } = await supabase
            .from('documents_enhanced')
            .insert({
              id: documentId,
              title: aiMetadata.title,
              author: aiMetadata.author,
              doc_type: 'Wedding Podcast',
              genre: 'Wedding Planning',
              content: `Wedding Podcast: ${aiMetadata.title} - ${chunks.length} chunks`,
              metadata: {
                ...aiMetadata,
                is_parent_document: true,
                chunk_count: chunks.length,
                processing_time: pdfResult.parseTime,
                text_length: fullTranscript.length,
                ai_generated_metadata: true,
                original_filename: file.name
              },
              source_type: 'pdf_podcasts',
              summary: aiMetadata.summary,
              chunk_id: 0,
              total_chunks: chunks.length,
              source: `${aiMetadata.title} (Wedding Podcast)`,
              category: aiMetadata.category,
              tags: aiMetadata.tags
            })

          if (docError) {
            console.error('❌ Error storing main document record:', docError)
          }
        } catch (error) {
          console.error('❌ Failed to store main document record:', error)
        }

        totalChunks += fileChunksStored
        documentsCount++
        console.log(`✅ Successfully processed wedding podcast: ${file.name} (${fileChunksStored} chunks)`)
        
      } catch (fileError) {
        console.error(`❌ Error processing wedding podcast ${file.name}:`, fileError)
        return NextResponse.json({ 
          error: `Failed to process wedding podcast ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}` 
        }, { status: 400 })
      }
    }

    return NextResponse.json({
      success: true,
      documentsCount,
      chunksCount: totalChunks,
      message: `Successfully processed ${documentsCount} wedding podcast(s) with ${totalChunks} chunks`,
      processingInfo: {
        aiMetadataGenerated: true,
        contentType: 'wedding_podcasts',
        totalFiles: files.length,
        successfulFiles: documentsCount
      }
    })

  } catch (error) {
    console.error('❌ Error in wedding podcast upload API:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
} 