import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, Save, ArrowLeft, Clock, User, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../stores/authStore';
import { useTranslation } from '../../../hooks/useTranslation';
import ConfirmModal from '../../../components/ConfirmModal';
import MarkingCodeAutocomplete from '../../../components/MarkingCodeAutocomplete';
import InspectionLampiranGrid from '../../../components/lampiran/InspectionLampiranGrid';
import type { Lampiran } from '../../../components/lampiran/LampiranGrid';
import { hasPermission } from '../../../lib/permissions';
import { inspectionReportsApi, type InspectionReport } from '../../../lib/inspectionReports';
import api from '../../../lib/api';

export default function InspectionReportFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.user);
  const { t } = useTranslation();

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [attToDelete, setAttToDelete] = useState<number | null>(null);

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
      toast.error(t('ir_form_err_no_customer'));
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
        toast.success(t('ir_form_toast_save_ok'));
        setTimeout(() => navigate('/inspection-reports'), 1000);
      } else {
        const res = await inspectionReportsApi.create(payload);
        toast.success(t('ir_form_toast_create_ok'));
        navigate(`/inspection-reports/${res.fdId}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('ir_form_toast_save_err'));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteLampiran = async () => {
    if (attToDelete === null) return;
    try {
      await api.delete(`/lampiran/${attToDelete}`);
      fetchLampiran();
      toast.success(t('ir_form_toast_att_del_ok'));
    } catch (error) {
      toast.error(t('ir_form_toast_att_del_err'));
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
      await inspectionReportsApi.delete(id as string);
      toast.success(t('ir_form_toast_delete_ok'));
      setTimeout(() => navigate('/inspection-reports'), 1000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('ir_form_toast_delete_err'));
      setIsSaving(false);
    }
  };

  const handleDeleteForm = () => {
    setIsDeleteModalOpen(true);
  };

  const canSave = 
    (isEdit && hasPermission(currentUser, 'inspection_reports:edit')) || 
    (!isEdit && hasPermission(currentUser, 'inspection_reports:create'));

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
          <h1 className="text-[2.2rem] font-display text-primary tracking-[-0.015em] leading-none mb-1">
            {isEdit ? t('ir_form_title_edit') : t('ir_form_title_new')}
          </h1>
          <p className="text-secondary text-sm">
            {isEdit ? t('ir_form_subtitle_edit') : t('ir_form_subtitle_new')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Header Information Section Card */}
        <div className="card bg-surface flex flex-col md:flex-row gap-5 justify-between md:items-center">
          <div>
            <h2 className="text-[1rem] font-semibold text-primary">{t('ir_form_meta_title')}</h2>
            <p className="text-secondary text-xs mt-0.5">{t('ir_form_meta_sub')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="bg-neutral px-3.5 py-2 rounded-md border border-secondary/15 flex items-center gap-2 text-[0.88rem] font-medium text-primary">
              <Hash size={14} className="text-secondary" />
              <span className="text-[0.72rem] text-secondary uppercase font-semibold">{t('ir_form_lbl_no')}</span>
              <span className="font-mono">{form.fdReportNumber || t('ir_form_auto_no')}</span>
            </div>
            <div className="bg-neutral px-3.5 py-2 rounded-md border border-secondary/15 flex items-center gap-2 text-[0.88rem] font-medium text-primary">
              <User size={14} className="text-secondary" />
              <span className="text-[0.72rem] text-secondary uppercase font-semibold">{t('ir_form_lbl_author')}</span>
              <span>{form.user?.fdNama || currentUser?.name || 'Unknown'}</span>
            </div>
            {(form.fdCreatedAt || isEdit) && (
              <div className="bg-neutral px-3.5 py-2 rounded-md border border-secondary/15 flex items-center gap-2 text-[0.88rem] font-medium text-primary">
                <Clock size={14} className="text-secondary" />
                <span className="text-[0.72rem] text-secondary uppercase font-semibold">{t('ir_form_lbl_created')}</span>
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
            {t('ir_form_tab_details')}
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
              {t('ir_form_tab_attachments')}
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
                  <h2 className="text-[1.1rem] font-semibold text-primary">{t('ir_form_section_title')}</h2>
                  <p className="text-secondary text-xs mt-0.5">{t('ir_form_section_sub')}</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="p-6 border border-secondary/20 rounded-lg bg-surface shadow-sm space-y-8">
                  {/* IDENTIFICATION SECTION */}
                  <div>
                    <h3 className="text-[0.7rem] font-bold text-secondary tracking-widest uppercase mb-4">{t('ir_form_sec_identification')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-primary text-[0.8rem] font-medium mb-1.5">
                          {t('ir_form_lbl_report_date')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="datetime-local"
                          value={form.fdReportDate}
                          onChange={(e) => setForm(prev => ({ ...prev, fdReportDate: e.target.value }))}
                          className="form-input"
                        />
                      </div>

                      <div>
                        <label className="block text-primary text-[0.8rem] font-medium mb-1.5">
                          {t('ir_form_lbl_marking_code')}
                        </label>
                        <MarkingCodeAutocomplete
                          value={form.fdMarkingCode || ''}
                          onChange={(val) => setForm(prev => ({ 
                            ...prev, 
                            fdMarkingCode: val,
                            fdListCode: '',
                            fdMarkingNo: '',
                            fdNamaCustomer: '',
                            fdTerima: ''
                          }))}
                          onSelect={(data) => {
                            setForm(prev => ({
                              ...prev,
                              fdMarkingCode: data.fdMarkingCode,
                              fdListCode: data.fdListCode,
                              fdMarkingNo: data.fdMarkingNo,
                              fdNamaCustomer: data.fdCustName || '',
                              fdTerima: data.fdTerima || ''
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="border-secondary/20" />

                  {/* CUSTOMER SECTION */}
                  <div>
                    <h3 className="text-[0.7rem] font-bold text-secondary tracking-widest uppercase mb-4">{t('ir_form_sec_customer')}</h3>
                    <div>
                      <label className="block text-primary text-[0.8rem] font-medium mb-1.5">
                        {t('ir_form_lbl_cust_name')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        disabled={!!form.fdListCode}
                        value={form.fdNamaCustomer || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, fdNamaCustomer: e.target.value.toUpperCase() }))}
                        className={`form-input ${form.fdListCode ? 'opacity-70 cursor-not-allowed bg-neutral/50' : ''}`}
                        placeholder={t('ir_form_ph_cust_name')}
                      />
                    </div>
                  </div>

                  <hr className="border-secondary/20" />

                  {/* INSPECTION DETAILS SECTION */}
                  <div>
                    <h3 className="text-[0.7rem] font-bold text-secondary tracking-widest uppercase mb-4">{t('ir_form_sec_insp_details')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div>
                        <label className="block text-primary text-[0.8rem] font-medium mb-1.5">{t('ir_form_lbl_marking_no')}</label>
                        <input
                          type="text"
                          disabled={!!form.fdListCode}
                          value={form.fdMarkingNo || ''}
                          onChange={(e) => setForm(prev => ({ ...prev, fdMarkingNo: e.target.value.toUpperCase() }))}
                          className={`form-input ${form.fdListCode ? 'opacity-70 cursor-not-allowed bg-neutral/50' : ''}`}
                          placeholder={t('ir_form_ph_marking_no')}
                        />
                      </div>

                      <div>
                        <label className="block text-primary text-[0.8rem] font-medium mb-1.5">{t('ir_form_lbl_list_code')}</label>
                        <input
                          type="text"
                          disabled={!!form.fdListCode}
                          value={form.fdListCode || ''}
                          onChange={(e) => setForm(prev => ({ ...prev, fdListCode: e.target.value.toUpperCase() }))}
                          className={`form-input ${form.fdListCode ? 'opacity-70 cursor-not-allowed bg-neutral/50' : ''}`}
                          placeholder={t('ir_form_ph_list_code')}
                        />
                      </div>

                      <div>
                        <label className="block text-primary text-[0.8rem] font-medium mb-1.5">{t('ir_form_lbl_terima')}</label>
                        <input
                          type="text"
                          disabled={!!form.fdListCode}
                          value={form.fdTerima || ''}
                          onChange={(e) => setForm(prev => ({ ...prev, fdTerima: e.target.value.toUpperCase() }))}
                          className={`form-input ${form.fdListCode ? 'opacity-70 cursor-not-allowed bg-neutral/50' : ''}`}
                          placeholder={t('ir_form_ph_terima')}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-primary text-[0.8rem] font-medium mb-1.5">{t('ir_form_lbl_remarks')}</label>
                      <textarea
                        rows={3}
                        value={form.fdKeterangan || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, fdKeterangan: e.target.value.toUpperCase() }))}
                        className="form-input resize-none"
                        placeholder={t('ir_form_ph_remarks')}
                      />
                    </div>
                  </div>

                  <hr className="border-secondary/20" />

                  {/* STATUS SECTION */}
                  <div className="flex items-center justify-between">
                    <label className="block text-primary text-[0.9rem] font-semibold">{t('ir_form_lbl_status')}</label>
                    <div className="flex bg-surface border border-secondary/20 rounded-md p-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, fdStatus: '1' }))}
                        className={`px-5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          form.fdStatus === '1' ? 'bg-black text-white' : 'text-primary hover:bg-neutral'
                        }`}
                      >
                        {t('ir_form_status_draft')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, fdStatus: '2' }))}
                        className={`px-5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          form.fdStatus === '2' ? 'bg-black text-white' : 'text-primary hover:bg-neutral'
                        }`}
                      >
                        {t('ir_form_status_done')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'attachments' && isEdit && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[1.1rem] font-semibold text-primary">{t('ir_form_att_title')}</h2>
                <p className="text-secondary text-xs mt-0.5">{t('ir_form_att_sub')}</p>
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
                <span className="hidden sm:inline">{t('ir_form_btn_delete')}</span>
              </button>
            )}
          </div>
          <div className="flex gap-3.5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary"
            >
              {canSave ? t('ir_form_btn_cancel') : t('ir_form_btn_back')}
            </button>
            {canSave && (
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={16} />
              {isSaving ? t('ir_form_btn_saving') : (isEdit ? t('ir_form_btn_update') : t('ir_form_btn_save'))}
            </button>
          )}
          </div>
        </div>
      </form>

      {/* Custom Confirm Modals */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title={t('ir_form_btn_delete')}
        message={t('ir_form_confirm_delete')}
        confirmText={t('ir_form_btn_delete')}
        cancelText={t('ir_form_btn_cancel')}
        onConfirm={confirmDeleteForm}
        onCancel={() => setIsDeleteModalOpen(false)}
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={attToDelete !== null}
        title={t('ir_form_btn_delete')}
        message={t('ir_form_confirm_att_del')}
        confirmText={t('ir_form_btn_delete')}
        cancelText={t('ir_form_btn_cancel')}
        onConfirm={confirmDeleteLampiran}
        onCancel={() => setAttToDelete(null)}
        isDestructive={true}
      />
    </div>
  );
}

