import{useState}from'react';
import{useTwoFactorActions}from'../../api/twoFactorHooks';
import{Button}from'../../components/ui/Button';
import{Modal}from'../../components/ui/Modal';
import{ApiError}from'../../services/apiClient';

const field='mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm';
export const isStrongAuthenticationRequired=(error:unknown)=>error instanceof ApiError&&error.status===401&&(error.details as{code?:unknown}|undefined)?.code==='STRONG_AUTH_REQUIRED';

export function StrongAuthenticationModal({open,onClose,onConfirmed}:{open:boolean;onClose:()=>void;onConfirmed:()=>void}){
 const actions=useTwoFactorActions(),[password,setPassword]=useState(''),[totp,setTotp]=useState(''),[error,setError]=useState('');
 const close=()=>{if(actions.stepUp.isPending)return;setPassword('');setTotp('');setError('');onClose()};
 const submit=async(event:React.FormEvent)=>{event.preventDefault();if(actions.stepUp.isPending)return;setError('');try{await actions.stepUp.mutateAsync({currentPassword:password,totpCode:totp||undefined});setPassword('');setTotp('');onConfirmed()}catch(reason){setError(reason instanceof Error?reason.message:'Vérification impossible.')}};
 return <Modal isOpen={open} onClose={close} title="Confirmer votre identité" description="Cette opération sensible exige une authentification renforcée récente."><form className="space-y-4" onSubmit={submit}><p className="text-xs text-slate-600">Saisissez votre mot de passe. Si votre compte utilise la double authentification, saisissez également un nouveau code TOTP. L’opération initiale ne sera pas relancée automatiquement.</p><label className="block text-xs font-semibold">Mot de passe actuel<input autoFocus autoComplete="current-password" type="password" required className={field} value={password} onChange={event=>setPassword(event.target.value)}/></label><label className="block text-xs font-semibold">Code TOTP si activé<input aria-label="Code TOTP de réauthentification" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className={field} value={totp} onChange={event=>setTotp(event.target.value.replace(/\D/g,''))}/></label>{error&&<p role="alert" className="rounded-md bg-red-50 p-3 text-xs text-red-700">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={actions.stepUp.isPending} onClick={close}>Annuler</Button><Button type="submit" loading={actions.stepUp.isPending} disabled={!password||Boolean(totp)&&totp.length!==6||actions.stepUp.isPending}>Confirmer mon identité</Button></div></form></Modal>;
}
