import type {LucideIcon} from 'lucide-react';
import {Bell,BriefcaseBusiness,Car,FileCheck2,FileText,Package,Receipt,ShieldCheck,ShoppingCart,Store,Truck,UserRound,UsersRound,Wrench} from 'lucide-react';
import type {NotificationPriority,NotificationRecord} from '../../types/notifications';

export type NotificationCategory='crm'|'showroom'|'sales'|'vehicles'|'quotations'|'deliveries'|'workshop'|'parts'|'billing'|'payments'|'hr'|'security'|'other';
export type NotificationTone='neutral'|'info'|'important'|'critical';

export interface NotificationCategoryPresentation{label:string;icon:LucideIcon;iconClass:string;backgroundClass:string}
export const notificationCategoryPresentation:Record<NotificationCategory,NotificationCategoryPresentation>={
  crm:{label:'CRM',icon:UsersRound,iconClass:'text-sky-700',backgroundClass:'bg-sky-50'},
  showroom:{label:'Showroom',icon:Store,iconClass:'text-violet-700',backgroundClass:'bg-violet-50'},
  sales:{label:'Ventes',icon:ShoppingCart,iconClass:'text-emerald-700',backgroundClass:'bg-emerald-50'},
  vehicles:{label:'Véhicules',icon:Car,iconClass:'text-blue-700',backgroundClass:'bg-blue-50'},
  quotations:{label:'Devis',icon:FileCheck2,iconClass:'text-indigo-700',backgroundClass:'bg-indigo-50'},
  deliveries:{label:'Livraisons',icon:Truck,iconClass:'text-cyan-700',backgroundClass:'bg-cyan-50'},
  workshop:{label:'Atelier',icon:Wrench,iconClass:'text-orange-700',backgroundClass:'bg-orange-50'},
  parts:{label:'Pièces',icon:Package,iconClass:'text-amber-700',backgroundClass:'bg-amber-50'},
  billing:{label:'Facturation',icon:FileText,iconClass:'text-slate-700',backgroundClass:'bg-slate-100'},
  payments:{label:'Paiements',icon:Receipt,iconClass:'text-teal-700',backgroundClass:'bg-teal-50'},
  hr:{label:'Ressources humaines',icon:BriefcaseBusiness,iconClass:'text-fuchsia-700',backgroundClass:'bg-fuchsia-50'},
  security:{label:'Sécurité',icon:ShieldCheck,iconClass:'text-rose-700',backgroundClass:'bg-rose-50'},
  other:{label:'Information',icon:Bell,iconClass:'text-slate-600',backgroundClass:'bg-slate-100'},
};

const eventLabels:Record<string,string>={
  'crm.lead_assigned':'Activité CRM','showroom.visitor_assigned':'Visiteur affecté','showroom.test-drive-planned':'Essai du véhicule planifié','showroom.test-drive-started':'Essai du véhicule démarré',
  'vehicles.created':'Nouveau véhicule','vehicles.status-changed':'Statut du véhicule mis à jour','vehicles.transferred':'Véhicule transféré',
  'sale.created':'Nouvelle vente enregistrée','sale.cancelled':'Vente annulée','sale.ready_for_delivery':'Vente prête pour livraison','quotation.created':'Nouveau devis commercial',
  'delivery.status_changed':'Activité de livraison','workshop.status_changed':'Activité de l’atelier',
  'parts.internal_request.created':'Demande de pièces créée','parts.internal_delivery.dispatched':'Pièces remises au SAV','parts.internal_delivery.received':'Réception SAV confirmée','parts.return.declared':'Retour SAV déclaré',
  'payment.received':'Paiement reçu','invoice.paid':'Facture soldée','hr.expense.cancelled':'Dépense annulée',
  'auth.2fa.enabled':'Double authentification activée','auth.2fa.disabled':'Double authentification désactivée','auth.2fa.recovery_used':'Code de récupération utilisé',
  'auth.2fa.requirement_changed':'Obligation de double authentification modifiée','auth.2fa.admin_reset':'Double authentification réinitialisée','auth.2fa.role_policy_changed':'Politique de double authentification modifiée','auth.2fa.trusted_device_revoked':'Appareil de confiance révoqué',
};

const exactTitleTranslations:Record<string,string>={
  'Nouvelle vente':'Nouvelle vente enregistrée','Statut atelier mis à jour':'Statut de l’atelier mis à jour','Nouvelle demande de pièces SAV':'Demande de pièces créée',
};
const crmStages:Record<string,string>={new:'Nouveau',qualified:'Qualifié',appointment:'Rendez-vous',test_drive:'Essai du véhicule',offer:'Offre commerciale',negotiation:'Négociation',won:'Gagné',lost:'Perdu'};
const saleStatuses:Record<string,string>={cancelled:'Annulée',ready_for_delivery:'Prête pour livraison'};
const workshopStatuses:Record<string,string>={planned:'Planifié',received:'Réceptionné',diagnosis:'Diagnostic',waiting_approval:'En attente d’approbation',in_progress:'En cours',quality_control:'Contrôle qualité',ready:'Prêt',invoiced:'Facturé',abandonment_pending:'Abandon en cours',abandoned:'Abandonné'};
const bonusStatuses:Record<string,string>={draft:'Brouillon',pending:'En attente',approved:'Approuvée',rejected:'Refusée',paid:'Payée',cancelled:'Annulée'};

export const notificationPriorityPresentation:Record<NotificationPriority,{label:string;tone:NotificationTone;className:string}>={
  low:{label:'Discrète',tone:'neutral',className:'bg-slate-50 text-slate-600 border-slate-200'},
  normal:{label:'Information',tone:'info',className:'bg-sky-50 text-sky-700 border-sky-200'},
  high:{label:'Important',tone:'important',className:'bg-amber-50 text-amber-800 border-amber-200'},
  urgent:{label:'Critique',tone:'critical',className:'bg-rose-50 text-rose-700 border-rose-200'},
};

export function notificationCategory(eventType:string|null,referenceType:string|null):NotificationCategory{
  const event=eventType??'',reference=referenceType??'';
  if(event.startsWith('auth.'))return'security';if(event.startsWith('employee_bonus.')||event.startsWith('hr.')||['employee_bonus','budget_expense'].includes(reference))return'hr';
  if(event.startsWith('parts.'))return'parts';if(event.startsWith('quotation.'))return'quotations';if(event.startsWith('payment.')||reference==='payment')return'payments';if(event.startsWith('invoice.')||reference==='invoice')return'billing';
  if(event.startsWith('workshop.')||reference==='repair_order')return'workshop';if(event.startsWith('delivery.')||reference==='delivery')return'deliveries';if(event.startsWith('vehicles.')||reference==='vehicle')return'vehicles';
  if(event.startsWith('sale.')||reference==='sale')return'sales';if(event.startsWith('showroom.')||reference==='showroom')return'showroom';if(event.startsWith('crm.')||reference==='lead')return'crm';return'other';
}

export function translateNotificationTitle(subject:string,eventType:string|null){const clean=subject.trim();if(clean&&clean!==eventType)return exactTitleTranslations[clean]??clean;return eventLabels[eventType??'']??'Nouvelle information';}

/** Traductions limitées à des phrases produites par un événement identifié. Aucun remplacement global dans du texte libre. */
export function translateNotificationMessage(message:string,eventType:string|null){
  if(!message)return'';const event=eventType??'';
  if(event==='crm.lead_assigned')return message.replace(/(à l[’']étape\s+)(new|qualified|appointment|test_drive|offer|negotiation|won|lost)(\.?$)/,(_all,prefix,value,suffix)=>`${prefix}${crmStages[value]??value}${suffix}`);
  if(event.startsWith('sale.'))return message.replace(/(au statut\s+)(cancelled|ready_for_delivery)(\.?$)/,(_all,prefix,value,suffix)=>`${prefix}${saleStatuses[value]??value}${suffix}`);
  if(event==='workshop.status_changed')return message.replace(/:\s*(planned|received|diagnosis|waiting_approval|in_progress|quality_control|ready|invoiced|abandonment_pending|abandoned)\.?$/,(_all,value)=>`: ${workshopStatuses[value]??value}`);
  if(event.startsWith('employee_bonus.'))return message.replace(/\best\s+(draft|pending|approved|rejected|paid|cancelled)\.?$/,(_all,value)=>`est ${String(bonusStatuses[value]??value).toLowerCase()}.`);
  return message;
}

export function notificationPresentation(notification:Pick<NotificationRecord,'subject'|'message'|'eventType'|'referenceType'|'priority'>){
  const category=notificationCategory(notification.eventType,notification.referenceType),categoryInfo=notificationCategoryPresentation[category],priority=notificationPriorityPresentation[notification.priority];
  return{category,categoryLabel:categoryInfo.label,Icon:categoryInfo.icon,iconClass:categoryInfo.iconClass,iconBackgroundClass:categoryInfo.backgroundClass,title:translateNotificationTitle(notification.subject,notification.eventType),message:translateNotificationMessage(notification.message,notification.eventType),priorityLabel:priority.label,priorityClass:priority.className,tone:priority.tone,eventLabel:eventLabels[notification.eventType??'']??'Information métier'};
}

const businessDestinations:Record<string,string>={sale:'Consulter la vente',delivery:'Consulter la livraison',repair_order:'Consulter l’ordre de réparation',invoice:'Consulter la facture',part:'Consulter la pièce',vehicle:'Consulter le véhicule',customer:'Consulter le client'};
export const notificationNavigationLabel=(referenceType:string|null)=>referenceType?businessDestinations[referenceType]??null:null;
export const notificationReferenceLabel=(referenceType:string|null)=>({sale:'Vente',delivery:'Livraison',repair_order:'Ordre de réparation',invoice:'Facture',part:'Pièce',vehicle:'Véhicule',customer:'Client',lead:'Prospect',showroom:'Visite showroom',payment:'Paiement',credit_note:'Avoir',document:'Document',purchase_order:'Commande fournisseur',employee_bonus:'Prime',budget_expense:'Dépense',user:'Utilisateur'}[referenceType??'']??'Référence');
