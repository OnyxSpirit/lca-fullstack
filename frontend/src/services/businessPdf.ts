import { apiDownload } from "./apiClient";
export async function openBusinessPdf(
  type: "sale" | "delivery" | "repair_order" | "vehicle" | "quotation" | "proforma",
  id: string,
  download = false,
) {
  const endpoint = type === "delivery" ? `/deliveries/${id}/pdf` : type === "repair_order" ? `/repair-orders/${id}/pdf` : type === "quotation" ? `/quotations/${id}/pdf` : type === "proforma" ? `/proformas/${id}/pdf` : `/documents/business/${type}/${id}/pdf`;
  const blob = await apiDownload(`${endpoint}${download ? "?download=true" : ""}`);
  const url = URL.createObjectURL(blob);
  if (download) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-${id}.pdf`;
    a.click();
  } else window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function openDeliveryPlanningPdf(date: string) {
  const blob = await apiDownload(`/deliveries-planning/pdf?date=${encodeURIComponent(date)}`);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function openOfficialPdf(endpoint:string,downloadName='document-officiel.pdf'){
  const blob=await apiDownload(endpoint),url=URL.createObjectURL(blob);
  const target=window.open(url,'_blank','noopener,noreferrer');
  if(!target){const a=document.createElement('a');a.href=url;a.download=downloadName;a.click()}
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
