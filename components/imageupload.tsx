'use client';

import { useRef, useState } from 'react';
import { useAuth } from './authprovider';
import { ImagePlus, X, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  currentImage?: string | null;
}

export default function ImageUpload({ onUpload, currentImage }: ImageUploadProps) {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        onUpload(data.url);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">
        รูปภาพความเสียหาย (ถ้ามี)
      </label>
      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="w-48 h-36 object-cover rounded-lg border border-navy-600"
          />
          <button
            onClick={() => { setPreview(null); onUpload(''); }}
            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-navy-600 rounded-lg text-gray-400 hover:border-gold-500 hover:text-gold-500 transition-all duration-200"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              กำลังอัพโหลด...
            </>
          ) : (
            <>
              <ImagePlus className="w-5 h-5" />
              อัพโหลดรูปภาพ
            </>
          )}
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
