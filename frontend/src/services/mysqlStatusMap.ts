import type { DeliveryStatus, InvoiceStatus, LeadStage, RepairOrderStatus, SaleStatus, VehicleStatus } from '../types';

export type DbVehicleStatus = 'ordered' | 'in_transit' | 'received' | 'preparation' | 'available' | 'reserved' | 'sold' | 'delivered';
export type DbOpportunityStage = 'new' | 'contacted' | 'qualified' | 'appointment' | 'test_drive' | 'offer' | 'negotiation' | 'won' | 'lost';
export type DbRepairOrderStatus = 'planned' | 'received' | 'diagnosis' | 'waiting_approval' | 'in_progress' | 'quality_control' | 'ready' | 'invoiced' | 'delivered' | 'closed' | 'cancelled';
export type DbSaleStatus = 'draft' | 'reserved' | 'ordered' | 'confirmed' | 'preparation' | 'ready_for_delivery' | 'delivered' | 'cancelled';
export type DbDeliveryStatus = 'planned' | 'preparing' | 'quality_control' | 'ready' | 'delivered' | 'cancelled';
export type DbInvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export const vehicleStatusFromDb: Record<DbVehicleStatus, VehicleStatus> = { ordered: 'COMMANDE', in_transit: 'EN_TRANSIT', received: 'RECEPTIONNE', preparation: 'PREPARATION', available: 'DISPONIBLE', reserved: 'RESERVE', sold: 'VENDU', delivered: 'LIVRE' };
export const opportunityStageFromDb: Record<DbOpportunityStage, LeadStage> = { new: 'NOUVEAU', contacted: 'CONTACTE', qualified: 'QUALIFIE', appointment: 'RDV', test_drive: 'ESSAI', offer: 'OFFRE', negotiation: 'NEGOCIATION', won: 'GAGNE', lost: 'PERDU' };
export const repairOrderStatusFromDb: Record<Exclude<DbRepairOrderStatus, 'cancelled'>, RepairOrderStatus> = { planned: 'PLANIFIE', received: 'RECEPTIONNE', diagnosis: 'DIAGNOSTIC', waiting_approval: 'ATTENTE_VALIDATION', in_progress: 'EN_COURS', quality_control: 'CONTROLE_QUALITE', ready: 'PRET', invoiced: 'FACTURE', delivered: 'LIVRE', closed: 'CLOTURE' };
export const saleStatusFromDb: Record<DbSaleStatus, SaleStatus> = { draft: 'DEVIS', reserved: 'RESERVATION', ordered: 'COMMANDE', confirmed: 'FINANCEMENT_VALIDE', preparation: 'PREPARATION', ready_for_delivery: 'PRET_LIVRAISON', delivered: 'LIVRE', cancelled: 'ANNULE' };
export const deliveryStatusFromDb: Record<DbDeliveryStatus, DeliveryStatus> = { planned: 'RDV_CONFIRME', preparing: 'EN_PREPARATION', quality_control: 'CONTROLE_QUALITE_EN_COURS', ready: 'VALIDE_POUR_LIVRAISON', delivered: 'LIVRE_SIGNE', cancelled: 'REPORTE' };
export const invoiceStatusFromDb: Record<DbInvoiceStatus, InvoiceStatus> = { draft: 'BROUILLON', issued: 'VALIDEE', partially_paid: 'PARTIELLEMENT_PAYEE', paid: 'PAYEE', overdue: 'EN_RETARD', cancelled: 'ANNULEE' };

export function reverseMap<T extends string, U extends string>(map: Record<T, U>): Partial<Record<U, T>> {
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [value, key])) as Partial<Record<U, T>>;
}

export const vehicleStatusToDb = reverseMap(vehicleStatusFromDb);
export const opportunityStageToDb = reverseMap(opportunityStageFromDb);
export const repairOrderStatusToDb = reverseMap(repairOrderStatusFromDb);
export const saleStatusToDb: Partial<Record<SaleStatus, DbSaleStatus>> = { DEVIS: 'draft', RESERVATION: 'reserved', COMMANDE: 'ordered', FINANCEMENT_EN_ATTENTE: 'confirmed', FINANCEMENT_VALIDE: 'confirmed', PREPARATION:'preparation', PRET_LIVRAISON: 'ready_for_delivery', LIVRE: 'delivered', ANNULE: 'cancelled' };
export const deliveryStatusToDb = reverseMap(deliveryStatusFromDb);
export const invoiceStatusToDb = reverseMap(invoiceStatusFromDb);
