import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, ArrowRight,Copy,Download } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export const LoginPage: React.FC = () => {
  const { currentUser, isAuthenticated, login,pendingTwoFactor,verifyTwoFactor,recoverTwoFactor,beginRequiredTwoFactorSetup,confirmRequiredTwoFactorSetup,finishRequiredTwoFactorSetup,cancelTwoFactorChallenge } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [twoFactorCode,setTwoFactorCode]=useState('');
  const [useRecovery,setUseRecovery]=useState(false);
  const [trustDevice,setTrustDevice]=useState(false);
  const [setup,setSetup]=useState<{manualKey:string;qrCodeDataUrl:string}|null>(null);
  const [recoveryCodes,setRecoveryCodes]=useState<string[]|null>(null);
  const [codesSaved,setCodesSaved]=useState(false);
  const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard';

  useEffect(()=>{if(pendingTwoFactor?.mode!=='setup'||setup||recoveryCodes)return;setLoading(true);beginRequiredTwoFactorSetup().then(setSetup).catch(e=>setError(e instanceof Error?e.message:'Configuration impossible')).finally(()=>setLoading(false))},[pendingTwoFactor?.challengeToken,pendingTwoFactor?.mode,setup,recoveryCodes,beginRequiredTwoFactorSetup]);

  if (isAuthenticated && currentUser) {
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true);
      const result = await login(email, password);
      if (result.success) navigate(destination, { replace: true });
      else if(!result.next)setError(result.message || 'Impossible de vous connecter.');
      setLoading(false);
  };
  const verifySecondFactor=async(event:React.FormEvent)=>{event.preventDefault();setError('');setLoading(true);const result=useRecovery?await recoverTwoFactor(twoFactorCode):await verifyTwoFactor(twoFactorCode,trustDevice,'Ce navigateur');if(result.success)navigate(destination,{replace:true});else setError(result.message??'Vérification impossible.');setLoading(false)};
  const confirmSetup=async(event:React.FormEvent)=>{event.preventDefault();setError('');setLoading(true);const result=await confirmRequiredTwoFactorSetup(twoFactorCode,trustDevice,'Ce navigateur');if(result.success)setRecoveryCodes(result.recoveryCodes??[]);else setError(result.message??'Activation impossible.');setLoading(false)};
  const downloadCodes=()=>{if(!recoveryCodes)return;const blob=new Blob([`Codes de récupération ERP LCA\n\n${recoveryCodes.join('\n')}\n`],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='codes-recuperation-erp-lca.txt';link.click();URL.revokeObjectURL(url)};

  return (
    <div className="min-h-screen bg-[#f5f4f2] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-2 ">
      <div className="w-full max-w-5xl bg-white rounded-md shadow-[0_24px_70px_rgba(15,15,16,.16)] border border-[#d5d1cc] overflow-hidden grid lg:grid-cols-[1.05fr_.95fr] relative">
        <div className="hidden lg:flex bg-[#ffffff] border-r-8 border-red-800 text-white p-12 flex-col justify-between min-h-[620px] relative overflow-hidden after:absolute after:-right-32 after:-bottom-32 after:w-80 after:h-80 after:border-[70px] after:border-[#8f1722]/15 after:rounded-full">
          <div>
            <div className="flex items-center gap-2"><div className="w-[60%] p-5"><img alt='LCA Logo' src='/images/logo-lca2.png'/></div><div></div></div>
            <div className="mt-10 max-w-md">
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#000000]">Espace professionnel</p>
              <h1 className="mt-4 text-[42px] font-bold leading-[1.08] tracking-[-.035em] text-black">La performance automobile, pilotée avec précision.</h1>
              <p className="mt-6 text-sm leading-6 text-zinc-400 max-w-sm">Une vision opérationnelle unique des ventes, du parc, de l'atelier et de la relation client.</p>
            </div>
          </div>
          
        </div>

        <div className="p-7 sm:p-10 lg:p-14 flex items-center bg-white">
          <div className="w-full max-w-md mx-auto">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="font-black tracking-[.15em]"><div className="w-[50%] p-2 "><img alt='LCA Logo' src='/images/logo-lca2.png'/></div></div>
            </div>
            <div className="mb-8"><div className="w-8 h-0.5 bg-[#8f1722] mb-4"/><h2 className="text-[28px] font-bold text-[#111113] tracking-[-.025em]">{recoveryCodes?'Codes de récupération':pendingTwoFactor?.mode==='setup'?'Configurer la double authentification':pendingTwoFactor?.mode==='verify'?'Vérification de sécurité':'Connexion'}</h2><p className="mt-1.5 text-sm text-zinc-500">{pendingTwoFactor?'Finalisez la protection de votre session.':'Accédez à votre environnement de travail.'}</p></div>

            {!pendingTwoFactor&&!recoveryCodes&&<form onSubmit={handleSubmit} className="space-y-5">
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
            </form>}
            {pendingTwoFactor?.mode==='verify'&&<form onSubmit={verifySecondFactor} className="space-y-5"><div className="rounded-md border bg-slate-50 p-3 text-xs text-slate-600"><ShieldCheck className="mb-2 h-5 w-5 text-[#8f1722]"/>Saisissez le code de votre application d’authentification. Aucun jeton métier n’est délivré avant cette vérification.</div><label className="block text-xs font-bold text-slate-700">{useRecovery?'Code de récupération':'Code à six chiffres'}<input autoFocus autoComplete="one-time-code" inputMode={useRecovery?'text':'numeric'} pattern={useRecovery?undefined:'[0-9]{6}'} maxLength={useRecovery?24:6} value={twoFactorCode} onChange={e=>setTwoFactorCode(e.target.value)} required className="mt-1.5 w-full h-12 rounded-sm border border-[#cbc7c2] px-3 text-center font-mono text-lg tracking-[.25em] outline-none focus:border-[#8f1722]"/></label>{pendingTwoFactor.trustedDeviceAvailable&&!useRecovery&&<label className="flex items-start gap-2 rounded border p-3 text-xs"><input type="checkbox" className="mt-0.5" checked={trustDevice} onChange={e=>setTrustDevice(e.target.checked)}/><span><b>Faire confiance à cet appareil</b><small className="mt-1 block text-slate-500">L’appareil pourra être reconnu pendant {pendingTwoFactor.trustedDeviceDurationDays} jour(s). Votre mot de passe restera nécessaire.</small></span></label>}{error&&<div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}<button disabled={loading} className="w-full h-12 rounded-sm bg-[#8f1722] text-white text-sm font-bold disabled:opacity-60">{loading?'Vérification…':'Vérifier et se connecter'}</button><button type="button" className="w-full text-xs font-semibold text-[#8f1722]" onClick={()=>{setUseRecovery(x=>!x);setTrustDevice(false);setTwoFactorCode('');setError('')}}>{useRecovery?'Utiliser l’application d’authentification':'Utiliser un code de récupération'}</button><button type="button" className="w-full text-xs text-slate-500" onClick={()=>{cancelTwoFactorChallenge();setTrustDevice(false);setError('');setTwoFactorCode('')}}>Retour à la connexion</button></form>}
            {pendingTwoFactor?.mode==='setup'&&!recoveryCodes&&<form onSubmit={confirmSetup} className="space-y-4">{setup?<><p className="text-xs text-slate-600">Scannez ce QR code avec Google Authenticator, Microsoft Authenticator, Authy ou une application TOTP compatible.</p><img src={setup.qrCodeDataUrl} alt="QR code de configuration 2FA" className="mx-auto h-52 w-52 rounded border"/><div className="rounded bg-slate-50 p-3 text-xs"><span className="text-slate-500">Clé de saisie manuelle</span><code className="mt-1 block break-all font-bold">{setup.manualKey}</code></div><label className="block text-xs font-bold">Premier code TOTP<input autoFocus autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={twoFactorCode} onChange={e=>setTwoFactorCode(e.target.value)} required className="mt-1.5 w-full h-12 rounded-sm border px-3 text-center font-mono text-lg tracking-[.25em]"/></label>{pendingTwoFactor.trustedDeviceAvailable&&<label className="flex items-start gap-2 rounded border p-3 text-xs"><input type="checkbox" className="mt-0.5" checked={trustDevice} onChange={e=>setTrustDevice(e.target.checked)}/><span><b>Faire confiance à cet appareil</b><small className="mt-1 block text-slate-500">L’appareil pourra être reconnu pendant {pendingTwoFactor.trustedDeviceDurationDays} jour(s). Votre mot de passe restera nécessaire.</small></span></label>}</>:<p className="animate-pulse text-sm text-slate-500">Préparation sécurisée…</p>}{error&&<div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}<button disabled={loading||!setup} className="w-full h-12 rounded-sm bg-[#8f1722] text-white text-sm font-bold disabled:opacity-60">{loading?'Activation…':'Activer et continuer'}</button></form>}
            {recoveryCodes&&<div className="space-y-4"><div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Ces codes ne seront affichés qu’une seule fois. Conservez-les hors de l’ERP.</div><div className="grid grid-cols-2 gap-2 rounded border bg-slate-50 p-3 font-mono text-xs">{recoveryCodes.map(value=><code key={value}>{value}</code>)}</div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>void navigator.clipboard.writeText(recoveryCodes.join('\n'))} className="flex h-10 items-center justify-center gap-2 rounded border text-xs font-bold"><Copy className="h-4 w-4"/>Copier</button><button type="button" onClick={downloadCodes} className="flex h-10 items-center justify-center gap-2 rounded border text-xs font-bold"><Download className="h-4 w-4"/>Télécharger</button></div><label className="flex gap-2 text-xs"><input type="checkbox" checked={codesSaved} onChange={e=>setCodesSaved(e.target.checked)}/>Je confirme avoir conservé ces codes dans un emplacement sûr.</label><button disabled={!codesSaved} onClick={()=>{finishRequiredTwoFactorSetup();navigate(destination,{replace:true})}} className="w-full h-12 rounded-sm bg-[#8f1722] text-white text-sm font-bold disabled:opacity-50">Accéder à l’ERP</button></div>}
            {/* <p className="mt-8 text-[10px] leading-4 text-zinc-400 text-center uppercase tracking-[.08em]">Authentification sécurisée · LCA ERP</p> */}
          </div>
        </div>
      </div>
    </div>
  );
};
