'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface SchoolLogoManagerProps {
  schoolId: string;
  schoolName: string;
  currentLogo?: string | null;
  onLogoUpdated?: (logoUrl: string) => void;
}

export default function SchoolLogoManager({
  schoolId,
  schoolName,
  currentLogo,
  onLogoUpdated,
}: SchoolLogoManagerProps) {
  const [logo, setLogo] = useState<string | null>(currentLogo || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogo || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogo(currentLogo || null);
    setPreviewUrl(currentLogo || null);
  }, [currentLogo]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only image files (JPEG, PNG, GIF, WebP) are allowed');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      // Step 1: Upload image file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadType', 'schools');

      const uploadResponse = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const uploadResult = await uploadResponse.json();
      const logoUrl = uploadResult.data.url;

      // Step 2: Update school logo in database
      const updateResponse = await fetch('/api/schools/logo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schoolId,
          logoUrl,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to update school logo');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const updateResult = await updateResponse.json();
      setLogo(logoUrl);
      setPreviewUrl(logoUrl);
      setSuccess('Logo updated successfully!');
      
      if (onLogoUpdated) {
        onLogoUpdated(logoUrl);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('Are you sure you want to remove the school logo?')) {
      return;
    }

    setUploading(true);
    setError('');

    try {
      const response = await fetch('/api/schools/logo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schoolId,
          logoUrl: null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove logo');
      }

      setLogo(null);
      setPreviewUrl(null);
      setSuccess('Logo removed successfully!');
      
      if (onLogoUpdated) {
        onLogoUpdated('');
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Remove error:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove logo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">School Logo</h3>
          <p className="text-sm text-gray-500 mt-1">
            Upload a logo for {schoolName}
          </p>
        </div>
      </div>

      {/* Preview */}
      <div className="mb-4">
        <div className="w-full h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
          {previewUrl ? (
            <div className="relative w-full h-full">
              <Image
                src={previewUrl}
                alt="School Logo"
                fill
                className="object-contain p-4"
                unoptimized={previewUrl.startsWith('data:')}
              />
            </div>
          ) : (
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">No logo uploaded</p>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Upload Guidelines */}
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>Guidelines:</strong> Upload a square logo (recommended 500x500px). 
          Max file size: 5MB. Formats: JPG, PNG, GIF, WebP.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {uploading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Uploading...
            </span>
          ) : logo ? (
            'Change Logo'
          ) : (
            'Upload Logo'
          )}
        </button>

        {logo && (
          <button
            onClick={handleRemoveLogo}
            disabled={uploading}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
