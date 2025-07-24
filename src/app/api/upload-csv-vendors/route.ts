import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'
import Papa from 'papaparse'

interface CSVVendorRow {
  'supplier name'?: string
  'status'?: string
  'category'?: string
  'rmw url'?: string
  'website'?: string
  'contact mail'?: string
  'counties'?: string
  [key: string]: string | undefined // Allow for additional columns
}

export async function POST(request: NextRequest) {
  try {
    console.log('🏪 CSV wedding vendor upload API called')
    
    // Get server-side Supabase client
    const supabase = createServerSupabaseClient()
    
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    console.log('🏪 Wedding vendor upload request:', {
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

    console.log('🏪 Processing wedding vendor CSV files...')

    let totalVendors = 0
    let totalProcessed = 0

    // Process each CSV file
    for (const file of csvFiles) {
      try {
        console.log(`🏪 Processing CSV file: ${file.name}`)
        
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
              // Map CSV headers to our field names
              const supplierName = vendor['supplier name']
              const category = vendor['category']
              const counties = vendor['counties']
              const email = vendor['contact mail']
              const website = vendor['website']
              const status = vendor['status']
              
              // Skip rows with no supplier name or category
              if (!supplierName || !category) {
                console.warn(`⚠️ Skipping vendor ${vendorIndex}: missing supplier name or category`)
                console.warn(`⚠️ Row data:`, vendor)
                return false
              }

              // Create context-enhanced text for embedding
              const contextEnhancedText = `
Wedding Vendor: ${supplierName}
Category: ${category}
Location: ${counties || 'Available'}
Email: ${email || 'Available on request'}
Website: ${website || 'Contact for details'}
Status: ${status || 'Active'}
              `.trim()
              
              const embedding = await generateEmbedding(contextEnhancedText)

              // Insert into simple wedding_vendors table
              const { error: vendorError } = await supabase
                .from('wedding_vendors')
                .insert({
                  supplier: supplierName,
                  category: category,
                  county: counties || null,
                  email: email || null,
                  website: website || null,
                  embedding: embedding,
                  source_file: file.name,
                  row_index: vendorIndex
                })

              if (vendorError) {
                console.error(`❌ Error storing vendor ${vendorIndex}:`, vendorError)
                console.error(`❌ Error details:`, {
                  code: vendorError.code,
                  message: vendorError.message,
                  details: vendorError.details,
                  hint: vendorError.hint
                })
                return false
              }

              console.log(`✅ Stored vendor: ${supplierName} (${category} in ${counties})`)
              return true
            } catch (error) {
              console.error(`❌ Error processing vendor ${vendorIndex}:`, error)
              return false
            }
          })

          const batchResults = await Promise.all(batchPromises)
          fileVendorsStored += batchResults.filter(Boolean).length
        }

        console.log(`✅ Successfully stored ${fileVendorsStored} vendors from ${file.name}`)
        
        if (fileVendorsStored === 0) {
          console.warn(`⚠️ No vendors were stored from ${file.name}. Check CSV format and data.`)
        }
        
        totalVendors += fileVendorsStored
        totalProcessed += vendors.length

      } catch (fileError) {
        console.error(`❌ Error processing file ${file.name}:`, fileError)
        return NextResponse.json({
          error: `Failed to process ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`
        }, { status: 500 })
      }
    }

    console.log(`🎉 Wedding vendor upload completed!`)
    console.log(`📊 Total processed: ${totalProcessed}, Successfully stored: ${totalVendors}`)

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${totalVendors} wedding vendors`,
      details: {
        totalProcessed,
        totalStored: totalVendors,
        filesProcessed: csvFiles.length,
        debug: {
          csvFilesFound: csvFiles.length,
          totalRowsProcessed: totalProcessed,
          vendorsSuccessfullyStored: totalVendors,
          successRate: totalProcessed > 0 ? `${Math.round((totalVendors / totalProcessed) * 100)}%` : '0%'
        }
      }
    })

  } catch (error) {
    console.error('❌ Error in wedding vendor upload API:', error)
    return NextResponse.json(
      { 
        error: 'Wedding vendor upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 