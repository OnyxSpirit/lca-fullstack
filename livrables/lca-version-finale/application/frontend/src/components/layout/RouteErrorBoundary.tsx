import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../navigation/routes';
import { Button } from '../ui/Button';

class ScreenErrorBoundary extends React.Component<React.PropsWithChildren, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('Erreur de rendu du module', error); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="min-h-[55vh] grid place-items-center"><div className="max-w-lg rounded-lg border border-red-200 bg-white p-8 text-center"><p className="text-xs font-bold uppercase tracking-wider text-red-700">Erreur d’affichage</p><h1 className="mt-2 text-2xl font-bold">Ce module n’a pas pu être affiché</h1><p className="mt-3 text-sm text-slate-500">{this.state.error.message}</p><Link className="mt-6 inline-block" to={ROUTES.dashboard}><Button>Retour au tableau de bord</Button></Link></div></div>;
  }
}

export function RouteErrorBoundary({ children }: React.PropsWithChildren) {
  const location = useLocation();
  return <ScreenErrorBoundary key={location.pathname}>{children}</ScreenErrorBoundary>;
}
