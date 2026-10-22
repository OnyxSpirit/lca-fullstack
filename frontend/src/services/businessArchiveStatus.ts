import type{BusinessArchiveStatus}from'../types';

export const businessArchiveStatusLabel=(status:BusinessArchiveStatus|undefined)=>{
  switch(status){
    case'AVAILABLE':return'Archive disponible';
    case'FILE_MISSING':return'Fichier de l’archive indisponible';
    case'INTEGRITY_ERROR':return'Intégrité de l’archive invalide';
    case'STORAGE_UNAVAILABLE':return'Stockage documentaire temporairement inaccessible';
    case'HISTORICAL_ONLY':return'Archive historique uniquement';
    case'ARCHIVING':return'Archivage en cours';
    case'FAILED':return'Archivage en échec';
    default:return'Archive absente';
  }
};
