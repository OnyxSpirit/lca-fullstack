import React, { useEffect, useState } from 'react';
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
  UploadCloud,
} from 'lucide-react';
import { useArchiveVehicle, useVehicle360Query, useVehicleImages, useVehicleStatusMutation } from '../../api/erpHooks';
import { optimizeImage } from './NewVehicleModal';
import { EditVehicleModal } from './EditVehicleModal';
import { useAuthStore } from '../../stores/authStore';
import { vehicleStatusToDb } from '../../services/mysqlStatusMap';
import { useUiStore } from '../../stores/uiStore';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { VehicleStatus } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { apiDownload } from '../../services/apiClient';
import { openBusinessPdf } from '../../services/businessPdf';
import { UploadModal } from '../documents/DocumentsGedPage';
import { VehicleTransferModal } from './VehicleTransferModal';

export const VehicleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const vehicleQuery=useVehicle360Query(id); const statusMutation = useVehicleStatusMutation();
  const imageMutations=useVehicleImages();
  const can=useAuthStore(state=>state.can);
  const canEdit=can('vehicles.update');
  const canManageImages=can('vehicles.images.manage');
  const canCreateSale=can('sales.create');
  const canCreateRepairOrder=can('service.order.create');
  const canViewDocuments=can('ged.view');
  const canUploadDocuments=can('ged.upload');
  const canChangeStatus=can('vehicles.status.update');
  const canViewFinancials=can('vehicles.financials.view');
  const canTransfer=can('vehicles.assign_agency'),canArchive=can('vehicles.archive');
  const { setActiveQuickActionModal, addToast } = useUiStore();

  const vehicle = vehicleQuery.data?.vehicle;
  const administrableStatuses:VehicleStatus[]=['COMMANDE','EN_TRANSIT','RECEPTIONNE','PREPARATION','DISPONIBLE'];
  const manualStatusOptions=vehicle&&administrableStatuses.includes(vehicle.status)?administrableStatuses.filter(status=>status!==vehicle.status):[];
  const stockLocked=vehicle?.status==='VENDU'||vehicle?.status==='LIVRE';
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedImageId, setSelectedImageId] = useState<string|null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'financials' | 'timeline' | 'documents'>('details');
  const [editOpen,setEditOpen]=useState(false);
  const [documentUploadOpen,setDocumentUploadOpen]=useState(false);
  const [transferOpen,setTransferOpen]=useState(false);
  const archiveVehicle=useArchiveVehicle();
  const galleryImages=vehicleQuery.data?.images??[];
  const selectedImage=galleryImages.find((image:any)=>String(image.id)===selectedImageId);
  useEffect(()=>{
    const selectedIndex=selectedImageId?galleryImages.findIndex((image:any)=>String(image.id)===selectedImageId):-1;
    if(selectedImageId&&selectedIndex<0)setSelectedImageId(null);
    else if(selectedIndex>=0&&selectedPhotoIndex!==selectedIndex)setSelectedPhotoIndex(selectedIndex);
    else if(selectedPhotoIndex>=galleryImages.length)setSelectedPhotoIndex(Math.max(0,galleryImages.length-1));
  },[galleryImages,selectedImageId,selectedPhotoIndex]);
  const downloadDocument=async(document:any)=>{try{const blob=await apiDownload(`/documents/${document.id}/download`),url=URL.createObjectURL(blob),link=window.document.createElement('a');link.href=url;link.download=document.file_name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(error){addToast({type:'error',title:'Téléchargement impossible',description:error instanceof Error?error.message:'Erreur API'})}};

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
    const status = vehicleStatusToDb[newStatus],reason=window.prompt('Motif obligatoire du changement de statut')?.trim();if(!reason)return;try{if(status)await statusMutation.mutateAsync({id:vehicle.id,status,reason});addToast({
      type: 'success',
      title: 'Statut du véhicule modifié',
      description: `Le véhicule est maintenant marqué comme ${newStatus}.`,
    });}catch(error){addToast({type:'error',title:'Mise à jour impossible',description:error instanceof Error?error.message:'Erreur API'});}
  };

  const handlePrintFlyer = () => {
    openBusinessPdf('vehicle',vehicle.id).catch(error=>addToast({type:'error',title:'PDF indisponible',description:error.message}));
  };
  const addImages=async(event:React.ChangeEvent<HTMLInputElement>)=>{try{const images=await Promise.all(Array.from(event.target.files??[]).map(optimizeImage));await imageMutations.add.mutateAsync({id:vehicle.id,images:images.map(({dataUrl,name})=>({dataUrl,name}))});addToast({type:'success',title:'Galerie mise à jour',description:`${images.length} photo(s) ajoutée(s).`})}catch(error){addToast({type:'error',title:'Ajout impossible',description:error instanceof Error?error.message:'Erreur image'})}event.target.value=''};
  const setPrimaryImage=async()=>{if(!selectedImage)return;try{await imageMutations.primary.mutateAsync({id:vehicle.id,imageId:String(selectedImage.id)});addToast({type:'success',title:'Image principale mise à jour',description:'La photo sélectionnée est maintenant l’image principale.'})}catch(error){addToast({type:'error',title:'Mise à jour impossible',description:error instanceof Error?error.message:'Erreur image'})}};
  const removeSelectedImage=async()=>{if(!selectedImage||!window.confirm('Supprimer cette photo du catalogue ?'))return;try{await imageMutations.remove.mutateAsync({id:vehicle.id,imageId:String(selectedImage.id)});setSelectedImageId(null);setSelectedPhotoIndex(0);addToast({type:'success',title:'Photo supprimée',description:'La photo sélectionnée a été retirée du catalogue.'})}catch(error){addToast({type:'error',title:'Suppression impossible',description:error instanceof Error?error.message:'Erreur image'})}};
  const moveImage=async(direction:-1|1)=>{if(!selectedImage)return;const index=galleryImages.indexOf(selectedImage),target=index+direction;if(target<0||target>=galleryImages.length)return;const ids=galleryImages.map((image:any)=>String(image.id));[ids[index],ids[target]]=[ids[target]!,ids[index]!];await imageMutations.reorder.mutateAsync({id:vehicle.id,imageIds:ids})};
  const archive=async()=>{if(!window.confirm('Archiver ce véhicule du catalogue ?'))return;try{await archiveVehicle.mutateAsync(vehicle.id);navigate('/vehicles')}catch(error){addToast({type:'error',title:'Archivage impossible',description:error instanceof Error?error.message:'Erreur API'})}};

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
            {canEdit&&!stockLocked&&<Button variant="outline" size="sm" icon={<Edit className="w-4 h-4"/>} onClick={()=>setEditOpen(true)}>Modifier</Button>}
            {canTransfer&&!stockLocked&&<Button variant="outline" size="sm" onClick={()=>setTransferOpen(true)}>Transférer</Button>}
            {/* Quick Status Selector */}
            {canChangeStatus&&!stockLocked&&manualStatusOptions.length>0&&<select
              value={vehicle.status}
              onChange={(e) => handleStatusChange(e.target.value as VehicleStatus)}
              className="text-xs font-bold p-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none"
            >
              <option value={vehicle.status}>Statut actuel : {vehicle.status}</option>
              {manualStatusOptions.map(status=><option key={status} value={status}>Passer à : {status}</option>)}
            </select>}

            <Button
              variant="outline"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrintFlyer}
            >
              Fiche A4
            </Button>

            {canCreateSale&&vehicle.status==='DISPONIBLE'&&<Button
              variant="primary"
              size="sm"
              icon={<BadgePercent className="w-4 h-4" />}
              onClick={() => setActiveQuickActionModal('sale',{vehicleId:vehicle.id})}
            >
              Créer Vente
            </Button>}
          </div>
        }
      />

      {/* Top Banner: Photos Gallery & Key Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gallery */}
        <div className="lg:col-span-2 space-y-3">
          <div className="aspect-16/9 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm relative">
            <img
              src={vehicle.photos[selectedPhotoIndex] || vehicle.photos[0] || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="450"%3E%3Crect width="100%25" height="100%25" fill="%23e2e8f0"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%2364748b" font-size="24"%3EAucune photo%3C/text%3E%3C/svg%3E'}
              alt={vehicle.model}
              className="w-full h-full object-cover"
              onError={event=>{event.currentTarget.onerror=null;event.currentTarget.src='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="450"%3E%3Crect width="100%25" height="100%25" fill="%23e2e8f0"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%2364748b" font-size="24"%3EAucune photo%3C/text%3E%3C/svg%3E'}}
            />
            <div className="absolute top-3 left-3 flex gap-2">
              <Badge variant="primary" size="md">{vehicle.type}</Badge>
              {vehicle.stockDays > 60 && (
                <Badge variant="danger" size="md">{vehicle.stockDays}j en stock</Badge>
              )}
            </div>
          </div>

          {galleryImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {galleryImages.map((image:any, idx:number) => (
                <button
                  key={image.id}
                  type="button"
                  aria-label={`Sélectionner la photo ${idx+1}${image.is_primary?' principale':''}`}
                  aria-pressed={String(image.id)===selectedImageId}
                  onClick={() => {setSelectedPhotoIndex(idx);setSelectedImageId(String(image.id))}}
                  className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8f1722] ${
                    String(image.id)===selectedImageId ? 'border-[#8f1722] ring-2 ring-[#8f1722]/20' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={image.thumbnail_path||image.file_path} alt={`Photo ${idx+1} de ${vehicle.model}`} className="w-full h-full object-cover" />
                  {Boolean(image.is_primary)&&<span className="absolute bottom-0 inset-x-0 bg-[#8f1722]/90 text-white text-[9px] font-bold py-0.5">Principale</span>}
                </button>
              ))}
            </div>
          )}
          {canManageImages&&!stockLocked&&<div className="flex flex-col sm:flex-row sm:items-center gap-2"><label className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold text-center cursor-pointer">Ajouter des photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={addImages}/></label><div className="flex flex-wrap items-center gap-2"><span className="text-xs text-slate-500">{selectedImage?`Photo ${galleryImages.indexOf(selectedImage)+1} sélectionnée`:'Sélectionnez une photo'}</span><Button size="xs" variant="outline" disabled={!selectedImage||galleryImages.indexOf(selectedImage)===0} onClick={()=>void moveImage(-1)}>Monter</Button><Button size="xs" variant="outline" disabled={!selectedImage||galleryImages.indexOf(selectedImage)===galleryImages.length-1} onClick={()=>void moveImage(1)}>Descendre</Button><Button size="xs" variant="outline" disabled={!selectedImage||Boolean(selectedImage.is_primary)} loading={imageMutations.primary.isPending} onClick={setPrimaryImage}>Définir comme principale</Button><Button size="xs" variant="outline" disabled={!selectedImage} loading={imageMutations.remove.isPending} onClick={removeSelectedImage}>Supprimer</Button></div></div>}
        </div>

        {/* Commercial Highlights Card */}
        <Card className="flex flex-col justify-between">
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Prix de vente concession HT</span>
              <div className="text-3xl font-extrabold text-blue-700 mt-1">
                {formatCurrency(vehicle.sellingPriceHT,vehicle.currencyCode)}
              </div>
              <span className="text-xs text-slate-500">Prix commercial hors taxes configuré pour la concession</span>
            </div>

            <div className="space-y-2 text-xs">
              {canViewFinancials&&<div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Marge Brute Cible HT</span>
                <span className="font-bold text-emerald-600">{vehicle.targetMarginHT==null?'—':`+${formatCurrency(vehicle.targetMarginHT,vehicle.currencyCode)}`}</span>
              </div>}
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
                <span className="font-semibold text-slate-800">{vehicle.location||'Non affecté'}{vehicle.locationType?` · ${vehicle.locationType==='PARC'?'Parc':'Showroom'}`:''}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Fournisseur d'origine</span>
                <span className="font-semibold text-slate-800">{vehicle.supplier}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            {canCreateSale&&vehicle.status==='DISPONIBLE'&&<Button
              variant="primary"
              className="w-full"
              onClick={() => setActiveQuickActionModal('sale',{vehicleId:vehicle.id})}
            >
              Créer Vente
            </Button>}
            {canCreateRepairOrder&&<Button
              variant="outline"
              className="w-full"
              onClick={() => setActiveQuickActionModal('or',{vehicleId:vehicle.id})}
            >
              Ouvrir OR Atelier (SAV / Prépa)
            </Button>}
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
        ].filter(tab=>(tab.key!=='financials'||canViewFinancials)&&(tab.key!=='documents'||canViewDocuments)).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'border-red-800 text-red-900'
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
      {canViewFinancials && activeTab === 'financials' && (
        <Card>
          <CardHeader>
            <CardTitle>Décomposition Financière (Calcul de Prix de Revient et Marge Nette)</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Prix d'Achat HT</span>
              <div className="text-lg font-bold text-slate-900 mt-1">{vehicle.purchasePriceHT==null?'—':formatCurrency(vehicle.purchasePriceHT,vehicle.currencyCode)}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Frais Remise en État HT</span>
              <div className="text-lg font-bold text-amber-700 mt-1">{vehicle.refurbishCostHT==null?'—':`+${formatCurrency(vehicle.refurbishCostHT,vehicle.currencyCode)}`}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Transport HT</span>
              <div className="text-lg font-bold text-amber-700 mt-1">{vehicle.transportCost==null?'—':`+${formatCurrency(vehicle.transportCost,vehicle.currencyCode)}`}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Frais administratifs HT</span>
              <div className="text-lg font-bold text-amber-700 mt-1">{vehicle.administrativeCost==null?'—':`+${formatCurrency(vehicle.administrativeCost,vehicle.currencyCode)}`}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Autres frais HT</span>
              <div className="text-lg font-bold text-amber-700 mt-1">{vehicle.additionalCosts==null?'—':`+${formatCurrency(vehicle.additionalCosts,vehicle.currencyCode)}`}</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Prix de Revient Total HT</span>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {[vehicle.purchasePriceHT,vehicle.refurbishCostHT,vehicle.otherCostsHT].some(value=>value==null)?'—':formatCurrency(vehicle.purchasePriceHT!+vehicle.refurbishCostHT!+vehicle.otherCostsHT!,vehicle.currencyCode)}
              </div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-xs text-emerald-800 font-medium">Marge Nette Cible HT</span>
              <div className="text-lg font-bold text-emerald-700 mt-1">{vehicle.targetMarginHT==null?'—':`+${formatCurrency(vehicle.targetMarginHT,vehicle.currencyCode)}`}</div>
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
            {vehicleQuery.data?.movements?.map((event:any)=><div key={`movement-${event.id}`} className="flex gap-4 items-start"><div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0"><ArrowRight className="w-4 h-4"/></div><div><div className="font-bold text-slate-900">Mouvement : {event.movement_type}</div><p className="text-slate-500 text-[11px]">{event.from_location_name||event.from_agency_name||'Non affecté'} → {event.to_location_name||event.to_agency_name||'Non affecté'}</p><p className="text-[11px] text-slate-500">{event.reason||'Sans motif'} · {event.performed_by_name||'Système'}</p><span className="text-[10px] text-slate-400">{formatDate(event.moved_at)}</span></div></div>)}
            {!vehicleQuery.data?.statusHistory?.length&&!vehicleQuery.data?.movements?.length&&<p className="text-slate-500">Aucun historique enregistré.</p>}
          </div>
        </Card>
      )}

      {/* TAB 4: DOCUMENTS GED */}
      {activeTab === 'documents' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3"><CardTitle>Documents Électroniques (GED Automobile)</CardTitle>{canUploadDocuments&&!stockLocked&&<Button size="sm" icon={<UploadCloud className="h-4 w-4"/>} onClick={()=>setDocumentUploadOpen(true)}>Ajouter un document</Button>}</div>
          </CardHeader>
          <div className="divide-y divide-slate-100 text-xs">{vehicleQuery.data?.documents?.map((document:any)=><div key={document.id} className="py-3 flex items-center justify-between"><div className="flex items-center gap-3"><FileText className="w-5 h-5 text-red-800"/><div><div className="font-semibold text-slate-800">{document.file_name}</div><div className="text-[11px] text-slate-400">{document.document_type||document.mime_type} · {document.file_size?`${Math.round(document.file_size/1024)} Ko`:''}</div></div></div><Button size="xs" variant="outline" onClick={()=>downloadDocument(document)}>Télécharger</Button></div>)}{!vehicleQuery.data?.documents?.length&&<p className="py-6 text-center text-slate-500">Aucun document GED associé à ce véhicule.</p>}</div>
        </Card>
      )}
      {canUploadDocuments&&!stockLocked&&<UploadModal
        open={documentUploadOpen}
        close={()=>setDocumentUploadOpen(false)}
        initialEntity={{entityType:'vehicle',entityId:vehicle.id,agencyId:vehicle.agencyId,agencyName:vehicle.agencyName,label:`${vehicle.brand} ${vehicle.model} — ${vehicle.vin}`,businessId:vehicle.stockNumber}}
        onSuccess={()=>void vehicleQuery.refetch()}
      />}
      <Card><CardHeader><CardTitle>Dossiers associés</CardTitle></CardHeader><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{vehicleQuery.data?.reservations?.map((item:any)=><div key={`r-${item.id}`} className="rounded border p-3 text-xs"><b>Réservation</b><p>{item.customer_name||'Client protégé'} · {item.status}</p></div>)}{vehicleQuery.data?.sales?.map((item:any)=><div key={`s-${item.id}`} className="rounded border p-3 text-xs"><b>Vente {item.sale_number}</b><p>{item.customer_name||'Client protégé'} · {item.status}</p><Link className="font-bold text-[#8f1722]" to={`/sales/${item.id}`}>Voir la vente</Link></div>)}{vehicleQuery.data?.deliveries?.map((item:any)=><div key={`d-${item.id}`} className="rounded border p-3 text-xs"><b>Livraison {item.delivery_number}</b><p>{item.status}</p><Link className="font-bold text-[#8f1722]" to={`/deliveries/${item.id}`}>Voir la livraison</Link></div>)}{vehicleQuery.data?.repairOrders?.map((item:any)=><div key={`o-${item.id}`} className="rounded border p-3 text-xs"><b>OR {item.order_number}</b><p>{item.status}</p><Link className="font-bold text-[#8f1722]" to={`/service/repair-orders/${item.id}`}>Voir l’OR</Link></div>)}{vehicleQuery.data?.warranty&&<div className="rounded border p-3 text-xs"><b>Garantie constructeur</b><p>{vehicleQuery.data.warranty.provider_name_snapshot||vehicleQuery.data.warranty.provider_name||'Fournisseur non renseigné'}</p><p>{vehicleQuery.data.warranty.status} · échéance {vehicleQuery.data.warranty.expiry_date?formatDate(vehicleQuery.data.warranty.expiry_date):'à déterminer'}</p></div>}</div></Card>
      {canViewFinancials&&Boolean(vehicleQuery.data?.priceHistory?.length)&&<Card><CardHeader><CardTitle>Historique des prix</CardTitle></CardHeader><div className="divide-y text-xs">{vehicleQuery.data.priceHistory.map((item:any)=><div key={item.id} className="grid gap-1 py-3 sm:grid-cols-4"><span>{formatDate(item.changed_at)}</span><span>Vente : {formatCurrency(Number(item.old_sale_price),vehicle.currencyCode)} → {formatCurrency(Number(item.new_sale_price),vehicle.currencyCode)}</span><span>Minimum : {formatCurrency(Number(item.old_minimum_price),vehicle.currencyCode)} → {formatCurrency(Number(item.new_minimum_price),vehicle.currencyCode)}</span><span>{item.reason||'Sans motif'} · {item.changed_by_name||'Système'}</span></div>)}</div></Card>}
      {canArchive&&!['RESERVE','VENDU','LIVRE'].includes(vehicle.status)&&<div className="flex justify-end"><Button variant="danger" loading={archiveVehicle.isPending} onClick={()=>void archive()}>Archiver le véhicule</Button></div>}
      <VehicleTransferModal open={transferOpen} close={()=>setTransferOpen(false)} vehicle={vehicle}/>
      <EditVehicleModal isOpen={editOpen} onClose={()=>setEditOpen(false)} vehicle={vehicle}/>
    </div>
  );
};
