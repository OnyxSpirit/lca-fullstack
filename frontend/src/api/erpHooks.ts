import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, assetUrl } from "../services/apiClient";
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
  WorkshopSchedule,
  WorkshopStats,
} from "../types";

export const erpKeys = {
  users: ["users"],
  agencies: ["agencies"],
  customers: ["customers"],
  leads: ["leads"],
  vehicles: ["vehicles"],
  sales: ["sales"],
  repairOrders: ["repair-orders"],
  parts: ["parts"],
  deliveries: ["deliveries"],
  invoices: ["invoices"],
} as const;
const enabled = () => Boolean(localStorage.getItem("lca-access-token"));
const n = (v: unknown) => Number(v ?? 0);
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
  mobile: r.secondaryPhone ?? r.phone ?? "",
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
  purchasePriceHT: n(r.purchasePrice),
  refurbishCostHT: n(r.refurbishmentCost),
  otherCostsHT:
    n(r.additionalCosts) + n(r.transportCost) + n(r.administrativeCost),
  catalogPriceTTC: n(r.catalogPrice),
  sellingPriceTTC: n(r.salePrice),
  minimumPriceTTC: n(r.minimumPrice),
  targetMarginHT:
    n(r.salePrice) -
    n(r.purchasePrice) -
    n(r.refurbishmentCost) -
    n(r.additionalCosts) -
    n(r.transportCost) -
    n(r.administrativeCost),
  photos: (r.photos ?? (r.primaryImage ? [r.primaryImage] : [])).map(assetUrl),
  features: r.features ?? [],
  supplier: r.supplierName ?? "",
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
  assignedToName: r.assignedUserName ?? "",
  createdById: s(r.createdById),
  createdByName: r.createdByName ?? "",
  agencyId: s(r.agencyId),
  priority: leadPriorityFromDb[r.priority] ?? "Moyenne",
  estimatedCloseDate: r.expectedCloseDate,
  notes: r.notes ?? "",
  createdAt: r.createdAt ?? "",
  updatedAt: r.updatedAt ?? "",
  score: n(r.probability),
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
  depositPaidTTC: n(r.deposit_amount),
  remainingBalanceTTC: n(r.balance_due),
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
  status:
    repairOrderStatusFromDb[r.status as keyof typeof repairOrderStatusFromDb] ??
    "PLANIFIE",
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
  interventions:(r.interventions??[]).map((x:any)=>({id:s(x.id),technicianId:s(x.technician_id),technicianName:x.technician_name??'',description:x.description,interventionType:x.intervention_type??'',plannedHours:n(x.planned_hours),actualHours:n(x.actual_hours),unitPrice:n(x.unit_price),lineTotal:n(x.line_total),status:x.status})),
  sessions:(r.sessions??[]).map((x:any)=>({id:s(x.id),technicianId:s(x.technician_id),technicianName:x.technician_name??'',interventionId:s(x.intervention_id),bayId:s(x.bay_id),startedAt:x.started_at,endedAt:x.ended_at??null,status:x.status})),
  reservations:(r.reservations??[]).map((x:any)=>({id:s(x.id),partId:s(x.part_id),partReference:x.part_reference??'',partName:x.part_name??'',locationName:x.location_name??'Non précisé',quantity:n(x.quantity),status:x.status,createdAt:x.created_at})),
  qualityControls:(r.qualityControls??[]).map((x:any)=>({id:s(x.id),plannedWorkCompleted:Boolean(x.planned_work_completed),defectCorrected:Boolean(x.defect_corrected),roadTestPerformed:Boolean(x.road_test_performed),noLeaks:Boolean(x.no_leaks),levelsChecked:Boolean(x.levels_checked),cleanlinessChecked:Boolean(x.cleanliness_checked),result:x.result,reason:x.reason??'',observations:x.observations??'',controlledByName:x.controlled_by_name??'',controlledAt:x.controlled_at})),
  history:(r.history??[]).map((x:any)=>({id:s(x.id),oldStatus:x.old_status??null,newStatus:x.new_status,reason:x.reason??'',changedByName:x.changed_by_name??'',changedAt:x.changed_at})),
  handover:r.handover?{customerName:r.handover.customer_name,mileageOut:r.handover.mileage_out==null?null:n(r.handover.mileage_out),observations:r.handover.observations??'',signatureData:r.handover.signature_data??'',handedOverAt:r.handover.handed_over_at}:null,
  invoice:r.invoice?{id:s(r.invoice.id),invoiceNumber:r.invoice.invoice_number,subtotal:n(r.invoice.subtotal),taxTotal:n(r.invoice.tax_total),total:n(r.invoice.total),status:r.invoice.status}:null,
  symptomsReported: r.complaint ?? "",
  diagnosticNotes: r.diagnosis_summary ?? "",
  operations:(r.interventions??[]).map((x:any)=>({id:s(x.id),code:`INT-${x.id}`,description:x.description,estimatedHours:n(x.planned_hours),actualHours:n(x.actual_hours),hourlyRateHT:n(x.unit_price),technicianId:s(x.technician_id),status:x.status==='completed'?'Termine':x.status==='in_progress'?'En_Cours':'A_Faire'})),
  parts:(r.items??[]).filter((x:any)=>x.item_type==='part'&&x.status!=='cancelled').map((x:any)=>({id:s(x.id),partId:s(x.part_id),partReference:x.part_reference??'',description:x.description,quantity:n(x.quantity),unitPriceHT:n(x.unit_price),totalHT:n(x.line_total)})),
  laborItems:(r.items??[]).filter((x:any)=>x.item_type==='labor'&&x.status!=='cancelled').map((x:any)=>({id:s(x.id),interventionId:s(x.intervention_id),description:x.description,quantity:n(x.quantity),unitPrice:n(x.unit_price),taxRate:n(x.tax_rate),lineTotal:n(x.line_total)})),
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
      ? `OR ${r.repair_order_id}`
      : "",
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
  payments:(r.payments??[]).map((x:any)=>({id:s(x.id),paymentNumber:x.payment_number,amount:n(x.amount),paymentMethodId:s(x.payment_method_id),paymentMethod:x.payment_method,reference:x.reference??'',status:x.status,paymentDate:x.payment_date,receivedByName:x.received_by_name??''})),
  creditNotes:(r.creditNotes??[]).map((x:any)=>({id:s(x.id),creditNoteNumber:x.credit_note_number,amount:n(x.amount),reason:x.reason,status:x.status,issueDate:x.issue_date,createdByName:x.created_by_name??''})),
});

function resource<T>(key: readonly string[], path: string, map: (r: any) => T) {
  return useQuery({
    queryKey: key,
    queryFn: async () => (await apiRequest<any[]>(path)).map(map),
    enabled: enabled(),
  });
}
export const useUsersQuery = () =>
  resource<User>(
    erpKeys.users,
    "/users/directory",
    (r: any) =>
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
      }) as User,
  );
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
export const useCustomersQuery = (search = "", type = "") =>
  useQuery({
    queryKey: [...erpKeys.customers, search, type],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (type) params.set("type", type);
      const suffix = params.size ? `?${params}` : "";
      return (await apiRequest<any[]>(`/customers${suffix}`)).map(mapCustomer);
    },
    enabled: enabled(),
  });
export const useLeadsQuery = (search = "", priority = "") =>
  useQuery({
    queryKey: [...erpKeys.leads, search, priority],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (priority) params.set("priority", priority);
      const suffix = params.size ? `?${params}` : "";
      return (await apiRequest<any[]>(`/leads${suffix}`)).map(mapLead);
    },
    enabled: enabled(),
  });
export interface VehicleFilters {
  search?: string;
  status?: string;
  type?: string;
  fuel?: string;
  dormant?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
}
export const useVehiclesQuery = (filters: VehicleFilters = {}) =>
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
      return data.items.map(mapVehicle);
    },
    enabled: enabled(),
  });
export const useSalesQuery = () => resource(erpKeys.sales, "/sales", mapSale);
export const useRepairOrdersQuery = (search="",status="") => useQuery({queryKey:[...erpKeys.repairOrders,search,status],queryFn:async()=>{const p=new URLSearchParams();if(search)p.set('search',search);if(status)p.set('status',status);return(await apiRequest<any[]>(`/repair-orders?${p}`)).map(mapRepair)},enabled:enabled()});
export const useRepairStatsQuery = () => useQuery({queryKey:["repair-orders","stats"],queryFn:()=>apiRequest<any>("/repair-orders/stats"),enabled:enabled()});
export const usePartsQuery = (agencyId?:string,filters:{search?:string;categoryId?:string}={}) => useQuery({queryKey:[...erpKeys.parts,agencyId,filters],queryFn:async()=>{const p=new URLSearchParams();if(agencyId)p.set('agencyId',agencyId);if(filters.search)p.set('search',filters.search);if(filters.categoryId)p.set('categoryId',filters.categoryId);return(await apiRequest<any[]>(`/parts?${p}`)).map(mapPart);},enabled:enabled()&&Boolean(agencyId)});
export const usePartReferencesQuery=(agencyId?:string)=>useQuery({queryKey:['part-references',agencyId],queryFn:()=>apiRequest<any>(`/part-references?agencyId=${encodeURIComponent(agencyId!)}`),enabled:enabled()&&Boolean(agencyId),staleTime:300_000});
export const usePurchaseOrdersQuery=(agencyId?:string)=>useQuery({queryKey:['purchase-orders',agencyId],queryFn:()=>apiRequest<any[]>(`/purchase-orders?agencyId=${encodeURIComponent(agencyId!)}`),enabled:enabled()&&Boolean(agencyId)});
export const usePurchaseOrderDetailQuery=(id?:string,agencyId?:string)=>useQuery({queryKey:['purchase-orders',id,agencyId],queryFn:()=>apiRequest<any>(`/purchase-orders/${id}?agencyId=${encodeURIComponent(agencyId!)}`),enabled:enabled()&&Boolean(id)&&Boolean(agencyId)});
export const useDeliveriesQuery = (
  filters: { search?: string; status?: string; dateFrom?: string; dateTo?: string; assignedUserId?: string } = {},
) =>
  useQuery({
    queryKey: [...erpKeys.deliveries, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
      return (await apiRequest<any[]>(`/deliveries?${params}`)).map(mapDelivery);
    },
    enabled: enabled(),
  });
export const useInvoicesQuery = (filters:Record<string,string>={}) => useQuery({queryKey:[...erpKeys.invoices,filters],queryFn:async()=>{const p=new URLSearchParams();Object.entries(filters).forEach(([k,v])=>{if(v)p.set(k,v)});return(await apiRequest<any[]>(`/invoices?${p}`)).map(mapInvoice)},enabled:enabled()});
export const useInvoiceQuery=(id?:string,agencyId?:string)=>useQuery({queryKey:['invoices',id,agencyId],queryFn:async()=>mapInvoice(await apiRequest<any>(`/invoices/${id}?agencyId=${encodeURIComponent(agencyId!)}`)),enabled:enabled()&&Boolean(id)&&Boolean(agencyId)});
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
        vehicles: data.vehicles.map((v: any) => ({
          ...v,
          status:
            vehicleStatusFromDb[v.status as keyof typeof vehicleStatusFromDb] ??
            v.status,
        })),
        sales: data.sales.map((sale: any) => ({
          ...sale,
          status:
            saleStatusFromDb[sale.status as keyof typeof saleStatusFromDb] ??
            sale.status,
        })),
        repairOrders: data.repairOrders.map((order: any) => ({
          ...order,
          status:
            repairOrderStatusFromDb[
              order.status as keyof typeof repairOrderStatusFromDb
            ] ?? order.status,
        })),
        invoices: data.invoices.map((invoice: any) => ({
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
export const useVehicleReferencesQuery = () =>
  useQuery({
    queryKey: ["vehicle-references"],
    queryFn: () => apiRequest<any>("/vehicle-references"),
    enabled: enabled(),
    staleTime: 300_000,
  });
export const usePartDetailQuery = (id?: string,agencyId?:string) =>
  useQuery({
    queryKey: ["parts", id,agencyId],
    queryFn: async () => mapPart(await apiRequest<any>(`/parts/${id}?agencyId=${encodeURIComponent(agencyId!)}`)),
    enabled: enabled() && Boolean(id)&&Boolean(agencyId),
  });
export const usePartMovementsQuery=(id?:string,agencyId?:string,filters:Record<string,string>={})=>useQuery({queryKey:['parts',id,'movements',agencyId,filters],queryFn:()=>{const p=new URLSearchParams({agencyId:agencyId!});Object.entries(filters).forEach(([k,v])=>{if(v)p.set(k,v)});return apiRequest<any[]>(`/parts/${id}/movements?${p}`)},enabled:enabled()&&Boolean(id)&&Boolean(agencyId)});
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
export interface CreateSalePayload { customerId:string;vehicleId:string;agencyId:string;salespersonId:string;discount:number;depositAmount:number;notes:string;idempotencyKey:string;opportunityId?:string }
export const useCreateSale = () => { const qc=useQueryClient();return useMutation({mutationFn:(body:CreateSalePayload)=>apiRequest('/sales',{method:'POST',body:JSON.stringify(body)}),onSuccess:()=>{void qc.invalidateQueries({queryKey:erpKeys.sales});void qc.invalidateQueries({queryKey:erpKeys.vehicles});void qc.invalidateQueries({queryKey:erpKeys.customers})}}); };
export const useCreateRepairOrder = () =>
  mutation<any>(() => "/repair-orders", "POST", erpKeys.repairOrders);
export const useCreateInvoice = () =>
  mutation<any>(() => "/invoices", "POST", erpKeys.invoices);
export function useLeadStageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      apiRequest(`/leads/${id}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: erpKeys.leads }),
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
    onSuccess: () => {void qc.invalidateQueries({ queryKey: erpKeys.sales });void qc.invalidateQueries({queryKey:erpKeys.vehicles});},
  });
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
export const usePaymentMethodsQuery = () =>
  useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => apiRequest<any[]>("/invoices/payment-methods"),
    enabled: enabled(),
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
    onSuccess: (_,v) => {qc.invalidateQueries({ queryKey: erpKeys.invoices });qc.invalidateQueries({queryKey:['invoices',v.invoiceId]});},
  });
}
export function useBillingAction(){const qc=useQueryClient();return useMutation({mutationFn:({path,method='POST',...body}:any)=>apiRequest(path,{method,body:JSON.stringify(body)}),onSuccess:()=>{void qc.invalidateQueries({queryKey:erpKeys.invoices});void qc.invalidateQueries({queryKey:['invoices']});void qc.invalidateQueries({queryKey:erpKeys.sales});void qc.invalidateQueries({queryKey:erpKeys.repairOrders})}})}
const mapTechnician=(r:any):Technician=>({id:s(r.id),userId:s(r.user_id),agencyId:s(r.agency_id),name:r.name??'',specialty:r.specialty??'',employeeCode:r.employee_code??'',hourlyRate:n(r.hourly_rate),availableHoursPerDay:n(r.available_hours_per_day),isActive:Boolean(r.is_active)});
const mapWorkshopBay=(r:any):WorkshopBay=>({id:s(r.id),agencyId:s(r.agency_id),name:r.name??'',bayType:r.bay_type??'',capacity:n(r.capacity),status:r.status,occupiedNow:Boolean(r.occupied_now)});
const mapWorkshopSchedule=(r:any):WorkshopSchedule=>({id:s(r.id),agencyId:s(r.agency_id),technicianId:s(r.technician_id),bayId:s(r.bay_id),repairOrderId:s(r.repair_order_id),interventionId:s(r.intervention_id),startsAt:r.starts_at,endsAt:r.ends_at,status:r.status,orderNumber:r.order_number??'',customerName:r.customer_name??'',vehicleLabel:r.vehicle_label??'',registrationNumber:r.registration_number??'',technicianName:r.technician_name??'',bayName:r.bay_name??'',bayStatus:r.bay_status??'available',bayOccupiedNow:Boolean(r.bay_occupied_now),interventionDescription:r.intervention_description??''});
const mapUnavailability=(r:any):TechnicianUnavailability=>({id:s(r.id),technicianId:s(r.technician_id),technicianName:r.technician_name??'',startsAt:r.starts_at,endsAt:r.ends_at,reason:r.reason??'Indisponible'});
export const useTechniciansQuery = (agencyId?:string) =>
  useQuery({
    queryKey: ["technicians",agencyId],
    queryFn: async () => (await apiRequest<any[]>(`/workshop/technicians?agencyId=${encodeURIComponent(agencyId!)}`)).map(mapTechnician),
    enabled: enabled()&&Boolean(agencyId),
  });
export const useWorkshopBaysQuery = (agencyId?:string) =>
  useQuery({ queryKey: ["workshop-bays",agencyId], queryFn: async () => (await apiRequest<any[]>(`/workshop/bays?agencyId=${encodeURIComponent(agencyId!)}`)).map(mapWorkshopBay), enabled: enabled()&&Boolean(agencyId) });
export const useWorkshopPlanningQuery = (agencyId?: string, from?: string, to?: string, filters: { technicianId?: string; bayId?: string; status?: string } = {}) =>
  useQuery({
    queryKey: ["workshop-planning", agencyId, from, to, filters],
    queryFn: async () => { const p=new URLSearchParams({agencyId:agencyId!,from:from!,to:to!});Object.entries(filters).forEach(([k,v])=>v&&p.set(k,v));return (await apiRequest<any[]>(`/workshop/planning?${p}`)).map(mapWorkshopSchedule); },
    enabled: enabled() && Boolean(agencyId && from && to),
  });
export const useWorkshopStatsQuery = (agencyId?: string, from?: string, to?: string) => useQuery({queryKey:["workshop-stats",agencyId,from,to],queryFn:async()=>{const r=await apiRequest<any>(`/workshop/stats?agencyId=${encodeURIComponent(agencyId!)}&from=${from}&to=${to}`);return{technicians:n(r.technicians),bays:n(r.bays),assignments:n(r.assignments),scheduledHours:n(r.scheduled_hours),actualHours:n(r.actual_hours),capacityHours:n(r.capacity_hours),bayCapacityHours:n(r.bay_capacity_hours),technicianOccupationRate:n(r.technician_occupation_rate),bayOccupationRate:n(r.bay_occupation_rate),productivityRate:n(r.productivity_rate)} satisfies WorkshopStats},enabled:enabled()&&Boolean(agencyId&&from&&to)});
export const useWorkshopUnavailabilitiesQuery=(agencyId?:string,from?:string,to?:string,technicianId?:string)=>useQuery({queryKey:["workshop-unavailabilities",agencyId,from,to,technicianId],queryFn:async()=>{const p=new URLSearchParams({agencyId:agencyId!,from:from!,to:to!});if(technicianId)p.set('technicianId',technicianId);return(await apiRequest<any[]>(`/workshop/unavailabilities?${p}`)).map(mapUnavailability)},enabled:enabled()&&Boolean(agencyId&&from&&to)});
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
  status:
    r.status === "waiting"
      ? "En Attente"
      : r.status === "assigned"
        ? "Affecté"
        : r.status === "in_progress"
          ? "En Entretien"
          : r.status === "completed"
            ? "Terminé"
            : "Annulé",
  waitTimeMinutes: n(r.waitMinutes),
});
export const useShowroomBoardQuery = () =>
  useQuery({
    queryKey: ["showroom"],
    queryFn: async () => {
      const data = await apiRequest<any>("/showroom");
      return { visits: data.visits.map(mapShowroom), metrics: data.metrics };
    },
    enabled: enabled(),
  });
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
  return {
    assign: useMutation({
      mutationFn: ({ id, ...body }: any) =>
        apiRequest(`/showroom/${id}/assign`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      onSuccess: done,
    }),
    takeOver: useMutation({
      mutationFn: (id: string) =>
        apiRequest(`/showroom/${id}/take-over`, { method: "PATCH" }),
      onSuccess: done,
    }),
    complete: useMutation({
      mutationFn: ({ id, ...body }: any) =>
        apiRequest(`/showroom/${id}/complete`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      onSuccess: done,
    }),
    cancel: useMutation({
      mutationFn: ({ id, ...body }: any) =>
        apiRequest(`/showroom/${id}/cancel`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      onSuccess: done,
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
      onSuccess: done,
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
export const useShowroomDetection = (phone: string) =>
  useQuery({
    queryKey: ["showroom-detect", phone],
    queryFn: () =>
      apiRequest<any>(`/showroom/detect?phone=${encodeURIComponent(phone)}`),
    enabled: enabled() && phone.replace(/\D/g, "").length >= 6,
  });
export const useCreateVehicle = () =>
  mutation<any>(() => "/vehicles", "POST", erpKeys.vehicles);
export function useVehicleImages() {
  const qc = useQueryClient();
  return {
    add: useMutation({
      mutationFn: ({ id, images }: { id: string; images: any[] }) =>
        apiRequest(`/vehicles/${id}/images`, {
          method: "POST",
          body: JSON.stringify({ images }),
        }),
      onSuccess: (_, v) =>
        qc.invalidateQueries({ queryKey: ["vehicles", v.id] }),
    }),
    primary: useMutation({
      mutationFn: ({ id, imageId }: { id: string; imageId: string }) =>
        apiRequest(`/vehicles/${id}/images/${imageId}/primary`, {
          method: "PATCH",
        }),
      onSuccess: (_, v) =>
        qc.invalidateQueries({ queryKey: ["vehicles", v.id] }),
    }),
    remove: useMutation({
      mutationFn: ({ id, imageId }: { id: string; imageId: string }) =>
        apiRequest(`/vehicles/${id}/images/${imageId}`, { method: "DELETE" }),
      onSuccess: (_, v) =>
        qc.invalidateQueries({ queryKey: ["vehicles", v.id] }),
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
export const useDeliveryDetailQuery = (id?: string) =>
  useQuery({
    queryKey: ["deliveries", id],
    queryFn: () => apiRequest<any>(`/deliveries/${id}`),
    enabled: enabled() && Boolean(id),
  });
export const useDeliveryStatsQuery = () =>
  useQuery({ queryKey: ["deliveries", "stats"], queryFn: () => apiRequest<any>("/deliveries/stats"), enabled: enabled() });
export const useCreateDelivery = () =>
  mutation<any>(() => "/deliveries", "POST", erpKeys.deliveries);
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
    onSuccess: () => {qc.invalidateQueries({ queryKey: erpKeys.repairOrders });qc.invalidateQueries({queryKey:["workshop-planning"]});qc.invalidateQueries({queryKey:["workshop-stats"]});},
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
export function useRepairOrderActions(){const qc=useQueryClient();const done=(_:unknown,v:any)=>{qc.invalidateQueries({queryKey:erpKeys.repairOrders});qc.invalidateQueries({queryKey:['repair-orders',v.repairOrderId]});};const action=(suffix:string,method='POST')=>useMutation({mutationFn:({repairOrderId,...body}:any)=>apiRequest(`/repair-orders/${repairOrderId}/${suffix}`,{method,body:JSON.stringify(body)}),onSuccess:done});return{inspection:action('inspection'),diagnostic:action('diagnostics'),approval:action('approval'),intervention:action('interventions'),interventionStatus:useMutation({mutationFn:({repairOrderId,interventionId,...body}:any)=>apiRequest(`/repair-orders/${repairOrderId}/interventions/${interventionId}/status`,{method:'PATCH',body:JSON.stringify(body)}),onSuccess:done}),startSession:action('sessions/start'),stopSession:useMutation({mutationFn:({repairOrderId,sessionId}:any)=>apiRequest(`/repair-orders/${repairOrderId}/sessions/${sessionId}/stop`,{method:'PATCH',body:'{}'}),onSuccess:done}),reservePart:action('parts/reserve'),reservationStatus:useMutation({mutationFn:({repairOrderId,reservationId,...body}:any)=>apiRequest(`/repair-orders/${repairOrderId}/parts/reservations/${reservationId}`,{method:'PATCH',body:JSON.stringify(body)}),onSuccess:(data,v)=>{done(data,v);qc.invalidateQueries({queryKey:erpKeys.parts})}}),qualityControl:action('quality-control'),handover:action('handover'),updateItem:useMutation({mutationFn:({repairOrderId,itemId,...body}:any)=>apiRequest(`/repair-orders/${repairOrderId}/items/${itemId}`,{method:'PATCH',body:JSON.stringify(body)}),onSuccess:(data,v)=>{done(data,v);qc.invalidateQueries({queryKey:erpKeys.parts})}}),cancelItem:useMutation({mutationFn:({repairOrderId,itemId}:any)=>apiRequest(`/repair-orders/${repairOrderId}/items/${itemId}`,{method:'DELETE'}),onSuccess:(data,v)=>{done(data,v);qc.invalidateQueries({queryKey:erpKeys.parts})}})}}
