import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, Clock, User, Hash, FileSearch, CheckCircle, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';
import CustomerAutocomplete from '../../../components/CustomerAutocomplete';
import InputanAutocomplete from '../../../components/InputanAutocomplete';
import EmployeeSelect from '../../../components/EmployeeSelect';
import LampiranGrid, { type Lampiran } from '../../../components/lampiran/LampiranGrid';
import { hasPermission } from '../../../lib/permissions';
import ConfirmModal from '../../../components/ConfirmModal';
import PullInvoiceDialog from '../../../components/PullInvoiceDialog';

interface Detail {
  fdNamaCustomer: string;
  fdMarking: string;
  fdNoReceipt: string;
  fdNoBilling: string;
  fdNoInputan: string;
  fdKeterangan: string;
}

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

export default function FormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = useAuthStore(state => state.user);

  // Step wizard: ?step=2 means we're in the attachment step after a fresh create
  const isStep2 = searchParams.get('step') === '2';

  const [form, setForm] = useState<FormState>({
    fdNomorForm: '',
    fdDirequest: '',
    fdBilling: '',
    fdAR: '',
    details: [{ fdNamaCustomer: '', fdMarking: '', fdNoReceipt: '', fdNoBilling: '', fdNoInputan: '', fdKeterangan: '' }]
  });

  const [lampiranItems, setLampiranItems] = useState<Lampiran[]>([]);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'attachments'>(isStep2 ? 'attachments' : 'items');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [attToDelete, setAttToDelete] = useState<number | null>(null);
  const [isPullInvoiceOpen, setIsPullInvoiceOpen] = useState(false);

  // Validation errors for per-row fdNoInputan
  const [inputanErrors, setInputanErrors] = useState<boolean[]>([]);

  useEffect(() => {
    if (isEdit) {
      fetchForm();
    }
  }, [id]);

  // When entering step 2, auto-switch to attachments tab
  useEffect(() => {
    if (isStep2) {
      setActiveTab('attachments');
    }
  }, [isStep2]);

  const fetchForm = async () => {
    try {
      const response = await api.get(`/local-charges/${id}`);
      const data = response.data;
      setForm({
        fdNomorForm: data.fdNomorForm,
        fdDirequest: data.fdDirequest || '',
        fdBilling: data.fdBilling || '',
        fdAR: data.fdAR || '',
        details: data.details.length > 0 ? data.details : [{ fdNamaCustomer: '', fdMarking: '', fdNoReceipt: '', fdNoBilling: '', fdNoInputan: '', fdKeterangan: '' }],
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
    if (!isEdit) return;
    try {
      const response = await api.get(`/local-charges/${id}`);
      setLampiranItems(response.data.lampiran || []);
    } catch (error) {
      console.error('Failed to fetch lampiran', error);
    }
  };

  const addDetailRow = () => {
    setForm(prev => ({
      ...prev,
      details: [...prev.details, { fdNamaCustomer: '', fdMarking: '', fdNoReceipt: '', fdNoBilling: '', fdNoInputan: '', fdKeterangan: '' }]
    }));
    setInputanErrors(prev => [...prev, false]);
  };

  const removeDetailRow = (index: number) => {
    if (form.details.length === 1) return;
    setForm(prev => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== index)
    }));
    setInputanErrors(prev => prev.filter((_, i) => i !== index));
  };

  const updateDetail = (index: number, field: keyof Detail, value: string) => {
    const newDetails = [...form.details];
    newDetails[index][field] = value;
    setForm(prev => ({ ...prev, details: newDetails }));
    // Clear error when user types in No. Inputan
    if (field === 'fdNoInputan') {
      const newErrors = [...inputanErrors];
      newErrors[index] = false;
      setInputanErrors(newErrors);
    }
  };

  const updateMultipleDetails = (index: number, data: Partial<Detail>) => {
    const newDetails = [...form.details];
    newDetails[index] = { ...newDetails[index], ...data };
    setForm(prev => ({ ...prev, details: newDetails }));
    // Clear inputan error when auto-filled
    if (data.fdNoInputan) {
      const newErrors = [...inputanErrors];
      newErrors[index] = false;
      setInputanErrors(newErrors);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const validDetails = form.details.filter(d => d.fdNamaCustomer.trim() !== '');

    if (validDetails.length === 0) {
      toast.error('Minimal satu baris detail dengan Customer Name wajib diisi.');
      setIsSaving(false);
      return;
    }

    // Validate: No. Inputan wajib diisi untuk setiap baris
    const newErrors = form.details.map(d => d.fdNamaCustomer.trim() !== '' && !d.fdNoInputan?.trim());
    const hasInputanError = newErrors.some(Boolean);
    if (hasInputanError) {
      setInputanErrors(newErrors);
      toast.error('No. Inputan wajib diisi untuk setiap item.');
      setIsSaving(false);
      return;
    }

    // Check for duplicates within the same form
    const noInputans = validDetails.map(d => d.fdNoInputan).filter(n => n && n.trim() !== '');
    if (new Set(noInputans).size !== noInputans.length) {
      toast.error('Terdapat duplikasi No. Inputan di dalam form ini.');
      setIsSaving(false);
      return;
    }

    const payload = {
      fdDirequest: form.fdDirequest || null,
      fdBilling: form.fdBilling || null,
      fdAR: form.fdAR || null,
      details: validDetails,
    };

    try {
      if (isEdit) {
        await api.put(`/local-charges/${id}`, payload);
        toast.success('Berhasil menyimpan perubahan!');
        setTimeout(() => navigate('/'), 1000);
      } else {
        // Create new → go to step 2 (attachment upload)
        const res = await api.post('/local-charges', payload);
        toast.success('Form berhasil dibuat! Silakan upload lampiran.');
        navigate(`/form/${res.data.fdId}?step=2`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan form');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteLampiran = async () => {
    if (attToDelete === null) return;
    try {
      await api.delete(`/lampiran/${attToDelete}`);
      fetchLampiran();
      toast.success('Lampiran berhasil dihapus');
    } catch (error) {
      toast.error('Gagal menghapus lampiran');
    } finally {
      setAttToDelete(null);
    }
  };

  const handleDeleteLampiran = (lampiranId: number) => {
    setAttToDelete(lampiranId);
  };

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

  const handleDeleteForm = () => {
    setIsDeleteModalOpen(true);
  };

  const isDone = form.fdStatus === 2;

  const canSave =
    !isDone && (
      (isEdit && hasPermission(currentUser, 'local_charges:edit')) ||
      (!isEdit && hasPermission(currentUser, 'local_charges:create'))
    );

  const canPullInvoice = !isDone && isEdit && hasPermission(currentUser, 'local_charges:pull_invoice');

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

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Page Title with Navigation */}
      <div className="flex items-center gap-4 pb-2 border-b border-secondary/10">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 hover:bg-neutral rounded-full transition-colors duration-150 text-secondary hover:text-primary border border-secondary/15 bg-surface"
          type="button"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[2.2rem] font-display text-primary tracking-[-0.015em] leading-none">
              {isEdit ? (isDone ? 'View Local Charge' : 'Edit Local Charge') : 'New Local Charge'}
            </h1>
            {isDone && (
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md text-[0.75rem] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <CheckCircle size={14} /> Locked
              </span>
            )}
          </div>
          <p className="text-secondary text-sm">
            {isEdit ? 'Update details and view attachments for this local charge record.' : 'Create a new local charge entry.'}
            {isDone && <span className="text-emerald-600/80 font-medium ml-1">Form ini sudah selesai dan dikunci.</span>}
          </p>
        </div>
      </div>

      {/* Step indicator for wizard mode (new form after step 1 save) */}
      {isEdit && isStep2 && (
        <div className="flex items-center gap-0 bg-surface border border-secondary/15 rounded-xl overflow-hidden shadow-sm">
          {/* Step 1 — completed */}
          <div className="flex-1 flex items-center gap-3 px-5 py-3.5 bg-tertiary/5 border-r border-secondary/10">
            <div className="w-7 h-7 rounded-full bg-tertiary flex items-center justify-center shrink-0">
              <CheckCircle size={15} className="text-on-primary" />
            </div>
            <div>
              <p className="text-[0.72rem] font-semibold text-tertiary uppercase tracking-wide">Step 1</p>
              <p className="text-[0.85rem] font-medium text-primary">Data Tersimpan</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-secondary/40 shrink-0" />
          {/* Step 2 — active */}
          <div className="flex-1 flex items-center gap-3 px-5 py-3.5 bg-tertiary/10">
            <div className="w-7 h-7 rounded-full bg-tertiary/20 border-2 border-tertiary flex items-center justify-center shrink-0">
              <span className="text-[0.7rem] font-bold text-tertiary">2</span>
            </div>
            <div>
              <p className="text-[0.72rem] font-semibold text-tertiary uppercase tracking-wide">Step 2</p>
              <p className="text-[0.85rem] font-medium text-primary">Upload Lampiran</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Header Information Section Card */}
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
                  {form.fdCreatedAt ? new Date(form.fdCreatedAt).toLocaleString('id-ID') : new Date().toLocaleString('id-ID')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Officers Section (Feature 2) */}
        <div className="card bg-surface space-y-4">
          <div>
            <h2 className="text-[1rem] font-semibold text-primary">Officers / PIC</h2>
            <p className="text-secondary text-xs mt-0.5">Data penanggung jawab diambil dari database SEJDB2020.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">
                Di-request (CSO / Shipment)
              </label>
              <EmployeeSelect
                role="direquest"
                value={form.fdDirequest || ''}
                onChange={(val) => setForm(prev => ({ ...prev, fdDirequest: val }))}
                placeholder="Pilih CSO / Shipment..."
                disabled={!canSave}
              />
            </div>
            <div>
              <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">
                Billing
              </label>
              <EmployeeSelect
                role="billing"
                value={form.fdBilling || ''}
                onChange={(val) => setForm(prev => ({ ...prev, fdBilling: val }))}
                placeholder="Pilih Billing..."
                disabled={!canSave}
              />
            </div>
            <div>
              <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">
                AR (Finance)
              </label>
              <EmployeeSelect
                role="ar"
                value={form.fdAR || ''}
                onChange={(val) => setForm(prev => ({ ...prev, fdAR: val }))}
                placeholder="Pilih AR..."
                disabled={!canSave}
              />
            </div>
          </div>
        </div>

        {/* Tab Bar — hide tabs in step 2 mode */}
        {!isStep2 && (
          <div className="flex items-center gap-2 border-b border-secondary/20 pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('items')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'items'
                  ? 'border-tertiary text-tertiary'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              Items &amp; References
            </button>
            {isEdit && (
              <button
                type="button"
                onClick={() => setActiveTab('attachments')}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'attachments'
                    ? 'border-tertiary text-tertiary'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                Attachments
                <span className={`px-1.5 py-0.5 rounded-full text-[0.65rem] ${
                  activeTab === 'attachments' ? 'bg-tertiary/10 text-tertiary' : 'bg-secondary/10 text-secondary'
                }`}>
                  {lampiranItems.length}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Step 2 heading (attachment) */}
        {isStep2 && (
          <div className="flex items-center gap-2 border-b border-secondary/20 pb-3">
            <span className="px-4 py-2.5 text-sm font-semibold text-tertiary border-b-2 border-tertiary">
              Attachments
            </span>
            <span className="px-1.5 py-0.5 rounded-full text-[0.65rem] bg-tertiary/10 text-tertiary">
              {lampiranItems.length}
            </span>
          </div>
        )}

        {/* Tab Content Wrapper */}
        <div className="card">
          {activeTab === 'items' && !isStep2 && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-[1.1rem] font-semibold text-primary">Items &amp; References</h2>
                  <p className="text-secondary text-xs mt-0.5">Specify customer and relevant tracking identifiers.</p>
                </div>
                {canSave && (
                  <button
                    type="button"
                    onClick={addDetailRow}
                    className="btn bg-tertiary/10 hover:bg-tertiary/20 text-tertiary text-sm py-2 px-3 flex items-center gap-1.5"
                  >
                    <Plus size={16} /> Add Row
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {form.details.map((detail, index) => (
                  <div
                    key={index}
                    className="relative p-5 border border-secondary/20 rounded-lg bg-neutral/30 hover:bg-neutral/50 transition-all duration-300 space-y-4"
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-secondary/10">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded bg-tertiary text-on-primary text-xs font-mono font-bold">
                          #{index + 1}
                        </span>
                        <span className="text-[0.95rem] font-semibold text-primary">Item Details</span>
                      </div>
                      {canSave && (
                        <button
                          type="button"
                          onClick={() => removeDetailRow(index)}
                          disabled={form.details.length === 1}
                          className="p-1.5 text-secondary hover:text-tertiary hover:bg-tertiary/10 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Remove Item"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* No. Inputan — mandatory (Feature 1) */}
                      <div className="md:col-span-2">
                        <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">
                          No. Inputan{' '}
                          <span className="text-tertiary">*</span>
                          <span className="text-secondary/60 normal-case tracking-normal font-normal ml-1">(wajib diisi)</span>
                        </label>
                        <InputanAutocomplete
                          value={detail.fdNoInputan || ''}
                          onChange={(val) => updateDetail(index, 'fdNoInputan', val)}
                          onSelect={(data) => {
                            updateMultipleDetails(index, {
                              fdNoInputan: data.fdNoInputan,
                              fdNamaCustomer: data.fdCustName,
                              fdMarking: data.fdMarking,
                              fdNoReceipt: data.fdNoReceipt,
                              fdNoBilling: data.fdNoBilling
                            });
                          }}
                          required
                          disabled={!canSave}
                        />
                        {inputanErrors[index] && (
                          <p className="mt-1 text-[0.75rem] text-rose-500 font-medium">
                            No. Inputan wajib diisi.
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">
                          Customer Name <span className="text-tertiary">*</span>
                        </label>
                        <CustomerAutocomplete
                          required={index === 0}
                          disabled={!canSave || !!detail.fdNoInputan}
                          value={detail.fdNamaCustomer}
                          onChange={(val) => updateDetail(index, 'fdNamaCustomer', val)}
                        />
                      </div>

                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                        <div>
                          <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">Marking</label>
                          <input
                            type="text"
                            disabled={!canSave || !!detail.fdNoInputan}
                            value={detail.fdMarking || ''}
                            onChange={(e) => updateDetail(index, 'fdMarking', e.target.value.toUpperCase())}
                            className={`form-input ${
                              (!canSave || !!detail.fdNoInputan) ? 'bg-neutral/60 text-secondary cursor-not-allowed border-secondary/15' : ''
                            }`}
                            placeholder="MARKING"
                          />
                        </div>

                        <div>
                          <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">No. Receipt</label>
                          <input
                            type="text"
                            disabled={!canSave || !!detail.fdNoInputan}
                            value={detail.fdNoReceipt || ''}
                            onChange={(e) => updateDetail(index, 'fdNoReceipt', e.target.value.toUpperCase())}
                            className={`form-input ${
                              (!canSave || !!detail.fdNoInputan) ? 'bg-neutral/60 text-secondary cursor-not-allowed border-secondary/15' : ''
                            }`}
                            placeholder="RECEIPT"
                          />
                        </div>

                        <div>
                          <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">No. Billing</label>
                          <input
                            type="text"
                            disabled={!canSave || !!detail.fdNoInputan}
                            value={detail.fdNoBilling || ''}
                            onChange={(e) => updateDetail(index, 'fdNoBilling', e.target.value.toUpperCase())}
                            className={`form-input ${
                              (!canSave || !!detail.fdNoInputan) ? 'bg-neutral/60 text-secondary cursor-not-allowed border-secondary/15' : ''
                            }`}
                            placeholder="BILLING"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">Remarks (Keterangan)</label>
                        <textarea
                          rows={2}
                          disabled={!canSave}
                          value={detail.fdKeterangan || ''}
                          onChange={(e) => updateDetail(index, 'fdKeterangan', e.target.value.toUpperCase())}
                          className={`form-input resize-none ${!canSave ? 'bg-neutral/60 text-secondary cursor-not-allowed border-secondary/15' : ''}`}
                          placeholder="Remarks info..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Attachments tab — shown in normal edit mode or step 2 wizard */}
          {(activeTab === 'attachments' || isStep2) && isEdit && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[1.1rem] font-semibold text-primary">
                  {isStep2 ? 'Upload Lampiran' : 'Uploaded Attachments'}
                </h2>
                <p className="text-secondary text-xs mt-0.5">
                  {isStep2
                    ? 'Upload lampiran untuk form ini. Setelah selesai, klik "Selesai" untuk kembali ke daftar.'
                    : 'View, download, or edit files uploaded to this charge list.'}
                </p>
              </div>
              <div className="border-t border-secondary/15 pt-4">
                <LampiranGrid
                  localChargesId={Number(id)}
                  items={lampiranItems}
                  onRefresh={fetchLampiran}
                  onDelete={handleDeleteLampiran}
                  canEdit={canSave}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {isEdit && !isDone && hasPermission(currentUser, 'local_charges:delete') && (
              <button
                type="button"
                onClick={handleDeleteForm}
                disabled={isSaving}
                className="btn border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white px-4 py-2 flex items-center gap-2"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
            {/* Pull Invoice button (Feature 4) */}
            {canPullInvoice && !isStep2 && (
              <button
                type="button"
                onClick={() => setIsPullInvoiceOpen(true)}
                disabled={isSaving}
                className="btn border border-tertiary/30 text-tertiary hover:bg-tertiary hover:text-on-primary px-4 py-2 flex items-center gap-2"
              >
                <FileSearch size={16} />
                <span className="hidden sm:inline">Pull Invoice</span>
              </button>
            )}
          </div>
          <div className="flex gap-3.5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary"
            >
              {isStep2 ? 'Lewati' : canSave ? 'Cancel' : 'Back'}
            </button>

            {/* Step 2: show "Selesai" instead of save */}
            {isStep2 ? (
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn-primary flex items-center gap-2"
              >
                <CheckCircle size={16} />
                Selesai
              </button>
            ) : (
              canSave && (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : isEdit ? 'Update Form' : 'Save & Continue →'}
                </button>
              )
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
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={attToDelete !== null}
        title="Hapus Lampiran"
        message="Anda yakin ingin menghapus lampiran ini?"
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={confirmDeleteLampiran}
        onCancel={() => setAttToDelete(null)}
        isDestructive={true}
      />

      {/* Pull Invoice Dialog (Feature 4) */}
      <PullInvoiceDialog
        isOpen={isPullInvoiceOpen}
        localChargesId={Number(id)}
        fdNomorForm={form.fdNomorForm || ''}
        onClose={() => setIsPullInvoiceOpen(false)}
        onStatusUpdated={() => {
          fetchForm();
          setIsPullInvoiceOpen(false);
        }}
      />
    </div>
  );
}
