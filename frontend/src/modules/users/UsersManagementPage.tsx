import React, { useState } from 'react';
import {
  Users,
  Plus,
  Shield,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { UserRole } from '../../types';
import { useCreateUser } from '../../api/erpHooks';

export const UsersManagementPage: React.FC = () => {
  const { allUsers, currentUser, allAgencies } = useAuthStore();
  const users = allUsers;
  const agencies = allAgencies;
  const { addToast } = useUiStore();
  const createUser = useCreateUser();

  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users');

  const roleDefinitions = [
    {role:'SUPER_ADMIN' as UserRole,label:'Super Administrateur',desc:'Configuration globale, utilisateurs, permissions, paramètres et supervision technique.',color:'danger'},
    {
      role: 'DIRECTION' as UserRole,
      label: 'Direction / Gérant',
      desc: 'Accès intégral à toutes les concessions, finances, marges, RH et paramétrages.',
      color: 'primary',
    },
    {
      role: 'SALES_MANAGER' as UserRole,
      label: 'Responsable Commercial',
      desc: 'Supervision des vendeurs, validation des remises commerciales et objectifs.',
      color: 'primary',
    },
    {
      role: 'SALES_REP' as UserRole,
      label: 'Conseiller Commercial VN / VO',
      desc: 'Gestion des prospects CRM, devis, ventes, reprises et livraisons.',
      color: 'default',
    },
    {role:'RECEPTIONIST' as UserRole,label:'Réceptionniste',desc:'Accueil, file d’attente, rendez-vous et affectation.',color:'default'},
    {role:'SERVICE_MANAGER' as UserRole,label:'Responsable SAV',desc:'Supervision du SAV, des rendez-vous et des ordres de réparation.',color:'warning'},
    {role:'SERVICE_ADVISOR' as UserRole,label:'Conseiller SAV',desc:'Réception client, ouverture et suivi des ordres de réparation.',color:'warning'},
    {
      role: 'WORKSHOP_CHIEF' as UserRole,
      label: 'Chef d\'Atelier & SAV',
      desc: 'Supervision des techniciens, planification des ponts, validation des OR.',
      color: 'warning',
    },
    {role:'TECHNICIAN' as UserRole,label:'Technicien',desc:'Interventions, diagnostic, temps passé et comptes rendus.',color:'default'},
    {
      role: 'PARTS_MANAGER' as UserRole,
      label: 'Magasinier Pièces (PR)',
      desc: 'Gestion des stocks PR, inventaires, commandes fournisseurs et sorties atelier.',
      color: 'default',
    },
    {role:'WAREHOUSE_CLERK' as UserRole,label:'Magasinier',desc:'Entrées, sorties, emplacements et inventaires de pièces.',color:'default'},
    {role:'DELIVERY_MANAGER' as UserRole,label:'Responsable livraison',desc:'Préparation, contrôle qualité, remise et signature client.',color:'success'},
    {
      role: 'ACCOUNTANT' as UserRole,
      label: 'Comptable & Facturation',
      desc: 'Factures, encaissements, relances créances, exports FEC et journaux comptables.',
      color: 'success',
    },
  ];
  const roleCodeMap: Record<UserRole,string> = {DIRECTION:'DIRECTOR',SALES_MANAGER:'SALES_MANAGER',SALES_REP:'SALES_AGENT',WORKSHOP_CHIEF:'WORKSHOP_MANAGER',PARTS_MANAGER:'PARTS_MANAGER',ACCOUNTANT:'ACCOUNTANT',SUPER_ADMIN:'SUPER_ADMIN',RECEPTIONIST:'RECEPTIONIST',SERVICE_MANAGER:'SERVICE_MANAGER',SERVICE_ADVISOR:'SERVICE_ADVISOR',TECHNICIAN:'TECHNICIAN',WAREHOUSE_CLERK:'WAREHOUSE_CLERK',DELIVERY_MANAGER:'DELIVERY_MANAGER'};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Collaborateurs & Habilitations (RBAC)"
        subtitle="Contrôle des profils utilisateurs, affectation aux concessions et matrice des droits d'accès."
        breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Administration' }, { label: 'Collaborateurs' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsNewUserOpen(true)}
          >
            Ajouter un Collaborateur
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Collaborateurs Actifs ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'matrix'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Matrice des Droits & Rôles
        </button>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Collaborateur</th>
                  <th className="py-3 px-4">Rôle Métier</th>
                  <th className="py-3 px-4">Concession / Agence</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Simuler ce profil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCurrent = currentUser.id === u.id;

                  return (
                    <tr key={u.id} className={isCurrent ? 'bg-blue-50/40' : 'hover:bg-slate-50'}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {u.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">{u.name}</span>
                            {isCurrent && (
                              <span className="ml-2 text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                Vous
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="primary" size="sm">{u.roleTitle}</Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{u.agencyName}</td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{u.email}</div>
                        <div className="text-[10px] text-slate-400">{u.phone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="success" size="sm">Actif</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant={isCurrent?'primary':'default'} size="sm">{isCurrent?'Votre compte':'Compte distinct'}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: RBAC MATRIX */}
      {activeTab === 'matrix' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roleDefinitions.map((roleDef, idx) => (
            <Card key={idx} className="flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-700" />
                    <h4 className="font-bold text-sm text-slate-900">{roleDef.label}</h4>
                  </div>
                  <Badge variant={roleDef.color as any} size="sm">{roleDef.role}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{roleDef.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Périmètre validé</span>
                <span className="font-semibold text-slate-600">Contrôlé par le serveur</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New User Modal */}
      <Modal
        isOpen={isNewUserOpen}
        onClose={() => setIsNewUserOpen(false)}
        title="Créer un Compte Collaborateur"
        description="Affectation d'une licence ERP et des droits de concession."
        maxWidth="md"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form=new FormData(e.currentTarget);const fullName=String(form.get('fullName')??'').trim().split(/\s+/);const lastName=fullName.pop()??'';const firstName=fullName.join(' ');
            try{await createUser.mutateAsync({firstName,lastName,email:form.get('email'),phone:form.get('phone'),roleCode:form.get('roleCode'),agencyId:form.get('agencyId'),password:form.get('password'),jobTitle:form.get('roleCode')});addToast({type:'success',title:'Collaborateur créé',description:'Le compte est enregistré. Transmettez son mot de passe temporaire de manière sécurisée.'});setIsNewUserOpen(false);}catch(error){addToast({type:'error',title:'Création impossible',description:error instanceof Error?error.message:'Erreur API'});}
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nom et Prénom *</label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="ex: Romain Duval"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email professionnel *</label>
              <input
                type="email"
                name="email"
                required
                placeholder="r.duval@autocore-group.fr"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
              <input
                type="tel"
                name="phone"
                placeholder="06 12 34 56 78"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Rôle Métier / Habilitation *</label>
            <select name="roleCode" className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white">
              {roleDefinitions.map((r, idx) => (
                <option key={idx} value={roleCodeMap[r.role]}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Concession d'Affectation</label>
            <select name="agencyId" className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white">
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.city})</option>
              ))}
            </select>
          </div>

          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Mot de passe temporaire *</label><input name="password" type="password" minLength={8} required className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white" placeholder="8 caractères minimum" /></div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsNewUserOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" type="submit">
              Envoyer l'invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
