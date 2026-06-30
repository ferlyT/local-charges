import React, { useState, useCallback, useEffect } from 'react';
import api from '../../lib/api';
import { UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';

interface LampiranUploaderProps {
  reportId: number;
  onUploadSuccess: () => void;
}

export default function InspectionLampiranUploader({ reportId, onUploadSuccess }: LampiranUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadText, setUploadText] = useState('Uploading...');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleMultipleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleMultipleFiles(e.target.files);
      e.target.value = '';
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isUploading) return;
      
      // Ignore paste if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        e.preventDefault();
        handleMultipleFiles(e.clipboardData.files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }); // Re-bind on render to keep handleMultipleFiles closure fresh

  const handleMultipleFiles = async (files: FileList | File[]) => {
    if (isUploading) return;
    const validFiles = Array.from(files).filter(file => {
      if (file.size > 10 * 1024 * 1024) return false;
      if (!['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type)) return false;
      return true;
    });

    if (validFiles.length !== Array.from(files).length) {
      toast.error('Beberapa file diabaikan karena ukurannya >10MB atau format tidak didukung.');
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    setProgress(0);

    let hasError = false;

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadText(`Mengunggah file ${i + 1} dari ${validFiles.length}...`);
      
      const formData = new FormData();
      formData.append('file', file);

      try {
        await api.post(`/lampiran/inspection-reports/${reportId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
            const overall = Math.round(((i * 100) + percentCompleted) / validFiles.length);
            setProgress(overall);
          },
        });
      } catch (err: any) {
        hasError = true;
        toast.error(err.response?.data?.message || `Gagal mengunggah ${file.name}`);
      }
    }
    
    if (!hasError) {
      toast.success('Upload selesai!');
    }
    
    onUploadSuccess();
    setIsUploading(false);
    setProgress(0);
    setUploadText('Uploading...');
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging 
            ? 'border-tertiary bg-tertiary/10' 
            : 'border-secondary/30 bg-surface'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        {!isUploading ? (
          <div className="flex flex-col items-center justify-center">
            <UploadCloud className="w-10 h-10 text-secondary/70 mb-2" />
            <p className="text-[0.95rem] font-medium text-primary">
              Drag & drop, click, or <strong className="text-tertiary font-bold">CTRL+V</strong> to paste files
            </p>
            <p className="text-[0.72rem] text-secondary mt-1">
              Supports images and PDFs up to 10MB.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex justify-between text-[0.72rem] font-medium mb-1 text-primary">
              <span>{uploadText}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-secondary/20 rounded-full h-2.5">
              <div 
                className="bg-tertiary h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
