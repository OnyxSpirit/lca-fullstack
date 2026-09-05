// Types definition for AutoCore ERP Automotive Dealership Portal

export type UserRole =
  | 'SUPER_ADMIN'
  | 'DIRECTION'
  | 'SALES_MANAGER'
  | 'SALES_REP'
  | 'RECEPTIONIST'
  | 'SERVICE_MANAGER'
  | 'SERVICE_ADVISOR'
  | 'WORKSHOP_CHIEF'
  | 'TECHNICIAN'
  | 'PARTS_MANAGER'
  | 'WAREHOUSE_CLERK'
  | 'DELIVERY_MANAGER'
  | 'ACCOUNTANT';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'validate'
  | 'cancel'
  | 'export'
  | 'print'
  | 'approve'
  | 'assign';

export type PermissionScope = 'groupe' | 'agence' | 'departement' | 'equipe' | 'utilisateur';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles: UserRole[];
  primaryRole: UserRole;
  roleTitle: string;
  avatar: string;
  agencyId: string;
  agencyName: string;
  department: string;
  phone: string;
  status: 'active' | 'inactive';
  password?: string;
}

export interface Agency {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  isMain: boolean;
  isActive: boolean;
}

// CRM & Prospects
export type LeadStage =
  | 'NOUVEAU'
  | 'CONTACTE'
  | 'QUALIFIE'
  | 'RDV'
  | 'ESSAI'
  | 'OFFRE'
  | 'NEGOCIATION'
  | 'GAGNE'
  | 'PERDU';

export interface Lead {
  id: string;
  civility: 'M.' | 'Mme' | 'Société';
  firstName: string;
  lastName: string;
  company?: string;
  email: string;
  phone: string;
  source: 'Web' | 'Passage Showroom' | 'Téléphone' | 'Parrainage' | 'Campagne Marketing' | 'LeBonCoin';
  stage: LeadStage;
  targetVehicle: string;
  targetBudget: number;
  assignedToId: string;
  assignedToName: string;
  createdById?: string;
  createdByName?: string;
  agencyId: string;
  priority: 'Basse' | 'Moyenne' | 'Haute' | 'Urgente';
  nextActionDate?: string;
  nextActionNote?: string;
  estimatedCloseDate?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  score: number; // 0-100 lead score
}

// Customer 360
export interface Customer {
  id: string;
  code: string;
  civility: 'M.' | 'Mme' | 'Société';
  firstName: string;
  lastName: string;
  company?: string;
  siret?: string;
  email: string;
  phone: string;
  mobile: string;
  address: string;
  zipCode: string;
  city: string;
  country?: string;
  type: 'Particulier' | 'Professionnel' | 'Flotte';
  salesRepId: string;
  salesRepName: string;
  agencyId: string;
  agencyName?: string;
  createdById?: string;
  createdByName?: string;
  segment?: string;
  score?: number;
  clientSince: string;
  totalRevenue: number;
  openBalance: number;
  rating: 'VIP' | 'Régulier' | 'Occasionnel' | 'Contentieux';
  notes: string;
}

// Vehicle & Stock
export type VehicleStatus =
  | 'COMMANDE'
  | 'EN_TRANSIT'
  | 'RECEPTIONNE'
  | 'PREPARATION'
  | 'DISPONIBLE'
  | 'RESERVE'
  | 'VENDU'
  | 'LIVRE';

export type FuelType =
  | 'Essence'
  | 'Diesel'
  | 'Hybride'
  | 'Hybride Rechargeable'
  | 'Électrique'
  | 'GPL / Bioéthanol';

export type TransmissionType = 'Automatique' | 'Manuelle' | 'Double Débrayage';

export interface Vehicle {
  id: string;
  stockNumber: string;
  vin: string;
  registrationNumber: string;
  brand: string;
  model: string;
  version: string;
  type: 'Neuf' | 'Occasion' | 'Démo' | 'Véhicule de Courtoisie';
  bodyType: 'Berline' | 'SUV' | 'Break' | 'Coupé' | 'Citadine' | 'Utilitaire';
  year: number;
  firstRegistrationDate: string;
  mileage: number;
  color: string;
  interiorColor: string;
  fuel: FuelType;
  transmission: TransmissionType;
  fiscalPower: number; // CV fiscaux
  realPower: number; // Ch
  co2Emissions: number; // g/km
  status: VehicleStatus;
  location: string;
  agencyId: string;
  agencyName: string;
  stockDays: number;
  // Financials
  purchasePriceHT: number;
  refurbishCostHT: number; // Frais de remise en état
  otherCostsHT: number;
  catalogPriceTTC: number;
  sellingPriceTTC: number;
  minimumPriceTTC: number;
  targetMarginHT: number;
  // Photos & media
  photos: string[];
  features: string[];
  supplier: string;
  assignedCustomerId?: string;
  assignedSaleId?: string;
  createdAt: string;
}

// Sales
export type SaleStatus =
  | 'DEVIS'
  | 'RESERVATION'
  | 'COMMANDE'
  | 'FINANCEMENT_EN_ATTENTE'
  | 'FINANCEMENT_VALIDE'
  | 'PREPARATION'
  | 'PRET_LIVRAISON'
  | 'LIVRE'
  | 'ANNULE';

export interface Sale {
  id: string;
  saleNumber: string;
  customerId: string;
  customerName: string;
  vehicleId: string;
  vehicleLabel: string;
  salesRepId: string;
  salesRepName: string;
  agencyId: string;
  agencyName: string;
  status: SaleStatus;
  vehiclePriceTTC: number;
  optionsTotalTTC: number;
  discountTTC: number;
  tradeInValueTTC?: number; // Reprise
  tradeInVehicleDetails?: string;
  registrationFeesTTC: number;
  administrativeFeesTTC: number;
  totalSaleTTC: number;
  depositPaidTTC: number;
  remainingBalanceTTC: number;
  financingType: 'Comptant' | 'Crédit Classique' | 'LOA' | 'LLD';
  financingPartner?: string;
  financingAmount?: number;
  monthlyPayment?: number;
  durationMonths?: number;
  contractDate: string;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  notes: string;
}

// Service / SAV / Repair Order (OR)
export type RepairOrderStatus =
  | 'PLANIFIE'
  | 'RECEPTIONNE'
  | 'DIAGNOSTIC'
  | 'ATTENTE_VALIDATION'
  | 'EN_COURS'
  | 'CONTROLE_QUALITE'
  | 'PRET'
  | 'FACTURE'
  | 'LIVRE'
  | 'CLOTURE';

export interface ServiceOperation {
  id: string;
  code: string;
  description: string;
  estimatedHours: number;
  actualHours: number;
  hourlyRateHT: number;
  technicianId?: string;
  status: 'A_Faire' | 'En_Cours' | 'Termine';
}

export interface ServicePartUsage {
  id?: string;
  partId: string;
  partReference: string;
  description: string;
  quantity: number;
  unitPriceHT: number;
  totalHT: number;
}

export interface RepairOrderInspection {id:string;fuelLevel:string;cleanliness:string;bodyworkDamage:string;itemsInVehicle:string;mileage:number|null;observations:string;customerSignature:string;inspectedBy:string;inspectedAt:string;}
export interface RepairOrderDiagnostic {id:string;technicianId:string;technicianName:string;diagnosis:string;recommendations:string;estimatedHours:number;diagnosedAt:string;}
export interface RepairApproval {id:string;approved:boolean;approvedAmount:number|null;customerName:string;signatureData:string;notes:string;recordedByName:string;recordedAt:string;}
export interface RepairIntervention {id:string;technicianId:string;technicianName:string;description:string;interventionType:string;plannedHours:number;actualHours:number;unitPrice:number;lineTotal:number;status:'planned'|'assigned'|'in_progress'|'completed'|'cancelled';}
export interface WorkSession {id:string;technicianId:string;technicianName:string;interventionId:string;bayId:string;startedAt:string;endedAt:string|null;status:'running'|'paused'|'completed'|'cancelled';}
export interface PartReservation {id:string;partId:string;partReference:string;partName:string;locationName:string;quantity:number;status:'reserved'|'consumed'|'released';createdAt:string;}
export interface RepairQualityControl {id:string;plannedWorkCompleted:boolean;defectCorrected:boolean;roadTestPerformed:boolean;noLeaks:boolean;levelsChecked:boolean;cleanlinessChecked:boolean;result:'passed'|'failed';reason:string;observations:string;controlledByName:string;controlledAt:string;}
export interface RepairOrderHistory {id:string;oldStatus:string|null;newStatus:string;reason:string;changedByName:string;changedAt:string;}

export interface RepairOrder {
  id: string;
  orNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vehicleId?: string;
  vehicleVin: string;
  vehiclePlate: string;
  vehicleModel: string;
  mileage: number;
  advisorId: string; // Réceptionnaire
  advisorName: string;
  technicianId?: string;
  technicianName?: string;
  bayNumber?: string;
  agencyId: string;
  status: RepairOrderStatus;
  appointmentDate: string;
  promisedCompletionDate: string;
  actualCompletionDate?: string;
  receptionChecklist: {
    fuelLevel: string; // "1/4", "1/2", etc.
    cleanliness: string;
    bodyworkDamage: string;
    itemsInVehicle: string;
  };
  inspection?: RepairOrderInspection|null;
  diagnostics?: RepairOrderDiagnostic[];
  approvals?: RepairApproval[];
  interventions?: RepairIntervention[];
  sessions?: WorkSession[];
  reservations?: PartReservation[];
  qualityControls?: RepairQualityControl[];
  history?: RepairOrderHistory[];
  handover?: {customerName:string;mileageOut:number|null;observations:string;signatureData:string;handedOverAt:string}|null;
  invoice?: {id:string;invoiceNumber:string;subtotal:number;taxTotal:number;total:number;status:string}|null;
  symptomsReported: string;
  diagnosticNotes: string;
  operations: ServiceOperation[];
  parts: ServicePartUsage[];
  laborItems?: Array<{id:string;interventionId:string;description:string;quantity:number;unitPrice:number;taxRate:number;lineTotal:number}>;
  estimatedTotalTTC: number;
  finalTotalTTC: number;
  warrantyCovered: boolean;
  warrantyReference?: string;
  courtesyCarAssigned?: string;
  createdAt: string;
}

// Workshop & Bays
export interface WorkshopBay {
  id: string;
  name: string;
  agencyId: string;
  bayType: string;
  capacity: number;
  status: 'available' | 'occupied' | 'maintenance' | 'inactive';
  occupiedNow: boolean;
}

export interface Technician {
  id: string;
  userId: string;
  agencyId: string;
  name: string;
  specialty: string;
  employeeCode: string;
  hourlyRate: number;
  availableHoursPerDay: number;
  isActive: boolean;
}

export interface WorkshopSchedule {
  id: string;
  agencyId: string;
  technicianId: string;
  bayId: string;
  repairOrderId: string;
  interventionId: string;
  startsAt: string;
  endsAt: string;
  status: 'planned' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  orderNumber: string;
  customerName: string;
  vehicleLabel: string;
  registrationNumber: string;
  technicianName: string;
  bayName: string;
  bayStatus: WorkshopBay['status'];
  bayOccupiedNow: boolean;
  interventionDescription: string;
}

export interface TechnicianUnavailability {
  id: string;
  technicianId: string;
  technicianName: string;
  startsAt: string;
  endsAt: string;
  reason: string;
}

export interface WorkshopStats {
  technicians: number;
  bays: number;
  assignments: number;
  scheduledHours: number;
  actualHours: number;
  capacityHours: number;
  bayCapacityHours: number;
  technicianOccupationRate: number;
  bayOccupationRate: number;
  productivityRate: number;
}

// Spare Parts (Magasin pièces)
export type PartStockStatus = 'NORMAL' | 'FAIBLE' | 'RUPTURE' | 'DORMANT';

export interface SparePart {
  id: string;
  reference: string;
  oemReference: string;
  name: string;
  category: string;
  categoryId: string;
  supplier: string;
  supplierId: string;
  brand: string;
  description: string;
  locationBin: string; // e.g. "A-04-2"
  stockQuantity: number;
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
  minStockAlert: number;
  maxStockLevel: number;
  pendingOrderQuantity: number;
  purchasePriceHT: number;
  sellingPriceHT: number;
  tvaRate: number;
  marginRate: number;
  status: PartStockStatus;
  lastRestockedDate: string;
  compatibilityList: string[];
  stocks?: Array<{id:string;agencyId:string;agencyName:string;locationId:string;locationName:string;physicalStock:number;reservedStock:number;availableStock:number;minStock:number;maxStock:number}>;
  orders?: Array<{id:string;orderNumber:string;status:string;expectedAt:string;quantityOrdered:number;quantityReceived:number;pendingQuantity:number}>;
}

export interface PartStockMovement {
  id: string;
  partId: string;
  type: 'Entrée Fournisseur' | 'Sortie Atelier (OR)' | 'Vente Comptoir' | 'Inventaire / Correction' | 'Retour Fournisseur';
  quantity: number;
  unitPriceHT: number;
  referenceDoc: string; // OR #, Bon de livraison, Facture
  date: string;
  operator: string;
}

// Deliveries
export type DeliveryStatus =
  | 'EN_PREPARATION'
  | 'CONTROLE_QUALITE_EN_COURS'
  | 'VALIDE_POUR_LIVRAISON'
  | 'RDV_CONFIRME'
  | 'EN_COURS_DE_LIVRAISON'
  | 'LIVRE_SIGNE'
  | 'REPORTE';

export interface DeliveryChecklist {
  cleaningInterior: boolean;
  cleaningExterior: boolean;
  aestheticCheck: boolean;
  mechanicalCheck: boolean;
  documentsComplete: boolean;
  accessoriesFitted: boolean;
  fuelOrBatteryCharged: boolean;
  finalQualitySignoff: boolean;
  customerHandoverBriefing: boolean;
  customerSignature: boolean;
}

export interface Delivery {
  id: string;
  deliveryNumber: string;
  saleId: string;
  saleNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vehicleId: string;
  vehicleLabel: string;
  vehicleVin: string;
  vehiclePlate: string;
  salesRepName: string;
  deliverySpecialistName: string;
  agencyId: string;
  deliveryDate: string;
  deliveryTimeSlot: string;
  status: DeliveryStatus;
  checklist: DeliveryChecklist;
  notes: string;
  customerRating?: number;
  checklistProgress?: { total: number; completed: number };
  rawStatus?: string;
  deliveryLocation?: string;
}

// Billing & Invoices
export type InvoiceType = 'FACTURE_VENTE_VN_VO' | 'FACTURE_ATELIER_SAV' | 'FACTURE_PIECES' | 'FACTURE_MANUELLE';
export type InvoiceStatus =
  | 'BROUILLON'
  | 'EN_ATTENTE'
  | 'VALIDEE'
  | 'PARTIELLEMENT_PAYEE'
  | 'PAYEE'
  | 'EN_RETARD'
  | 'ANNULEE';

export type PaymentMethod = string;

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  customerId: string;
  customerName: string;
  relatedDocNumber: string; // Sale # or OR #
  issueDate: string;
  dueDate: string;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  paidAmountTTC: number;
  remainingAmountTTC: number;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod;
  paymentDate?: string;
  pdfUrl?: string;
  agencyId?: string;
  agencyName?: string;
  currencyCode?: string;
  notes?: string;
  items?: InvoiceLine[];
  payments?: InvoicePayment[];
  creditNotes?: CreditNote[];
}
export interface InvoiceLine{id:string;description:string;quantity:number;unitPrice:number;discount:number;taxRate:number;taxAmount:number;lineTotal:number}
export interface InvoicePayment{id:string;paymentNumber:string;amount:number;paymentMethodId:string;paymentMethod:string;reference:string;status:string;paymentDate:string;receivedByName:string}
export interface CreditNote{id:string;creditNoteNumber:string;amount:number;reason:string;status:string;issueDate:string;createdByName:string}

// Showroom Visitors
export interface ShowroomVisitor {
  id: string;
  visitorName: string;
  phone: string;
  arrivalDateTime: string;
  interest: 'Achat Véhicule Neuf' | 'Achat Occasion' | 'Essai Véhicule' | 'Reprise / Estimation' | 'SAV / Atelier' | 'Livraison';
  preferredModel?: string;
  assignedRepName?: string;
  status: 'En Attente' | 'Affecté' | 'En Entretien' | 'En Essai' | 'Terminé' | 'Annulé';
  waitTimeMinutes: number;
}

// Notifications
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: 'Commercial' | 'SAV' | 'Atelier' | 'Stock' | 'Finance' | 'Système';
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  linkRoute?: string;
}

// Timeline unified event
export interface TimelineEvent {
  id: string;
  type: 'prospect_created' | 'contact' | 'appointment' | 'test_drive' | 'quote' | 'sale' | 'delivery' | 'service_booking' | 'repair_order' | 'invoice' | 'payment';
  title: string;
  description: string;
  date: string;
  author: string;
  badgeText?: string;
  badgeColor?: string;
}
