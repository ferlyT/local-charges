import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Eye, Trash2, FileText, Download } from 'lucide-react';

interface Lampiran {
  fdId: number;
  fdFileName: string;
  fdMimeType: string;
  fdFileSize: number;
  fdFilePath: string;
}

interface LampiranItemProps {
  item: Lampiran;
  onDelete?: (id: number) => void;
  onClick: () => void;
}

export default function LampiranItem({ item, onDelete, onClick }: LampiranItemProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isImage = item.fdMimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(item.fdFileName || '');
  const isPdf = item.fdMimeType === 'application/pdf' || /\.(pdf)$/i.test(item.fdFileName || '');

  // Extract filename safely
  const rawFileName = item.fdFilePath.split('/').pop() || item.fdFileName;

  useEffect(() => {
    let url: string | null = null;
    
    const fetchFile = async () => {
      try {
        const response = await api.get(`/lampiran/download/${rawFileName}`, {
          responseType: 'blob'
        });
        url = URL.createObjectURL(response.data);
        setBlobUrl(url);
      } catch (error) {
        console.error('Failed to fetch file thumbnail', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isImage) {
      fetchFile();
    } else {
      setIsLoading(false);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [rawFileName, isImage]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await api.get(`/lampiran/download/${rawFileName}?download=1`, {
        responseType: 'blob'
      });
      const downloadUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = item.fdFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed', error);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div 
      className="group relative flex flex-col items-center justify-center p-2 border border-secondary/20 rounded-lg bg-surface overflow-hidden cursor-pointer hover:border-tertiary transition-colors"
      onClick={onClick}
    >
      <div className="w-full h-32 flex items-center justify-center bg-neutral rounded overflow-hidden mb-2 relative">
        {isLoading ? (
          <div className="animate-pulse bg-secondary/20 w-full h-full" />
        ) : isImage && blobUrl ? (
          <img src={blobUrl} alt={item.fdFileName} className="object-cover w-full h-full" />
        ) : isPdf ? (
          <FileText size={40} className="text-tertiary" />
        ) : (
          <FileText size={40} className="text-secondary" />
        )}

        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button 
            type="button"
            className="p-1.5 bg-surface text-primary rounded-full hover:bg-neutral transition"
            title="View"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
          >
            <Eye size={16} />
          </button>
          <button 
            type="button"
            className="p-1.5 bg-surface text-primary rounded-full hover:bg-neutral transition"
            title="Download"
            onClick={handleDownload}
          >
            <Download size={16} />
          </button>
          {onDelete && (
            <button 
              type="button"
              className="p-1.5 bg-surface text-tertiary rounded-full hover:bg-neutral transition"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.fdId);
              }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="w-full text-center px-1">
        <p className="text-[0.72rem] tracking-[0.02em] font-medium text-primary truncate" title={item.fdFileName}>
          {item.fdFileName}
        </p>
        <p className="text-[0.72rem] text-secondary">
          {formatSize(item.fdFileSize)}
        </p>
      </div>
    </div>
  );
}
