import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save, ArrowLeft, Trash2, Hash, User, Clock,
  CheckCircle, ChevronRight, ChevronLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../../lib/api';
import { useAuthStore } from '../../../../stores/authStore';
import { hasPermission } from '../../../../lib/permissions';
import ConfirmModal from '../../../../components/ConfirmModal';
import type { Lampiran } from '../../../../components/lampiran/LampiranGrid';

import StepIndicator, { type StepInfo } from '../../components/StepIndicator';
import StepOfficers from './steps/StepOfficers';
import StepItems, { type Detail } from './steps/StepItems';
import StepAttachments from './steps/StepAttachments';
import StepReview from './steps/StepReview';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  fdNomorForm?: string;
  fdDirequest?: string;
  fdBilling?: string;
  fdAR?: string;
  details: Detail[];
  user?: { fdNama: string };
  fdCreatedAt?: string;
  fdStatus?: number;
}

const EMPTY_DETAIL: Detail = {
  fdNamaCustomer: '',
  fdMarking: '',
  fdNoReceipt: '',
  fdNoBilling: '',
  fdNoInputan: '',
  fdKeterangan: '',
  fdMataUang: 'IDR',
  fdJumlah: '',
};

// ─── Wizard step definitions ──────────────────────────────────────────────────

const WIZARD_STEPS = [
  { label: 'Officers', description: 'PIC / Penanggung jawab' },
  { label: 'Items', description: 'Data barang & referensi' },
  { label: 'Lampiran', description: 'Upload dokumen (opsional)' },
  { label: 'Review', description: 'Cek & konfirmasi' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LocalChargesForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  // ── Core form state ────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({
    fdNomorForm: '',
    fdDirequest: '',
    fdBilling: '',
    fdAR: '',
    details: [{ ...EMPTY_DETAIL }],
  });
  const [lampiranItems, setLampiranItems] = useState<Lampiran[]>([]);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [inputanErrors, setInputanErrors] = useState<boolean[]>([]);

  // ── Edit-mode tab state ─────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'items' | 'attachments'>('items');

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [attToDelete, setAttToDelete] = useState<number | null>(null);

  // ── Wizard state (create only) ──────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [direquestError, setDirectequestError] = useState<string | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const isDone = form.fdStatus === 2;
  const canSave =
    !isDone &&
    ((isEdit && hasPermission(currentUser, 'local_charges:edit')) ||
      (!isEdit && hasPermission(currentUser, 'local_charges:create')));

  // The ID that is valid for lampiran operations (either edit id or wizard-created id)
  const activeId = isEdit ? Number(id) : createdId;

  // ─── Data fetching ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (isEdit) fetchForm();
  }, [id]);

  const fetchForm = async () => {
    try {
      const response = await api.get(`/local-charges/${id}`);
      const data = response.data;
      setForm({
        fdNomorForm: data.fdNomorForm,
        fdDirequest: data.fdDirequest || '',
        fdBilling: data.fdBilling || '',
        fdAR: data.fdAR || '',
        details:
          data.details.length > 0
            ? data.details
            : [{ ...EMPTY_DETAIL }],
        user: data.user,
        fdCreatedAt: data.fdCreatedAt,
        fdStatus: data.fdStatus,
      });
      setLampiranItems(data.lampiran || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch form data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLampiran = async () => {
    const lid = activeId;
    if (!lid) return;
    try {
      const response = await api.get(`/local-charges/${lid}`);
      setLampiranItems(response.data.lampiran || []);
    } catch {
      console.error('Failed to fetch lampiran');
    }
  };

  // ─── Detail row helpers ────────────────────────────────────────────────────

  const addDetailRow = () => {
    setForm((prev) => ({ ...prev, details: [...prev.details, { ...EMPTY_DETAIL }] }));
    setInputanErrors((prev) => [...prev, false]);
  };

  const removeDetailRow = (index: number) => {
    if (form.details.length === 1) return;
    setForm((prev) => ({ ...prev, details: prev.details.filter((_, i) => i !== index) }));
    setInputanErrors((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDetail = (index: number, field: keyof Detail, value: string) => {
    const newDetails = [...form.details];
    newDetails[index][field] = value;
    setForm((prev) => ({ ...prev, details: newDetails }));
    if (field === 'fdNoInputan') {
      const newErrors = [...inputanErrors];
      newErrors[index] = false;
      setInputanErrors(newErrors);
    }
  };

  const updateMultipleDetails = (index: number, data: Partial<Detail>) => {
    const newDetails = [...form.details];
    newDetails[index] = { ...newDetails[index], ...data };
    setForm((prev) => ({ ...prev, details: newDetails }));
    if (data.fdNoInputan) {
      const newErrors = [...inputanErrors];
      newErrors[index] = false;
      setInputanErrors(newErrors);
    }
  };

  // ─── Validation ────────────────────────────────────────────────────────────

  const validateOfficers = (): boolean => {
    if (!form.fdDirequest?.trim()) {
      setDirectequestError('Di-request (CSO / Shipment) wajib diisi.');
      return false;
    }
    setDirectequestError(null);
    return true;
  };

  const validateItems = (): boolean => {
    const validDetails = form.details.filter((d) => d.fdNamaCustomer.trim() !== '');
    if (validDetails.length === 0) {
      toast.error('Minimal satu baris detail dengan Customer Name wajib diisi.');
      return false;
    }
    const newErrors = form.details.map(
      (d) => d.fdNamaCustomer.trim() !== '' && !d.fdNoInputan?.trim()
    );
    if (newErrors.some(Boolean)) {
      setInputanErrors(newErrors);
      toast.error('No. Inputan wajib diisi untuk setiap item.');
      return false;
    }
    const noInputans = validDetails
      .map((d) => d.fdNoInputan)
      .filter((n) => n && n.trim() !== '');
    if (new Set(noInputans).size !== noInputans.length) {
      toast.error('Terdapat duplikasi No. Inputan di dalam form ini.');
      return false;
    }
    return true;
  };

  // ─── Wizard navigation (create mode) ──────────────────────────────────────

  const handleNext = async () => {
    // Step 0 → 1: validate Officers, no network call
    if (currentStep === 0) {
      if (!validateOfficers()) return;
      setCurrentStep(1);
      return;
    }

    // Step 1 → 2: validate Items, then POST to create the record
    if (currentStep === 1) {
      if (!validateItems()) return;
      setIsSaving(true);
      try {
        const validDetails = form.details.filter((d) => d.fdNamaCustomer.trim() !== '');
        const payload = {
          fdDirequest: form.fdDirequest || null,
          fdBilling: form.fdBilling || null,
          fdAR: form.fdAR || null,
          details: validDetails,
        };
        const res = await api.post('/local-charges', payload);
        setCreatedId(res.data.fdId);
        toast.success('Form berhasil dibuat! Upload lampiran jika diperlukan.');
        setCurrentStep(2);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Gagal menyimpan form');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Step 2 → 3 (Review): no network call
    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const handleGoToStep = (step: number) => {
    // Only allow jumping back (not forward past current completed step)
    if (step < currentStep) setCurrentStep(step);
  };

  // ─── Edit mode submit ──────────────────────────────────────────────────────

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateItems()) return;
    setIsSaving(true);
    const validDetails = form.details.filter((d) => d.fdNamaCustomer.trim() !== '');
    const payload = {
      fdDirequest: form.fdDirequest || null,
      fdBilling: form.fdBilling || null,
      fdAR: form.fdAR || null,
      details: validDetails,
    };
    try {
      await api.put(`/local-charges/${id}`, payload);
      toast.success('Berhasil menyimpan perubahan!');
      setTimeout(() => navigate('/'), 1000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan form');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Delete handlers ───────────────────────────────────────────────────────

  const handleDeleteLampiran = (lampiranId: number) => setAttToDelete(lampiranId);

  const confirmDeleteLampiran = async () => {
    if (attToDelete === null) return;
    try {
      await api.delete(`/lampiran/${attToDelete}`);
      fetchLampiran();
      toast.success('Lampiran berhasil dihapus');
    } catch {
      toast.error('Gagal menghapus lampiran');
    } finally {
      setAttToDelete(null);
    }
  };

  const handleDeleteForm = () => setIsDeleteModalOpen(true);

  const confirmDeleteForm = async () => {
    setIsSaving(true);
    setIsDeleteModalOpen(false);
    try {
      await api.delete(`/local-charges/${id}`);
      toast.success('Form berhasil dihapus');
      setTimeout(() => navigate('/'), 1000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menghapus form');
      setIsSaving(false);
    }
  };

  // ─── Wizard step indicator config ─────────────────────────────────────────

  const buildWizardSteps = (): StepInfo[] =>
    WIZARD_STEPS.map((s, i) => ({
      label: s.label,
      description: s.description,
      status:
        i < currentStep
          ? 'done'
          : i === currentStep
          ? 'active'
          : 'upcoming',
    }));

  // ─── Loading skeleton ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto space-y-8">
        <div className="flex items-center gap-4 animate-pulse">
          <div className="h-10 w-10 skeleton rounded-full" />
          <div className="h-10 w-72 skeleton" />
        </div>
        <div className="h-24 w-full skeleton rounded-lg" />
        <div className="space-y-6">
          <div className="h-96 w-full skeleton rounded-lg" />
        </div>
      </div>
    );
  }

  // ─── Metadata bar (shared between create wizard and edit) ──────────────────

  const MetadataBar = () => (
    <div className="card bg-surface flex flex-col md:flex-row gap-5 justify-between md:items-center">
      <div>
        <h2 className="text-[1rem] font-semibold text-primary">Metadata</h2>
        <p className="text-secondary text-xs mt-0.5">Automated registration tracking data.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="bg-neutral px-3.5 py-2 rounded-md border border-secondary/15 flex items-center gap-2 text-[0.88rem] font-medium text-primary">
          <Hash size={14} className="text-secondary" />
          <span className="text-[0.72rem] text-secondary uppercase font-semibold">No:</span>
          <span className="font-mono">{form.fdNomorForm || 'Auto Generated'}</span>
        </div>
        <div className="bg-neutral px-3.5 py-2 rounded-md border border-secondary/15 flex items-center gap-2 text-[0.88rem] font-medium text-primary">
          <User size={14} className="text-secondary" />
          <span className="text-[0.72rem] text-secondary uppercase font-semibold">Author:</span>
          <span>{form.user?.fdNama || currentUser?.name || 'Unknown'}</span>
        </div>
        {(form.fdCreatedAt || isEdit) && (
          <div className="bg-neutral px-3.5 py-2 rounded-md border border-secondary/15 flex items-center gap-2 text-[0.88rem] font-medium text-primary">
            <Clock size={14} className="text-secondary" />
            <span className="text-[0.72rem] text-secondary uppercase font-semibold">Created:</span>
            <span>
              {form.fdCreatedAt
                ? new Date(form.fdCreatedAt).toLocaleString('id-ID')
                : new Date().toLocaleString('id-ID')}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE MODE — 4-step Wizard
  // ═══════════════════════════════════════════════════════════════════════════

  if (!isEdit) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 pb-2 border-b border-secondary/10">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 hover:bg-neutral rounded-full transition-colors duration-150 text-secondary hover:text-primary border border-secondary/15 bg-surface"
            type="button"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-[1.5rem] sm:text-[1.9rem] md:text-[2.2rem] font-display text-primary tracking-[-0.015em] leading-tight sm:leading-none">
              New Local Charge
            </h1>
            <p className="text-secondary text-xs sm:text-sm">Create a new local charge entry.</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="card p-3 sm:p-5 bg-surface">
          <StepIndicator steps={buildWizardSteps()} currentStep={currentStep} />
        </div>

        {/* Metadata bar */}
        <MetadataBar />

        {/* Step Content */}
        <div className="card bg-surface p-4 sm:p-6">
          {currentStep === 0 && (
            <StepOfficers
              form={form}
              onChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
              canSave={canSave}
              direquestError={direquestError}
            />
          )}
          {currentStep === 1 && (
            <StepItems
              details={form.details}
              onUpdate={updateDetail}
              onUpdateMultiple={updateMultipleDetails}
              onAdd={addDetailRow}
              onRemove={removeDetailRow}
              canSave={canSave}
              inputanErrors={inputanErrors}
            />
          )}
          {currentStep === 2 && activeId && (
            <StepAttachments
              localChargesId={activeId}
              items={lampiranItems}
              onRefresh={fetchLampiran}
              onDelete={handleDeleteLampiran}
              canEdit={canSave}
              isWizardMode
            />
          )}
          {currentStep === 3 && (
            <StepReview
              form={form}
              details={form.details}
              lampiranItems={lampiranItems}
              onGoToStep={handleGoToStep}
            />
          )}
        </div>

        {/* Wizard Navigation */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-3">
          <div className="order-1 sm:order-2 text-center text-[0.78rem] text-secondary">
            Langkah {currentStep + 1} dari {WIZARD_STEPS.length}
          </div>

          <button
            type="button"
            onClick={currentStep === 0 ? () => navigate(-1) : handleBack}
            className="order-2 sm:order-1 w-full sm:w-auto btn-secondary flex items-center justify-center gap-2"
          >
            <ChevronLeft size={16} />
            {currentStep === 0 ? 'Batal' : 'Kembali'}
          </button>

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isSaving || (currentStep === 2 && !activeId)}
              className="order-3 w-full sm:w-auto btn-primary flex items-center justify-center gap-2"
            >
              {isSaving ? (
                'Menyimpan...'
              ) : currentStep === 1 ? (
                <>Simpan &amp; Lanjut <ChevronRight size={16} /></>
              ) : (
                <>Lanjut <ChevronRight size={16} /></>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="order-3 w-full sm:w-auto btn-primary flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} />
              Selesai
            </button>
          )}
        </div>

        {/* Lampiran delete confirm */}
        <ConfirmModal
          isOpen={attToDelete !== null}
          title="Hapus Lampiran"
          message="Anda yakin ingin menghapus lampiran ini?"
          confirmText="Hapus"
          cancelText="Batal"
          onConfirm={confirmDeleteLampiran}
          onCancel={() => setAttToDelete(null)}
          isDestructive
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EDIT MODE — Tab-based (unchanged from original design)
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 pb-2 border-b border-secondary/10">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 hover:bg-neutral rounded-full transition-colors duration-150 text-secondary hover:text-primary border border-secondary/15 bg-surface"
          type="button"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center flex-wrap gap-2 sm:gap-3 mb-1">
            <h1 className="text-[1.5rem] sm:text-[1.9rem] md:text-[2.2rem] font-display text-primary tracking-[-0.015em] leading-tight sm:leading-none">
              {isDone ? 'View Local Charge' : 'Edit Local Charge'}
            </h1>
            {isDone && (
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md text-[0.75rem] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <CheckCircle size={14} /> Locked
              </span>
            )}
          </div>
          <p className="text-secondary text-xs sm:text-sm">
            Update details and view attachments for this local charge record.
            {isDone && (
              <span className="text-emerald-600/80 font-medium ml-1">Form ini sudah selesai dan dikunci.</span>
            )}
          </p>
        </div>
      </div>

      <form onSubmit={handleEditSubmit} className="space-y-6 sm:space-y-8">
        {/* Metadata */}
        <MetadataBar />

        {/* Officers */}
        <div className="card bg-surface p-4 sm:p-6">
          <StepOfficers
            form={form}
            onChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
            canSave={canSave}
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 border-b border-secondary/20 pb-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'items'
                ? 'border-tertiary text-tertiary'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            Items &amp; References
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attachments')}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'attachments'
                ? 'border-tertiary text-tertiary'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            Attachments
            <span
              className={`px-1.5 py-0.5 rounded-full text-[0.65rem] ${
                activeTab === 'attachments'
                  ? 'bg-tertiary/10 text-tertiary'
                  : 'bg-secondary/10 text-secondary'
              }`}
            >
              {lampiranItems.length}
            </span>
          </button>
        </div>

        {/* Tab content */}
        <div className="card p-4 sm:p-6">
          {activeTab === 'items' && (
            <StepItems
              details={form.details}
              onUpdate={updateDetail}
              onUpdateMultiple={updateMultipleDetails}
              onAdd={addDetailRow}
              onRemove={removeDetailRow}
              canSave={canSave}
              inputanErrors={inputanErrors}
            />
          )}
          {activeTab === 'attachments' && activeId && (
            <StepAttachments
              localChargesId={activeId}
              items={lampiranItems}
              onRefresh={fetchLampiran}
              onDelete={handleDeleteLampiran}
              canEdit={canSave}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex gap-2">
            {!isDone && hasPermission(currentUser, 'local_charges:delete') && (
              <button
                type="button"
                onClick={handleDeleteForm}
                disabled={isSaving}
                className="w-full sm:w-auto justify-center btn border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white px-4 py-2 flex items-center gap-2"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            )}
          </div>
          <div className="flex gap-3 sm:gap-3.5">
            <button type="button" onClick={() => navigate(-1)} className="flex-1 sm:flex-none justify-center btn-secondary">
              {canSave ? 'Cancel' : 'Back'}
            </button>
            {canSave && (
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 sm:flex-none justify-center btn-primary flex items-center gap-2"
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Update Form'}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Modals */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Hapus Form Biaya Lokal"
        message="Hapus form ini? Form akan masuk Recycle Bin dan bisa di-restore oleh admin."
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={confirmDeleteForm}
        onCancel={() => setIsDeleteModalOpen(false)}
        isDestructive
      />
      <ConfirmModal
        isOpen={attToDelete !== null}
        title="Hapus Lampiran"
        message="Anda yakin ingin menghapus lampiran ini?"
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={confirmDeleteLampiran}
        onCancel={() => setAttToDelete(null)}
        isDestructive
      />
    </div>
  );
}
