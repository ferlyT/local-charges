import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { User as UserIcon, Lock, Save, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { resolveAvatarUrl } from '../lib/constants';
import { useTranslation } from '../hooks/useTranslation';

export default function ProfilePage() {
  const { user, setAuth, token } = useAuthStore();
  const [nama, setNama] = useState(user?.name || '');
  // Store only the relative path internally; resolve to full URL only when rendering
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const res = await api.put('/auth/profile', { nama, avatar: avatar || null });
      setAuth(res.data.user, token!);
      toast.success(t('profile_toast_update_success'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('profile_toast_update_err'));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('profile_err_pass_match'));
      return;
    }
    
    setIsUpdatingPassword(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      toast.success(t('profile_toast_pass_success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('profile_toast_pass_err'));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile_err_file_size'));
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    setIsUploadingAvatar(true);
    const loadingToast = toast.loading(t('profile_toast_upload_loading'));
    try {
      const res = await api.post('/lampiran/avatar', formData);
      // Save only the relative path (e.g. "/api/v1/lampiran/download/avatars/xxx.jpg")
      // resolveAvatarUrl will convert it to the correct full URL at render time
      setAvatar(res.data.url);
      toast.success(t('profile_toast_upload_success'), { id: loadingToast });
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || t('profile_toast_upload_err'), { id: loadingToast });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 pb-4 border-b border-secondary/10">
        <div className="w-12 h-12 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary shadow-inner">
          <UserIcon size={24} />
        </div>
        <div>
          <h1 className="text-[2.2rem] font-display text-primary tracking-[-0.015em] leading-none mb-1">
            {t('profile_title')}
          </h1>
          <p className="text-secondary text-sm">
            {t('profile_subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Info */}
        <div className="bg-surface shadow-md border border-secondary/20 rounded-xl p-6">
          <h2 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
            <UserIcon size={20} className="text-tertiary" /> {t('profile_section_personal')}
          </h2>
          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div className="flex items-center gap-6 mb-6">
              <div 
                className={`relative group cursor-pointer ${isUploadingAvatar ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                title={t('profile_tooltip_avatar')}
              >
                <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral/50 border-4 border-surface shadow-sm group-hover:border-tertiary/30 transition-colors">
                  {avatar ? (
                     <img src={resolveAvatarUrl(avatar) ?? avatar} alt="Avatar" className="w-full h-full object-cover" onError={(e) => { (e.target as any).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(nama || 'User') + '&background=random' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-secondary uppercase bg-tertiary/10">
                      {(nama || 'U')[0]}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 bg-tertiary text-white p-1.5 rounded-full shadow-md group-hover:scale-110 transition-transform">
                  <Camera size={14} />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload} 
                  accept="image/jpeg,image/png,image/jpg" 
                  className="hidden" 
                />
              </div>
              <div className="flex-1">
                <p className="text-xs text-secondary mb-1 uppercase font-semibold tracking-wider">{t('profile_lbl_username')}</p>
                <p className="font-mono text-primary bg-secondary/5 px-3 py-1.5 rounded-md inline-block">@{user?.username}</p>
                <div className="mt-2">
                  <span className="text-[0.7rem] bg-tertiary/10 text-tertiary px-2 py-0.5 rounded-full uppercase font-bold tracking-widest">
                    {t('profile_lbl_role')}: {user?.role}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5">{t('profile_lbl_fullname')}</label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full bg-surface border border-secondary/20 focus:border-tertiary/50 focus:ring-4 focus:ring-tertiary/10 rounded-lg px-4 py-2.5 text-[0.95rem] text-primary outline-none transition-all"
                required
              />
            </div>
            
            {avatar && (
              <div className="flex items-center justify-between gap-3 bg-secondary/5 border border-secondary/15 rounded-lg px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Camera size={15} className="text-tertiary flex-shrink-0" />
                  <span className="text-[0.82rem] text-secondary truncate font-mono">
                    {avatar.startsWith('/api/') ? t('profile_photo_uploaded') : avatar}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAvatar('')}
                  className="text-rose-500 hover:text-rose-600 text-[0.78rem] font-semibold flex-shrink-0 transition-colors"
                >
                  {t('profile_btn_remove_photo')}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="w-full bg-tertiary hover:bg-tertiary/90 text-white font-semibold py-2.5 rounded-lg shadow-md shadow-tertiary/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {isUpdatingProfile ? t('profile_btn_save_saving') : t('profile_btn_save')}
            </button>
          </form>
        </div>

        {/* Password Update */}
        <div className="bg-surface shadow-md border border-secondary/20 rounded-xl p-6">
          <h2 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
            <Lock size={20} className="text-tertiary" /> {t('profile_section_password')}
          </h2>
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5">{t('profile_lbl_curr_pass')}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-surface border border-secondary/20 focus:border-tertiary/50 focus:ring-4 focus:ring-tertiary/10 rounded-lg px-4 py-2.5 text-[0.95rem] text-primary outline-none transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5">{t('profile_lbl_new_pass')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                className="w-full bg-surface border border-secondary/20 focus:border-tertiary/50 focus:ring-4 focus:ring-tertiary/10 rounded-lg px-4 py-2.5 text-[0.95rem] text-primary outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5">{t('profile_lbl_confirm_pass')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                className="w-full bg-surface border border-secondary/20 focus:border-tertiary/50 focus:ring-4 focus:ring-tertiary/10 rounded-lg px-4 py-2.5 text-[0.95rem] text-primary outline-none transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="w-full bg-neutral/50 border border-secondary/20 hover:bg-neutral/80 text-primary font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              <Lock size={18} />
              {isUpdatingPassword ? t('profile_btn_pass_updating') : t('profile_btn_pass_update')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
