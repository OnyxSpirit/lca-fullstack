type Section = 'overview'|'sales'|'finance'|'vehicles'|'workshop'|'parts';
type Column = readonly [key:string,label:string,kind:'number'|'text'];
export const reportFileNames:Record<Section,string>={overview:'synthese',sales:'ventes',finance:'finances',vehicles:'vehicules',workshop:'atelier',parts:'pieces'};

export const reportColumns:Record<Section,readonly Column[]>={
  overview:[['gross','Facturation brute TTC','number'],['net','Facturation nette TTC','number'],['collected','Encaissements nets','number'],['outstanding','Reste à percevoir','number'],['sales_count','Nombre de ventes','number'],['delivered_count','Ventes avec véhicule livré','number'],['margin','Marge brute véhicules','number'],['invoices_count','Nombre de factures','number'],['overdue_amount','Créances échues','number']],
  sales:[['sales_count','Nombre de ventes','number'],['delivered_count','Ventes avec véhicule livré','number'],['revenue','Montant des ventes TTC','number'],['revenue_ht','Montant des ventes HT','number'],['discount_total','Remises','number'],['vn_count','Véhicules neufs vendus','number'],['vo_count','Véhicules d’occasion vendus','number'],['margin','Marge brute véhicules','number'],['financed_sales','Ventes financées','number']],
  finance:[['gross','Facturation brute TTC','number'],['net','Facturation nette TTC','number'],['collected','Encaissements nets','number'],['outstanding','Reste à percevoir','number'],['overdue_amount','Créances échues','number'],['invoices_count','Nombre de factures','number']],
  vehicles:[['stock_count','Véhicules en stock','number'],['stock_value','Valeur du stock au coût','number'],['average_stock_age','Âge moyen du stock (jours)','number'],['vn_stock','Véhicules neufs en stock','number'],['vo_stock','Véhicules d’occasion en stock','number'],['slow_moving_count','Véhicules en stock depuis plus de 120 jours','number']],
  workshop:[['invoices','Factures atelier','number'],['revenue','Facturation atelier TTC','number'],['collected','Montant payé des factures atelier','number'],['outstanding','Reste à percevoir atelier','number']],
  parts:[['references_count','Références de pièces','number'],['physical','Stock physique','number'],['reserved','Stock réservé','number'],['available','Stock disponible','number'],['stock_value','Valeur du stock au coût','number']],
};

const neutralize=(value:string)=>/^[\s\u0000-\u001f]*[=+\-@]/u.test(value)?`'${value}`:value;
const cell=(value:string,protect=true)=>`"${(protect?neutralize(value):value).replaceAll('"','""')}"`;
export function reportCsv(section:Section,data:Record<string,unknown>,from:string,to:string,agency:string){
  const date=(value:string)=>value.split('-').reverse().join('/');
  const snapshot=section==='vehicles'||section==='parts';
  const today=new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Brazzaville'}).format(new Date());
  const rows=[snapshot?['Date du relevé','Agence','Indicateur','Valeur']:['Période du','Période au','Agence','Indicateur','Valeur'],...reportColumns[section].map(([key,label,kind])=>[...(snapshot?[today,agency]:[date(from),date(to),agency]),label,kind==='number'&&data[key]!=null?Number(data[key]).toLocaleString('fr-FR',{useGrouping:false,maximumFractionDigits:2}):String(data[key]??'')])];
  return '\ufeff'+rows.map((row,rowIndex)=>row.map((value,columnIndex)=>cell(value,!(rowIndex>0&&columnIndex===row.length-1&&reportColumns[section][rowIndex-1]?.[2]==='number'))).join(';')).join('\r\n')+'\r\n';
}
