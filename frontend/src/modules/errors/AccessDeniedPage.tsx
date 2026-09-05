import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ROUTES } from '../../navigation/routes';

export const AccessDeniedPage:React.FC=()=> (
  <div className="min-h-[65vh] grid place-items-center">
    <div className="max-w-lg text-center">
      <ShieldX className="mx-auto h-12 w-12 text-[#8f1722]" />
      <p className="mt-4 text-sm font-black tracking-[0.2em] text-[#8f1722]">ACCÈS REFUSÉ</p>
      <h1 className="mt-3 text-3xl font-bold text-[#111113]">Permission insuffisante</h1>
      <p className="mt-3 text-sm text-slate-500">Votre rôle ne permet pas de consulter ce module. Aucun appel métier n’a été lancé.</p>
      <Link className="mt-6 inline-block" to={ROUTES.modules}><Button>Retour aux modules autorisés</Button></Link>
    </div>
  </div>
);
