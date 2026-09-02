import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Car,
  ChevronLeft,
  Calendar,
  Fuel,
  Gauge,
  DollarSign,
  FileText,
  Wrench,
  BadgePercent,
  CheckCircle2,
  Clock,
  Printer,
  Edit,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useVehicle360Query, useVehicleImages, useVehicleStatusMutation } from '../../api/erpHooks';
import { optimizeImage } from './NewVehicleModal';
import { vehicleStatusToDb } from '../../services/mysqlStatusMap';
import { useUiStore } from '../../stores/uiStore';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { VehicleStatus } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { openBusinessPdf } from '../../services/businessPdf';

export const VehicleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const vehicleQuery=useVehicle360Query(id); const statusMutation = useVehicleStatusMutation();
  const imageMutations=useVehicleImages();
  const { setActiveQuickActionModal, addToast } = useUiStore();

  const vehicle = vehicleQuery.data?.vehicle;
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'details' | 'financials' | 'timeline' | 'documents'>('details');

  if(vehicleQuery.isLoading)return <div className="p-8 text-sm text-slate-500">Chargement du véhicule…</div>;
  if (vehicleQuery.isError) return <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-800"><strong>Lecture impossible.</strong> {vehicleQuery.error instanceof Error?vehicleQuery.error.message:'Erreur API'}<div className="mt-4"><Button variant="outline" onClick={()=>navigate('/vehicles')}>Retour au stock</Button></div></div>;
  if (!vehicle) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">Véhicule introuvable dans le stock de la concession.</p>
        <Button variant="outline" onClick={() => navigate('/vehicles')}>
          Retour au stock
        </Button>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: VehicleStatus) => {
    const status = vehicleStatusToDb[newStatus]; try{if (status) await statusMutation.mutateAsync({ id: vehicle.id, status });addToast({
      type: 'success',
      title: 'Statut du véhicule modifié',
      description: `Le véhicule est maintenant marqué comme ${newStatus}.`,
    });}catch(error){addToast({type:'error',title:'Mise à jour impossible',description:error instanceof Error?error.message:'Erreur API'});}
  };

  const handlePrintFlyer = () => {
    openBusinessPdf('vehicle',vehicle.id).catch(error=>addToast({type:'error',title:'PDF indisponible',description:error.message}));
  };
  const addImages=async(event:React.ChangeEvent<HTMLInputElement>)=>{try{const images=await Promise.all(Array.from(event.target.files??[]).map(optimizeImage));await imageMutations.add.mutateAsync({id:vehicle.id,images:images.map(({dataUrl,name})=>({dataUrl,name}))});addToast({type:'success',title:'Galerie mise à jour',description:`${images.length} photo(s) ajoutée(s).`})}catch(error){addToast({type:'error',title:'Ajout impossible',description:error instanceof Error?error.message:'Erreur image'})}event.target.value=''};

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${vehicle.brand} ${vehicle.model} — ${vehicle.version}`}
        subtitle={`VIN : ${vehicle.vin} • Immatriculation : ${vehicle.registrationNumber || 'Non immatriculé'} • N° Stock : ${vehicle.stockNumber}`}
        breadcrumbs={[
          { label: 'Accueil', href: '/dashboard' },
          { label: 'Stock Véhicules', href: '/vehicles' },
          { label: `${vehicle.brand} ${vehicle.model}` },
        ]}
        badge={<StatusBadge status={vehicle.status} type="vehicle" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Status Selector */}
            <select
              value={vehicle.status}
              onChange={(e) => handleStatusChange(e.target.value as VehicleStatus)}
              className="text-xs font-bold p-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none"
            >
              <option value="COMMANDE">Statut : Commandé</option>
              <option value="EN_TRANSIT">Statut : En transit</option>
              <option value="RECEPTIONNE">Statut : Réceptionné</option>
              <option value="PREPARATION">Statut : En préparation</option>
              <option value="DISPONIBLE">Statut : Disponible à la vente</option>
              <option value="RESERVE">Statut : Réservé</option>
              <option value="VENDU">Statut : Vendu</option>
              <option value="LIVRE">Statut : Livré au client</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrintFlyer}
            >
              Fiche A4
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={<BadgePercent className="w-4 h-4" />}
              onClick={() => setActiveQuickActionModal('sale',{vehicleId:vehicle.id})}
            >
              Créer Vente
            </Button>
          </div>
        }
      />

      {/* Top Banner: Photos Gallery & Key Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gallery */}
        <div className="lg:col-span-2 space-y-3">
          <div className="aspect-16/9 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm relative">
            <img
              src={vehicle.photos[selectedPhotoIndex] || vehicle.photos[0]}
              alt={vehicle.model}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 flex gap-2">
              <Badge variant="primary" size="md">{vehicle.type}</Badge>
              {vehicle.stockDays > 60 && (
                <Badge variant="danger" size="md">{vehicle.stockDays}j en stock</Badge>
              )}
            </div>
          </div>

          {vehicle.photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {vehicle.photos.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className={`w-20 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    selectedPhotoIndex === idx ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2"><label className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer">Ajouter des photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={addImages}/></label>{vehicleQuery.data?.images?.map((image:any,index:number)=><div key={image.id} className="flex gap-1"><Button size="xs" variant="outline" disabled={Boolean(image.is_primary)} onClick={()=>imageMutations.primary.mutate({id:vehicle.id,imageId:String(image.id)})}>{index===0?'Principale':'Définir principale'}</Button><Button size="xs" variant="outline" onClick={()=>{if(window.confirm('Supprimer cette photo du catalogue ?'))imageMutations.remove.mutate({id:vehicle.id,imageId:String(image.id)})}}>Supprimer</Button></div>)}</div>
        </div>

        {/* Commercial Highlights Card */}
        <Card className="flex flex-col justify-between">
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Prix de Vente Concession</span>
              <div className="text-3xl font-extrabold text-blue-700 mt-1">
                {formatCurrency(vehicle.sellingPriceTTC)}
              </div>
              <span className="text-xs text-slate-500">TVA incluse ({formatCurrency(vehicle.sellingPriceTTC / 1.2)} HT)</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Marge Brute Cible HT</span>
                <span className="font-bold text-emerald-600">+{formatCurrency(vehicle.targetMarginHT)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Kilométrage</span>
                <span className="font-semibold text-slate-800">{vehicle.mileage.toLocaleString()} km</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Énergie & Motorisation</span>
                <span className="font-semibold text-slate-800">{vehicle.fuel} ({vehicle.realPower} ch)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Boîte de vitesses</span>
                <span className="font-semibold text-slate-800">{vehicle.transmission}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Emplacement Parc</span>
                <span className="font-semibold text-slate-800">{vehicle.location}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Fournisseur d'origine</span>
                <span className="font-semibold text-slate-800">{vehicle.supplier}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => setActiveQuickActionModal('sale',{vehicleId:vehicle.id})}
            >
              Établir une Proposition Commerciale
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setActiveQuickActionModal('or',{vehicleId:vehicle.id})}
            >
              Ouvrir OR Atelier (SAV / Prépa)
            </Button>
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { key: 'details', label: 'Caractéristiques & Équipements' },
          { key: 'financials', label: 'Décomposition des Coûts & Marges' },
          { key: 'timeline', label: 'Cycle de Vie & Traçabilité' },
          { key: 'documents', label: 'GED & Documents Associés' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: TECHNICAL SPECS & FEATURES */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Identité Mécanique & Fiche Technique</CardTitle>
            </CardHeader>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Numéro de Châssis (VIN)</span>
                <span className="font-mono font-bold text-slate-800">{vehicle.vin}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Immatriculation</span>
                <span className="font-mono font-bold text-slate-800">{vehicle.registrationNumber || 'Non immatriculé'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">1ère Mise en Circulation</span>
                <span className="font-semibold text-slate-800">{vehicle.firstRegistrationDate}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Année Modèle</span>
                <span className="font-semibold text-slate-800">{vehicle.year}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Carrosserie</span>
                <span className="font-semibold text-slate-800">{vehicle.bodyType}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Couleur Extérieure</span>
                <span className="font-semibold text-slate-800">{vehicle.color}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Sellerie / Intérieur</span>
                <span className="font-semibold text-slate-800">{vehicle.interiorColor}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Puissance Fiscale / Réelle</span>
                <span className="font-semibold text-slate-800">{vehicle.fiscalPower} CV / {vehicle.realPower} ch</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Émissions CO2 (WLTP)</span>
                <span className="font-semibold text-slate-800">{vehicle.co2Emissions} g/km</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Équipements & Options Incluses</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              {vehicle.features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: FINANCIALS & MARGINS */}
      {activeTab === 'financials' && (
        <Card>
          <CardHeader>
            <CardTitle>Décomposition Financière (Calcul de Prix de Revient et Marge Nette)</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Prix d'Achat HT</span>
              <div className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(vehicle.purchasePriceHT)}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Frais Remise en État HT</span>
              <div className="text-lg font-bold text-amber-700 mt-1">+{formatCurrency(vehicle.refurbishCostHT)}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Prix de Revient Total HT</span>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {formatCurrency(vehicle.purchasePriceHT + vehicle.refurbishCostHT + vehicle.otherCostsHT)}
              </div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-xs text-emerald-800 font-medium">Marge Nette Cible HT</span>
              <div className="text-lg font-bold text-emerald-700 mt-1">+{formatCurrency(vehicle.targetMarginHT)}</div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 3: LIFECYCLE TIMELINE */}
      {activeTab === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle>Historique et Traçabilité du Véhicule</CardTitle>
          </CardHeader>
          <div className="space-y-4 text-xs">
            {vehicleQuery.data?.statusHistory?.map((event:any)=><div key={`status-${event.id}`} className="flex gap-4 items-start"><div className="w-8 h-8 rounded-full bg-red-100 text-red-800 flex items-center justify-center shrink-0 font-bold">●</div><div><div className="font-bold text-slate-900">Statut : {event.old_status||'entrée'} → {event.new_status}</div><p className="text-slate-500 text-[11px]">{event.reason||'Changement de statut'} · {event.changed_by_name||'Système'}</p><span className="text-[10px] text-slate-400">{formatDate(event.changed_at)}</span></div></div>)}
            {vehicleQuery.data?.movements?.map((event:any)=><div key={`movement-${event.id}`} className="flex gap-4 items-start"><div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0"><ArrowRight className="w-4 h-4"/></div><div><div className="font-bold text-slate-900">Mouvement : {event.movement_type}</div><p className="text-slate-500 text-[11px]">{event.from_location_name||event.from_agency_name||'Entrée'} → {event.to_location_name||event.to_agency_name||vehicle.agencyName}</p><span className="text-[10px] text-slate-400">{formatDate(event.moved_at)}</span></div></div>)}
            {!vehicleQuery.data?.statusHistory?.length&&!vehicleQuery.data?.movements?.length&&<p className="text-slate-500">Aucun historique enregistré.</p>}
          </div>
        </Card>
      )}

      {/* TAB 4: DOCUMENTS GED */}
      {activeTab === 'documents' && (
        <Card>
          <CardHeader>
            <CardTitle>Documents Électroniques (GED Automobile)</CardTitle>
          </CardHeader>
          <div className="divide-y divide-slate-100 text-xs">{vehicleQuery.data?.documents?.map((document:any)=><div key={document.id} className="py-3 flex items-center justify-between"><div className="flex items-center gap-3"><FileText className="w-5 h-5 text-red-800"/><div><div className="font-semibold text-slate-800">{document.file_name}</div><div className="text-[11px] text-slate-400">{document.document_type||document.mime_type} · {document.file_size?`${Math.round(document.file_size/1024)} Ko`:''}</div></div></div><Button size="xs" variant="outline" onClick={()=>window.open(document.file_url,'_blank','noopener,noreferrer')}>Télécharger</Button></div>)}{!vehicleQuery.data?.documents?.length&&<p className="py-6 text-center text-slate-500">Aucun document GED associé à ce véhicule.</p>}</div>
        </Card>
      )}
    </div>
  );
};
