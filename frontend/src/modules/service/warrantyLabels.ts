import type{RepairOrder}from'../../types';
type Warranty=NonNullable<RepairOrder['warranty']>;
export const warrantyDecisionLabel:Record<Warranty['decisionStatus'],string>={PENDING:"En attente d'étude",APPROVED:'Prise en charge approuvée',REJECTED:'Prise en charge refusée'};
export const warrantyModeLabel:Record<NonNullable<Warranty['coverageMode']>,string>={FULL:'Prise en charge totale',PARTIAL:'Prise en charge partielle'};
export const warrantyAllocationLabel:Record<Warranty['allocationStatus'],string>={UNALLOCATED:'Répartition à définir',DRAFT:'Répartition en préparation',CONFIRMED:'Répartition confirmée',LEGACY_UNALLOCATED:'Répartition non définie'};
