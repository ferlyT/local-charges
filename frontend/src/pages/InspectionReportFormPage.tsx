import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, Save, ArrowLeft, Clock, User, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import MarkingCodeAutocomplete from '../components/MarkingCodeAutocomplete';
import InspectionLampiranGrid from '../components/lampiran/InspectionLampiranGrid';
import type { Lampiran } from '../components/lampiran/LampiranGrid';
import { hasPermission } from '../lib/permissions';
import { inspectionReportsApi, type InspectionReport } from '../lib/inspectionReports';
import api from '../lib/api';

export default function InspectionReportFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.user);

  const [form, setForm] = useState<Partial<InspectionReport>>({
    fdReportNumber: '',
    fdReportDate: new Date().toISOString().slice(0, 16),
    fdListCode: '',
    fdMarkingCode: '',
    fdMarkingNo: '',
    fdNamaCustomer: '',
    fdKeterangan: '',
    fdStatus: '1'
  });

  const [lampiranItems, setLampiranItems] = useState<Lampiran[]>([]);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'attachments'>('items');

  useEffect(() => {
    if (isEdit) {
      fetchForm();
    }
  }, [id]);

  const fetchForm = async () => {
    try {
      const data = await inspectionReportsApi.getById(id as string);
      setForm({
        fdId: data.fdId,
        fdReportNumber: data.fdReportNumber,
        fdReportDate: new Date(data.fdReportDate).toISOString().slice(0, 16),
        fdListCode: data.fdListCode,
        fdMarkingCode: data.fdMarkingCode,
        fdMarkingNo: data.fdMarkingNo,
        fdNamaCustomer: data.fdNamaCustomer,
        fdKeterangan: data.fdKeterangan,
        fdStatus: data.fdStatus,
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
      const data = await inspectionReportsApi.getById(id as string);
      setLampiranItems(data.lampiran || []);
    } catch (error) {
      console.error('Failed to fetch lampiran', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (!form.fdNamaCustomer || form.fdNamaCustomer.trim() === '') {
      toast.error('Please add a Customer Name');
      setIsSaving(false);
      return;
    }

    try {
      const payload = {
        fdReportDate: new Date(form.fdReportDate as string).toISOString(),
        fdListCode: form.fdListCode,
        fdMarkingCode: form.fdMarkingCode,
        fdMarkingNo: form.fdMarkingNo,
        fdNamaCustomer: form.fdNamaCustomer,
        fdKeterangan: form.fdKeterangan,
        fdStatus: form.fdStatus,
      };

      if (isEdit) {
        await inspectionReportsApi.update(id as string, payload);
        toast.success('Berhasil menyimpan perubahan!');
        navigate('/inspection-reports');
      } else {
        const res = await inspectionReportsApi.create(payload);
        toast.success('Form berhasil dibuat! Silakan upload lampiran.');
        navigate(`/inspection-reports/${res.fdId}`);
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

  const handleDeleteForm = async () => {
    if (!confirm('Hapus form ini? Form akan masuk Recycle Bin dan bisa di-restore oleh admin.')) return;
    setIsSaving(true);
    try {
      await inspectionReportsApi.delete(id as string);
      toast.success('Form berhasil dihapus');
      navigate('/inspection-reports');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menghapus form');
      setIsSaving(false);
    }
  };

  const canSave = 
    (isEdit && hasPermission(currentUser, 'inspection_reports:edit')) || 
    (!isEdit && hasPermission(currentUser, 'inspection_reports:create'));

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
            {isEdit ? 'Edit Inspection Report' : 'New Inspection Report'}
          </h1>
          <p className="text-secondary text-sm">
            {isEdit ? 'Update details and view attachments for this report.' : 'Create a new inspection report entry.'}
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
              <span className="font-mono">{form.fdReportNumber || 'Auto Generated'}</span>
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

        {/* Tab Bar */}
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
            Report Details
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

        {/* Tab Content Wrapper */}
        <div className="card">
          {activeTab === 'items' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-[1.1rem] font-semibold text-primary">Report Details</h2>
                  <p className="text-secondary text-xs mt-0.5">Specify customer and relevant inspection identifiers.</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="relative p-5 border border-secondary/20 rounded-lg bg-neutral/30 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">
                        Report Date <span className="text-tertiary">*</span>
                      </label>
                      <input
                        required
                        type="datetime-local"
                        value={form.fdReportDate}
                        onChange={(e) => setForm(prev => ({ ...prev, fdReportDate: e.target.value }))}
                        className="form-input"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">
                        Marking Code (Auto Fill lookup)
                      </label>
                      <MarkingCodeAutocomplete
                        value={form.fdMarkingCode || ''}
                        onChange={(val) => setForm(prev => ({ ...prev, fdMarkingCode: val }))}
                        onSelect={(data) => {
                          setForm(prev => ({
                            ...prev,
                            fdMarkingCode: data.fdMarkingCode,
                            fdListCode: data.fdListCode,
                            fdMarkingNo: data.fdMarkingNo,
                            fdNamaCustomer: data.fdCustName
                          }));
                        }}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">
                        Customer Name <span className="text-tertiary">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={form.fdNamaCustomer || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, fdNamaCustomer: e.target.value.toUpperCase() }))}
                        className="form-input"
                        placeholder="CUSTOMER NAME"
                      />
                    </div>
                    
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">Marking No</label>
                        <input
                          type="text"
                          value={form.fdMarkingNo || ''}
                          onChange={(e) => setForm(prev => ({ ...prev, fdMarkingNo: e.target.value.toUpperCase() }))}
                          className="form-input"
                          placeholder="MARKING NO"
                        />
                      </div>

                      <div>
                        <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">List Code</label>
                        <input
                          type="text"
                          value={form.fdListCode || ''}
                          onChange={(e) => setForm(prev => ({ ...prev, fdListCode: e.target.value.toUpperCase() }))}
                          className="form-input"
                          placeholder="LIST CODE"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">Remarks (Keterangan)</label>
                      <textarea
                        rows={3}
                        value={form.fdKeterangan || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, fdKeterangan: e.target.value.toUpperCase() }))}
                        className="form-input resize-none"
                        placeholder="Remarks info..."
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-primary text-[0.72rem] font-semibold tracking-wide uppercase mb-1">Status</label>
                      <select
                        value={form.fdStatus || '1'}
                        onChange={(e) => setForm(prev => ({ ...prev, fdStatus: e.target.value }))}
                        className="form-input"
                      >
                        <option value="1">Draft</option>
                        <option value="2">Done</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'attachments' && isEdit && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[1.1rem] font-semibold text-primary">Uploaded Attachments</h2>
                <p className="text-secondary text-xs mt-0.5">View, download, or edit files uploaded to this inspection report.</p>
              </div>
              <div className="border-t border-secondary/15 pt-4">
                <InspectionLampiranGrid 
                  reportId={Number(id)} 
                  items={lampiranItems} 
                  onRefresh={fetchLampiran}
                  onDelete={handleDeleteLampiran}
                  canEdit={canSave}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Sticky-ish row */}
        <div className="flex justify-between items-center">
          <div>
            {isEdit && hasPermission(currentUser, 'inspection_reports:delete') && (
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
          </div>
          <div className="flex gap-3.5">
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
        </div>
      </form>
    </div>
  );
}
