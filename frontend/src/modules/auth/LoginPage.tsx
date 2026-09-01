import React, { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, ArrowRight } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export const LoginPage: React.FC = () => {
  const { currentUser, isAuthenticated, login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard';

  if (isAuthenticated && currentUser) {
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true);
      const result = await login(email, password);
      if (result.success) navigate(destination, { replace: true });
      else setError(result.message || 'Impossible de vous connecter.');
      setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f4f2] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-[#8f1722]">
      <div className="w-full max-w-5xl bg-white rounded-md shadow-[0_24px_70px_rgba(15,15,16,.16)] border border-[#d5d1cc] overflow-hidden grid lg:grid-cols-[1.05fr_.95fr] relative">
        <div className="hidden lg:flex bg-[#0b0b0c] text-white p-12 flex-col justify-between min-h-[620px] relative overflow-hidden after:absolute after:-right-32 after:-bottom-32 after:w-80 after:h-80 after:border-[70px] after:border-[#8f1722]/15 after:rounded-full">
          <div>
            <div className="flex items-center gap-4"><div className="w-11 h-11 border border-[#a51d2a] flex items-center justify-center font-black tracking-[-.08em]">LC</div><div><div className="text-2xl font-black tracking-[.16em] leading-none">LCA</div><div className="mt-1.5 text-[9px] uppercase tracking-[.25em] text-zinc-500">La Congolaise de l'Automobile</div></div></div>
            <div className="mt-20 max-w-md">
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#d2767e]">Espace professionnel</p>
              <h1 className="mt-4 text-[42px] font-bold leading-[1.08] tracking-[-.035em]">La performance automobile, pilotée avec précision.</h1>
              <p className="mt-6 text-sm leading-6 text-zinc-400 max-w-sm">Une vision opérationnelle unique des ventes, du parc, de l'atelier et de la relation client.</p>
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-2 text-xs text-zinc-500"><ShieldCheck className="w-4 h-4 text-[#b83c47]" /> Accès sécurisé par profil utilisateur</div>
        </div>

        <div className="p-7 sm:p-10 lg:p-14 flex items-center bg-white">
          <div className="w-full max-w-md mx-auto">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-[#0b0b0c] text-white flex items-center justify-center font-black">LC</div><div className="font-black tracking-[.15em]">LCA</div>
            </div>
            <div className="mb-8"><div className="w-8 h-0.5 bg-[#8f1722] mb-4"/><h2 className="text-[28px] font-bold text-[#111113] tracking-[-.025em]">Connexion</h2><p className="mt-1.5 text-sm text-zinc-500">Accédez à votre environnement de travail.</p></div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Adresse e-mail</label>
                <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nom@concession.fr" autoComplete="username" required className="w-full h-12 pl-10 pr-3 rounded-sm border border-[#cbc7c2] text-sm outline-none focus:ring-2 focus:ring-[#8f1722]/15 focus:border-[#8f1722]" /></div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Mot de passe</label>
                <div className="relative"><LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Votre mot de passe" autoComplete="current-password" required className="w-full h-12 pl-10 pr-10 rounded-sm border border-[#cbc7c2] text-sm outline-none focus:ring-2 focus:ring-[#8f1722]/15 focus:border-[#8f1722]" /><button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-800" aria-label="Afficher le mot de passe">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
              </div>
              {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">{error}</div>}
              <button disabled={loading} className="w-full h-12 rounded-sm bg-[#8f1722] hover:bg-[#6f1019] disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors">{loading ? 'Connexion...' : 'Se connecter'} {!loading && <ArrowRight className="w-4 h-4" />}</button>
            </form>
            <p className="mt-8 text-[10px] leading-4 text-zinc-400 text-center uppercase tracking-[.08em]">Authentification sécurisée · LCA ERP</p>
          </div>
        </div>
      </div>
    </div>
  );
};
