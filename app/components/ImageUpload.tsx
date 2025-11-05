'use client'

import { useState, useRef } from 'react'

interface ImageUploadProps {
  onImageUploaded: (imageUrl: string, imageData: Record<string, unknown>) => void
  uploadType?: string
  currentImage?: string
  className?: string
  buttonText?: string
  allowedTypes?: string[]
  maxSize?: number // in MB
  disabled?: boolean
}

export default function ImageUpload({
  onImageUploaded,
  uploadType = 'general',
  currentImage,
  className = '',
  buttonText = 'Upload Image',
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  maxSize = 5,
  disabled = false
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
    }

    const maxSizeBytes = maxSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSize}MB`
    }

    return null
  }

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('uploadType', uploadType)

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setPreview(result.data.url)
      onImageUploaded(result.data.url, result.data)

    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      uploadFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
  }

  const removeImage = () => {
    setPreview(null)
    setError(null)
    onImageUploaded('', {})
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`image-upload-component ${className}`}>
      
      {/* Preview Image */}
      {preview && (
        <div className="mb-4">
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-lg border border-gray-300"
            />
            <button
              type="button"
              onClick={removeImage}
              disabled={disabled || uploading}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />

        {uploading ? (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mx-auto w-12 h-12 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-blue-600">{buttonText}</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              {allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} up to {maxSize}MB
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </div>
      )}

      {/* Success Message */}
      {preview && !error && !uploading && (
        <div className="mt-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-2">
          Image uploaded successfully!
        </div>
      )}
    </div>
  )
}