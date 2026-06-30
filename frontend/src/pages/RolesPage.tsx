import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Navigate } from 'react-router-dom';
import { hasPermission } from '../lib/permissions';

interface RoleType {
  fdId: number;
  fdNama: string;
  fdDeskripsi: string;
  permissions: string[];
  userCount: number;
}

const PERMISSION_GROUPS = [
  {
    group: 'Local Charges',
    permissions: [
      { id: 'local_charges:read', label: 'View Local Charges' },
      { id: 'local_charges:create', label: 'Create Local Charges' },
      { id: 'local_charges:edit', label: 'Edit Local Charges' },
      { id: 'local_charges:delete', label: 'Delete Local Charges' },
    ]
  },
  {
    group: 'Inspection Reports',
    permissions: [
      { id: 'inspection_reports:read', label: 'View Inspection Reports' },
      { id: 'inspection_reports:create', label: 'Create Inspection Reports' },
      { id: 'inspection_reports:edit', label: 'Edit Inspection Reports' },
      { id: 'inspection_reports:delete', label: 'Delete Inspection Reports' },
    ]
  },
  {
    group: 'System & Administration',
    permissions: [
      { id: 'users:manage', label: 'Manage Users' },
      { id: 'roles:manage', label: 'Manage Roles' },
    ]
  }
];

export default function RolesPage() {
  const currentUser = useAuthStore(state => state.user);
  const queryClient = useQueryClient();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleType | null>(null);
  
  const [formData, setFormData] = useState({
    fdNama: '',
    fdDeskripsi: '',
    permissions: [] as string[]
  });

  if (!hasPermission(currentUser, 'roles:manage')) {
    return <Navigate to="/" replace />;
  }

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get('/roles');
      return res.data.data as RoleType[];
    }
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await api.post('/roles', data);
    },
    onSuccess: () => {
      toast.success('Role created successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create role');
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: number }) => {
      await api.put(`/roles/${data.id}`, data);
    },
    onSuccess: () => {
      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      toast.success('Role deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete role');
    }
  });

  const openModal = (role?: RoleType) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        fdNama: role.fdNama,
        fdDeskripsi: role.fdDeskripsi || '',
        permissions: role.permissions
      });
    } else {
      setEditingRole(null);
      setFormData({ fdNama: '', fdDeskripsi: '', permissions: [] });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => {
      const isSelected = prev.permissions.includes(permissionId);
      return {
        ...prev,
        permissions: isSelected 
          ? prev.permissions.filter(p => p !== permissionId)
          : [...prev.permissions, permissionId]
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole) {
      updateRoleMutation.mutate({ ...formData, id: editingRole.fdId });
    } else {
      createRoleMutation.mutate(formData);
    }
  };

  const handleDelete = (role: RoleType) => {
    if (window.confirm(`Are you sure you want to delete the role "${role.fdNama}"?`)) {
      deleteRoleMutation.mutate(role.fdId);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-secondary">Loading roles...</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-4 border-b border-secondary/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary shadow-inner">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-[2.2rem] font-display text-primary tracking-[-0.015em] leading-none mb-1">
              Roles & Permissions
            </h1>
            <p className="text-secondary text-sm">
              Manage system roles and their access levels.
            </p>
          </div>
        </div>

        <button
          onClick={() => openModal()}
          className="bg-tertiary hover:bg-tertiary/90 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md shadow-tertiary/20 flex items-center gap-2 transition-all active:scale-[0.98]"
        >
          <Plus size={18} /> New Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles?.map((role) => (
          <div key={role.fdId} className="bg-surface border border-secondary/20 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Shield size={16} className="text-tertiary" /> {role.fdNama}
                </h3>
                <p className="text-sm text-secondary mt-1 min-h-[2.5rem]">{role.fdDeskripsi || 'No description'}</p>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => openModal(role)}
                  className="p-1.5 text-secondary hover:text-tertiary hover:bg-tertiary/10 rounded-md transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                {role.fdNama !== 'admin' && role.fdNama !== 'user' && (
                  <button 
                    onClick={() => handleDelete(role)}
                    disabled={role.userCount > 0}
                    className="p-1.5 text-secondary hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={role.userCount > 0 ? "Cannot delete role with assigned users" : "Delete role"}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="mt-5 flex-1">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3 border-b border-secondary/10 pb-1.5">
                Permissions
              </p>
              <div className="flex flex-wrap gap-2">
                {role.permissions.map(p => (
                  <span key={p} className="text-[0.7rem] font-medium bg-secondary/10 text-primary px-2.5 py-1 rounded-full border border-secondary/20 hover:bg-secondary/20 transition-colors cursor-default">
                    {p}
                  </span>
                ))}
                {role.permissions.length === 0 && (
                  <span className="text-xs text-secondary italic py-1">No permissions</span>
                )}
              </div>
            </div>
            
            <div className="mt-5 pt-3 border-t border-secondary/10 flex justify-between items-center text-sm">
              <span className="text-secondary">Assigned Users</span>
              <span className="font-bold text-primary bg-secondary/10 px-2 py-0.5 rounded-md">
                {role.userCount}
              </span>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-xl border border-secondary/20 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-secondary/10">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h2>
              <button onClick={closeModal} className="text-secondary hover:text-primary transition-colors p-1 rounded-md hover:bg-secondary/10">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto">
              <form id="roleForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-secondary mb-1.5">Role Name</label>
                  <input
                    type="text"
                    value={formData.fdNama}
                    onChange={(e) => setFormData({...formData, fdNama: e.target.value.toLowerCase()})}
                    disabled={editingRole?.fdNama === 'admin'}
                    className="w-full bg-surface border border-secondary/20 focus:border-tertiary/50 focus:ring-4 focus:ring-tertiary/10 rounded-lg px-4 py-2.5 text-[0.95rem] text-primary outline-none transition-all disabled:opacity-60"
                    required
                    pattern="^[a-z0-9_-]+$"
                    title="Only lowercase letters, numbers, underscores, and hyphens"
                  />
                  {editingRole?.fdNama === 'admin' && (
                    <p className="text-xs text-rose-500 mt-1">Core admin role name cannot be changed.</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-secondary mb-1.5">Description (Optional)</label>
                  <input
                    type="text"
                    value={formData.fdDeskripsi}
                    onChange={(e) => setFormData({...formData, fdDeskripsi: e.target.value})}
                    className="w-full bg-surface border border-secondary/20 focus:border-tertiary/50 focus:ring-4 focus:ring-tertiary/10 rounded-lg px-4 py-2.5 text-[0.95rem] text-primary outline-none transition-all"
                  />
                </div>
                
                <div className="pt-3">
                  <label className="block text-sm font-semibold text-secondary mb-3">Permissions</label>
                  <div className="space-y-4">
                    {PERMISSION_GROUPS.map((group, idx) => (
                      <div key={idx} className="border border-secondary/20 rounded-lg overflow-hidden bg-surface">
                        <div className="bg-neutral/50 px-4 py-2 border-b border-secondary/10">
                          <h4 className="text-xs font-bold text-primary uppercase tracking-wider">{group.group}</h4>
                        </div>
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.permissions.map(perm => (
                            <label key={perm.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/5 cursor-pointer transition-colors border border-transparent hover:border-secondary/20">
                              <input
                                type="checkbox"
                                checked={formData.permissions.includes(perm.id)}
                                onChange={() => handlePermissionToggle(perm.id)}
                                disabled={editingRole?.fdNama === 'admin'}
                                className="w-4 h-4 text-tertiary rounded border-secondary/30 focus:ring-tertiary/30 cursor-pointer"
                              />
                              <span className="text-sm text-primary font-medium">{perm.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {editingRole?.fdNama === 'admin' && (
                    <p className="text-xs text-secondary mt-2 italic bg-secondary/10 p-2 rounded-md">Admin role implicitly has all permissions. These checkboxes are for display only.</p>
                  )}
                </div>
              </form>
            </div>
            
            <div className="p-5 border-t border-secondary/10 bg-neutral/30 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2.5 text-sm font-semibold text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="roleForm"
                disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                className="bg-tertiary hover:bg-tertiary/90 text-white text-sm font-semibold py-2.5 px-6 rounded-lg shadow-md shadow-tertiary/20 flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
              >
                <Save size={16} />
                {editingRole ? 'Save Changes' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
