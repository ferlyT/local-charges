import React from 'react';
import { Paperclip } from 'lucide-react';
import LampiranGrid, { type Lampiran } from '../../../../../components/lampiran/LampiranGrid';

interface StepAttachmentsProps {
  localChargesId: number;
  items: Lampiran[];
  onRefresh: () => void;
  onDelete: (id: number) => void;
  canEdit: boolean;
  isWizardMode?: boolean;
}

export default function StepAttachments({
  localChargesId,
  items,
  onRefresh,
  onDelete,
  canEdit,
  isWizardMode = false,
}: StepAttachmentsProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[1.1rem] font-semibold text-primary">
          {isWizardMode ? 'Upload Lampiran' : 'Uploaded Attachments'}
        </h2>
        <p className="text-secondary text-xs mt-0.5">
          {isWizardMode
            ? 'Upload lampiran untuk form ini. Lampiran bisa ditambahkan sekarang atau nanti lewat Edit.'
            : 'View, download, or edit files uploaded to this charge list.'}
        </p>
      </div>

      {items.length === 0 && isWizardMode && (
        <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-secondary/20 rounded-lg bg-neutral/20">
          <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-3">
            <Paperclip size={22} className="text-secondary" />
          </div>
          <p className="text-[0.88rem] font-medium text-secondary">Belum ada lampiran</p>
          <p className="text-[0.78rem] text-secondary/60 mt-0.5">
            Bisa ditambahkan sekarang atau nanti lewat halaman Edit.
          </p>
        </div>
      )}

      <div className="border-t border-secondary/15 pt-4">
        <LampiranGrid
          localChargesId={localChargesId}
          items={items}
          onRefresh={onRefresh}
          onDelete={onDelete}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
