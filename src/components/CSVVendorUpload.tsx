'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, CheckCircle, AlertCircle, MapPin, Store } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'

interface UploadProgress {
  stage: string
  progress: number
  message: string
}

interface UploadResult {
  success: boolean
  documentsCount: number
  vendorsCount: number
  message: string
  processingInfo?: {
    contentType: string
    totalFiles: number
    successfulFiles: number
    vendorsProcessed: number
  }
  error?: string
}

export function CSVVendorUpload() {
  const [files, setFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFiles = acceptedFiles.filter(file => 
      file.type === 'text/csv' || 
      file.name.toLowerCase().endsWith('.csv')
    )
    
    if (csvFiles.length === 0) {
      alert('Please select CSV files only.')
      return
    }

    setFiles(csvFiles)
    setError('')
    setUploadResult(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: true
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      alert('Please select CSV vendor files first')
      return
    }

    setIsUploading(true)
    setError('')
    setUploadResult(null)

    try {
      setUploadProgress({ 
        stage: 'parsing', 
        progress: 10, 
        message: 'Parsing CSV vendor data...' 
      })

      const formData = new FormData()
      files.forEach(file => formData.append('files', file))

      setUploadProgress({ 
        stage: 'processing', 
        progress: 50, 
        message: 'Processing vendor information...' 
      })

      const response = await fetch('/api/upload-csv-vendors', {
        method: 'POST',
        body: formData
      })

      setUploadProgress({ 
        stage: 'storing', 
        progress: 80, 
        message: 'Storing vendor data...' 
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
      console.error('CSV vendor upload error:', error)
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
          <div className="p-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500">
            <Store className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Wedding Vendor Upload</h2>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Upload CSV files containing wedding vendor information. Each row will become a searchable vendor entry 
          with contact details, location, and services.
        </p>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-green-100">
            <Upload className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragActive ? 'Drop CSV files here...' : 'Upload Wedding Vendor CSV Files'}
            </p>
            <p className="text-gray-500 mt-1">
              Drag & drop CSV files or click to browse
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
                <FileText className="w-5 h-5 text-green-600" />
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

      {/* CSV Format Info */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Expected CSV Format</h4>
            <p className="text-sm text-blue-700 mb-2">
              Your CSV should include these columns (case-insensitive):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
              <div>• <strong>email:</strong> Contact email</div>
              <div>• <strong>county:</strong> Location/area</div>
              <div>• <strong>website:</strong> Business website</div>
              <div>• <strong>category:</strong> Service type</div>
              <div>• <strong>supplier:</strong> Business name</div>
              <div className="md:col-span-2 mt-1 text-xs">
                + Any additional columns will be included in the searchable content
              </div>
            </div>
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
                  <p>✅ {uploadResult.documentsCount} CSV file(s) processed</p>
                  <p>✅ {uploadResult.vendorsCount} wedding vendors added</p>
                  <p>✅ Vendors are now searchable by location, category, and services</p>
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
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isUploading ? 'Processing...' : `Upload ${files.length} CSV File${files.length !== 1 ? 's' : ''}`}
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

      {/* Example CSV */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Example CSV Structure:</h4>
        <pre className="text-xs text-gray-600 overflow-x-auto">
{`supplier,category,county,email,website
Grand Wedding Venue,venues,Yorkshire,contact@grandvenue.co.uk,www.grandvenue.co.uk
Beautiful Blooms Florist,florists,Lancashire,info@beautifulblooms.com,www.beautifulblooms.com
Perfect Day Photography,photography,Yorkshire,hello@perfectday.photo,www.perfectday.photo`}
        </pre>
      </div>
    </div>
  )
} 