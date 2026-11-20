const activityTypeLabels:Record<string,string>={
  call:'Appel téléphonique',
  email:'E-mail',
  appointment:'Rendez-vous',
  meeting:'Rendez-vous',
  visit:'Visite',
  test_drive:'Essai routier',
  note:'Note',
};

const activityStatusLabels:Record<string,string>={
  planned:'Planifiée',
  pending:'En attente',
  in_progress:'En cours',
  completed:'Terminée',
  cancelled:'Annulée',
};

const quotationStatusLabels:Record<string,string>={
  draft:'Brouillon',
  sent:'Émis',
  negotiation:'En négociation',
  accepted:'Accepté',
  rejected:'Refusé',
  cancelled:'Annulé',
  expired:'Expiré',
  converted:'Converti en vente',
};

const testDriveStatusLabels:Record<string,string>={
  planned:'Planifié',
  in_progress:'En cours',
  completed:'Terminé',
  cancelled:'Annulé',
};

const explicitUnknown=(kind:string,value:unknown)=>{
  const raw=String(value??'').trim();
  return raw?`${kind} non reconnu (${raw})`:`${kind} non renseigné`;
};

export const activityTypeLabel=(value:unknown)=>activityTypeLabels[String(value??'').toLowerCase()]??explicitUnknown('Type d’activité',value);
export const activityStatusLabel=(value:unknown)=>activityStatusLabels[String(value??'').toLowerCase()]??explicitUnknown('Statut d’activité',value);
export const quotationStatusLabel=(value:unknown)=>quotationStatusLabels[String(value??'').toLowerCase()]??explicitUnknown('Statut du devis',value);
export const testDriveStatusLabel=(value:unknown)=>testDriveStatusLabels[String(value??'').toLowerCase()]??explicitUnknown('Statut de l’essai',value);

const financialLabels:Record<string,string>={issued:'Factures émises',cancelled:'Factures annulées',credits:'Avoirs',collections:'Encaissements',refunds:'Remboursements',receivables:'Créances clients',customerCreditBalances:'Soldes créditeurs clients',netBilling:'Facturation nette',netCollections:'Encaissements nets',initialEnvelope:'Enveloppe initiale',additionalEnvelope:'Rallonges budgétaires',commitments:'Engagements',paid:'Montant décaissé',totalEnvelope:'Enveloppe totale',remainingToPay:'Reste à payer',availableForCommitments:'Disponible pour nouveaux engagements',prepared:'Préparé',validated:'Validé',bonuses:'Primes',engaged:'Engagé',remaining:'Solde restant',accountCount:'Nombre de comptes',eligibleCash:'Trésorerie éligible',activeReservations:'Réservations actives',remainingCommitments:'Engagements restant à payer',unallocatedCash:'Liquidités non affectées',reservationCovered:'Engagements couverts par réservation',unreservedCommitments:'Engagements non réservés',indicativeShortfall:'Insuffisance indicative',active:'Actif',closed:'Clôturé',invoices:'Factures fournisseurs',netInvoices:'Factures fournisseurs nettes'};
export const financialLabel=(value:unknown)=>financialLabels[String(value??'')]??explicitUnknown('Indicateur financier',value);
const financialStatuses:Record<string,string>={POSTED:'Comptabilisé',PENDING:'En attente',CANCELLED:'Annulé',REVERSED:'Contrepassé',VALIDATED:'Validé',DRAFT:'Brouillon',SUBMITTED:'Soumis',PROCESSING:'Traitement en cours',IN_PROGRESS:'En cours',FAILED:'Échec',REGULARIZE:'À régulariser',ACTIVE:'Actif',INACTIVE:'Inactif',OPEN:'Ouvert',CLOSED:'Clôturé',APPROVED:'Approuvé',REJECTED:'Refusé',COMPLETED:'Terminé',CONFIRMED:'Confirmé',AUTHORIZED:'Autorisé',REVOKED:'Révoqué',ISSUED:'Émise',PARTIAL:'Partiel',PARTIALLY_PAID:'Partiellement payée',UNPAID:'Non réglée',PAID:'Payée',REFUNDED:'Remboursé',APPLIED:'Appliqué',DECLARED:'Déclaré',OVERDUE:'Échu',RESERVED:'Réservé',PREPARATION:'En préparation',READY_FOR_DELIVERY:'Prêt pour livraison',DELIVERED:'Livré',PLANNED:'Planifié',QUALITY_CONTROL:'Contrôle qualité',READY:'Prêt',INVOICED:'Facturé',DIAGNOSIS:'Diagnostic',WAITING_APPROVAL:'En attente d’approbation',ELIGIBLE_CONTRACTUALLY:'Éligible selon le contrat',NO_ACTIVE_CONTRACT:'Aucun contrat actif',EXPIRED:'Contrat expiré',MILEAGE_EXCEEDED:'Limite kilométrique dépassée',EN_ATTENTE_RECEPTION:'En attente de réception',CONFIRME:'Confirmé',REFUSE:'Refusé',ANNULE:'Annulé',BALANCED_IN:'Équilibré par une entrée',BALANCED_OUT:'Équilibré par une sortie'};
export const financialStatusLabel=(value:unknown)=>financialStatuses[String(value??'').toUpperCase()]??explicitUnknown('Statut financier',value);

const savEventLabels:Record<string,string>={OR_DRAFT:'Ordre de réparation créé',OR_OPEN:'Ordre de réparation ouvert',OR_PLANIFIE:'Ordre de réparation planifié',OR_RECEPTIONNE:'Véhicule réceptionné',OR_DIAGNOSTIC:'Diagnostic',OR_WAITING_APPROVAL:'En attente d’approbation',OR_APPROVED:'Devis approuvé',OR_IN_PROGRESS:'Travaux en cours',OR_READY:'Véhicule prêt',OR_INVOICED:'Ordre facturé',OR_DELIVERED:'Véhicule restitué',OR_CLOSED:'Ordre clôturé',OR_CANCELLED:'Ordre annulé',OR_ABANDONED:'Ordre abandonné',PAIEMENT:'Paiement',TRANSFERT_INITIE:'Transfert initié',TRANSFERT_CONFIRME:'Transfert confirmé',TRANSFERT_REFUSE:'Transfert refusé',TRANSFERT_ANNULE:'Transfert annulé'};
export const savEventLabel=(value:unknown)=>savEventLabels[String(value??'').toUpperCase()]??explicitUnknown('Type d’opération SAV',value);
export const savEventOptions=Object.entries(savEventLabels).map(([value,label])=>({value,label}));

const accountingCodes:Record<string,string>={BALANCE_SHEET:'Bilan',INCOME_STATEMENT:'Compte de résultat',CASH_FLOW:'Tableau des flux de trésorerie',NOTES:'Notes annexes',TO_VERIFY:'À vérifier',PREPARATORY:'Préparatoire',PREVIEW:'Aperçu',IMPORT:'Import',EXPORT:'Export',BOTH:'Import et export',CONTINUOUS:'Continue',EXACT:'Correspondance exacte',AMOUNT_DIFFERENCE:'Écart de montant',DATE_DIFFERENCE:'Écart de date',AMOUNT_AND_DATE_DIFFERENCE:'Écarts de montant et de date',CERTAIN:'Certain',PROBABLE:'Probable',MANUAL:'Manuel',BANK_FEE:'Frais bancaires',COMMISSION:'Commission',MISSING_ERP_OPERATION:'Opération ERP manquante',OUTSTANDING_RECEIPT:'Encaissement en attente',OUTSTANDING_CHEQUE:'Chèque en circulation',TRANSFER_IN_TRANSIT:'Transfert en cours',UNKNOWN:'À qualifier',OTHER:'Autre',ACTIVE:'Actif',DISABLED:'Désactivé'};
export const accountingCodeLabel=(value:unknown)=>accountingCodes[String(value??'').toUpperCase()]??financialStatuses[String(value??'').toUpperCase()]??explicitUnknown('Valeur comptable',value);
export const accountingDiscrepancyOptions=['BANK_FEE','COMMISSION','DATE_DIFFERENCE','AMOUNT_DIFFERENCE','MISSING_ERP_OPERATION','OUTSTANDING_RECEIPT','OUTSTANDING_CHEQUE','TRANSFER_IN_TRANSIT','UNKNOWN','OTHER'].map(value=>({value,label:accountingCodeLabel(value)}));

const partsCodes:Record<string,string>={OPEN:'Ouvert',DRAFT:'Brouillon',SENT:'Envoyée',CONFIRMED:'Confirmée',PARTIALLY_RECEIVED:'Partiellement réceptionnée',RECEIVED:'Réceptionnée',CANCELLED:'Annulée',SUBMITTED:'Soumise',VALIDATED:'Validée',REJECTED:'Refusée',PARTIALLY_PAID:'Partiellement réglée',PAID:'Réglée',DIRECT:'Achat direct',URGENT:'Achat urgent',OCCASIONAL:'Achat occasionnel',SUPPLIER_CREDIT:'Crédit fournisseur',AGENT_ADVANCE:'Avance d’un agent',CENTRAL_DISBURSEMENT:'Décaissement central',RESERVED:'Réservée',RELEASED:'Remise effectuée',GOOD:'Bon état',DAMAGED:'Endommagée',DEFECTIVE:'Défectueuse',UNUSABLE:'Inutilisable',PENDING:'En attente',PREPARED:'Préparée',PARTIALLY_PREPARED:'Partiellement préparée',DISPATCHED:'Expédiée',PARTIALLY_DELIVERED:'Partiellement livrée',DELIVERED:'Livrée',RESTOCKED:'Réintégrée au stock',QUARANTINED:'Mise en quarantaine',SUPPLIER_RETURN:'Retour fournisseur',SCRAPPED:'Mise au rebut',EXCHANGED:'Échangée',NONE:'Aucune',CREDIT:'Avoir',REFUND:'Remboursement',PARTIAL_REFUND:'Remboursement partiel',EXCHANGE:'Échange',PURCHASE:'Achat fournisseur',REPAIR_ORDER:'Ordre de réparation',TRANSFER_IN:'Transfert entrant',TRANSFER_OUT:'Transfert sortant',INVENTORY:'Inventaire',ADJUSTMENT:'Ajustement',RETURN:'Retour',SALE:'Vente',RESERVATION:'Réservation',RELEASE:'Libération de réservation'};
export const partsCodeLabel=(value:unknown)=>partsCodes[String(value??'').toUpperCase()]??explicitUnknown('Valeur Pièces',value);
export const directPurchaseStatusOptions=['OPEN','PARTIALLY_RECEIVED','RECEIVED','CANCELLED'].map(value=>({value,label:partsCodeLabel(value)}));
export const directPurchaseKindOptions=['DIRECT','URGENT','OCCASIONAL'].map(value=>({value,label:partsCodeLabel(value)}));
export const directPurchaseFundingOptions=['SUPPLIER_CREDIT','AGENT_ADVANCE','CENTRAL_DISBURSEMENT'].map(value=>({value,label:partsCodeLabel(value)}));

const vehicleTransferStatuses:Record<string,string>={PENDING_SHIPMENT:'En attente d’expédition',IN_TRANSIT:'En transit',RECEIVED:'Réceptionné',RETURN_REQUIRED:'Retour requis',RETURNED:'Retourné',CANCELLED:'Annulé'};
export const vehicleTransferStatusLabel=(value:unknown)=>vehicleTransferStatuses[String(value??'').toUpperCase()]??explicitUnknown('Statut du transfert',value);
const resourceStatuses:Record<string,string>={available:'Disponible',occupied:'Occupé',inactive:'Inactif'};
export const resourceStatusLabel=(value:unknown)=>resourceStatuses[String(value??'').toLowerCase()]??explicitUnknown('Statut de la ressource',value);
