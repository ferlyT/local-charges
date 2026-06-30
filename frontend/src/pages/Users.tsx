import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users as UsersIcon, CheckSquare, AlertTriangle, Shield, User, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Navigate } from 'react-router-dom';
import { hasPermission } from '../lib/permissions';
import { useTranslation } from '../hooks/useTranslation';

interface UserType {
  fdId: number;
  fdNama: string;
  fdUsername: string;
  fdRole: string;
  fdAktif: boolean;
  fdCreatedAt: string;
}

interface RoleType {
  fdId: number;
  fdNama: string;
}

export default function Users() {
  const currentUser = useAuthStore(state => state.user);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState('');
  const { t, language } = useTranslation();

  if (!hasPermission(currentUser, 'users:manage')) {
    return <Navigate to="/" replace />;
  }

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data.data as UserType[];
    }
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get('/roles');
      return res.data.data as RoleType[];
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, fdAktif }: { id: number, fdAktif: boolean }) => {
      await api.put(`/users/${id}/status`, { fdAktif });
    },
    onSuccess: () => {
      toast.success(t('users_toast_status_success'));
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || t('users_toast_status_err'));
    }
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ id, fdRoleId }: { id: number, fdRoleId: number }) => {
      await api.put(`/users/${id}/role`, { fdRoleId });
    },
    onSuccess: () => {
      toast.success(t('users_toast_role_success'));
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || t('users_toast_role_err'));
    }
  });

  const filteredUsers = users?.filter(user =>
    user.fdNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.fdUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.fdRole.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleStatus = (user: UserType) => {
    if (user.fdId === currentUser?.id) {
      toast.error(t('users_err_self_deactivate'));
      return;
    }
    toggleStatusMutation.mutate({ id: user.fdId, fdAktif: !user.fdAktif });
  };

  const handleChangeRole = (user: UserType, roleId: number) => {
    if (user.fdId === currentUser?.id) {
      toast.error(t('users_err_self_role'));
      return;
    }
    changeRoleMutation.mutate({ id: user.fdId, fdRoleId: roleId });
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-pulse">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 skeleton rounded-xl" />
          <div className="space-y-2">
            <div className="h-6 w-48 skeleton" />
            <div className="h-4 w-64 skeleton" />
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-secondary/20 overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="h-10 w-full skeleton" />
            <div className="h-10 w-full skeleton" />
            <div className="h-10 w-full skeleton" />
            <div className="h-10 w-full skeleton" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header section with theme tokens */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-4 border-b border-secondary/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary shadow-inner">
            <UsersIcon size={24} />
          </div>
          <div>
            <h1 className="text-[2.2rem] font-display text-primary tracking-[-0.015em] leading-none mb-1">
              {t('users_title')}
            </h1>
            <p className="text-secondary text-sm">
              {t('users_subtitle')}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={16} className="text-secondary/60" />
          </div>
          <input
            type="text"
            placeholder={t('users_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-secondary/20 focus:border-tertiary/50 focus:ring-4 focus:ring-tertiary/10 rounded-xl pl-10 pr-4 py-2.5 text-[0.95rem] text-primary placeholder:text-secondary/50 outline-none transition-all duration-200"
          />
        </div>
      </div>

      {/* Modern Table Card */}
      <div className="bg-surface shadow-md border border-secondary/20 rounded-lg overflow-hidden transition-all duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral/50 border-b border-secondary/20 text-xs font-semibold text-secondary uppercase tracking-wider">
                <th className="px-6 py-4">{t('col_name')}</th>
                <th className="px-6 py-4">{t('col_username')}</th>
                <th className="px-6 py-4">{t('col_role')}</th>
                <th className="px-6 py-4">{t('col_joined')}</th>
                <th className="px-6 py-4 text-center">{t('col_status')}</th>
                <th className="px-6 py-4 text-right">{t('col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary/15">
              {filteredUsers?.map((user) => (
                <tr key={user.fdId} className="hover:bg-neutral/40 transition-colors duration-150">
                  <td className="px-6 py-4 font-medium text-primary flex items-center gap-2">
                    <span className="text-primary font-semibold">{user.fdNama}</span>
                    {user.fdId === currentUser?.id && (
                      <span className="bg-tertiary/10 text-tertiary px-2 py-0.5 rounded-full text-[0.72rem] font-bold tracking-wide font-mono uppercase">
                        {t('users_badge_you')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[0.95rem] text-secondary font-mono">{user.fdUsername}</td>
                  <td className="px-6 py-4">
                    <select
                      value={roles?.find(r => r.fdNama === user.fdRole)?.fdId || ''}
                      onChange={(e) => handleChangeRole(user, parseInt(e.target.value))}
                      disabled={user.fdId === currentUser?.id || changeRoleMutation.isPending}
                      className="bg-surface border border-secondary/20 text-secondary text-sm rounded-lg focus:ring-tertiary/50 focus:border-tertiary/50 block w-full p-1.5 outline-none cursor-pointer disabled:opacity-50"
                    >
                      {roles?.map(role => (
                        <option key={role.fdId} value={role.fdId}>{role.fdNama}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-[0.9rem] text-secondary">
                    {new Date(user.fdCreatedAt).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {user.fdAktif ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        <CheckSquare size={13} /> {t('users_status_active')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                        <AlertTriangle size={13} /> {t('users_status_inactive')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggleStatus(user)}
                      disabled={user.fdId === currentUser?.id || toggleStatusMutation.isPending}
                      className={`text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-md transition-all duration-150 border active:scale-[0.97] ${
                        user.fdAktif 
                          ? 'text-rose-600 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 dark:text-rose-400' 
                          : 'text-emerald-600 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 dark:text-emerald-400'
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      {user.fdAktif ? t('users_btn_deactivate') : t('users_btn_activate')}
                    </button>
                  </td>
                </tr>
              ))}
              
              {filteredUsers?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-secondary">
                    {searchQuery ? t('users_empty_search', { query: searchQuery }) : t('users_empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

