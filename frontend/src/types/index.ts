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
  | 'edit'
  | 'delete'
  | 'validate'
  | 'cancel'
  | 'export'
  | 'print';

export type PermissionScope = 'groupe' | 'agence' | 'departement' | 'equipe' | 'utilisateur';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
  partId: string;
  partReference: string;
  description: string;
  quantity: number;
  unitPriceHT: number;
  totalHT: number;
}

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
  symptomsReported: string;
  diagnosticNotes: string;
  operations: ServiceOperation[];
  parts: ServicePartUsage[];
  estimatedTotalTTC: number;
  finalTotalTTC: number;
  warrantyCovered: boolean;
  courtesyCarAssigned?: string;
  createdAt: string;
}

// Workshop & Bays
export interface WorkshopBay {
  id: string;
  name: string;
  code: string;
  type: 'Mécanique Rapide' | 'Grosse Mécanique' | 'Diagnostic Électronique' | 'Carrosserie' | 'Géométrie' | 'Préparation Véhicule Neuf';
  activeTechnicianId?: string;
  activeTechnicianName?: string;
  currentOrId?: string;
  currentOrNumber?: string;
  currentVehicle?: string;
  status: 'Libre' | 'Occupé' | 'En Pause' | 'Maintenance';
}

export interface Technician {
  id: string;
  name: string;
  specialty: string;
  dailyCapacityHours: number;
  assignedHoursToday: number;
  efficiencyRate: number; // % (e.g. 108%)
  status: 'Disponible' | 'En Intervention' | 'Formation' | 'Absent';
  currentBay?: string;
}

// Spare Parts (Magasin pièces)
export type PartStockStatus = 'NORMAL' | 'FAIBLE' | 'RUPTURE' | 'DORMANT';

export interface SparePart {
  id: string;
  reference: string;
  oemReference: string;
  name: string;
  category: 'Freinage' | 'Filtration' | 'Moteur' | 'Électrique' | 'Carrosserie' | 'Suspension' | 'Pneumatique' | 'Fluides & Huiles';
  supplier: string;
  locationBin: string; // e.g. "A-04-2"
  stockQuantity: number;
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
}

// Billing & Invoices
export type InvoiceType = 'FACTURE_VENTE_VN_VO' | 'FACTURE_ATELIER_SAV' | 'FACTURE_PIECES' | 'AVOIR' | 'ACOMPTE';
export type InvoiceStatus =
  | 'BROUILLON'
  | 'EN_ATTENTE'
  | 'VALIDEE'
  | 'PARTIELLEMENT_PAYEE'
  | 'PAYEE'
  | 'EN_RETARD'
  | 'ANNULEE';

export type PaymentMethod = 'Virement' | 'Carte Bancaire' | 'Chèque de Banque' | 'Prélèvement / Financement' | 'Espèces';

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
}

// Showroom Visitors
export interface ShowroomVisitor {
  id: string;
  visitorName: string;
  phone: string;
  arrivalDateTime: string;
  interest: 'Achat Véhicule Neuf' | 'Achat Occasion' | 'Essai Véhicule' | 'Reprise / Estimation' | 'SAV / Atelier' | 'Livraison';
  preferredModel?: string;
  assignedRepName?: string;
  status: 'En Attente' | 'En Entretien' | 'En Essai' | 'Terminé';
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
