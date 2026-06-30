import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import Spinner from '../components/ui/Spinner';
import { User, Lock, FileSpreadsheet } from 'lucide-react';

export default function Register() {
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/register', { nama, username, password });
      toast.success('Registration successful! Please wait for admin approval to sign in.');
      setTimeout(() => navigate('/login'), 1000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral transition-colors duration-200">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Left side hero (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-5/12 bg-surface border-r border-secondary/20 relative overflow-hidden flex-col justify-between p-12">
        {/* Dynamic ambient gradient background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-tertiary/10 via-transparent to-tertiary/5 pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-tertiary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-tertiary/10 blur-3xl" />

        <div className="relative z-10">
          <span className="font-mono text-[0.72rem] tracking-[0.2em] text-tertiary uppercase font-bold">
            Internal Platform
          </span>
          <h1 className="text-[3rem] font-display text-primary tracking-[-0.02em] leading-none mt-6">
            Local Charges
          </h1>
          <p className="text-secondary text-[1.05rem] max-w-sm mt-4 leading-relaxed">
            Create an authorization request. Account activation is subject to supervisor approval.
          </p>
        </div>

        <div className="relative z-10 border-t border-secondary/20 pt-8 mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-tertiary animate-ping" />
            <span className="text-[0.8rem] text-secondary font-medium tracking-wide">
              Waiting Queue Integration Enabled
            </span>
          </div>
          <span className="block text-[0.72rem] text-secondary/60 mt-2 font-mono">
            © {new Date().getFullYear()} Local Charges. All rights reserved.
          </span>
        </div>
      </div>

      {/* Right side form */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 sm:p-12 md:p-16 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="text-left">
            <span className="lg:hidden font-mono text-[0.72rem] tracking-[0.2em] text-tertiary uppercase font-bold">
              Local Charges
            </span>
            <h2 className="text-[2.2rem] font-display text-primary tracking-[-0.015em] leading-tight mt-2 lg:mt-0">
              Create Account
            </h2>
            <p className="text-secondary text-[0.95rem] mt-2">
              Sign up to request dashboard access credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="nama" className="block text-primary text-[0.75rem] tracking-[0.04em] font-semibold uppercase">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
                  <FileSpreadsheet size={18} />
                </div>
                <input
                  id="nama"
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="form-input pl-10"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-primary text-[0.75rem] tracking-[0.04em] font-semibold uppercase">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
                  <User size={18} />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input pl-10"
                  placeholder="Choose a username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-primary text-[0.75rem] tracking-[0.04em] font-semibold uppercase">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-primary text-[0.75rem] tracking-[0.04em] font-semibold uppercase">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
                  <Lock size={18} />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" className="text-on-primary" />
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-[0.9rem] text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="text-tertiary hover:underline font-semibold transition-colors duration-150">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
