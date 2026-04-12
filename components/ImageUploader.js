'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Upload, X, ImagePlus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ImageUploader({ 
  bucket = 'listing-media', 
  folder = '', 
  maxFiles = 6, 
  maxSizeMB = 5,
  images = [], 
  onImagesChange 
}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({})
  const inputRef = useRef(null)

  const handleFileSelect = useCallback(async (files) => {
    const fileList = Array.from(files)
    
    // Validate
    if (images.length + fileList.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} images allowed`)
      return
    }

    const validFiles = fileList.filter(file => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error(`${file.name}: Only JPG, PNG, WEBP allowed`)
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
    const newImages = []

    for (const file of validFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

      try {
        setProgress(prev => ({ ...prev, [file.name]: 0 }))
        
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (error) throw error

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path)

        newImages.push(publicUrl)
        setProgress(prev => ({ ...prev, [file.name]: 100 }))
      } catch (err) {
        console.error('Upload error:', err)
        toast.error(`Failed to upload ${file.name}`)
      }
    }

    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages])
      toast.success(`${newImages.length} image${newImages.length > 1 ? 's' : ''} uploaded`)
    }

    setUploading(false)
    setProgress({})
  }, [images, maxFiles, maxSizeMB, bucket, folder, onImagesChange])

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
          multiple
          accept="image/jpeg,image/png,image/webp"
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
                Drop images here or <span className="text-primary-600">browse</span>
              </p>
              <p className="text-xs text-stone-400 mt-1">
                JPG, PNG, WEBP up to {maxSizeMB}MB • Max {maxFiles} images
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

      {/* Preview Grid */}
      {images.length > 0 && (
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
      )}

      {/* Counter */}
      <p className="text-xs text-stone-400 text-right">
        {images.length}/{maxFiles} images
      </p>
    </div>
  )
}
