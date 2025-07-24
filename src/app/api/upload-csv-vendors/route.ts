import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'
import Papa from 'papaparse'

interface CSVVendorRow {
  email?: string
  county?: string
  website?: string
  category?: string
  supplier?: string
  [key: string]: string | undefined // Allow for additional columns
}

export async function POST(request: NextRequest) {
  try {
    console.log('📊 CSV vendor upload API called')
    
    // Get server-side Supabase client
    const supabase = createServerSupabaseClient()
    
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    console.log('📊 CSV vendor upload request:', {
      fileCount: files.length,
      fileSizes: files.map(f => `${f.name}: ${(f.size / 1024).toFixed(1)}KB`)
    })

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No CSV files provided' }, { status: 400 })
    }

    // Validate CSV files
    const csvFiles = files.filter(file => 
      file.type === 'text/csv' || 
      file.name.toLowerCase().endsWith('.csv')
    )

    if (csvFiles.length === 0) {
      return NextResponse.json({ error: 'Please provide valid CSV files' }, { status: 400 })
    }

    console.log('📊 Processing wedding vendor CSV files...')

    let totalVendors = 0
    let documentsCount = 0

    // Process each CSV file
    for (const file of csvFiles) {
      try {
        console.log(`📊 Processing CSV file: ${file.name}`)
        
        // Read file content
        const fileContent = await file.text()
        console.log(`📝 Read ${fileContent.length} characters from ${file.name}`)

        if (!fileContent || fileContent.trim().length === 0) {
          console.warn(`⚠️ No content in ${file.name}`)
          continue
        }

        // Parse CSV
        console.log('🔍 Parsing CSV data...')
        const parseResult = Papa.parse<CSVVendorRow>(fileContent, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.toLowerCase().trim(),
          transform: (value: string) => value.trim()
        })

        if (parseResult.errors.length > 0) {
          console.warn('⚠️ CSV parsing warnings:', parseResult.errors)
        }

        const vendors = parseResult.data
        console.log(`✅ Parsed ${vendors.length} vendor rows from ${file.name}`)

        if (vendors.length === 0) {
          console.warn(`⚠️ No valid vendor rows in ${file.name}`)
          continue
        }

        // Process each vendor row
        const BATCH_SIZE = 20
        let fileVendorsStored = 0

        for (let i = 0; i < vendors.length; i += BATCH_SIZE) {
          const batchVendors = vendors.slice(i, i + BATCH_SIZE)
          const batchPromises = batchVendors.map(async (vendor, batchIndex) => {
            const vendorIndex = i + batchIndex
            try {
              // Create meaningful title from vendor data
              const vendorName = vendor.supplier || vendor.category || `Vendor ${vendorIndex + 1}`
              const location = vendor.county ? ` in ${vendor.county}` : ''
              const title = `${vendorName}${location}`.trim()

              // Create searchable content from vendor information
              const vendorContent = [
                vendor.supplier && `Business: ${vendor.supplier}`,
                vendor.category && `Category: ${vendor.category}`,
                vendor.county && `Location: ${vendor.county}`,
                vendor.website && `Website: ${vendor.website}`,
                vendor.email && `Contact: ${vendor.email}`,
                // Include any additional columns
                ...Object.entries(vendor)
                  .filter(([key, value]) => 
                    !['supplier', 'category', 'county', 'website', 'email'].includes(key) && 
                    value && 
                    value.toString().trim()
                  )
                  .map(([key, value]) => `${key}: ${value}`)
              ].filter(Boolean).join('\n')

              // Create context-enhanced text for wedding vendor embedding
              const contextEnhancedText = `
Wedding Vendor: ${title}
Business Type: ${vendor.category || 'Wedding Service'}
Location: ${vendor.county || 'Available'}
Business Name: ${vendor.supplier || 'Wedding Vendor'}
Contact Information: ${vendor.email || 'Contact Available'}
Details: ${vendorContent}
              `.trim()
              
              const embedding = await generateEmbedding(contextEnhancedText)

              const { error: vendorError } = await supabase
                .from('documents_enhanced')
                .insert({
                  content: vendorContent,
                  metadata: {
                    ...vendor,
                    row_index: vendorIndex,
                    source_file: file.name,
                    csv_processed: true,
                    vendor_type: vendor.category || 'wedding_service'
                  },
                  embedding: embedding,
                  title: title,
                  author: vendor.supplier || 'Wedding Vendor',
                  doc_type: 'Wedding Vendor',
                  genre: 'Wedding Planning',
                  topic: vendor.category || 'Wedding Services',
                  difficulty: 'General',
                  tags: [
                    vendor.category,
                    vendor.county,
                    'wedding vendor',
                    'wedding services'
                  ].filter(Boolean).join(', '),
                  source_type: 'csv_vendors', // This matches our database schema
                  summary: `${vendor.category || 'Wedding service'} provider${vendor.county ? ` in ${vendor.county}` : ''}`,
                  chunk_id: vendorIndex + 1,
                  total_chunks: vendors.length,
                  source: file.name,
                  category: vendor.category || 'Wedding Services'
                })

              if (vendorError) {
                console.error(`❌ Error storing vendor ${vendorIndex}:`, vendorError)
                return false
              }
              return true
            } catch (error) {
              console.error(`❌ Error processing vendor ${vendorIndex}:`, error)
              return false
            }
          })

          const batchResults = await Promise.all(batchPromises)
          fileVendorsStored += batchResults.filter(Boolean).length
        }

        // Store main CSV document record
        try {
          const documentId = `csv_vendors_${Date.now()}_${Math.random().toString(36).substring(2)}`
          
          const { error: docError } = await supabase
            .from('documents_enhanced')
            .insert({
              id: documentId,
              title: `Wedding Vendors from ${file.name}`,
              author: 'Vendor Directory',
              doc_type: 'Vendor Directory',
              genre: 'Wedding Planning',
              content: `Wedding vendor directory with ${vendors.length} vendors`,
              metadata: {
                is_parent_document: true,
                vendor_count: vendors.length,
                source_file: file.name,
                csv_columns: Object.keys(vendors[0] || {}),
                processing_date: new Date().toISOString()
              },
              source_type: 'csv_vendors',
              summary: `Directory of ${vendors.length} wedding vendors from ${file.name}`,
              chunk_id: 0,
              total_chunks: vendors.length,
              source: `${file.name} (Wedding Vendor Directory)`,
              category: 'Vendor Directory',
              tags: 'wedding vendors, directory, suppliers'
            })

          if (docError) {
            console.error('❌ Error storing main CSV document record:', docError)
          }
        } catch (error) {
          console.error('❌ Failed to store main CSV document record:', error)
        }

        totalVendors += fileVendorsStored
        documentsCount++
        console.log(`✅ Successfully processed ${file.name}: ${fileVendorsStored} vendors stored`)
        
      } catch (fileError) {
        console.error(`❌ Error processing CSV file ${file.name}:`, fileError)
        return NextResponse.json({ 
          error: `Failed to process CSV file ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}` 
        }, { status: 400 })
      }
    }

    return NextResponse.json({
      success: true,
      documentsCount,
      vendorsCount: totalVendors,
      message: `Successfully processed ${documentsCount} CSV file(s) with ${totalVendors} wedding vendors`,
      processingInfo: {
        contentType: 'csv_vendors',
        totalFiles: csvFiles.length,
        successfulFiles: documentsCount,
        vendorsProcessed: totalVendors
      }
    })

  } catch (error) {
    console.error('❌ Error in CSV vendor upload API:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
} 