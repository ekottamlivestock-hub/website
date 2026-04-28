'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { X, ImagePlus, Loader2, FileCheck2 } from 'lucide-react'
import toast from 'react-hot-toast'

// Private buckets (no public read policy) — for these we store the storage
// PATH instead of a public URL, since getPublicUrl() returns a 400 path on
// private buckets. Consumers (e.g. admin views) generate signed URLs on
// demand via supabase.storage.from(bucket).createSignedUrl(path, ttl).
const PRIVATE_BUCKETS = new Set(['seller-docs'])

export default function ImageUploader({
  bucket = 'listing-media',
  folder = '',
  maxFiles = 6,
  maxSizeMB = 5,
  images = [],
  onImagesChange,
}) {
  const isPrivate = PRIVATE_BUCKETS.has(bucket)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({})
  const inputRef = useRef(null)

  // For private buckets `bucket` allows pdf — accept image + pdf there.
  const acceptTypes = isPrivate
    ? 'image/jpeg,image/png,application/pdf'
    : 'image/jpeg,image/png,image/webp'

  const handleFileSelect = useCallback(async (files) => {
    const fileList = Array.from(files)
    const validMimes = isPrivate
      ? ['image/jpeg', 'image/png', 'application/pdf']
      : ['image/jpeg', 'image/png', 'image/webp']

    if (images.length + fileList.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`)
      return
    }

    const validFiles = fileList.filter(file => {
      if (!validMimes.includes(file.type)) {
        toast.error(`${file.name}: unsupported file type`)
        return false
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`${file.name}: Max size is ${maxSizeMB}MB`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    setUploading(true)
    const newEntries = [] // strings — paths for private, public URLs for public

    try {
      for (const file of validFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

        try {
          setProgress(prev => ({ ...prev, [file.name]: 0 }))

          const uploadPromise = supabase.storage
            .from(bucket)
            .upload(fileName, file, { cacheControl: '3600', upsert: false })

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Upload timed out after 20 seconds. Please check your connection.')), 20000)
          })

          const result = await Promise.race([uploadPromise, timeoutPromise])
          if (result.error) throw result.error
          const data = result.data

          if (isPrivate) {
            // Store the path. We don't generate a signed URL here because
            // the private-bucket render path shows a "uploaded ✓" pill,
            // not an <Image>. Admin views generate a fresh signed URL on
            // click.
            newEntries.push(data.path)
          } else {
            // Public bucket — public URL is fine to render directly.
            const { data: { publicUrl } } = supabase.storage
              .from(bucket)
              .getPublicUrl(data.path)
            newEntries.push(publicUrl)
          }

          setProgress(prev => ({ ...prev, [file.name]: 100 }))
        } catch (err) {
          console.error('Upload error:', err)
          toast.error(err.message || `Failed to upload ${file.name}`)
        }
      }

      if (newEntries.length > 0) {
        onImagesChange([...images, ...newEntries])
        toast.success(`${newEntries.length} file${newEntries.length > 1 ? 's' : ''} uploaded`)
      }
    } finally {
      setUploading(false)
      setProgress({})
    }
  }, [images, maxFiles, maxSizeMB, bucket, folder, onImagesChange, isPrivate])

  const removeImage = (index) => {
    const newImages = [...images]
    newImages.splice(index, 1)
    onImagesChange(newImages)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFileSelect(e.dataTransfer.files)
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-200 ${
          uploading
            ? 'border-primary-400 bg-primary-50'
            : 'border-stone-300 hover:border-primary-400 hover:bg-primary-50/50'
        } ${images.length >= maxFiles ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={acceptTypes}
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={uploading || images.length >= maxFiles}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            <p className="text-sm font-medium text-primary-600">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <ImagePlus className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-700">
                Drop {isPrivate ? 'file' : 'images'} here or <span className="text-primary-600">browse</span>
              </p>
              <p className="text-xs text-stone-400 mt-1">
                {isPrivate ? 'JPG, PNG, PDF' : 'JPG, PNG, WEBP'} up to {maxSizeMB}MB · Max {maxFiles}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bars */}
      {Object.entries(progress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(progress).map(([name, pct]) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-xs text-stone-500 truncate w-32">{name}</span>
              <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Grid — public buckets show thumbnails; private buckets show
          a confirmation pill (no <Image> because the file isn't publicly
          readable, and signed URLs would expire/clutter the layout). */}
      {images.length > 0 && (
        isPrivate ? (
          <div className="space-y-2">
            {images.map((pathOrUrl, i) => {
              const filename = pathOrUrl.split('/').pop()
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="flex-1 text-sm text-emerald-900 truncate">{filename}</span>
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="text-emerald-700 hover:text-red-600 transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {images.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                <Image
                  src={url}
                  alt={`Upload ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="150px"
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(i) }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full
                    flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
                    hover:bg-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/60 text-white
                    text-[10px] font-medium rounded-full">
                    Cover
                  </span>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Counter */}
      <p className="text-xs text-stone-400 text-right">
        {images.length}/{maxFiles} {isPrivate ? 'files' : 'images'}
      </p>
    </div>
  )
}
