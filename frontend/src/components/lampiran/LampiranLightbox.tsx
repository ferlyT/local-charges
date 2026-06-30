import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, AlertCircle, RotateCw } from 'lucide-react';
import Spinner from '../ui/Spinner';

interface Lampiran {
  fdId: number;
  fdFileName: string;
  fdMimeType: string;
  fdFilePath: string;
}

interface LampiranLightboxProps {
  items: Lampiran[];
  initialIndex: number;
  onClose: () => void;
}

export default function LampiranLightbox({ items, initialIndex, onClose }: LampiranLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const currentItem = items[currentIndex];
  const isImage = currentItem?.fdMimeType.startsWith('image/');
  const isPdf = currentItem?.fdMimeType === 'application/pdf';

  useEffect(() => {
    if (!currentItem) return;
    
    let url: string | null = null;
    setIsLoading(true);
    setZoom(1);
    setRotation(0);
    
    const rawFileName = currentItem.fdFilePath.split('/').pop() || currentItem.fdFileName;

    const fetchFile = async () => {
      try {
        const response = await api.get(`/lampiran/download/${rawFileName}`, {
          responseType: 'blob'
        });
        url = URL.createObjectURL(response.data);
        setBlobUrl(url);
      } catch (error) {
        console.error('Failed to fetch file for lightbox', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFile();

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [currentIndex, currentItem]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, items.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = async () => {
    if (!blobUrl || !currentItem) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = currentItem.fdFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between text-white z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div className="text-sm font-medium">
          {currentIndex + 1} / {items.length} - {currentItem.fdFileName}
        </div>
        <div className="flex items-center gap-4">
          {isImage && (
            <button type="button" onClick={() => setRotation(r => r + 90)} className="hover:text-secondary mr-2" title="Rotate">
              <RotateCw size={20} />
            </button>
          )}
          {(isImage || isPdf) && (
            <>
              <button type="button" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="hover:text-secondary">
                <ZoomOut size={20} />
              </button>
              <span className="text-xs">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="hover:text-secondary">
                <ZoomIn size={20} />
              </button>
            </>
          )}
          <button type="button" onClick={handleDownload} className="hover:text-secondary ml-2" title="Download">
            <Download size={20} />
          </button>
          <button type="button" onClick={onClose} className="hover:text-secondary ml-4" title="Close">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button 
            type="button"
            onClick={handlePrev}
            className="absolute left-4 p-2 text-white bg-black/50 rounded-full hover:bg-black/80 transition z-10"
          >
            <ChevronLeft size={32} />
          </button>
          <button 
            type="button"
            onClick={handleNext}
            className="absolute right-4 p-2 text-white bg-black/50 rounded-full hover:bg-black/80 transition z-10"
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}

      {/* Content Area */}
      <div className="w-full h-full flex items-center justify-center p-12 overflow-auto">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <Spinner size="lg" className="text-white" />
          </div>
        ) : isImage && blobUrl ? (
          <img 
            src={blobUrl} 
            alt={currentItem.fdFileName} 
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          />
        ) : isPdf && blobUrl ? (
          <iframe 
            src={blobUrl} 
            className="w-full h-full max-w-4xl bg-surface rounded-lg"
            title={currentItem.fdFileName}
          />
        ) : (
          <div className="flex flex-col items-center text-secondary">
            <AlertCircle size={48} className="mb-4 opacity-50" />
            <p>Preview not available for this file type.</p>
            <button type="button" onClick={handleDownload} className="mt-4 px-[20px] py-[12px] bg-tertiary text-on-primary rounded-md hover:opacity-90 transition-opacity">
              Download File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
