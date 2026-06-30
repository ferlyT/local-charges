import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import ThemeToggle from '../components/ThemeToggle';
import Spinner from '../components/ui/Spinner';
import { Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', { username, password });
      const { user, token } = response.data;
      setAuth(user, token);
      // Use replace:true so the login page is removed from history,
      // and window.location ensures the base path is respected in production.
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
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
            WorkHub
          </h1>
          <p className="text-secondary text-[1.05rem] max-w-sm mt-4 leading-relaxed">
            Manage, verify, and track domestic operational fees and attachments with speed and clarity.
          </p>
        </div>

        <div className="relative z-10 border-t border-secondary/20 pt-8 mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-tertiary animate-ping" />
            <span className="text-[0.8rem] text-secondary font-medium tracking-wide">
              Secure System Authorization Enabled
            </span>
          </div>
          <span className="block text-[0.72rem] text-secondary/60 mt-2 font-mono">
            © {new Date().getFullYear()} WorkHub. All rights reserved.
          </span>
        </div>
      </div>

      {/* Right side form */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 sm:p-12 md:p-16 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="text-left">
            <span className="lg:hidden font-mono text-[0.72rem] tracking-[0.2em] text-tertiary uppercase font-bold">
              WorkHub
            </span>
            <h2 className="text-[2.2rem] font-display text-primary tracking-[-0.015em] leading-tight mt-2 lg:mt-0">
              Sign In
            </h2>
            <p className="text-secondary text-[0.95rem] mt-2">
              Enter your credentials to access your dashboard.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-4 text-[0.95rem] text-rose-600 dark:text-rose-400 flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  placeholder="Enter your username"
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
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-primary transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" className="text-on-primary" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-[0.9rem] text-secondary">
              Don't have an account?{' '}
              <Link to="/register" className="text-tertiary hover:underline font-semibold transition-colors duration-150">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

