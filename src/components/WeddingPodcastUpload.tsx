'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, Bot, CheckCircle, AlertCircle, Heart, Mic } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'

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