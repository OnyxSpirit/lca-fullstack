export interface WorkshopRates{T1:number;T2:number;T3:number;T4:number}
export interface UpdateSettingsPayload{billing:{defaultVatRate:number};workshop:{rates:WorkshopRates}}
export interface ConcessionIdentityPayload{name:string;legalName?:string|null;taxIdentifier?:string|null;address?:string|null;city?:string|null;country?:string|null;currencyCode:string;timezone:string}
export interface AgencyPayload{name:string;code:string;address?:string|null;city?:string|null;phone?:string|null;email?:string|null;concessionId?:string}
export const SETTING_KEYS={vat:'billing.default_vat_rate',T1:'workshop.rate_t1',T2:'workshop.rate_t2',T3:'workshop.rate_t3',T4:'workshop.rate_t4'} as const;
export const DEFAULTS={vat:18.9,T1:35000,T2:45000,T3:55000,T4:45000} as const;
