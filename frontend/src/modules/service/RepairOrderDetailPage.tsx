import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Wrench,
  Printer,
  CheckCircle2,
  Receipt,
  User,
  Car,
  Clock,
  Plus,
  Trash2,
  ShieldCheck,
  Fuel,
  Package,
} from 'lucide-react';
import { useAddRepairItem, useAssignRepairOrder, useCreateInvoice, usePartsQuery, useRepairDetailQuery, useRepairOrdersQuery, useRepairStatusMutation, useTechniciansQuery } from '../../api/erpHooks';
import { repairOrderStatusToDb } from '../../services/mysqlStatusMap';
import { useUiStore } from '../../stores/uiStore';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { RepairOrderStatus } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { openBusinessPdf } from '../../services/businessPdf';

export const RepairOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const repairOrdersQuery=useRepairOrdersQuery(),repairOrders=repairOrdersQuery.data??[],spareParts=usePartsQuery().data??[]; const detailQuery=useRepairDetailQuery(id); const repairStatus=useRepairStatusMutation(); const createInvoice=useCreateInvoice();
  const { addToast } = useUiStore();

  const summary = repairOrders.find((o) => o.id === id); const raw=detailQuery.data;
  const repairOrder = summary ? {...summary,diagnosticNotes:raw?.diagnosis_summary??summary.diagnosticNotes,estimatedTotalTTC:Number(raw?.estimated_total??summary.estimatedTotalTTC),finalTotalTTC:Number(raw?.actual_total??summary.finalTotalTTC),operations:(raw?.items??[]).filter((item:any)=>item.item_type==='labor').map((item:any)=>({id:String(item.id),code:`MO-${item.id}`,description:item.description,estimatedHours:Number(item.quantity),actualHours:Number(item.quantity),hourlyRateHT:Number(item.unit_price),status:'Planifie'})),parts:(raw?.items??[]).filter((item:any)=>item.item_type==='part').map((item:any)=>({partId:String(item.part_id),partReference:item.part_reference??'',description:item.description,quantity:Number(item.quantity),unitPriceHT:Number(item.unit_price)}))} : undefined;

  const [activeTab, setActiveTab] = useState<'operations' | 'parts' | 'reception' | 'diagnostic'>('operations');
  const [selectedPartRef, setSelectedPartRef] = useState(spareParts[0]?.reference || '');
  const [partQty, setPartQty] = useState(1);
  const [laborDescription,setLaborDescription]=useState('');const[laborHours,setLaborHours]=useState(1);const[laborRate,setLaborRate]=useState(35000);const addItem=useAddRepairItem();
  const technicians=useTechniciansQuery().data??[];const assign=useAssignRepairOrder();const[technicianId,setTechnicianId]=useState('');const[startsAt,setStartsAt]=useState('');const[endsAt,setEndsAt]=useState('');
  useEffect(()=>{if(!selectedPartRef&&spareParts[0])setSelectedPartRef(spareParts[0].reference)},[spareParts,selectedPartRef]);
  useEffect(()=>{if(!technicianId&&technicians[0])setTechnicianId(String(technicians[0].id))},[technicians,technicianId]);

  if (repairOrdersQuery.isLoading || detailQuery.isLoading) return <div className="p-8 text-sm text-slate-500">Chargement de l’ordre de réparation…</div>;
  if (!repairOrder || detailQuery.isError) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">Ordre de réparation introuvable.</p>
        <Button variant="outline" onClick={() => navigate('/service')}>
          Retour au SAV
        </Button>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: RepairOrderStatus) => {
    const status=repairOrderStatusToDb[newStatus]; try { if(status) await repairStatus.mutateAsync({id:repairOrder.id,status}); addToast({
      type: 'success',
      title: 'Statut OR mis à jour',
      description: `L'ordre de réparation passe au statut ${newStatus}.`,
    }); }catch(error){addToast({type:'error',title:'Transition impossible',description:error instanceof Error?error.message:'Erreur API'});}
  };

  const handleGenerateInvoice = async () => {
    const totalHT = (repairOrder.finalTotalTTC || 400) / 1.2;
    const totalTVA = totalHT * 0.2;
    const totalTTC = repairOrder.finalTotalTTC || 400;

    try { await createInvoice.mutateAsync({
      invoiceType: 'workshop',
      customerId: repairOrder.customerId,
      agencyId: repairOrder.agencyId,
      repairOrderId: repairOrder.id,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      items: [{ description: `Intervention atelier ${repairOrder.orNumber}`, quantity: 1, unitPrice: totalHT, taxRate: 20 }],
    });

    await handleStatusChange('FACTURE');

    addToast({
      type: 'success',
      title: 'Facture Atelier générée !',
      description: `Facture de ${formatCurrency(totalTTC)} TTC émise pour ${repairOrder.customerName}.`,
    });

    navigate('/billing'); }catch(error){addToast({type:'error',title:'Facturation impossible',description:error instanceof Error?error.message:'Erreur API'});}
  };
  const addLabor=async(e:React.FormEvent)=>{e.preventDefault();try{await addItem.mutateAsync({repairOrderId:id,itemType:'labor',description:laborDescription,quantity:laborHours,unitPrice:laborRate,taxRate:18.9});setLaborDescription('');addToast({type:'success',title:'Opération ajoutée',description:'La main-d’œuvre a été enregistrée sur l’OR.'})}catch(error){addToast({type:'error',title:'Ajout impossible',description:error instanceof Error?error.message:'Erreur API'})}};
  const addPart=async(e:React.FormEvent)=>{e.preventDefault();const part=spareParts.find(p=>p.reference===selectedPartRef);if(!part)return;try{await addItem.mutateAsync({repairOrderId:id,itemType:'part',partId:part.id,description:part.name,quantity:partQty,unitPrice:part.sellingPriceHT,taxRate:part.tvaRate});addToast({type:'success',title:'Pièce ajoutée',description:'La pièce a été consommée et le stock mis à jour.'})}catch(error){addToast({type:'error',title:'Ajout impossible',description:error instanceof Error?error.message:'Erreur API'})}};
  const schedule=async(e:React.FormEvent)=>{e.preventDefault();try{await assign.mutateAsync({repairOrderId:id,technicianId,startsAt:new Date(startsAt).toISOString(),endsAt:new Date(endsAt).toISOString()});addToast({type:'success',title:'Technicien affecté',description:'L’intervention apparaît maintenant dans le planning atelier.'})}catch(error){addToast({type:'error',title:'Affectation impossible',description:error instanceof Error?error.message:'Erreur API'})}};

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Ordre de Réparation : ${repairOrder.orNumber}`}
        subtitle={`Client : ${repairOrder.customerName} • Véhicule : ${repairOrder.vehicleModel} (${repairOrder.vehiclePlate})`}
        breadcrumbs={[
          { label: 'Accueil', href: '/dashboard' },
          { label: 'Après-Vente', href: '/service' },
          { label: repairOrder.orNumber },
        ]}
        badge={<StatusBadge status={repairOrder.status} type="or" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={repairOrder.status}
              onChange={(e) => handleStatusChange(e.target.value as RepairOrderStatus)}
              className="text-xs font-bold p-2 rounded-lg border border-slate-300 bg-white focus:outline-none"
            >
              <option value="PLANIFIE">Statut : Planifié</option>
              <option value="RECEPTIONNE">Statut : Réceptionné</option>
              <option value="DIAGNOSTIC">Statut : En diagnostic</option>
              <option value="EN_COURS">Statut : Travaux en cours</option>
              <option value="CONTROLE_QUALITE">Statut : Contrôle qualité</option>
              <option value="PRET_FACTURATION">Statut : Prêt à facturer</option>
              <option value="FACTURE">Statut : Facturé</option>
              <option value="CLOTURE">Statut : Clôturé</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={() => openBusinessPdf('repair_order',repairOrder.id).catch(error=>addToast({type:'error',title:'PDF indisponible',description:error.message}))}
            >
              Imprimer OR
            </Button>

            {repairOrder.status !== 'FACTURE' && repairOrder.status !== 'CLOTURE' && (
              <Button
                variant="primary"
                size="sm"
                icon={<Receipt className="w-4 h-4" />}
                onClick={handleGenerateInvoice}
              >
                Générer Facture Atelier
              </Button>
            )}
          </div>
        }
      />

      <Card><CardHeader><CardTitle>Affectation au planning</CardTitle></CardHeader><form onSubmit={schedule} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"><label className="text-xs font-semibold">Technicien<select required value={technicianId} onChange={e=>setTechnicianId(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2">{technicians.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label className="text-xs font-semibold">Début<input required type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2"/></label><label className="text-xs font-semibold">Fin<input required type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2"/></label><Button type="submit" loading={assign.isPending} disabled={!technicianId||!startsAt||!endsAt}>Affecter</Button></form></Card>

      {/* Top Details Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informations Dossier & Réception Atelier</CardTitle>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Client</span>
                <span className="font-bold text-slate-900">{repairOrder.customerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Téléphone</span>
                <span className="font-semibold text-slate-800">{repairOrder.customerPhone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Conseiller SAV</span>
                <span className="font-semibold text-slate-800">{repairOrder.advisorName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Date RDV</span>
                <span className="font-semibold text-slate-800">{repairOrder.appointmentDate}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Véhicule</span>
                <span className="font-bold text-slate-900">{repairOrder.vehicleModel}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Immatriculation / VIN</span>
                <span className="font-mono font-bold text-slate-800">{repairOrder.vehiclePlate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Technicien / Pont</span>
                <span className="font-semibold text-slate-800">{repairOrder.technicianName} ({repairOrder.bayNumber})</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Garantie Constructeur</span>
                <Badge variant={repairOrder.warrantyCovered ? 'success' : 'default'} size="sm">
                  {repairOrder.warrantyCovered ? 'Prise en charge' : 'Facturation Client'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
            <span className="font-bold text-amber-900 block mb-1">Motif de visite / Symptômes signalés :</span>
            <p className="text-amber-800">{repairOrder.symptomsReported}</p>
          </div>
        </Card>

        {/* Financial Recap Box */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader>
              <CardTitle>Totalisation Atelier SAV</CardTitle>
            </CardHeader>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Total Main d'Œuvre HT</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(
                    repairOrder.operations.reduce((acc, op) => acc + op.estimatedHours * op.hourlyRateHT, 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Total Pièces Détachées HT</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(
                    repairOrder.parts.reduce((acc, p) => acc + p.quantity * p.unitPriceHT, 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">TVA (20%)</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency((repairOrder.finalTotalTTC || 380) * 0.2 / 1.2)}
                </span>
              </div>
              <div className="flex justify-between py-2 font-bold text-base text-slate-900 border-t border-slate-200">
                <span>Total TTC Final</span>
                <span className="text-blue-700">{formatCurrency(repairOrder.finalTotalTTC || 380)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            {repairOrder.courtesyCarAssigned && (
              <div className="p-2.5 bg-blue-50 text-blue-900 rounded-lg text-xs flex items-center gap-2 mb-3">
                <Car className="w-4 h-4 text-blue-600" />
                <span>Véhicule de prêt : <strong>{repairOrder.courtesyCarAssigned}</strong></span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Tabs for Operations & Parts */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { key: 'operations', label: `Main d'Œuvre & Barèmes (${repairOrder.operations.length})` },
          { key: 'parts', label: `Pièces de Rechange Consommées (${repairOrder.parts.length})` },
          { key: 'reception', label: 'Checklist État Véhicule' },
          { key: 'diagnostic', label: 'Rapport Diagnostic' },
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

      {/* TAB 1: OPERATIONS */}
      {activeTab === 'operations' && (
        <div className="space-y-4"><Card><form onSubmit={addLabor} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"><label className="md:col-span-2 text-xs font-semibold">Opération<input required value={laborDescription} onChange={e=>setLaborDescription(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2" placeholder="Diagnostic, vidange…"/></label><label className="text-xs font-semibold">Heures<input required min="0.1" step="0.1" type="number" value={laborHours} onChange={e=>setLaborHours(Number(e.target.value))} className="mt-1 w-full rounded-md border border-slate-300 p-2"/></label><div><label className="text-xs font-semibold">Tarif horaire XAF<input required min="0" type="number" value={laborRate} onChange={e=>setLaborRate(Number(e.target.value))} className="mt-1 w-full rounded-md border border-slate-300 p-2"/></label><Button className="mt-2 w-full" type="submit" loading={addItem.isPending}>Ajouter</Button></div></form></Card><Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-4">Code Opération</th>
                  <th className="py-2.5 px-4">Description Travaux</th>
                  <th className="py-2.5 px-4">Temps Barème (h)</th>
                  <th className="py-2.5 px-4">Temps Passé (h)</th>
                  <th className="py-2.5 px-4">Taux Horaire HT</th>
                  <th className="py-2.5 px-4">Total HT</th>
                  <th className="py-2.5 px-4">Statut Opération</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {repairOrder.operations.map((op) => (
                  <tr key={op.id}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{op.code}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{op.description}</td>
                    <td className="py-3 px-4 font-semibold">{op.estimatedHours} h</td>
                    <td className="py-3 px-4">{op.actualHours} h</td>
                    <td className="py-3 px-4">{formatCurrency(op.hourlyRateHT)}/h</td>
                    <td className="py-3 px-4 font-bold text-blue-700">
                      {formatCurrency(op.estimatedHours * op.hourlyRateHT)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={op.status === 'Termine' ? 'success' : op.status === 'En_Cours' ? 'warning' : 'default'} size="sm">
                        {op.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card></div>
      )}

      {/* TAB 2: SPARE PARTS */}
      {activeTab === 'parts' && (
        <div className="space-y-4"><Card><form onSubmit={addPart} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"><label className="md:col-span-2 text-xs font-semibold">Pièce<select required value={selectedPartRef} onChange={e=>setSelectedPartRef(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2">{spareParts.map(p=><option key={p.id} value={p.reference}>{p.reference} — {p.name} — stock {p.stockQuantity}</option>)}</select></label><label className="text-xs font-semibold">Quantité<input required min="1" type="number" value={partQty} onChange={e=>setPartQty(Number(e.target.value))} className="mt-1 w-full rounded-md border border-slate-300 p-2"/></label><Button type="submit" loading={addItem.isPending}>Ajouter à l’OR</Button></form></Card><Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-4">Référence Pièce</th>
                  <th className="py-2.5 px-4">Désignation</th>
                  <th className="py-2.5 px-4">Quantité</th>
                  <th className="py-2.5 px-4">Prix Unitaire HT</th>
                  <th className="py-2.5 px-4">Total HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {repairOrder.parts.map((p, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{p.partReference}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{p.description}</td>
                    <td className="py-3 px-4 font-bold">{p.quantity}</td>
                    <td className="py-3 px-4">{formatCurrency(p.unitPriceHT)}</td>
                    <td className="py-3 px-4 font-bold text-blue-700">{formatCurrency(p.quantity * p.unitPriceHT)}</td>
                  </tr>
                ))}
                {repairOrder.parts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Aucune pièce détachée ajoutée à cet OR.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card></div>
      )}

      {/* TAB 3: RECEPTION CHECKLIST */}
      {activeTab === 'reception' && (
        <Card>
          <CardHeader>
            <CardTitle>État des Lieux à la Réception du Véhicule</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium block mb-1">Niveau Carburant</span>
              <div className="font-bold text-slate-900">{repairOrder.receptionChecklist.fuelLevel}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium block mb-1">État de Propreté</span>
              <div className="font-bold text-slate-900">{repairOrder.receptionChecklist.cleanliness}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium block mb-1">Dommages Carrosserie Constatés</span>
              <div className="font-bold text-slate-900">{repairOrder.receptionChecklist.bodyworkDamage}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium block mb-1">Objets & Documents laissés à bord</span>
              <div className="font-bold text-slate-900">{repairOrder.receptionChecklist.itemsInVehicle}</div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 4: DIAGNOSTIC */}
      {activeTab === 'diagnostic' && (
        <Card>
          <CardHeader>
            <CardTitle>Notes de Diagnostic & Constatations Mécanicien</CardTitle>
          </CardHeader>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs leading-relaxed text-slate-800">
            {repairOrder.diagnosticNotes || 'Diagnostic en cours par le technicien assigné.'}
          </div>
        </Card>
      )}
    </div>
  );
};
