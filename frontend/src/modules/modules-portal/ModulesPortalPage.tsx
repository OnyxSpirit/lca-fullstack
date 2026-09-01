import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Car,
  BadgePercent,
  Compass,
  Truck,
  Wrench,
  Calendar,
  Package,
  Receipt,
  BarChart3,
  FileText,
  Bell,
  ShieldCheck,
  Settings,
  Search,
  ArrowRight,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { ROUTES } from '../../navigation/routes';

export const ModulesPortalPage: React.FC = () => {
  const { hasPermission, currentUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  interface ModuleItem {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    route: string;
    permissionKey: string;
    badgeText?: string;
    badgeVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'default';
    features: string[];
  }

  interface ModuleCategory {
    categoryName: string;
    description: string;
    modules: ModuleItem[];
  }

  const categories: ModuleCategory[] = [
    {
      categoryName: 'Commercial & Négociation',
      description: 'Prospection, gestion des opportunités et cycle de vente automobile.',
      modules: [
        {
          id: 'crm',
          title: 'CRM & Prospects',
          description: 'Pipeline commercial Kanban, relances, scoring des prospects et suivi des opportunités VN/VO.',
          icon: <Users className="w-6 h-6 text-blue-600" />,
          route: ROUTES.crm,
          permissionKey: 'crm',
          badgeText: '8 Actifs',
          badgeVariant: 'primary',
          features: ['Kanban 8 étapes', 'Fiches opportunités', 'Alertes relances', 'Scoring IA'],
        },
        {
          id: 'vehicles',
          title: 'Stock Véhicules (VN / VO)',
          description: 'Gestion du parc automobile, identification VIN, prix d’achat, frais de remise en état et marges.',
          icon: <Car className="w-6 h-6 text-emerald-600" />,
          route: ROUTES.vehicles,
          permissionKey: 'vehicles',
          badgeText: '20 Véhicules',
          badgeVariant: 'success',
          features: ['Gestion VIN 17 car.', 'Alertes stock >60j', 'Calcul marge HT', 'Galerie photos'],
        },
        {
          id: 'sales',
          title: 'Ventes & Bons de Commande',
          description: 'Création de propositions commerciales, reprises, financements (LOA/LLD/Crédit) et bons de commande.',
          icon: <BadgePercent className="w-6 h-6 text-indigo-600" />,
          route: ROUTES.sales,
          permissionKey: 'sales',
          features: ['Assistant de vente', 'Calcul LOA/LLD', 'Estimation reprise', 'Validation hiérarchique'],
        },
      ],
    },
    {
      categoryName: 'Expérience Client & Accueil',
      description: 'Accueil physique en concession, gestion des contacts et remises de clés.',
      modules: [
        {
          id: 'showroom',
          title: 'Showroom & Réception',
          description: 'Accueil des visiteurs en concession, file d’attente, affectation conseiller et suivi des essais.',
          icon: <Compass className="w-6 h-6 text-amber-600" />,
          route: ROUTES.showroom,
          permissionKey: 'showroom',
          badgeText: '3 Visiteurs',
          badgeVariant: 'warning',
          features: ['File d’attente live', 'Attribution conseiller', 'Essais routiers', 'Fiches de passage'],
        },
        {
          id: 'customers',
          title: 'Fiches Clients 360°',
          description: 'Référentiel unique Particuliers / Entreprises : historique véhicules possédés, SAV et facturation.',
          icon: <Users className="w-6 h-6 text-teal-600" />,
          route: ROUTES.customers,
          permissionKey: 'customers',
          features: ['Vue 360° unifiée', 'Flottes entreprises', 'Historique complet', 'Documents GED'],
        },
        {
          id: 'deliveries',
          title: 'Livraisons Véhicules',
          description: 'Planning des mises en main, checklist qualité en 8 points et procès-verbal de livraison signé.',
          icon: <Truck className="w-6 h-6 text-cyan-600" />,
          route: ROUTES.deliveries,
          permissionKey: 'deliveries',
          badgeText: '2 Prévues',
          badgeVariant: 'primary',
          features: ['Checklist 8 points', 'Mise en main client', 'PV de livraison', 'Photos véhicule'],
        },
      ],
    },
    {
      categoryName: 'Après-Vente, Atelier & Pièces',
      description: 'Gestion technique des réparations, planning des mécaniciens et magasin PR.',
      modules: [
        {
          id: 'service',
          title: 'SAV & Ordres de Réparation (OR)',
          description: 'Ouverture de dossier SAV, réception véhicule, devis atelier, diagnostic et suivi des travaux.',
          icon: <Wrench className="w-6 h-6 text-blue-600" />,
          route: ROUTES.service,
          permissionKey: 'service',
          badgeText: '3 En cours',
          badgeVariant: 'primary',
          features: ['OR standardisé', 'Pointage temps barème', 'Garantie constructeur', 'Véhicule de prêt'],
        },
        {
          id: 'workshop',
          title: 'Planning Atelier & Ponts',
          description: 'Vue graphique des ponts et postes de travail, planning des techniciens et taux d’occupation.',
          icon: <Calendar className="w-6 h-6 text-purple-600" />,
          route: ROUTES.workshop,
          permissionKey: 'workshop',
          features: ['Vue 8 ponts élévateurs', 'Planning hebdomadaire', 'Taux productivité', 'Assignation directe'],
        },
        {
          id: 'parts',
          title: 'Pièces de Rechange (Magasin PR)',
          description: 'Catalogue de pièces détachées, gestion des casiers, alertes seuil d’alerte et commandes réappro.',
          icon: <Package className="w-6 h-6 text-rose-600" />,
          route: ROUTES.parts,
          permissionKey: 'parts',
          badgeText: '2 Alertes',
          badgeVariant: 'danger',
          features: ['Gestion des casiers', 'Seuils mini/maxi', 'Commandes usine', 'Vente comptoir'],
        },
      ],
    },
    {
      categoryName: 'Finance, Pilotage & Administration',
      description: 'Facturation, comptabilité, Business Intelligence et paramétrage du portail.',
      modules: [
        {
          id: 'billing',
          title: 'Facturation & Règlements',
          description: 'Émission des factures VN, VO, Atelier et Pièces, suivi des encaissements et relance impayés.',
          icon: <Receipt className="w-6 h-6 text-emerald-600" />,
          route: ROUTES.billing,
          permissionKey: 'billing',
          features: ['Factures multi-activités', 'Gestion des acomptes', 'Suivi des impayés', 'Export comptable'],
        },
        {
          id: 'reports',
          title: 'Reporting & Business Intelligence',
          description: 'Tableaux de bord de direction, analyse des marges par véhicule, performances des commerciaux.',
          icon: <BarChart3 className="w-6 h-6 text-indigo-600" />,
          route: ROUTES.reports,
          permissionKey: 'reports',
          features: ['Marges nettes', 'Performance vendeurs', 'Taux reprise VO', 'Rendement atelier'],
        },
        {
          id: 'documents',
          title: 'Documents & GED',
          description: 'Gestion Électronique des Documents : cartes grises, permis, contrats de vente, factures et PV.',
          icon: <FileText className="w-6 h-6 text-slate-600" />,
          route: ROUTES.documents,
          permissionKey: 'documents',
          features: ['Recherche par VIN', 'Classement auto', 'Génération PDF', 'Archivage sécurisé'],
        },
        {
          id: 'users',
          title: 'Utilisateurs & RBAC',
          description: 'Gestion des profils collaborateurs, rôles métier et matrice granulaire des droits d’accès.',
          icon: <ShieldCheck className="w-6 h-6 text-blue-700" />,
          route: ROUTES.users,
          permissionKey: 'users',
          features: ['11 rôles métier', 'Matrice de droits', 'Audit de sécurité', 'Affectation agence'],
        },
        {
          id: 'settings',
          title: 'Paramètres Concession',
          description: 'Configuration du groupe, des concessions multi-sites, barèmes de main d’œuvre et taux de TVA.',
          icon: <Settings className="w-6 h-6 text-slate-700" />,
          route: ROUTES.settings,
          permissionKey: 'settings',
          features: ['Multi-agences', 'Taux horaires MO', 'Partenaires LLD', 'Numérotation auto'],
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portail Intégré des Modules ERP"
        subtitle="Accédez à tous les domaines opérationnels de la concession automobile."
        breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Portail des Modules' }]}
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer les modules..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        }
      />

      {/* Grid by categories */}
      <div className="space-y-8">
        {categories.map((cat, idx) => {
          // Filter visible modules
          const visibleModules = cat.modules.filter((m) => {
            const hasPerm = hasPermission('view', m.permissionKey);
            if (!hasPerm) return false;
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (
              m.title.toLowerCase().includes(q) ||
              m.description.toLowerCase().includes(q) ||
              m.features.some((f) => f.toLowerCase().includes(q))
            );
          });

          if (visibleModules.length === 0) return null;

          return (
            <div key={idx} className="space-y-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>{cat.categoryName}</span>
                  <span className="text-xs font-normal text-slate-500">({visibleModules.length} modules)</span>
                </h3>
                <p className="text-xs text-slate-500">{cat.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleModules.map((mod) => (
                  <Link
                    key={mod.id}
                    to={mod.route}
                    className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 group-hover:scale-105 group-hover:bg-blue-50 transition-all">
                          {mod.icon}
                        </div>
                        {mod.badgeText && (
                          <Badge variant={mod.badgeVariant || 'primary'} size="sm">
                            {mod.badgeText}
                          </Badge>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors flex items-center justify-between">
                        <span>{mod.title}</span>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </h4>

                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {mod.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100/80">
                      <div className="flex flex-wrap gap-1.5">
                        {mod.features.map((f, fIdx) => (
                          <span
                            key={fIdx}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
