import React from 'react';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../navigation/routes';
import { Button } from '../../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  return <div className="min-h-[65vh] grid place-items-center"><div className="max-w-lg text-center"><p className="text-sm font-black tracking-[0.2em] text-[#8f1722]">ERREUR 404</p><h1 className="mt-3 text-4xl font-bold text-[#111113]">Écran introuvable</h1><p className="mt-3 text-sm text-slate-500">Cette adresse ne correspond à aucun module de LCA ERP. Elle n’a pas été redirigée silencieusement.</p><div className="mt-6 flex justify-center gap-3"><Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>Page précédente</Button><Link to={ROUTES.dashboard}><Button icon={<LayoutDashboard className="w-4 h-4" />}>Tableau de bord</Button></Link></div></div></div>;
};
