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
