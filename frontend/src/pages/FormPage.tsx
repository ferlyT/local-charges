import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, Clock, User, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import LampiranGrid, { type Lampiran } from '../components/lampiran/LampiranGrid';
import CustomerAutocomplete from '../components/CustomerAutocomplete';
import InputanAutocomplete from '../components/InputanAutocomplete';

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
  details: Detail[];
  user?: { fdNama: string };
  fdCreatedAt?: string;
}

export default function FormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.user);

  const [form, setForm] = useState<FormState>({
    fdNomorForm: '',
    details: [{ fdNamaCustomer: '', fdMarking: '', fdNoReceipt: '', fdNoBilling: '', fdNoInputan: '', fdKeterangan: '' }]
  });

  const [lampiranItems, setLampiranItems] = useState<Lampiran[]>([]);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchForm();
    }
  }, [id]);

  const fetchForm = async () => {
    try {
      const response = await api.get(`/local-charges/${id}`);
      const data = response.data;
      setForm({
        fdNomorForm: data.fdNomorForm,
        details: data.details.length > 0 ? data.details : [{ fdNamaCustomer: '', fdMarking: '', fdNoReceipt: '', fdNoBilling: '', fdNoInputan: '', fdKeterangan: '' }],
        user: data.user,
        fdCreatedAt: data.fdCreatedAt
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
  };

  const removeDetailRow = (index: number) => {
    if (form.details.length === 1) return;
    setForm(prev => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== index)
    }));
  };

  const updateDetail = (index: number, field: keyof Detail, value: string) => {
    const newDetails = [...form.details];
    newDetails[index][field] = value;
    setForm(prev => ({ ...prev, details: newDetails }));
  };

  const updateMultipleDetails = (index: number, data: Partial<Detail>) => {
    const newDetails = [...form.details];
    newDetails[index] = { ...newDetails[index], ...data };
    setForm(prev => ({ ...prev, details: newDetails }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const validDetails = form.details.filter(d => d.fdNamaCustomer.trim() !== '');

    if (validDetails.length === 0) {
      toast.error('Please add at least one valid detail with a Customer Name');
      setIsSaving(false);
      return;
    }

    const noInputans = validDetails
      .map(d => d.fdNoInputan)
      .filter(n => n && n.trim() !== '');
      
    if (new Set(noInputans).size !== noInputans.length) {
      toast.error('Terdapat duplikasi No. Inputan di dalam form ini.');
      setIsSaving(false);
      return;
    }

    const payload = {
      details: validDetails
    };

    try {
      if (isEdit) {
        await api.put(`/local-charges/${id}`, payload);
        toast.success('Berhasil menyimpan perubahan!');
        navigate('/');
      } else {
        const res = await api.post('/local-charges', payload);
        toast.success('Form berhasil dibuat! Silakan upload lampiran.');
        navigate(`/form/${res.data.fdId}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan form');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLampiran = async (lampiranId: number) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;
    try {
      await api.delete(`/lampiran/${lampiranId}`);
      fetchLampiran();
      toast.success('Lampiran berhasil dihapus');
    } catch (error) {
      toast.error('Gagal menghapus lampiran');
    }
  };

  const canSave = 
    (isEdit && (currentUser?.role === 'admin' || currentUser?.permissions?.includes('local_charges:edit'))) || 
    (!isEdit && (currentUser?.role === 'admin' || currentUser?.permissions?.includes('local_charges:create')));

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-8">
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
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-8">
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
          <h1 className="text-[2.2rem] font-display text-primary tracking-[-0.015em] leading-none mb-1">
            {isEdit ? 'Edit Form' : 'New Form'}
          </h1>
          <p className="text-secondary text-sm">
            {isEdit ? 'Update details and view attachments for this local charge record.' : 'Create a new local charge entry.'}
          </p>
        </div>
      </div>

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

        {/* Details Form Grid Wrapper */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-[1.1rem] font-semibold text-primary">Items & References</h2>
              <p className="text-secondary text-xs mt-0.5">Specify customer and relevant tracking identifiers.</p>
            </div>
            <button
              type="button"
              onClick={addDetailRow}
              className="btn bg-tertiary/10 hover:bg-tertiary/20 text-tertiary text-sm py-2 px-3 flex items-center gap-1.5"
            >
              <Plus size={16} /> Add Row
            </button>
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
                  <button
                    type="button"
                    onClick={() => removeDetailRow(index)}
                    disabled={form.details.length === 1}
                    className="p-1.5 text-secondary hover:text-tertiary hover:bg-tertiary/10 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Remove Item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">
                      No. Inputan (Auto Fill lookup)
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
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">
                      Customer Name <span className="text-tertiary">*</span>
                    </label>
                    <CustomerAutocomplete
                      required={index === 0}
                      disabled={!!detail.fdNoInputan}
                      value={detail.fdNamaCustomer}
                      onChange={(val) => updateDetail(index, 'fdNamaCustomer', val)}
                    />
                  </div>
                  
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    <div>
                      <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">Marking</label>
                      <input
                        type="text"
                        disabled={!!detail.fdNoInputan}
                        value={detail.fdMarking || ''}
                        onChange={(e) => updateDetail(index, 'fdMarking', e.target.value.toUpperCase())}
                        className={`form-input ${
                          !!detail.fdNoInputan ? 'bg-neutral/60 text-secondary cursor-not-allowed border-secondary/15' : ''
                        }`}
                        placeholder="MARKING"
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">No. Receipt</label>
                      <input
                        type="text"
                        disabled={!!detail.fdNoInputan}
                        value={detail.fdNoReceipt || ''}
                        onChange={(e) => updateDetail(index, 'fdNoReceipt', e.target.value.toUpperCase())}
                        className={`form-input ${
                          !!detail.fdNoInputan ? 'bg-neutral/60 text-secondary cursor-not-allowed border-secondary/15' : ''
                        }`}
                        placeholder="RECEIPT"
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">No. Billing</label>
                      <input
                        type="text"
                        disabled={!!detail.fdNoInputan}
                        value={detail.fdNoBilling || ''}
                        onChange={(e) => updateDetail(index, 'fdNoBilling', e.target.value.toUpperCase())}
                        className={`form-input ${
                          !!detail.fdNoInputan ? 'bg-neutral/60 text-secondary cursor-not-allowed border-secondary/15' : ''
                        }`}
                        placeholder="BILLING"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">Remarks (Keterangan)</label>
                    <textarea
                      rows={2}
                      value={detail.fdKeterangan || ''}
                      onChange={(e) => updateDetail(index, 'fdKeterangan', e.target.value.toUpperCase())}
                      className="form-input resize-none"
                      placeholder="Remarks info..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons Sticky-ish row */}
        <div className="flex justify-end gap-3.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            {canSave ? 'Cancel' : 'Back'}
          </button>
          {canSave && (
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : (isEdit ? 'Update Form' : 'Save & Continue')}
            </button>
          )}
        </div>
      </form>

      {/* Attachments Card Section */}
      {isEdit && (
        <div className="card space-y-6">
          <div>
            <h2 className="text-[1.1rem] font-semibold text-primary">Uploaded Attachments</h2>
            <p className="text-secondary text-xs mt-0.5">View, download, or edit files uploaded to this charge list.</p>
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
  );
}

