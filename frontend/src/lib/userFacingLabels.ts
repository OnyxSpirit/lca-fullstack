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
const financialStatuses:Record<string,string>={POSTED:'Enregistré',PENDING:'En attente',CANCELLED:'Annulé',REVERSED:'Contrepassé',VALIDATED:'Validé',DRAFT:'Brouillon',OPEN:'Ouvert',CLOSED:'Clôturé'};
export const financialStatusLabel=(value:unknown)=>financialStatuses[String(value??'').toUpperCase()]??explicitUnknown('Statut financier',value);
