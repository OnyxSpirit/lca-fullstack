import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, assetUrl } from "../services/apiClient";
import {leadQueryKey} from './crmQueryKeys';
export {leadQueryKey} from './crmQueryKeys';
import {
  deliveryStatusFromDb,
  invoiceStatusFromDb,
  opportunityStageFromDb,
  repairOrderStatusFromDb,
  saleStatusFromDb,
  vehicleStatusFromDb,
} from "../services/mysqlStatusMap";
import type {
  Agency,
  Customer,
  Delivery,
  Invoice,
  Lead,
  RepairOrder,
  Sale,
  SparePart,
  User,
  Vehicle,
  Technician,
  TechnicianUnavailability,
  WorkshopBay,
  WorkshopInterventionHistory,
  WorkshopSchedule,
  WorkshopStats,
  CrmActivity,
  Quotation,
} from "../types";

export const erpKeys = {
  users: ["users"],
  agencies: ["agencies"],
  customers: ["customers"],
  leads: ["leads"],
  quotations: ["quotations"],
  vehicles: ["vehicles"],
  sales: ["sales"],
  repairOrders: ["repair-orders"],
  parts: ["parts"],
  deliveries: ["deliveries"],
  invoices: ["invoices"],
  notifications: ["notifications"],
} as const;
const enabled = () => Boolean(localStorage.getItem("lca-access-token"));
const n = (v: unknown) => Number(v ?? 0);
const optionalNumber = (v: unknown) => v == null ? undefined : Number(v);
const s = (v: unknown) => (v == null ? "" : String(v));

const customerRating: Record<string, Customer["rating"]> = {
  occasional: "Occasionnel",
  regular: "Régulier",
  vip: "VIP",
  at_risk: "Contentieux",
};
const mapCustomer = (r: any): Customer => ({
  id: s(r.id),
  code: r.customerCode ?? r.code ?? `CLI-${r.id}`,
  civility: r.civility ?? (r.customerType === "company" ? "Société" : "M."),
  firstName: r.firstName ?? "",
  lastName: r.lastName ?? "",
  company: r.companyName ?? undefined,
  siret: r.taxIdentifier,
  email: r.email ?? "",
  phone: r.phone ?? "",
  mobile: r.secondaryPhone ?? "",
  address: r.address ?? "",
  zipCode: r.postalCode ?? r.zipCode ?? "",
  city: r.city ?? "",
  country: r.country ?? "",
  type: r.customerType === "company" ? "Professionnel" : "Particulier",
  salesRepId: s(r.assignedUserId),
  salesRepName: r.assignedUserName ?? "",
  agencyId: s(r.agencyId),
  agencyName: r.agencyName ?? "",
  createdById: s(r.createdById),
  createdByName: r.createdByName ?? "",
  segment: r.segment ?? "",
  score: n(r.score),
  clientSince: r.createdAt ?? "",
  totalRevenue: n(r.totalRevenue),
  openBalance: n(r.openBalance),
  rating: customerRating[r.classification] ?? r.rating ?? "Occasionnel",
  notes: r.notes ?? "",
});
const vehicleType: Record<string, Vehicle["type"]> = {
  new: "Neuf",
  used: "Occasion",
  demo: "Démo",
  courtesy: "Véhicule de Courtoisie",
};
const mapVehicle = (r: any): Vehicle => ({
  id: s(r.id),
  stockNumber: r.stockNumber ?? "",
  vin: r.vin,
  registrationNumber: r.registrationNumber ?? "",
  brand: r.brand ?? "",
  model: r.model ?? "",
  version: r.version ?? "",
  type: vehicleType[r.vehicleType] ?? r.type ?? "Neuf",
  bodyType: r.bodyType ?? "SUV",
  year: n(r.year),
  firstRegistrationDate: r.firstRegistrationDate ?? "",
  mileage: n(r.mileage),
  color: r.color ?? "",
  interiorColor: r.interiorColor ?? "",
  fuel: r.fuelType ?? "Essence",
  transmission: r.transmission ?? "Automatique",
  fiscalPower: n(r.fiscalPower),
  realPower: n(r.realPower),
  co2Emissions: n(r.co2Emissions),
  status:
    vehicleStatusFromDb[r.status as keyof typeof vehicleStatusFromDb] ??
    "COMMANDE",
  location: r.locationName ?? "",
  agencyId: s(r.agencyId),
  agencyName: r.agencyName ?? "",
  stockDays: r.entryDate
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(r.entryDate).getTime()) / 86400000),
      )
    : 0,
  purchasePriceHT: optionalNumber(r.purchasePrice),
  refurbishCostHT: optionalNumber(r.refurbishmentCost),
  otherCostsHT: [r.additionalCosts,r.transportCost,r.administrativeCost].every(value=>value!=null)
    ? Number(r.additionalCosts)+Number(r.transportCost)+Number(r.administrativeCost)
    : undefined,
  catalogPriceTTC: n(r.catalogPrice),
  sellingPriceTTC: n(r.salePrice),
  minimumPriceTTC: optionalNumber(r.minimumPrice),
  targetMarginHT: [r.salePrice,r.purchasePrice,r.refurbishmentCost,r.additionalCosts,r.transportCost,r.administrativeCost].every(value=>value!=null)
    ? Number(r.salePrice)-Number(r.purchasePrice)-Number(r.refurbishmentCost)-Number(r.additionalCosts)-Number(r.transportCost)-Number(r.administrativeCost)
    : undefined,
  photos: (r.photos ?? (r.primaryImage ? [r.primaryImage] : [])).map(assetUrl),
  features: r.features ?? [],
  supplier: r.supplierName ?? "",
  supplierId: s(r.supplierId),
  locationId: s(r.locationId),
  engine: r.engine ?? "",
  notes: r.notes ?? "",
  transportCost: optionalNumber(r.transportCost),
  administrativeCost: optionalNumber(r.administrativeCost),
  additionalCosts: optionalNumber(r.additionalCosts),
  createdAt: r.createdAt ?? "",
});
const leadPriorityFromDb: Record<string, Lead["priority"]> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};
const mapLead = (r: any): Lead => ({
  id: s(r.id),
  opportunityId: s(r.opportunityId),
  customerId: s(r.customerId),
  civility: r.companyName ? "Société" : "M.",
  firstName: r.firstName ?? "",
  lastName: r.lastName ?? "",
  company: r.companyName,
  email: r.email ?? "",
  phone: r.phone ?? "",
  source: r.source ?? "Web",
  stage:
    opportunityStageFromDb[r.stage as keyof typeof opportunityStageFromDb] ??
    "NOUVEAU",
  targetVehicle: r.title ?? "",
  targetBudget: n(r.expectedValue),
  assignedToId: s(r.assignedUserId),
  assignedToName: r.assignedUserName?.trim() || "À affecter",
  createdById: s(r.createdById),
  createdByName: r.createdByName ?? "",
  agencyId: s(r.agencyId),
  priority: leadPriorityFromDb[r.priority] ?? "Moyenne",
  estimatedCloseDate: r.expectedCloseDate,
  notes: r.notes ?? "",
  lostReason: r.lostReason ?? "",
  createdAt: r.createdAt ?? "",
  updatedAt: r.updatedAt ?? "",
  score: n(r.probability),
  canStartTestDrive: Boolean(r.canStartTestDrive),
  testDriveStatus: r.testDriveStatus ?? null,
  testDriveReturnedAt: r.testDriveReturnedAt ?? undefined,
  canCreateQuotation: Boolean(r.canCreateQuotation),
});
const mapSale = (r: any): Sale => ({
  id: s(r.id),
  saleNumber: r.sale_number,
  customerId: s(r.customer_id),
  customerName: r.customer_name ?? "",
  vehicleId: s(r.vehicle_id),
  vehicleLabel: r.vehicle_label ?? "",
  salesRepId: s(r.salesperson_id),
  salesRepName: r.salesperson_name ?? "",
  agencyId: s(r.agency_id),
  agencyName: r.agency_name ?? "",
  status:
    saleStatusFromDb[r.status as keyof typeof saleStatusFromDb] ?? "DEVIS",
  vehiclePriceTTC: n(r.subtotal),
  optionsTotalTTC: 0,
  discountTTC: n(r.discount_total),
  tradeInValueTTC: r.trade_in_value == null ? undefined : n(r.trade_in_value),
  tradeInVehicleDetails: r.trade_in_vehicle_details ?? undefined,
  registrationFeesTTC: 0,
  administrativeFeesTTC: 0,
  totalSaleTTC: n(r.total),
  taxMode: r.tax_mode??'TAX_EXEMPT',
  priceInputMode: r.price_input_mode??'HT',
  taxRate: n(r.tax_rate_snapshot),
  currencyCode: r.currency_code??undefined,
  depositPaidTTC: r.invoice_id ? n(r.invoice_amount_paid) : n(r.deposit_amount),
  remainingBalanceTTC: r.invoice_id ? n(r.invoice_balance_due) : n(r.balance_due),
  invoiceId: r.invoice_id == null ? undefined : s(r.invoice_id),
  financialStatus: r.invoice_status ?? undefined,
  financiallyCleared: Boolean(r.financially_cleared),
  financingType: ({ cash: "Comptant", credit: "Crédit Classique", loa: "LOA", lld: "LLD", Comptant: "Comptant", "Crédit Classique": "Crédit Classique", LOA: "LOA", LLD: "LLD" } as Record<string, Sale['financingType']>)[r.financing_type] ?? "Comptant",
  financingPartner: r.financier_name ?? undefined,
  financingAmount: r.financed_amount == null ? undefined : n(r.financed_amount),
  monthlyPayment: r.monthly_payment == null ? undefined : n(r.monthly_payment),
  durationMonths: r.duration_months == null ? undefined : n(r.duration_months),
  contractDate: r.created_at ?? "",
  expectedDeliveryDate: r.expected_delivery_date ?? "",
  actualDeliveryDate: r.sold_at ?? undefined,
  notes: r.notes ?? "",
});
export const mapRepairStatus=(status:unknown):RepairOrder['status']=>{
  const mapped=repairOrderStatusFromDb[status as keyof typeof repairOrderStatusFromDb];
  if(!mapped)throw new Error(`Statut OR backend inconnu : ${String(status)}`);
  return mapped;
};
export const mapRepair = (r: any): RepairOrder => ({
  id: s(r.id),
  orNumber: r.order_number,
  customerId: s(r.customer_id),
  customerName: r.customer_name ?? "",
  customerPhone: r.customer_phone ?? "",
  vehicleId: s(r.vehicle_id),
  vehicleVin: r.vin ?? "",
  vehiclePlate: r.registration_number ?? "",
  vehicleModel: r.vehicle_label ?? "",
  mileage: n(r.mileage_in),
  advisorId: s(r.advisor_id),
  advisorName: r.advisor_name ?? "",
  agencyId: s(r.agency_id),
  status:mapRepairStatus(r.status),
  appointmentDate: r.received_at ?? r.created_at,
  promisedCompletionDate: r.promised_completion_at ?? "",
  receptionChecklist: {
    fuelLevel: r.inspection?.fuel_level ?? "",
    cleanliness: r.inspection?.cleanliness ?? "",
    bodyworkDamage: r.inspection?.bodywork_damage ?? "",
    itemsInVehicle: r.inspection?.items_in_vehicle ?? "",
  },
  inspection:r.inspection?{id:s(r.inspection.id),fuelLevel:r.inspection.fuel_level??'',cleanliness:r.inspection.cleanliness??'',bodyworkDamage:r.inspection.bodywork_damage??'',itemsInVehicle:r.inspection.items_in_vehicle??'',mileage:r.inspection.mileage==null?null:n(r.inspection.mileage),observations:r.inspection.observations??'',customerSignature:r.inspection.customer_signature??'',inspectedBy:s(r.inspection.inspected_by),inspectedAt:r.inspection.inspected_at}:null,
  diagnostics:(r.diagnostics??[]).map((x:any)=>({id:s(x.id),technicianId:s(x.technician_id),technicianName:x.technician_name??'',diagnosis:x.diagnosis,recommendations:x.recommendations??'',estimatedHours:n(x.estimated_hours),diagnosedAt:x.diagnosed_at})),
  approvals:(r.approvals??[]).map((x:any)=>({id:s(x.id),approved:Boolean(x.approved),approvedAmount:x.approved_amount==null?null:n(x.approved_amount),customerName:x.customer_name,signatureData:x.signature_data??'',notes:x.notes??'',recordedByName:x.recorded_by_name??'',recordedAt:x.recorded_at})),
  estimateItems:(r.estimateItems??[]).map((x:any)=>({id:s(x.id),itemType:x.item_type,partId:s(x.part_id),partReference:x.part_reference??'',description:x.description,quantity:n(x.quantity),unitPrice:n(x.unit_price),discount:n(x.discount),taxRate:n(x.tax_rate),lineTotal:n(x.line_total),interventionId:s(x.intervention_id),interventionTechnicianId:s(x.intervention_technician_id),interventionStatus:x.intervention_status??'',actualHours:n(x.actual_hours),reservationId:s(x.reservation_id),reservedQuantity:n(x.reserved_quantity),consumedQuantity:n(x.consumed_quantity),reservationStatus:x.reservation_status??'',actualItemId:s(x.actual_item_id),actualQuantity:n(x.actual_quantity)})),
  estimateSummary:{gross:n(r.estimateSummary?.gross),discount:n(r.estimateSummary?.discount),subtotal:n(r.estimateSummary?.subtotal),tax:n(r.estimateSummary?.tax),total:n(r.estimateSummary?.total),currencyCode:r.estimateSummary?.currencyCode??'XAF',byType:r.estimateSummary?.byType??{}},
  interventions:(r.interventions??[]).map((x:any)=>({id:s(x.id),technicianId:s(x.technician_id),technicianName:x.technician_name??'',description:x.description,interventionType:x.intervention_type??'',plannedHours:n(x.planned_hours),actualHours:n(x.actual_hours),unitPrice:n(x.unit_price),lineTotal:n(x.line_total),status:x.status})),
  sessions:(r.sessions??[]).map((x:any)=>({id:s(x.id),technicianId:s(x.technician_id),technicianName:x.technician_name??'',interventionId:s(x.intervention_id),bayId:s(x.bay_id),startedAt:x.started_at,endedAt:x.ended_at??null,status:x.status})),
  reservations:(r.reservations??[]).map((x:any)=>({id:s(x.id),partId:s(x.part_id),partReference:x.part_reference??'',partName:x.part_name??'',locationName:x.location_name??'Non précisé',quantity:n(x.quantity),status:x.status,createdAt:x.created_at})),
  qualityControls:(r.qualityControls??[]).map((x:any)=>({id:s(x.id),plannedWorkCompleted:Boolean(x.planned_work_completed),defectCorrected:Boolean(x.defect_corrected),roadTestPerformed:Boolean(x.road_test_performed),noLeaks:Boolean(x.no_leaks),levelsChecked:Boolean(x.levels_checked),cleanlinessChecked:Boolean(x.cleanliness_checked),result:x.result,reason:x.reason??'',observations:x.observations??'',controlledByName:x.controlled_by_name??'',controlledAt:x.controlled_at})),
  history:(r.history??[]).map((x:any)=>({id:s(x.id),oldStatus:x.old_status??null,newStatus:x.new_status,reason:x.reason??'',changedByName:x.changed_by_name??'',changedAt:x.changed_at})),
  handover:r.handover?{customerName:r.handover.customer_name,mileageOut:r.handover.mileage_out==null?null:n(r.handover.mileage_out),observations:r.handover.observations??'',signatureData:r.handover.signature_data??'',handedOverAt:r.handover.handed_over_at}:null,
  invoice:r.invoice?{id:s(r.invoice.id),invoiceNumber:r.invoice.invoice_number,subtotal:n(r.invoice.subtotal),taxTotal:n(r.invoice.tax_total),total:n(r.invoice.total),amountPaid:n(r.invoice.amount_paid),balanceDue:n(r.invoice.balance_due),status:invoiceStatusFromDb[r.invoice.status as keyof typeof invoiceStatusFromDb]??r.invoice.status}:null,
  financiallyCleared:Boolean(r.financially_cleared),
  symptomsReported: r.complaint ?? "",
  diagnosticNotes: r.diagnosis_summary ?? "",
  operations:(r.interventions??[]).map((x:any)=>({id:s(x.id),code:`INT-${x.id}`,description:x.description,estimatedHours:n(x.planned_hours),actualHours:n(x.actual_hours),hourlyRateHT:n(x.unit_price),technicianId:s(x.technician_id),status:x.status==='completed'?'Termine':x.status==='in_progress'?'En_Cours':'A_Faire'})),
  parts:(r.items??[]).filter((x:any)=>x.item_type==='part'&&x.status!=='cancelled').map((x:any)=>({id:s(x.id),partId:s(x.part_id),partReference:x.part_reference??'',description:x.description,quantity:n(x.quantity),unitPriceHT:n(x.unit_price),discount:n(x.discount),taxRate:n(x.tax_rate),totalHT:n(x.line_total)})),
  laborItems:(r.items??[]).filter((x:any)=>x.item_type==='labor'&&x.status!=='cancelled').map((x:any)=>({id:s(x.id),interventionId:s(x.intervention_id),description:x.description,quantity:n(x.quantity),unitPrice:n(x.unit_price),discount:n(x.discount),taxRate:n(x.tax_rate),lineTotal:n(x.line_total)})),
  financialSummary:{gross:n(r.financialSummary?.gross),discount:n(r.financialSummary?.discount),subtotal:n(r.financialSummary?.subtotal),tax:n(r.financialSummary?.tax),total:n(r.financialSummary?.total),currencyCode:r.financialSummary?.currencyCode??'XAF'},
  estimatedTotalTTC: n(r.estimated_total),
  finalTotalTTC: n(r.actual_total),
  warrantyCovered: Boolean(r.warranty_covered),
  warrantyReference:r.warranty_reference??'',
  createdAt: r.created_at ?? "",
});
const mapPart = (r: any): SparePart => ({
  id: s(r.id),
  reference: r.reference,
  oemReference: r.oem_reference ?? "",
  name: r.name,
  categoryId: s(r.category_id),
  category: r.category_name ?? "Moteur",
  supplierId: s(r.supplier_id),
  supplier: r.supplier_name ?? "",
  brand: r.brand ?? "",
  description: r.description ?? "",
  locationBin: r.location_name ?? r.location_bin ?? "",
  stockQuantity: n(r.available_stock),
  physicalStock: n(r.current_stock),
  reservedStock: n(r.reserved_stock),
  availableStock: n(r.available_stock),
  minStockAlert: n(r.min_stock),
  maxStockLevel: n(r.max_stock),
  pendingOrderQuantity: n(r.pending_order_quantity),
  purchasePriceHT: n(r.purchase_price),
  sellingPriceHT: n(r.sale_price),
  tvaRate: n(r.tax_rate),
  marginRate: n(r.purchase_price)
    ? ((n(r.sale_price) - n(r.purchase_price)) / n(r.purchase_price)) * 100
    : 0,
  status: r.obsolete
    ? "DORMANT"
    : n(r.available_stock) <= 0
      ? "RUPTURE"
      : r.low_stock
        ? "FAIBLE"
        : "NORMAL",
  lastRestockedDate: r.updated_at ?? "",
  compatibilityList: [],
  stocks: (r.stocks??[]).map((stock:any)=>({id:s(stock.id),agencyId:s(stock.agency_id),agencyName:stock.agency_name??'',locationId:s(stock.location_id),locationName:stock.location_name??'Non précisé',physicalStock:n(stock.current_stock),reservedStock:n(stock.reserved_stock),availableStock:n(stock.available_stock),minStock:n(stock.min_stock),maxStock:n(stock.max_stock)})),
  orders:(r.orders??[]).map((x:any)=>({id:s(x.id),orderNumber:x.order_number,status:x.status,expectedAt:x.expected_at??'',quantityOrdered:n(x.quantity_ordered),quantityReceived:n(x.quantity_received),pendingQuantity:n(x.pending_quantity)})),
});
const mapDelivery = (r: any): Delivery => ({
  id: s(r.id),
  deliveryNumber: r.delivery_number,
  saleId: s(r.sale_id),
  saleNumber: r.sale_number ?? "",
  customerId: s(r.customer_id),
  customerName: r.customer_name ?? "",
  customerPhone: r.phone ?? "",
  vehicleId: s(r.vehicle_id),
  vehicleLabel: r.vehicle_label ?? "",
  vehicleVin: r.vin ?? "",
  vehiclePlate: r.registration_number ?? "",
  salesRepName: r.salesperson_name ?? "",
  deliverySpecialistName: r.delivery_specialist_name ?? "",
  agencyId: s(r.agency_id),
  deliveryDate: r.scheduled_at ?? "",
  deliveryTimeSlot: r.scheduled_at?.slice?.(11, 16) ?? "",
  status:
    deliveryStatusFromDb[r.status as keyof typeof deliveryStatusFromDb] ??
    "RDV_CONFIRME",
  checklist: {
    cleaningInterior: false,
    cleaningExterior: false,
    aestheticCheck: false,
    mechanicalCheck: false,
    documentsComplete: false,
    accessoriesFitted: false,
    fuelOrBatteryCharged: false,
    finalQualitySignoff: false,
    customerHandoverBriefing: false,
    customerSignature: false,
  },
  notes: r.customer_notes ?? "",
  ...(r.checklist_progress ? { checklistProgress: r.checklist_progress } : {}),
  rawStatus: r.status,
  deliveryLocation: r.delivery_location ?? "",
});
const mapInvoice = (r: any): Invoice => ({
  id: s(r.id),
  invoiceNumber: r.invoice_number,
  type:
    r.invoice_type === "vehicle"
      ? "FACTURE_VENTE_VN_VO"
      : r.invoice_type === "workshop"
        ? "FACTURE_ATELIER_SAV"
        : r.invoice_type === "parts" ? "FACTURE_PIECES" : "FACTURE_MANUELLE",
  customerId: s(r.customer_id),
  customerName: r.customer_name ?? "",
  relatedDocNumber: r.sale_id
    ? `Vente ${r.sale_id}`
    : r.repair_order_id
      ? r.repair_order_number ?? `OR ${r.repair_order_id}`
      : "",
  repairOrderId: r.repair_order_id ? s(r.repair_order_id) : undefined,
  issueDate: r.issue_date,
  dueDate: r.due_date ?? "",
  amountHT: n(r.subtotal),
  amountTVA: n(r.tax_total),
  amountTTC: n(r.total),
  paidAmountTTC: n(r.amount_paid),
  remainingAmountTTC: n(r.balance_due),
  status:
    invoiceStatusFromDb[(r.effective_status??r.status) as keyof typeof invoiceStatusFromDb] ??
    "BROUILLON",
  agencyId:s(r.agency_id),agencyName:r.agency_name??'',currencyCode:r.currency_code??undefined,notes:r.notes??'',
  items:(r.items??[]).map((x:any)=>({id:s(x.id),description:x.description,quantity:n(x.quantity),unitPrice:n(x.unit_price),discount:n(x.discount),taxRate:n(x.tax_rate),taxAmount:n(x.tax_amount),lineTotal:n(x.line_total)})),
  payments:(r.payments??[]).map((x:any)=>({id:s(x.id),paymentNumber:x.payment_number,amount:n(x.amount),refundedAmount:n(x.refunded_amount),refundableRemaining:Math.max(0,n(x.amount)-n(x.refunded_amount)),paymentMethodId:s(x.payment_method_id),paymentMethod:x.payment_method,reference:x.reference??'',status:x.effective_status??x.status,paymentDate:x.payment_date,receivedByName:x.received_by_name??''})),
  creditNotes:(r.creditNotes??[]).map((x:any)=>({id:s(x.id),creditNoteNumber:x.credit_note_number,amount:n(x.amount),refundedAmount:n(x.refunded_amount),refundableRemaining:Math.max(0,n(x.amount)-n(x.refunded_amount)),reason:x.reason,status:x.status,issueDate:x.issue_date,createdByName:x.created_by_name??''})),
});

function resource<T>(key: readonly string[], path: string, map: (r: any) => T) {
  return useQuery({
    queryKey: key,
    queryFn: async () => (await apiRequest<any[]>(path)).map(map),
    enabled: enabled(),
  });
}
export const useUsersQuery = (requestEnabled=true) =>
  useQuery({queryKey:erpKeys.users,enabled:enabled()&&requestEnabled,queryFn:async()=>(await apiRequest<any[]>("/users/directory")).map((r:any)=>
      ({
        id: s(r.id),
        name: r.displayName,
        email: "",
        role: ({DIRECTOR:'DIRECTION',SALES_AGENT:'SALES_REP',WORKSHOP_MANAGER:'WORKSHOP_CHIEF'} as Record<string,string>)[r.roles?.[0]] ?? r.roles?.[0] ?? "RECEPTIONIST",
        roles: (r.roles??[]).map((x:string)=>({DIRECTOR:'DIRECTION',SALES_AGENT:'SALES_REP',WORKSHOP_MANAGER:'WORKSHOP_CHIEF'} as Record<string,string>)[x]??x),
        primaryRole: (({DIRECTOR:'DIRECTION',SALES_AGENT:'SALES_REP',WORKSHOP_MANAGER:'WORKSHOP_CHIEF'} as Record<string,string>)[r.roles?.[0]] ?? r.roles?.[0] ?? "RECEPTIONIST"),
        roleTitle: "",
        avatar: r.avatar??"",
        agencyId: s(r.agencyId),
        agencyName: "",
        department: "",
        phone: "",
        status: r.isActive ? "active" : "inactive",
        isSystemSuperAdmin: Boolean(r.isSystemSuperAdmin),
        permissions: Array.isArray(r.permissions)?r.permissions:Object.keys(r.permissions??{}),
      }) as User)});
export const useAgenciesQuery = () =>
  resource<Agency>(erpKeys.agencies, "/agencies", (r: any) => ({
    id: s(r.id),
    name: r.name,
    code: r.code,
    address: r.address ?? "",
    city: r.city ?? "",
    phone: r.phone ?? "",
    email: r.email ?? "",
    isMain: false,
    isActive: Boolean(r.isActive),
  }));
export const useCustomersQuery = (search = "", type = "", requestEnabled = true) =>
  useQuery({
    queryKey: [...erpKeys.customers, search, type],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (type) params.set("type", type);
      const suffix = params.size ? `?${params}` : "";
      return (await apiRequest<any[]>(`/customers${suffix}`)).map(mapCustomer);
    },
    enabled: enabled() && requestEnabled,
  });
export const useLeadsQuery = (search = "", priority = "", requestEnabled = true, stage = "", commercialId = "") =>
  useQuery({
    queryKey: leadQueryKey(search,priority,stage,commercialId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (priority) params.set("priority", priority);
      if (stage) params.set("stage", stage);
      if (commercialId) params.set("commercialId", commercialId);
      const suffix = params.size ? `?${params}` : "";
      return (await apiRequest<any[]>(`/leads${suffix}`)).map(mapLead);
    },
    enabled: enabled() && requestEnabled,
  });
export const useLeadActivitiesQuery=(leadId?:string,requestEnabled=true)=>useQuery({queryKey:[...erpKeys.leads,leadId,'activities'],queryFn:()=>apiRequest<CrmActivity[]>(`/leads/${leadId}/activities`),enabled:enabled()&&requestEnabled&&Boolean(leadId)});
export const useLeadQuotationsQuery=(opportunityId?:string,requestEnabled=true)=>useQuery({queryKey:[...erpKeys.quotations,'opportunity',opportunityId],queryFn:()=>apiRequest<Quotation[]>(`/quotations/opportunity/${opportunityId}`),enabled:enabled()&&requestEnabled&&Boolean(opportunityId)});
export const useQuotationConfig=()=>useQuery({queryKey:[...erpKeys.quotations,'config'],queryFn:()=>apiRequest<{defaultVatRate:number;currencyCode:string;defaultTaxMode:'TAXABLE';defaultPriceInputMode:'HT'}>('/quotations/config'),enabled:enabled()});
export const useCreateQuotation=()=>{const qc=useQueryClient();return useMutation({mutationFn:(body:{opportunityId:string;vehicleId:string;discount:number;validUntil?:string;notes?:string;taxMode:'TAXABLE'|'TAX_EXEMPT';priceInputMode:'HT'|'TTC';taxRate:number})=>apiRequest<Quotation>('/quotations',{method:'POST',body:JSON.stringify(body)}),onSuccess:quote=>{void qc.invalidateQueries({queryKey:erpKeys.quotations});void qc.invalidateQueries({queryKey:erpKeys.leads});void qc.invalidateQueries({queryKey:[...erpKeys.leads,quote.opportunityId,'activities']});void qc.invalidateQueries({queryKey:erpKeys.customers})}})};
export const useUpdateQuotation=()=>{const qc=useQueryClient();return useMutation({mutationFn:({id,...body}:{id:string;discount?:number;validUntil?:string;notes?:string})=>apiRequest<Quotation>(`/quotations/${id}`,{method:'PATCH',body:JSON.stringify(body)}),onSuccess:()=>{void qc.invalidateQueries({queryKey:erpKeys.quotations});void qc.invalidateQueries({queryKey:erpKeys.leads})}})};
export const useValidateQuotation=()=>{const qc=useQueryClient();return useMutation({mutationFn:(id:string)=>apiRequest<Quotation>(`/quotations/${id}/validate`,{method:'POST'}),onSuccess:quote=>{void qc.invalidateQueries({queryKey:erpKeys.quotations});void qc.invalidateQueries({queryKey:erpKeys.leads});void qc.invalidateQueries({queryKey:[...erpKeys.leads,quote.opportunityId,'activities']})}})};
export const useCancelQuotation=()=>{const qc=useQueryClient();return useMutation({mutationFn:({id,status='cancelled',reason}:{id:string;status?:'cancelled'|'rejected';reason:string})=>apiRequest<Quotation>(`/quotations/${id}/cancel`,{method:'POST',body:JSON.stringify({status,reason})}),onSuccess:()=>{void qc.invalidateQueries({queryKey:erpKeys.quotations});void qc.invalidateQueries({queryKey:erpKeys.leads})}})};
export const useUpdateLead=()=>{const qc=useQueryClient();return useMutation({mutationFn:({id,...body}:Record<string,unknown>&{id:string})=>apiRequest(`/leads/${id}`,{method:'PATCH',body:JSON.stringify(body)}),onSuccess:()=>qc.invalidateQueries({queryKey:erpKeys.leads})})};
export const useCreateCrmAppointment=()=>{const qc=useQueryClient();return useMutation({mutationFn:({id,...body}:{id:string;scheduledAt:string;subject?:string;description?:string})=>apiRequest(`/leads/${id}/appointments`,{method:'POST',body:JSON.stringify(body)}),onSuccess:(_data,input)=>{void qc.invalidateQueries({queryKey:erpKeys.leads});void qc.invalidateQueries({queryKey:[...erpKeys.leads,input.id,'activities']});void qc.invalidateQueries({queryKey:erpKeys.notifications})}})};
export const useCreateCrmTestDrive=()=>{const qc=useQueryClient();return useMutation({mutationFn:({leadId,...body}:{leadId:string;vehicleId:string;licenseNumber:string;mileageOut:number})=>apiRequest<{id:string;visitId:string;opportunityId:string;leadId:string;stage:string}>(`/showroom/crm/leads/${leadId}/test-drives`,{method:'POST',body:JSON.stringify(body)}),onSuccess:(_data,input)=>{void qc.invalidateQueries({queryKey:erpKeys.leads});void qc.invalidateQueries({queryKey:[...erpKeys.leads,input.leadId,'activities']});void qc.invalidateQueries({queryKey:erpKeys.vehicles});void qc.invalidateQueries({queryKey:['showroom']});void qc.invalidateQueries({queryKey:erpKeys.notifications})}})};
export interface VehicleFilters {
  view?: 'active' | 'sold' | 'all';
  agencyId?: string;
  search?: string;
  status?: string;
  type?: string;
  fuel?: string;
  brandId?: string;
  modelId?: string;
  dormant?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
}
export interface VehicleListResult {
  items: Vehicle[];
  total: number;
  page: number;
  pageSize: number;
}
export const useVehicleListQuery = (filters: VehicleFilters = {}, requestEnabled = true) =>
  useQuery({
    queryKey: [...erpKeys.vehicles, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "" && value !== false)
          params.set(key, String(value));
      });
      const data = await apiRequest<{
        items: any[];
        total: number;
        page: number;
        pageSize: number;
      }>(`/vehicles?${params}`);
      return {...data,items:data.items.map(mapVehicle)} satisfies VehicleListResult;
    },
    enabled: enabled() && requestEnabled,
  });
export const useVehiclesQuery = (filters: VehicleFilters = {}, requestEnabled = true) => {
  const query=useVehicleListQuery(filters,requestEnabled);
  return {...query,data:query.data?.items};
};
export interface VehicleFilterOption { id:string; name:string }
export interface VehicleModelFilterOption extends VehicleFilterOption { brandId:string }
export const useVehicleFilterOptionsQuery=(filters:{agencyId?:string;view?:VehicleFilters['view'];brandId?:string}={},requestEnabled=true)=>useQuery({
  queryKey:[...erpKeys.vehicles,'filter-options',filters],
  queryFn:()=>{const params=new URLSearchParams();Object.entries(filters).forEach(([key,value])=>{if(value)params.set(key,value)});return apiRequest<{brands:VehicleFilterOption[];models:VehicleModelFilterOption[]}>(`/vehicles/filter-options?${params}`)},
  enabled:enabled()&&requestEnabled,
});
export interface VehicleStats {
  total:number; ordered:number; inTransit:number; received:number; preparation:number;
  available:number; availableForSale:number; reserved:number; sold:number; delivered:number; dormant:number; stockValue?:number;
}
export const useVehicleStatsQuery=(agencyId?:string)=>useQuery({
  queryKey:[...erpKeys.vehicles,'stats',agencyId],
  queryFn:()=>apiRequest<VehicleStats>(`/vehicles/stats${agencyId?`?agencyId=${encodeURIComponent(agencyId)}`:''}`),
  enabled:enabled(),
});
export interface VehicleCreateAgency {id:string;name:string;code:string;financialAllowed:boolean}
export const useVehicleCreateAgenciesQuery=(requestEnabled=true)=>useQuery({queryKey:[...erpKeys.vehicles,'create-agencies'],queryFn:()=>apiRequest<VehicleCreateAgency[]>('/vehicles/agencies/create'),enabled:enabled()&&requestEnabled});
export const useSalesQuery = (requestEnabled=true) => useQuery({queryKey:erpKeys.sales,queryFn:async()=>(await apiRequest<any[]>('/sales')).map(mapSale),enabled:enabled()&&requestEnabled});
export const useQuotationsQuery = (requestEnabled=true) => useQuery({queryKey:erpKeys.quotations,queryFn:()=>apiRequest<Quotation[]>('/quotations'),enabled:enabled()&&requestEnabled});
export const useRepairOrdersQuery = (search="",status="",requestEnabled=true) => useQuery({queryKey:[...erpKeys.repairOrders,search,status],queryFn:async()=>{const p=new URLSearchParams();if(search)p.set('search',search);if(status)p.set('status',status);return(await apiRequest<any[]>(`/repair-orders?${p}`)).map(mapRepair)},enabled:enabled()&&requestEnabled});
export interface RepairOrderStats {total:number;inWorkshop:number;in_progress:number;warranty:number;revenue:number;baysTotal:number;baysOccupied:number}
export const useRepairStatsQuery = () => useQuery({queryKey:["repair-orders","stats"],queryFn:()=>apiRequest<RepairOrderStats>("/repair-orders/stats"),enabled:enabled()});
export const usePartsQuery = (agencyId?:string,filters:{search?:string;categoryId?:string}={},requestEnabled=true) => useQuery({queryKey:[...erpKeys.parts,agencyId,filters],queryFn:async()=>{const p=new URLSearchParams();if(agencyId)p.set('agencyId',agencyId);if(filters.search)p.set('search',filters.search);if(filters.categoryId)p.set('categoryId',filters.categoryId);return(await apiRequest<any[]>(`/parts?${p}`)).map(mapPart);},enabled:enabled()&&Boolean(agencyId)&&requestEnabled});
export interface PartCategory {id:string;parent_id:string|null;name:string;code:string;description:string|null;is_active:number|boolean}
export const usePartCategoriesQuery=(requestEnabled=true)=>useQuery({queryKey:['part-categories'],queryFn:()=>apiRequest<PartCategory[]>('/part-categories'),enabled:enabled()&&requestEnabled});
export const useSavePartCategory=()=>{const qc=useQueryClient();return useMutation({mutationFn:({id,...body}:{id?:string;name:string;code:string;parentId:string|null;description:string;isActive:boolean})=>apiRequest(id?`/part-categories/${id}`:'/part-categories',{method:id?'PATCH':'POST',body:JSON.stringify(body)}),onSuccess:()=>{void qc.invalidateQueries({queryKey:['part-categories']});void qc.invalidateQueries({queryKey:['part-references']})}})};
export interface PartLocation {id:string;agencyId:string;agencyName:string;name:string;type:'warehouse';address:string;isActive:boolean}
export interface PartLocationAgency {id:string;name:string;code:string}
export const usePartLocationAgenciesQuery=(actorId?:string,requestEnabled=true)=>useQuery({queryKey:['part-location-agencies',actorId],queryFn:()=>apiRequest<PartLocationAgency[]>('/part-locations/agencies'),enabled:enabled()&&requestEnabled&&Boolean(actorId)});
export const usePartLocationsQuery=(agencyId?:string,actorId?:string,requestEnabled=true)=>useQuery({queryKey:['part-locations',actorId,agencyId],queryFn:()=>apiRequest<PartLocation[]>(`/part-locations?targetAgency=${encodeURIComponent(agencyId!)}`),enabled:enabled()&&requestEnabled&&Boolean(agencyId)&&Boolean(actorId)});
export const useSavePartLocation=()=>{const qc=useQueryClient();return useMutation({mutationFn:({id,targetAgency,...body}:{id?:string;targetAgency:string;name:string;address:string;isActive:boolean})=>apiRequest(id?`/part-locations/${id}`:`/part-locations?targetAgency=${encodeURIComponent(targetAgency)}`,{method:id?'PATCH':'POST',body:JSON.stringify(body)}),onSuccess:()=>{void qc.invalidateQueries({queryKey:['part-locations']});void qc.invalidateQueries({queryKey:['part-references']})}})};
export const usePartReferencesQuery=(agencyId?:string,requestEnabled=true)=>useQuery({queryKey:['part-references',agencyId],queryFn:()=>apiRequest<any>(`/part-references?agencyId=${encodeURIComponent(agencyId!)}`),enabled:enabled()&&requestEnabled&&Boolean(agencyId),staleTime:300_000});
export const usePurchaseOrdersQuery=(agencyId?:string,requestEnabled=true)=>useQuery({queryKey:['purchase-orders',agencyId],queryFn:()=>apiRequest<any[]>(`/purchase-orders?agencyId=${encodeURIComponent(agencyId!)}`),enabled:enabled()&&requestEnabled&&Boolean(agencyId)});
export const usePurchaseOrderDetailQuery=(id?:string,agencyId?:string)=>useQuery({queryKey:['purchase-orders',id,agencyId],queryFn:()=>apiRequest<any>(`/purchase-orders/${id}?agencyId=${encodeURIComponent(agencyId!)}`),enabled:enabled()&&Boolean(id)&&Boolean(agencyId)});
export const useDeliveriesQuery = (
  filters: { search?: string; status?: string; dateFrom?: string; dateTo?: string; assignedUserId?: string } = {},
  requestEnabled = true,
) =>
  useQuery({
    queryKey: [...erpKeys.deliveries, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
      return (await apiRequest<any[]>(`/deliveries?${params}`)).map(mapDelivery);
    },
    enabled: enabled() && requestEnabled,
  });
export const useInvoicesQuery = (filters:Record<string,string>={},requestEnabled=true) => useQuery({queryKey:[...erpKeys.invoices,filters],queryFn:async()=>{const p=new URLSearchParams();Object.entries(filters).forEach(([k,v])=>{if(v)p.set(k==='agencyId'?'billingAgencyId':k,v)});return(await apiRequest<any[]>(`/invoices?${p}`)).map(mapInvoice)},enabled:enabled()&&requestEnabled});
export const useInvoiceQuery=(id?:string,agencyId?:string,requestEnabled=true)=>useQuery({queryKey:['invoices',id,agencyId],queryFn:async()=>mapInvoice(await apiRequest<any>(`/invoices/${id}?billingAgencyId=${encodeURIComponent(agencyId!)}`)),enabled:enabled()&&requestEnabled&&Boolean(id)&&Boolean(agencyId)});
export const useInvoicePaymentsQuery=(id?:string,requestEnabled=true)=>useQuery({queryKey:['invoices',id,'payments'],queryFn:async()=>(await apiRequest<any[]>(`/invoices/${id}/payments`)).map(x=>({id:s(x.id),paymentNumber:x.payment_number,amount:n(x.amount),refundedAmount:n(x.refunded_amount),refundableRemaining:Math.max(0,n(x.amount)-n(x.refunded_amount)),paymentMethodId:s(x.payment_method_id),paymentMethod:x.payment_method,reference:x.reference??'',status:x.effective_status??x.status,paymentDate:x.payment_date,receivedByName:x.received_by_name??''})),enabled:enabled()&&requestEnabled&&Boolean(id)});
export const useBillingConfigQuery=(agencyId?:string)=>useQuery({queryKey:['billing-config',agencyId],queryFn:()=>apiRequest<{defaultVatRate:number;currencyCode:string}>(`/billing/config?agencyId=${encodeURIComponent(agencyId!)}`),enabled:enabled()&&Boolean(agencyId),staleTime:300_000});
export const useCustomerDetailQuery = (id?: string) =>
  useQuery({
    queryKey: ["customers", id],
    queryFn: async () => mapCustomer(await apiRequest<any>(`/customers/${id}`)),
    enabled: enabled() && Boolean(id),
  });
export const useCustomer360Query = (id?: string) =>
  useQuery({
    queryKey: ["customers", id, "360"],
    queryFn: async () => {
      const data = await apiRequest<any>(`/customers/${id}/360`);
      return {
        ...data,
        customer: mapCustomer(data.customer),
        vehicles: (data.vehicles ?? []).map((v: any) => ({
          ...v,
          status:
            vehicleStatusFromDb[v.status as keyof typeof vehicleStatusFromDb] ??
            v.status,
        })),
        sales: (data.sales ?? []).map((sale: any) => ({
          ...sale,
          status:
            saleStatusFromDb[sale.status as keyof typeof saleStatusFromDb] ??
            sale.status,
        })),
        repairOrders: (data.repairOrders ?? []).map((order: any) => ({
          ...order,
          status:
            repairOrderStatusFromDb[
              order.status as keyof typeof repairOrderStatusFromDb
            ] ?? order.status,
        })),
        invoices: (data.invoices ?? []).map((invoice: any) => ({
          ...invoice,
          status:
            invoiceStatusFromDb[
              invoice.status as keyof typeof invoiceStatusFromDb
            ] ?? invoice.status,
        })),
      };
    },
    enabled: enabled() && Boolean(id),
  });
export function useCreateCustomerContact(customerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) =>
      apiRequest(`/customers/${customerId}/contacts`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["customers", customerId, "360"] }),
  });
}
export const useVehicleDetailQuery = (id?: string) =>
  useQuery({
    queryKey: ["vehicles", id],
    queryFn: async () => mapVehicle(await apiRequest<any>(`/vehicles/${id}`)),
    enabled: enabled() && Boolean(id),
  });
export const useVehicle360Query = (id?: string) =>
  useQuery({
    queryKey: ["vehicles", id, "360"],
    queryFn: async () => {
      const data = await apiRequest<any>(`/vehicles/${id}/360`);
      return {
        ...data,
        vehicle: mapVehicle({
          ...data.vehicle,
          photos: data.images.map((image: any) => image.file_path),
          features: data.features.map((feature: any) => feature.name),
        }),
        images: data.images.map((image: any) => ({
          ...image,
          file_path: assetUrl(image.file_path),
          thumbnail_path: assetUrl(image.thumbnail_path),
        })),
        documents: data.documents,
      };
    },
    enabled: enabled() && Boolean(id),
  });
export const useVehicleReferencesQuery = (agencyId?:string) =>
  useQuery({
    queryKey: ["vehicle-references",agencyId],
    queryFn: () => apiRequest<any>(`/vehicle-references${agencyId?`?agencyId=${encodeURIComponent(agencyId)}`:''}`),
    enabled: enabled(),
    staleTime: 300_000,
  });
export const usePartDetailQuery = (id?: string,agencyId?:string,requestEnabled=true) =>
  useQuery({
    queryKey: ["parts", id,agencyId],
    queryFn: async () => mapPart(await apiRequest<any>(`/parts/${id}?agencyId=${encodeURIComponent(agencyId!)}`)),
    enabled: enabled() && requestEnabled && Boolean(id)&&Boolean(agencyId),
  });
export const usePartMovementsQuery=(id?:string,agencyId?:string,filters:Record<string,string>={},requestEnabled=true)=>useQuery({queryKey:['parts',id,'movements',agencyId,filters],queryFn:()=>{const p=new URLSearchParams({agencyId:agencyId!});Object.entries(filters).forEach(([k,v])=>{if(v)p.set(k,v)});return apiRequest<any[]>(`/parts/${id}/movements?${p}`)},enabled:enabled()&&requestEnabled&&Boolean(id)&&Boolean(agencyId)});
export const useSaleDetailQuery = (id?: string) =>
  useQuery({
    queryKey: ["sales", id],
    queryFn: async () => mapSale(await apiRequest<any>(`/sales/${id}`)),
    enabled: enabled() && Boolean(id),
  });
function mutation<T>(
  path: (v: T) => string,
  method = "POST",
  invalidate: readonly string[],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: T) =>
      apiRequest(path(v), { method, body: JSON.stringify(v) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: invalidate }),
  });
}
export const useCreateCustomer = () =>
  mutation<any>(() => "/customers", "POST", erpKeys.customers);
export const useCreateLead = () =>
  mutation<any>(() => "/leads", "POST", erpKeys.leads);
export interface CreateSalePayload { customerId:string;vehicleId:string;agencyId:string;salespersonId?:string;discount:number;depositAmount:number;notes:string;idempotencyKey:string;opportunityId?:string;quotationId?:string }
export const useCreateSale = () => { const qc=useQueryClient();return useMutation({mutationFn:(body:CreateSalePayload)=>apiRequest('/sales',{method:'POST',body:JSON.stringify(body)}),onSuccess:()=>{void qc.invalidateQueries({queryKey:erpKeys.sales});void qc.invalidateQueries({queryKey:erpKeys.vehicles});void qc.invalidateQueries({queryKey:erpKeys.customers});void qc.invalidateQueries({queryKey:erpKeys.leads});void qc.invalidateQueries({queryKey:erpKeys.quotations})}}); };
export interface ServiceVehicleOption {id:string;vin:string;registrationNumber:string;label:string}
export interface AdvisorCandidate {id:string;name:string}
export interface RepairOrderCustomerOption {id:string;code:string;civility:string;firstName:string;lastName:string;companyName:string;phone:string;agencyId:string}
export const useRepairOrderCustomersQuery=(actorId?:string,requestEnabled=true)=>useQuery({queryKey:['repair-order-customer-candidates',actorId],queryFn:()=>apiRequest<RepairOrderCustomerOption[]>('/repair-orders/customer-candidates'),enabled:enabled()&&requestEnabled&&Boolean(actorId)});
export const useAdvisorCandidatesQuery=(agencyId?:string,requestEnabled=true)=>useQuery({queryKey:['repair-order-advisors',agencyId],queryFn:()=>apiRequest<AdvisorCandidate[]>(`/repair-orders/advisor-candidates?targetAgency=${encodeURIComponent(agencyId!)}`),enabled:enabled()&&requestEnabled&&Boolean(agencyId)});
export const useCustomerServiceVehiclesQuery=(customerId?:string,requestEnabled=true)=>useQuery({queryKey:['repair-order-customer-vehicles',customerId],queryFn:()=>apiRequest<ServiceVehicleOption[]>(`/repair-orders/customer-vehicles?customerId=${encodeURIComponent(customerId!)}`),enabled:enabled()&&requestEnabled&&Boolean(customerId)});
export const useCreateRepairOrder = () =>
  mutation<any>(() => "/repair-orders", "POST", erpKeys.repairOrders);
export const useCreateInvoice = () =>
  mutation<any>(() => "/invoices", "POST", erpKeys.invoices);
export function useLeadStageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, lostReason }: { id: string; stage: string; lostReason?: string }) =>
      apiRequest(`/leads/${id}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage, lostReason }),
      }),
    onSuccess: (_data,input) => {void qc.invalidateQueries({ queryKey: erpKeys.leads });void qc.invalidateQueries({queryKey:[...erpKeys.leads,input.id,'activities']});void qc.invalidateQueries({queryKey:erpKeys.quotations})},
  });
}
export function useVehicleStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?:string }) =>
      apiRequest(`/vehicles/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status,reason }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: erpKeys.vehicles }),
  });
}
export function useSaleStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?:string }) =>
      apiRequest(`/sales/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status,reason }),
      }),
    onSuccess: () => {void qc.invalidateQueries({ queryKey: erpKeys.sales });void qc.invalidateQueries({queryKey:erpKeys.vehicles});void qc.invalidateQueries({queryKey:erpKeys.invoices});},
  });
}
export function useUpdateSale() {
  const qc=useQueryClient();
  return useMutation({mutationFn:({id,...body}:{id:string;notes?:string;salespersonId?:string})=>apiRequest(`/sales/${id}`,{method:'PATCH',body:JSON.stringify(body)}),onSuccess:(_,input)=>{void qc.invalidateQueries({queryKey:erpKeys.sales});void qc.invalidateQueries({queryKey:[...erpKeys.sales,input.id]})}});
}
export function useRepairStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status,reason }: { id: string; status: string;reason?:string }) =>
      apiRequest(`/repair-orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status,reason }),
      }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: erpKeys.repairOrders });
      qc.invalidateQueries({ queryKey: ["repair-orders", v.id] });
    },
  });
}
export type RepairAbandonmentImpact={repairOrderId:string;status:string;activeSessions:number;completedInterventions:number;openInterventions:number;actualHours:number;consumedParts:number;reservedParts:number;activeSchedules:number;actualItemsTotal:number;invoice:null|{id:string;invoiceNumber:string;status:string;total:number;netInvoiced:number;netCollected:number;balanceDue:number}};
export const useRepairAbandonmentImpactQuery=(id?:string,requestEnabled=false)=>useQuery({queryKey:['repair-orders',id,'abandonment-impact'],queryFn:()=>apiRequest<RepairAbandonmentImpact>(`/repair-orders/${id}/abandonment-impact`),enabled:enabled()&&requestEnabled&&Boolean(id)});
export function useRepairAbandonmentActions(){const qc=useQueryClient(),done=(_:unknown,v:any)=>{void qc.invalidateQueries({queryKey:erpKeys.repairOrders});void qc.invalidateQueries({queryKey:['repair-orders',v.repairOrderId]});void qc.invalidateQueries({queryKey:['repair-orders',v.repairOrderId,'abandonment-impact']});void qc.invalidateQueries({queryKey:['workshop-planning']});void qc.invalidateQueries({queryKey:['workshop-stats']});void qc.invalidateQueries({queryKey:erpKeys.parts})};return{request:useMutation({mutationFn:({repairOrderId,...body}:any)=>apiRequest(`/repair-orders/${repairOrderId}/abandonment`,{method:'POST',body:JSON.stringify(body)}),onSuccess:done}),finalize:useMutation({mutationFn:({repairOrderId}:any)=>apiRequest(`/repair-orders/${repairOrderId}/abandonment/finalize`,{method:'POST',body:'{}'}),onSuccess:done}),handover:useMutation({mutationFn:({repairOrderId,...body}:any)=>apiRequest(`/repair-orders/${repairOrderId}/abandonment/handover`,{method:'POST',body:JSON.stringify(body)}),onSuccess:done})}}
export function usePartMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: any) =>
      apiRequest(`/parts/${id}/movements`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: erpKeys.parts }),
  });
}
export const useCreatePart = () =>
  mutation<any>(() => "/parts", "POST", erpKeys.parts);
export function usePartAction(){const qc=useQueryClient();return useMutation({mutationFn:({id,action,...body}:any)=>apiRequest(`/parts/${id}/${action}`,{method:'POST',body:JSON.stringify(body)}),onSuccess:(_,v:any)=>{void qc.invalidateQueries({queryKey:erpKeys.parts});void qc.invalidateQueries({queryKey:['parts',v.id]})}})}
export function useCreatePurchaseOrder(){const qc=useQueryClient();return useMutation({mutationFn:(body:any)=>apiRequest('/purchase-orders',{method:'POST',body:JSON.stringify(body)}),onSuccess:()=>{void qc.invalidateQueries({queryKey:['purchase-orders']});void qc.invalidateQueries({queryKey:erpKeys.parts})}})}
export function usePurchaseOrderStatus(){const qc=useQueryClient();return useMutation({mutationFn:({id,...body}:any)=>apiRequest(`/purchase-orders/${id}/status`,{method:'PATCH',body:JSON.stringify(body)}),onSuccess:()=>void qc.invalidateQueries({queryKey:['purchase-orders']})})}
export function useReceivePurchaseOrder(){const qc=useQueryClient();return useMutation({mutationFn:({id,...body}:any)=>apiRequest(`/purchase-orders/${id}/receipts`,{method:'POST',body:JSON.stringify(body)}),onSuccess:()=>{void qc.invalidateQueries({queryKey:['purchase-orders']});void qc.invalidateQueries({queryKey:erpKeys.parts})}})}
export const usePaymentMethodsQuery = (requestEnabled=true) =>
  useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => apiRequest<any[]>("/invoices/payment-methods"),
    enabled: enabled()&&requestEnabled,
    staleTime: 300_000,
  });
export function useInvoicePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, ...body }: any) =>
      apiRequest(`/invoices/${invoiceId}/payments`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_,v) => {qc.invalidateQueries({ queryKey: erpKeys.invoices });qc.invalidateQueries({queryKey:['invoices',v.invoiceId]});qc.invalidateQueries({queryKey:erpKeys.repairOrders});},
  });
}
export function useBillingAction(){const qc=useQueryClient();return useMutation({mutationFn:({path,method='POST',...body}:any)=>apiRequest(path,{method,body:JSON.stringify(body)}),onSuccess:()=>{void qc.invalidateQueries({queryKey:erpKeys.invoices});void qc.invalidateQueries({queryKey:['invoices']});void qc.invalidateQueries({queryKey:erpKeys.sales});void qc.invalidateQueries({queryKey:erpKeys.repairOrders})}})}
const mapTechnician=(r:any):Technician=>({id:s(r.id),userId:s(r.user_id),agencyId:s(r.agency_id),name:r.name??'',specialty:r.specialty??'',employeeCode:r.employee_code??'',hourlyRate:n(r.hourly_rate),availableHoursPerDay:n(r.available_hours_per_day),isActive:Boolean(r.is_active)});
const mapWorkshopBay=(r:any):WorkshopBay=>({id:s(r.id),agencyId:s(r.agency_id),name:r.name??'',bayType:r.bay_type??'',capacity:n(r.capacity),status:r.status,occupiedNow:Boolean(r.occupied_now)});
const mapWorkshopSchedule=(r:any):WorkshopSchedule=>({id:s(r.id),agencyId:s(r.agency_id),technicianId:s(r.technician_id),bayId:s(r.bay_id),repairOrderId:s(r.repair_order_id),interventionId:s(r.intervention_id),startsAt:r.starts_at,endsAt:r.ends_at,status:r.status,orderNumber:r.order_number??'',customerName:r.customer_name??'',vehicleLabel:r.vehicle_label??'',registrationNumber:r.registration_number??'',technicianName:r.technician_name??'',bayName:r.bay_name??'',bayStatus:r.bay_status??'available',bayOccupiedNow:Boolean(r.bay_occupied_now),interventionDescription:r.intervention_description??''});
const mapWorkshopInterventionHistory=(r:any):WorkshopInterventionHistory=>({id:s(r.id),repairOrderId:s(r.repair_order_id),orderNumber:r.order_number??'',description:r.description??'',technicianName:r.technician_name??'',bayNames:r.bay_names??'',startedAt:r.started_at??null,endedAt:r.ended_at??null,durationHours:n(r.duration_hours),status:r.status});
const mapUnavailability=(r:any):TechnicianUnavailability=>({id:s(r.id),technicianId:s(r.technician_id),technicianName:r.technician_name??'',startsAt:r.starts_at,endsAt:r.ends_at,reason:r.reason??'Indisponible'});
export const useTechniciansQuery = (agencyId?:string, requestEnabled=true) =>
  useQuery({
    queryKey: ["technicians",agencyId],
    queryFn: async () => (await apiRequest<any[]>(`/workshop/technicians?agencyId=${encodeURIComponent(agencyId!)}`)).map(mapTechnician),
    enabled: enabled()&&requestEnabled&&Boolean(agencyId),
  });
export const useRepairTechnicianCandidatesQuery=(repairOrderId?:string)=>useQuery({queryKey:['repair-technician-candidates',repairOrderId],queryFn:async()=>(await apiRequest<any[]>(`/repair-orders/${repairOrderId}/technician-candidates`)).map((row:any)=>({id:s(row.id),userId:s(row.userId),agencyId:s(row.agencyId),name:row.name as string})),enabled:enabled()&&Boolean(repairOrderId)});
export interface EffectiveLaborRate {id:string;baseRateId:string;code:string;label:string;hourlyRate:number;source:'concession'|'agency'}
export const useRepairLaborRatesQuery=(repairOrderId?:string)=>useQuery({queryKey:['repair-labor-rates',repairOrderId],queryFn:()=>apiRequest<{rates:EffectiveLaborRate[];currencyCode:string}>(`/repair-orders/${repairOrderId}/labor-rates`),enabled:enabled()&&Boolean(repairOrderId)});
export const useRepairAvailablePartsQuery=(repairOrderId?:string,requestEnabled=true)=>useQuery({queryKey:['repair-available-parts',repairOrderId],queryFn:()=>apiRequest<Array<{id:string;reference:string;name:string;salePrice:number;availableStock:number}>>(`/repair-orders/${repairOrderId}/available-parts`),enabled:enabled()&&requestEnabled&&Boolean(repairOrderId)});
export const useRepairPartStocksQuery=(repairOrderId?:string,partId?:string,requestEnabled=true)=>useQuery({queryKey:['repair-part-stocks',repairOrderId,partId],queryFn:()=>apiRequest<Array<{id:string;locationId:string;locationName:string;availableStock:number}>>(`/repair-orders/${repairOrderId}/available-parts/${partId}/stocks`),enabled:enabled()&&requestEnabled&&Boolean(repairOrderId&&partId)});
export const useWorkshopBaysQuery = (agencyId?:string, requestEnabled=true) =>
  useQuery({ queryKey: ["workshop-bays",agencyId], queryFn: async () => (await apiRequest<any[]>(`/workshop/bays?agencyId=${encodeURIComponent(agencyId!)}`)).map(mapWorkshopBay), enabled: enabled()&&requestEnabled&&Boolean(agencyId) });
export const useWorkshopPlanningQuery = (agencyId?: string, from?: string, to?: string, filters: { technicianId?: string; bayId?: string; status?: string } = {}, requestEnabled=true) =>
  useQuery({
    queryKey: ["workshop-planning", agencyId, from, to, filters],
    queryFn: async () => { const p=new URLSearchParams({agencyId:agencyId!,from:from!,to:to!});Object.entries(filters).forEach(([k,v])=>v&&p.set(k,v));return (await apiRequest<any[]>(`/workshop/planning?${p}`)).map(mapWorkshopSchedule); },
    enabled: enabled() && requestEnabled && Boolean(agencyId && from && to),
  });
export const useWorkshopInterventionHistoryQuery=(requestEnabled=true)=>useQuery({queryKey:['workshop-intervention-history'],queryFn:async()=>(await apiRequest<any[]>('/workshop/interventions/history')).map(mapWorkshopInterventionHistory),enabled:enabled()&&requestEnabled});
export const useWorkshopStatsQuery = (agencyId?: string, from?: string, to?: string, requestEnabled=true) => useQuery({queryKey:["workshop-stats",agencyId,from,to],queryFn:async()=>{const r=await apiRequest<any>(`/workshop/stats?agencyId=${encodeURIComponent(agencyId!)}&from=${from}&to=${to}`);return{technicians:n(r.technicians),bays:n(r.bays),assignments:n(r.assignments),scheduledHours:n(r.scheduled_hours),actualHours:n(r.actual_hours),capacityHours:n(r.capacity_hours),bayCapacityHours:n(r.bay_capacity_hours),technicianOccupationRate:n(r.technician_occupation_rate),bayOccupationRate:n(r.bay_occupation_rate),productivityRate:n(r.productivity_rate)} satisfies WorkshopStats},enabled:enabled()&&requestEnabled&&Boolean(agencyId&&from&&to)});
export const useWorkshopUnavailabilitiesQuery=(agencyId?:string,from?:string,to?:string,technicianId?:string,requestEnabled=true)=>useQuery({queryKey:["workshop-unavailabilities",agencyId,from,to,technicianId],queryFn:async()=>{const p=new URLSearchParams({agencyId:agencyId!,from:from!,to:to!});if(technicianId)p.set('technicianId',technicianId);return(await apiRequest<any[]>(`/workshop/unavailabilities?${p}`)).map(mapUnavailability)},enabled:enabled()&&requestEnabled&&Boolean(agencyId&&from&&to)});
export function useWorkshopScheduleMutation(){const qc=useQueryClient();const done=()=>{qc.invalidateQueries({queryKey:["workshop-planning"]});qc.invalidateQueries({queryKey:["workshop-stats"]});qc.invalidateQueries({queryKey:erpKeys.repairOrders})};return{
  update:useMutation({mutationFn:({id,...body}:{id:string;technicianId:string;bayId?:string;startsAt:string;endsAt:string;agencyId?:string})=>apiRequest(`/workshop/schedules/${id}`,{method:"PATCH",body:JSON.stringify(body)}),onSuccess:done}),
  cancel:useMutation({mutationFn:({id,agencyId}:{id:string;agencyId?:string})=>apiRequest(`/workshop/schedules/${id}`,{method:"DELETE",body:JSON.stringify({agencyId})}),onSuccess:done}),
};}
export function useWorkshopUnavailabilityMutation(){const qc=useQueryClient();const done=()=>{qc.invalidateQueries({queryKey:["workshop-unavailabilities"]});qc.invalidateQueries({queryKey:["workshop-planning"]});qc.invalidateQueries({queryKey:["workshop-stats"]})};return{create:useMutation({mutationFn:({technicianId,...body}:{technicianId:string;startsAt:string;endsAt:string;reason:string;agencyId?:string})=>apiRequest(`/workshop/technicians/${technicianId}/unavailability`,{method:'POST',body:JSON.stringify(body)}),onSuccess:done}),remove:useMutation({mutationFn:({id,agencyId}:{id:string;agencyId?:string})=>apiRequest(`/workshop/unavailabilities/${id}`,{method:'DELETE',body:JSON.stringify({agencyId})}),onSuccess:done})}}
const mapShowroom = (r: any) => ({
  id: s(r.id),
  visitorName: r.visitorName ?? "",
  phone: r.phone ?? "",
  arrivalDateTime: r.arrivalAt,
  interest: r.reason ?? "Achat Véhicule Neuf",
  preferredModel: r.preferredModel ?? "",
  assignedRepName: r.assignedUserName ?? "",
  assignedUserId: s(r.assignedUserId),
  customerId: s(r.customerId),
  leadId: s(r.leadId),
  vehicleId: s(r.vehicleId),
  vehicleLabel: r.vehicleLabel ?? "",
  queueNumber: n(r.queueNumber),
  outcome: r.outcome ?? "pending",
  activeTestDriveId: s(r.activeTestDriveId),
  activeTestDriveMileage:
    r.activeTestDriveMileage == null ? null : n(r.activeTestDriveMileage),
  canStartTestDrive: Boolean(r.canStartTestDrive),
  status:
    r.status === "waiting"
      ? "En Attente"
      : r.status === "assigned"
        ? "Affecté"
        : r.status === "in_progress"
          ? r.activeTestDriveId
            ? "En Essai"
            : "En Entretien"
          : r.status === "completed"
            ? "Terminé"
            : "Annulé",
  waitTimeMinutes: n(r.waitMinutes),
});
export const useShowroomBoardQuery = (requestEnabled=true) =>
  useQuery({
    queryKey: ["showroom"],
    queryFn: async () => {
      const data = await apiRequest<any>("/showroom");
      return { visits: data.visits.map(mapShowroom), metrics: data.metrics };
    },
    enabled: enabled() && requestEnabled,
  });
export interface ShowroomAgencyOption {id:string;name:string;code:string}
export interface ShowroomSalesCandidate {id:string;name:string;agencyId:string}
export const useShowroomCreateAgenciesQuery=(requestEnabled=true)=>useQuery({queryKey:['showroom','create-agencies'],queryFn:()=>apiRequest<ShowroomAgencyOption[]>('/showroom/agencies/visitor-create'),enabled:enabled()&&requestEnabled});
export const useShowroomSalesCandidatesQuery=(agencyId?:string,requestEnabled=true)=>useQuery({queryKey:['showroom','sales-candidates',agencyId],queryFn:()=>apiRequest<ShowroomSalesCandidate[]>(`/showroom/agencies/${agencyId}/sales-candidates`),enabled:enabled()&&requestEnabled&&Boolean(agencyId)});
export const useShowroomQuery = () =>
  useQuery({
    queryKey: ["showroom"],
    queryFn: async () => {
      const data = await apiRequest<any>("/showroom");
      return data.visits.map(mapShowroom);
    },
    enabled: enabled(),
  });
export function useCreateShowroomVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) =>
      apiRequest("/showroom", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["showroom"] }),
  });
}
export function useShowroomActions() {
  const qc = useQueryClient(),
    done = () => qc.invalidateQueries({ queryKey: ["showroom"] });
  const updateVisit=(raw:any)=>qc.setQueryData<any>(["showroom"],current=>{
    const visit=mapShowroom(raw),replace=(items:any[])=>items.map(item=>item.id===visit.id?visit:item);
    if(Array.isArray(current))return replace(current);
    if(current?.visits)return{...current,visits:replace(current.visits)};
    return current;
  });
  return {
    assign: useMutation({
      mutationFn: ({ id, ...body }: any) =>
        apiRequest(`/showroom/${id}/assign`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      onSuccess: visit => { updateVisit(visit);void done(); },
    }),
    takeOver: useMutation({
      mutationFn: (id: string) =>
        apiRequest(`/showroom/${id}/take-over`, { method: "PATCH" }),
      onSuccess: visit => { updateVisit(visit);void done(); },
    }),
    complete: useMutation({
      mutationFn: ({ id, ...body }: any) =>
        apiRequest(`/showroom/${id}/complete`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      onSuccess: visit => { updateVisit(visit);void done(); },
    }),
    cancel: useMutation({
      mutationFn: ({ id, ...body }: any) =>
        apiRequest(`/showroom/${id}/cancel`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      onSuccess: visit => { updateVisit(visit);void done(); },
    }),
    convert: useMutation({
      mutationFn: ({ id, ...body }: any) =>
        apiRequest<any>(`/showroom/${id}/convert-to-lead`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      onSuccess: done,
    }),
    startDrive: useMutation({
      mutationFn: ({ id, ...body }: any) =>
        apiRequest<any>(`/showroom/${id}/test-drives`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      onSuccess: done,
    }),
    completeDrive: useMutation({
      mutationFn: ({ id, ...body }: any) =>
        apiRequest(`/showroom/test-drives/${id}/complete`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      onSuccess: () => {void done();void qc.invalidateQueries({queryKey:erpKeys.leads});void qc.invalidateQueries({queryKey:erpKeys.vehicles});void qc.invalidateQueries({queryKey:erpKeys.notifications});},
    }),
    cancelDrive: useMutation({
      mutationFn: ({ id, ...body }: any) =>
        apiRequest(`/showroom/test-drives/${id}/cancel`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      onSuccess: done,
    }),
  };
}
export const useShowroomDetection = (phone: string, requestEnabled=true) =>
  useQuery({
    queryKey: ["showroom-detect", phone],
    queryFn: () =>
      apiRequest<any>(`/showroom/detect?phone=${encodeURIComponent(phone)}`),
    enabled: enabled() && requestEnabled && phone.replace(/\D/g, "").length >= 6,
  });
export const useCreateVehicle = () =>
  mutation<any>(() => "/vehicles", "POST", erpKeys.vehicles);
export const useUpdateVehicle=()=>{
  const qc=useQueryClient();
  return useMutation({
    mutationFn:({id,...body}:{id:string}&Record<string,unknown>)=>apiRequest(`/vehicles/${id}`,{method:'PATCH',body:JSON.stringify(body)}),
    onSuccess:(_,variables)=>{
      qc.invalidateQueries({queryKey:erpKeys.vehicles});
      qc.invalidateQueries({queryKey:['vehicles',variables.id]});
      qc.invalidateQueries({queryKey:['dashboard']});
    },
  });
};
export function useVehicleImages() {
  const qc = useQueryClient();
  return {
    add: useMutation({
      mutationFn: ({ id, images }: { id: string; images: any[] }) =>
        apiRequest(`/vehicles/${id}/images`, {
          method: "POST",
          body: JSON.stringify({ images }),
        }),
      onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: erpKeys.vehicles }); qc.invalidateQueries({ queryKey: ["vehicles", v.id] }); qc.invalidateQueries({queryKey:['dashboard']}); },
    }),
    primary: useMutation({
      mutationFn: ({ id, imageId }: { id: string; imageId: string }) =>
        apiRequest(`/vehicles/${id}/images/${imageId}/primary`, {
          method: "PATCH",
        }),
      onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: erpKeys.vehicles }); qc.invalidateQueries({ queryKey: ["vehicles", v.id] }); },
    }),
    remove: useMutation({
      mutationFn: ({ id, imageId }: { id: string; imageId: string }) =>
        apiRequest(`/vehicles/${id}/images/${imageId}`, { method: "DELETE" }),
      onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: erpKeys.vehicles }); qc.invalidateQueries({ queryKey: ["vehicles", v.id] }); },
    }),
  };
}
export const useCreateUser = () =>
  mutation<any>(() => "/users", "POST", erpKeys.users);
export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) =>
      apiRequest("/activities", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}
export const useDeliveryDetailQuery = (id?: string,requestEnabled=true) =>
  useQuery({
    queryKey: ["deliveries", id],
    queryFn: () => apiRequest<any>(`/deliveries/${id}`),
    enabled: enabled() && Boolean(id) && requestEnabled,
  });
export const useDeliveryStatsQuery = (requestEnabled=true) =>
  useQuery({ queryKey: ["deliveries", "stats"], queryFn: () => apiRequest<any>("/deliveries/stats"), enabled: enabled()&&requestEnabled });
export const useCreateDelivery = () =>
  mutation<any>(() => "/deliveries", "POST", erpKeys.deliveries);
export const useDeliveryCandidatesQuery = (requestEnabled=true) => useQuery({queryKey:[...erpKeys.deliveries,'candidates'],queryFn:()=>apiRequest<any[]>('/deliveries/candidates'),enabled:enabled()&&requestEnabled});
export const useDeliverySpecialistsQuery=(saleId:string,requestEnabled=true)=>useQuery({queryKey:[...erpKeys.deliveries,'candidates',saleId,'specialists'],queryFn:()=>apiRequest<Array<{id:string;name:string;agencyId:string}>>(`/deliveries/candidates/${saleId}/specialists`),enabled:enabled()&&requestEnabled&&Boolean(saleId)});
export const useDeliveryTemplatesQuery=(requestEnabled=true)=>useQuery({queryKey:[...erpKeys.deliveries,'templates'],queryFn:()=>apiRequest<any[]>('/deliveries/checklist-templates'),enabled:enabled()&&requestEnabled});
export const useDeliveryTemplateActions=()=>{const qc=useQueryClient(),done=()=>qc.invalidateQueries({queryKey:[...erpKeys.deliveries,'templates']});return{
  create:useMutation({mutationFn:(body:any)=>apiRequest('/deliveries/checklist-templates',{method:'POST',body:JSON.stringify(body)}),onSuccess:done}),
  update:useMutation({mutationFn:({id,...body}:any)=>apiRequest(`/deliveries/checklist-templates/${id}`,{method:'PATCH',body:JSON.stringify(body)}),onSuccess:done}),
}};
export function useDeliveryChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deliveryId, itemId, ...body }: any) =>
      apiRequest(`/deliveries/${deliveryId}/checklist/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (_, v: any) => {
      qc.invalidateQueries({ queryKey: erpKeys.deliveries });
      qc.invalidateQueries({ queryKey: ["deliveries", v.deliveryId] });
    },
  });
}
export function useSignDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deliveryId, ...body }: any) =>
      apiRequest(`/deliveries/${deliveryId}/sign`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_, v: any) => {
      qc.invalidateQueries({ queryKey: erpKeys.deliveries });
      qc.invalidateQueries({ queryKey: ["deliveries", v.deliveryId] });
    },
  });
}
export function useDeliveryActions() {
  const qc = useQueryClient();
  const done = (_: unknown, value: any) => {
    qc.invalidateQueries({ queryKey: erpKeys.deliveries });
    qc.invalidateQueries({ queryKey: ["deliveries", value.deliveryId] });
  };
  return {
    status: useMutation({ mutationFn: ({ deliveryId, ...body }: any) => apiRequest(`/deliveries/${deliveryId}/status`, { method: "PATCH", body: JSON.stringify(body) }), onSuccess: done }),
    cancel: useMutation({ mutationFn: ({ deliveryId, ...body }: any) => apiRequest(`/deliveries/${deliveryId}/cancel`, { method: "PATCH", body: JSON.stringify(body) }), onSuccess: done }),
    reschedule: useMutation({ mutationFn: ({ deliveryId, ...body }: any) => apiRequest(`/deliveries/${deliveryId}/reschedule`, { method: "PATCH", body: JSON.stringify(body) }), onSuccess: done }),
    addDocument: useMutation({ mutationFn: ({ deliveryId, ...body }: any) => apiRequest(`/deliveries/${deliveryId}/documents`, { method: "POST", body: JSON.stringify(body) }), onSuccess: done }),
    markDocument: useMutation({ mutationFn: ({ deliveryId, documentId, ...body }: any) => apiRequest(`/deliveries/${deliveryId}/documents/${documentId}`, { method: "PATCH", body: JSON.stringify(body) }), onSuccess: done }),
  };
}
export const useRepairDetailQuery = (id?: string) =>
  useQuery({
    queryKey: ["repair-orders", id],
    queryFn: async() => mapRepair(await apiRequest<any>(`/repair-orders/${id}`)),
    enabled: enabled() && Boolean(id),
  });
export function useAddRepairItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ repairOrderId, ...body }: any) =>
      apiRequest(`/repair-orders/${repairOrderId}/items`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_, v: any) => {
      qc.invalidateQueries({ queryKey: erpKeys.repairOrders });
      qc.invalidateQueries({ queryKey: ["repair-orders", v.repairOrderId] });
      qc.invalidateQueries({ queryKey: erpKeys.parts });
      qc.invalidateQueries({queryKey:['repair-available-parts',v.repairOrderId]});
      qc.invalidateQueries({queryKey:['repair-part-stocks',v.repairOrderId]});
    },
  });
}
export function useAssignRepairOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ repairOrderId, ...body }: {repairOrderId:string;technicianId:string;bayId?:string;interventionId?:string;startsAt:string;endsAt:string}) =>
      apiRequest(`/repair-orders/${repairOrderId}/assign`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {qc.invalidateQueries({ queryKey: erpKeys.repairOrders });qc.invalidateQueries({queryKey:["workshop-planning"]});qc.invalidateQueries({queryKey:["workshop-intervention-history"]});qc.invalidateQueries({queryKey:["workshop-stats"]});},
  });
}
export function useInvoiceRepairOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ repairOrderId }: { repairOrderId: string }) => apiRequest(`/repair-orders/${repairOrderId}/invoice`, { method: "POST" }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: erpKeys.repairOrders });
      qc.invalidateQueries({ queryKey: ["repair-orders", v.repairOrderId] });
      qc.invalidateQueries({ queryKey: erpKeys.invoices });
    },
  });
}
export function useRepairOrderActions(){const qc=useQueryClient();const done=(_:unknown,v:any)=>{qc.invalidateQueries({queryKey:erpKeys.repairOrders});qc.invalidateQueries({queryKey:['repair-orders',v.repairOrderId]});qc.invalidateQueries({queryKey:['repair-available-parts',v.repairOrderId]});qc.invalidateQueries({queryKey:['repair-part-stocks',v.repairOrderId]});qc.invalidateQueries({queryKey:['repair-technician-candidates',v.repairOrderId]});qc.invalidateQueries({queryKey:['workshop-intervention-history']});};const action=(suffix:string,method='POST')=>useMutation({mutationFn:({repairOrderId,...body}:any)=>apiRequest(`/repair-orders/${repairOrderId}/${suffix}`,{method,body:JSON.stringify(body)}),onSuccess:done});return{inspection:action('inspection'),diagnostic:action('diagnostics'),approval:action('approval'),estimateItem:action('estimate-items'),deleteEstimateItem:useMutation({mutationFn:({repairOrderId,itemId}:any)=>apiRequest(`/repair-orders/${repairOrderId}/estimate-items/${itemId}`,{method:'DELETE'}),onSuccess:done}),createEstimateIntervention:useMutation({mutationFn:({repairOrderId,estimateItemId,...body}:any)=>apiRequest(`/repair-orders/${repairOrderId}/estimate-items/${estimateItemId}/intervention`,{method:'POST',body:JSON.stringify(body)}),onSuccess:done}),reserveEstimatePart:useMutation({mutationFn:({repairOrderId,estimateItemId,...body}:any)=>apiRequest(`/repair-orders/${repairOrderId}/estimate-items/${estimateItemId}/reserve`,{method:'POST',body:JSON.stringify(body)}),onSuccess:(data,v)=>{done(data,v);qc.invalidateQueries({queryKey:erpKeys.parts})}}),intervention:action('interventions'),interventionStatus:useMutation({mutationFn:({repairOrderId,interventionId,...body}:any)=>apiRequest(`/repair-orders/${repairOrderId}/interventions/${interventionId}/status`,{method:'PATCH',body:JSON.stringify(body)}),onSuccess:done}),startSession:action('sessions/start'),pauseSession:useMutation({mutationFn:({repairOrderId,sessionId}:any)=>apiRequest(`/repair-orders/${repairOrderId}/sessions/${sessionId}/pause`,{method:'PATCH',body:'{}'}),onSuccess:done}),resumeSession:useMutation({mutationFn:({repairOrderId,sessionId}:any)=>apiRequest(`/repair-orders/${repairOrderId}/sessions/${sessionId}/resume`,{method:'PATCH',body:'{}'}),onSuccess:done}),stopSession:useMutation({mutationFn:({repairOrderId,sessionId}:any)=>apiRequest(`/repair-orders/${repairOrderId}/sessions/${sessionId}/stop`,{method:'PATCH',body:'{}'}),onSuccess:done}),reservePart:action('parts/reserve'),reservationStatus:useMutation({mutationFn:({repairOrderId,reservationId,...body}:any)=>apiRequest(`/repair-orders/${repairOrderId}/parts/reservations/${reservationId}`,{method:'PATCH',body:JSON.stringify(body)}),onSuccess:(data,v)=>{done(data,v);qc.invalidateQueries({queryKey:erpKeys.parts})}}),qualityControl:action('quality-control'),handover:action('handover'),updateItem:useMutation({mutationFn:({repairOrderId,itemId,...body}:any)=>apiRequest(`/repair-orders/${repairOrderId}/items/${itemId}`,{method:'PATCH',body:JSON.stringify(body)}),onSuccess:(data,v)=>{done(data,v);qc.invalidateQueries({queryKey:erpKeys.parts})}}),cancelItem:useMutation({mutationFn:({repairOrderId,itemId}:any)=>apiRequest(`/repair-orders/${repairOrderId}/items/${itemId}`,{method:'DELETE'}),onSuccess:(data,v)=>{done(data,v);qc.invalidateQueries({queryKey:erpKeys.parts})}})}}
