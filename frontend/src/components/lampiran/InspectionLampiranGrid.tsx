import React, { useState } from 'react';
import InspectionLampiranUploader from './InspectionLampiranUploader';
import LampiranItem from './LampiranItem';
import LampiranLightbox from './LampiranLightbox';
import { Lampiran } from './LampiranGrid';

interface LampiranGridProps {
  reportId: number;
  items: Lampiran[];
  onRefresh: () => void;
  onDelete: (id: number) => void;
  canEdit?: boolean;
}

export default function InspectionLampiranGrid({ reportId, items, onRefresh, onDelete, canEdit = true }: LampiranGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {canEdit && <InspectionLampiranUploader reportId={reportId} onUploadSuccess={onRefresh} />}

      {/* Grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((item, index) => (
            <LampiranItem 
              key={item.fdId} 
              item={item} 
              onDelete={canEdit ? onDelete : undefined}
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
