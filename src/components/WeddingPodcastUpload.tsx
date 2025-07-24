'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, Bot, CheckCircle, AlertCircle, Heart, Mic, Zap } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'
import { DocumentMetadata } from '@/types'

interface UploadProgress {
  stage: string
  progress: number
  message: string
}

interface UploadResult {
  success: boolean
  documentsCount: number
  chunksCount: number
  message: string
  processingInfo?: {
    aiMetadataGenerated: boolean
    contentType: string
    totalFiles: number
    successfulFiles: number
  }
  error?: string
}

export function WeddingPodcastUpload() {
  const [files, setFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  // Metadata state
  const [metadata, setMetadata] = useState<DocumentMetadata>({
    title: '',
    author: '',
    summary: '',
    tags: '',
    tone: '',
    audience: '',
    category: ''
  })

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [splitterType, setSplitterType] = useState<'recursive' | 'character'>('recursive')
  const [chunkSize, setChunkSize] = useState(500)
  const [chunkOverlap, setChunkOverlap] = useState(50)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf')
    
    if (pdfFiles.length === 0) {
      alert('Please select PDF files only.')
      return
    }

    setFiles(pdfFiles)
    setError('')
    setUploadResult(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const updateMetadata = (field: keyof DocumentMetadata, value: string) => {
    setMetadata(prev => ({ ...prev, [field]: value }))
  }

  const generateMetadata = async () => {
    if (!files || files.length === 0) {
      alert('Please upload PDF files first')
      return
    }

    try {
      // Extract PDF content first
      const file = files[0] // Use first file for metadata generation
      const formData = new FormData()
      formData.append('file', file)

      console.log('📄 Extracting PDF content for metadata generation...')
      const extractResponse = await fetch('/api/extract-pdf-content', {
        method: 'POST',
        body: formData
      })

      if (!extractResponse.ok) {
        throw new Error('Failed to extract PDF content')
      }

      const { content } = await extractResponse.json()
      
      if (!content || content.trim().length === 0) {
        throw new Error('No text content found in PDF')
      }

      // Generate metadata from actual content
      console.log('🤖 Generating metadata from PDF transcript...')
      const metadataResponse = await fetch('/api/generate-wedding-podcast-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fullTranscript: content,
          filename: file.name 
        })
      })

      if (metadataResponse.ok) {
        const data = await metadataResponse.json()
        setMetadata(prev => ({
          ...prev,
          ...data.metadata
        }))
      } else {
        alert('Failed to generate metadata. Please enter manually.')
      }
    } catch (error) {
      console.error('Error generating metadata:', error)
      alert('Failed to generate metadata. Please enter manually.')
    }
  }

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      alert('Please select wedding podcast PDF files first')
      return
    }

    setIsUploading(true)
    setError('')
    setUploadResult(null)

    try {
      setUploadProgress({ 
        stage: 'extracting', 
        progress: 10, 
        message: 'Extracting transcripts from PDFs...' 
      })

      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      formData.append('splitterType', splitterType)
      formData.append('chunkSize', chunkSize.toString())
      formData.append('chunkOverlap', chunkOverlap.toString())
      formData.append('pdfParser', 'pdf-parse')

      setUploadProgress({ 
        stage: 'analyzing', 
        progress: 30, 
        message: 'Analyzing transcripts with AI...' 
      })

      const response = await fetch('/api/upload-wedding-podcasts', {
        method: 'POST',
        body: formData
      })

      setUploadProgress({ 
        stage: 'processing', 
        progress: 70, 
        message: 'Processing and storing content...' 
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const result = await response.json()
      
      setUploadProgress({ 
        stage: 'complete', 
        progress: 100, 
        message: 'Upload completed successfully!' 
      })

      setUploadResult(result)
      
      if (result.success) {
        // Reset form after successful upload
        setTimeout(() => {
          setFiles([])
          setUploadResult(null)
          setUploadProgress(null)
        }, 5000)
      }
      
    } catch (error) {
      console.error('Wedding podcast upload error:', error)
      setError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setFiles([])
    setUploadResult(null)
    setError('')
    setUploadProgress(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="p-3 rounded-full bg-gradient-to-r from-rose-500 to-pink-500">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Wedding Podcast Upload</h2>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Upload wedding podcast transcript PDFs. Our AI will automatically analyze the content and generate 
          appropriate metadata including title, summary, tags, tone, and category.
        </p>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-rose-400 bg-rose-50'
            : 'border-gray-300 hover:border-rose-400 hover:bg-rose-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-rose-100">
            <Upload className="w-8 h-8 text-rose-600" />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragActive ? 'Drop wedding podcast PDFs here...' : 'Upload Wedding Podcast Transcripts'}
            </p>
            <p className="text-gray-500 mt-1">
              Drag & drop PDF files or click to browse
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900">Selected Files ({files.length})</h3>
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Metadata Section */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Wedding Podcast Metadata</h3>
            <button
              onClick={generateMetadata}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Generate Metadata
            </button>
          </div>

          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
            <div className="flex items-center gap-2 text-rose-700 text-sm mb-2">
              <Bot className="w-4 h-4" />
              <span className="font-medium">AI-Powered Metadata Generation</span>
            </div>
            <p className="text-rose-600 text-sm">
              Click &quot;Generate Metadata&quot; to automatically extract title, author, summary, and other details from the PDF transcript content. You can edit any field before uploading.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={metadata.title}
                onChange={(e) => updateMetadata('title', e.target.value)}
                placeholder="e.g., Wedding Planning Essentials"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Author/Host
              </label>
              <input
                type="text"
                value={metadata.author}
                onChange={(e) => updateMetadata('author', e.target.value)}
                placeholder="e.g., Sarah Johnson"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={metadata.category}
                onChange={(e) => updateMetadata('category', e.target.value)}
                placeholder="e.g., Wedding Planning, Vendor Tips"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tone
              </label>
              <input
                type="text"
                value={metadata.tone}
                onChange={(e) => updateMetadata('tone', e.target.value)}
                placeholder="e.g., Conversational, Expert"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Audience
              </label>
              <input
                type="text"
                value={metadata.audience}
                onChange={(e) => updateMetadata('audience', e.target.value)}
                placeholder="e.g., Engaged Couples, Wedding Planners"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                value={metadata.tags}
                onChange={(e) => updateMetadata('tags', e.target.value)}
                placeholder="e.g., wedding planning, venues, budget"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Summary
            </label>
            <textarea
              value={metadata.summary}
              onChange={(e) => updateMetadata('summary', e.target.value)}
              placeholder="Brief summary of the podcast content..."
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>
        </div>
      )}

      {/* Advanced Settings */}
      <div className="border rounded-lg">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 text-left font-medium text-gray-900 hover:bg-gray-50 transition-colors"
        >
          Advanced Settings {showAdvanced ? '▼' : '▶'}
        </button>
        
        {showAdvanced && (
          <div className="border-t p-4 space-y-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Splitter
                </label>
                <select
                  value={splitterType}
                  onChange={(e) => setSplitterType(e.target.value as 'recursive' | 'character')}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="recursive">Recursive (Recommended)</option>
                  <option value="character">Character-based</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chunk Size
                </label>
                <input
                  type="number"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  min="1000"
                  max="10000"
                  step="500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chunk Overlap
                </label>
                <input
                  type="number"
                  value={chunkOverlap}
                  onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  min="0"
                  max="2000"
                  step="100"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Processing Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Bot className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">AI-Powered Metadata Generation</h4>
            <p className="text-sm text-blue-700">
              Our AI will analyze the full transcript to automatically generate:
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• <strong>Title:</strong> Descriptive episode title</li>
              <li>• <strong>Author:</strong> Host or expert name</li>
              <li>• <strong>Summary:</strong> Key takeaways and topics</li>
              <li>• <strong>Tags:</strong> Wedding planning keywords</li>
              <li>• <strong>Tone:</strong> Content style (conversational, expert, etc.)</li>
              <li>• <strong>Category:</strong> Main wedding planning area</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-medium text-blue-900">{uploadProgress.message}</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.progress}%` }}
            ></div>
          </div>
          <div className="text-sm text-blue-700 mt-1">{uploadProgress.progress}% complete</div>
        </div>
      )}

      {/* Success Result */}
      {uploadResult && uploadResult.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900 mb-1">Upload Successful!</h4>
              <p className="text-green-700 mb-3">{uploadResult.message}</p>
              {uploadResult.processingInfo && (
                <div className="text-sm text-green-700 space-y-1">
                  <p>✅ AI metadata generated automatically</p>
                  <p>✅ {uploadResult.documentsCount} podcast(s) processed</p>
                  <p>✅ {uploadResult.chunksCount} content chunks created</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900 mb-1">Upload Failed</h4>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleUpload}
          disabled={!files.length || isUploading}
          className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 py-3 rounded-lg font-medium hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isUploading ? 'Processing...' : `Upload ${files.length} Wedding Podcast${files.length !== 1 ? 's' : ''}`}
        </button>
        
        {(files.length > 0 || uploadResult || error) && (
          <button
            onClick={resetForm}
            disabled={isUploading}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
} 