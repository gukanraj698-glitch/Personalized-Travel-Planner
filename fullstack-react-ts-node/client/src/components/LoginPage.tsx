import React, { useState } from 'react';
import { Lock, Mail, User, Phone, Sparkles, Shield, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchFromAPI } from '../services/api.ts';

interface LoginPageProps {
  onSuccess: (user: any, token: string) => void;
  onClose?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onClose }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemoFill = (role: 'admin' | 'traveller') => {
    setError(null);
    setIsRegister(false);
    if (role === 'admin') {
      setEmail('admin@wanderly.com');
      setPassword('admin123');
    } else {
      setEmail('traveller@wanderly.com');
      setPassword('password123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const data = await fetchFromAPI('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            full_name: fullName,
            phone
          })
        });
        localStorage.setItem('wanderly_token', data.token);
        localStorage.setItem('wanderly_user', JSON.stringify(data.user));
        onSuccess(data.user, data.token);
      } else {
        const data = await fetchFromAPI('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        localStorage.setItem('wanderly_token', data.token);
        localStorage.setItem('wanderly_user', JSON.stringify(data.user));
        onSuccess(data.user, data.token);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl z-10">
        
        {/* LEFT COLUMN: HERO SHOWCASE */}
        <div className="md:col-span-5 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-8 flex flex-col justify-between border-r border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
                ✦
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white">
                WANDERLY <span className="text-emerald-400">ENTERPRISE</span>
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Next-Gen Travel OS
            </span>

            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-3">
              Your personalized journey begins here.
            </h2>
            <p className="text-slate-300 text-xs leading-relaxed mb-6">
              Access smart itinerary matching, verified boutique stays, regional dining guides, and GPS turn-by-turn route navigation.
            </p>

            {/* Feature Checkpoints */}
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><b>AI Preference Matcher:</b> 0-100% destination compatibility</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><b>PostgreSQL Verified:</b> 23 sights & 17 dining venues</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><b>Privilege Club:</b> Earn 5% points on every reservation</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" /> 256-Bit Encrypted JWT
            </span>
            <span>v3.0 Production</span>
          </div>
        </div>

        {/* RIGHT COLUMN: LOGIN / REGISTER FORM */}
        <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  {isRegister ? 'Create an Account' : 'Welcome Back'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isRegister
                    ? 'Enter your details to register as a Wanderly Club Member'
                    : 'Sign in to access your saved itineraries and bookings'}
                </p>
              </div>
              {onClose && (
                <button onClick={onClose} className="text-slate-400 hover:text-white text-lg p-1">
                  ✕
                </button>
              )}
            </div>

            {/* Error Notification */}
            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Aryan Sharma"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-slate-800/60 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Mobile Phone (Optional)</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-800/60 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@wanderly.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  {!isRegister && (
                    <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Demo password reset link dispatched.'); }} className="text-[11px] text-emerald-400 hover:underline">
                      Forgot Password?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 text-white rounded-xl pl-10 pr-10 py-2.5 text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition duration-200 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : isRegister ? 'Complete Registration ✦' : 'Sign In to Account →'}
              </button>
            </form>

            {/* Quick 1-Click Demo Accounts */}
            <div className="mt-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                ⚡ 1-Click Demo Auto-Fill
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoFill('traveller')}
                  className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/80 p-2.5 rounded-xl text-left transition text-xs group"
                >
                  <b className="text-white block group-hover:text-emerald-300">🎒 Traveller Demo</b>
                  <small className="text-slate-400 text-[10px]">traveller@wanderly.com</small>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoFill('admin')}
                  className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/80 p-2.5 rounded-xl text-left transition text-xs group"
                >
                  <b className="text-white block group-hover:text-emerald-300">⚡ Admin Console</b>
                  <small className="text-slate-400 text-[10px]">admin@wanderly.com</small>
                </button>
              </div>
            </div>
          </div>

          {/* Toggle Login / Register Switch */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
            {isRegister ? (
              <span>
                Already have an account?{' '}
                <button onClick={() => { setIsRegister(false); setError(null); }} className="text-emerald-400 font-bold hover:underline">
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Don't have a Wanderly account yet?{' '}
                <button onClick={() => { setIsRegister(true); setError(null); }} className="text-emerald-400 font-bold hover:underline">
                  Sign Up Free
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
