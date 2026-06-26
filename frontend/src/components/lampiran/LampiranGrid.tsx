import React, { useState } from 'react';
import LampiranUploader from './LampiranUploader';
import LampiranItem from './LampiranItem';
import LampiranLightbox from './LampiranLightbox';

export interface Lampiran {
  fdId: number;
  fdFileName: string;
  fdMimeType: string;
  fdFileSize: number;
  fdFilePath: string;
}

interface LampiranGridProps {
  localChargesId: number;
  items: Lampiran[];
  onRefresh: () => void;
  onDelete: (id: number) => void;
}

export default function LampiranGrid({ localChargesId, items, onRefresh, onDelete }: LampiranGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <LampiranUploader localChargesId={localChargesId} onUploadSuccess={onRefresh} />

      {/* Grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((item, index) => (
            <LampiranItem 
              key={item.fdId} 
              item={item} 
              onDelete={onDelete}
              onClick={() => setLightboxIndex(index)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-secondary">
          No attachments yet. Upload some files above.
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <LampiranLightbox
          items={items}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
