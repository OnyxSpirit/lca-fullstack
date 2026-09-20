import{useMutation,useQuery,useQueryClient}from'@tanstack/react-query';
import{apiRequest}from'../services/apiClient';

export interface Employee{id:string;user_id:string;first_name:string;last_name:string;email:string;phone:string|null;employee_number:string;position_title:string|null;hire_date:string;employment_status:'active'|'inactive'|'departed';agency_id:string;agency_name:string;account_active:boolean;current_salary?:number}
export interface Salary{id:string;amount:number;effective_date:string;created_at:string;author_name:string|null}
export interface StockItem{id:string;agency_id:string;agency_name:string;designation:string;reference:string|null;category:string|null;unit:string;current_quantity:number;minimum_quantity:number;below_minimum:boolean;is_active:boolean}
export interface StockMovement{id:string;movement_type:'entry'|'exit';quantity:number;quantity_before:number;quantity_after:number;movement_date:string;reason:string|null;reference:string|null;author_name:string|null}
export interface Budget{id:string;scope_type:'agency'|'concession';agency_id:string|null;concession_id:string|null;agency_name:string|null;concession_name:string|null;label:string;initial_amount:number;spent:number;remaining:number;start_date:string;end_date:string;category:string|null;status:string}
export interface Expense{id:string;label:string;amount:number;expense_date:string;category:string|null;reference:string|null;author_name:string|null}
export interface HrOverview{activeEmployees?:number;payroll?:number;stockItems?:number;lowStockItems?:number;activeBudget?:number;expenses?:number;remainingBudget?:number}
export interface HrReport{headcount?:Record<string,unknown>[];payroll?:Record<string,unknown>[];stock?:Record<string,unknown>[];budgets?:Record<string,unknown>[]}
const keys={root:['hr']as const,employees:['hr','employees']as const,stock:['hr','stock']as const,budgets:['hr','budgets']as const,overview:['hr','overview']as const,reporting:['hr','reporting']as const};
const invalidate=(qc:ReturnType<typeof useQueryClient>)=>void qc.invalidateQueries({queryKey:keys.root});
const params=(values:Record<string,string|number|undefined>)=>{const p=new URLSearchParams();Object.entries(values).forEach(([k,v])=>{if(v!==undefined&&v!=='')p.set(k,String(v))});return p.toString()};
export const useHrOverviewQuery=(enabled:boolean)=>useQuery({queryKey:keys.overview,queryFn:()=>apiRequest<HrOverview>('/hr/overview'),enabled});
export const useEmployeesQuery=(filters:Record<string,string|number>,enabled:boolean)=>useQuery({queryKey:[...keys.employees,filters],queryFn:()=>apiRequest<{items:Employee[];total:number;page:number;pageSize:number}>(`/hr/employees?${params(filters)}`),enabled});
export const useSalariesQuery=(employeeId:string|undefined,enabled:boolean)=>useQuery({queryKey:['hr','salary',employeeId],queryFn:()=>apiRequest<Salary[]>(`/hr/employees/${employeeId}/salaries`),enabled:enabled&&Boolean(employeeId)});
export const useStockQuery=(filters:Record<string,string>,enabled:boolean)=>useQuery({queryKey:[...keys.stock,filters],queryFn:()=>apiRequest<StockItem[]>(`/hr/internal-stock?${params(filters)}`),enabled});
export const useStockMovementsQuery=(itemId:string|undefined,enabled:boolean)=>useQuery({queryKey:['hr','stock',itemId,'movements'],queryFn:()=>apiRequest<StockMovement[]>(`/hr/internal-stock/${itemId}/movements`),enabled:enabled&&Boolean(itemId)});
export const useBudgetsQuery=(enabled:boolean)=>useQuery({queryKey:keys.budgets,queryFn:()=>apiRequest<Budget[]>('/hr/budgets'),enabled});
export const useExpensesQuery=(budgetId:string|undefined,enabled:boolean)=>useQuery({queryKey:['hr','budget',budgetId,'expenses'],queryFn:()=>apiRequest<Expense[]>(`/hr/budgets/${budgetId}/expenses`),enabled:enabled&&Boolean(budgetId)});
export const useHrReportingQuery=(enabled:boolean)=>useQuery({queryKey:keys.reporting,queryFn:()=>apiRequest<HrReport>('/hr/reporting'),enabled});
export const useHrConcessionsQuery=(enabled:boolean)=>useQuery({queryKey:['hr','concessions'],queryFn:()=>apiRequest<{id:string;name:string}[]>('/hr/concessions'),enabled});
export function useHrActions(){const qc=useQueryClient();return{
 updateEmployee:useMutation({mutationFn:({id,body}:{id:string;body:Record<string,unknown>})=>apiRequest(`/hr/employees/${id}`,{method:'PATCH',body:JSON.stringify(body)}),onSuccess:()=>invalidate(qc)}),
 salary:useMutation({mutationFn:({employeeId,amount,effectiveDate}:{employeeId:string;amount:string;effectiveDate:string})=>apiRequest(`/hr/employees/${employeeId}/salaries`,{method:'POST',body:JSON.stringify({amount,effectiveDate})}),onSuccess:()=>invalidate(qc)}),
 stockItem:useMutation({mutationFn:(body:Record<string,unknown>)=>apiRequest('/hr/internal-stock',{method:'POST',body:JSON.stringify(body)}),onSuccess:()=>invalidate(qc)}),
 stockMovement:useMutation({mutationFn:({itemId,body}:{itemId:string;body:Record<string,unknown>})=>apiRequest(`/hr/internal-stock/${itemId}/movements`,{method:'POST',body:JSON.stringify(body)}),onSuccess:()=>invalidate(qc)}),
 budget:useMutation({mutationFn:(body:Record<string,unknown>)=>apiRequest('/hr/budgets',{method:'POST',body:JSON.stringify(body)}),onSuccess:()=>invalidate(qc)}),
 expense:useMutation({mutationFn:({budgetId,body}:{budgetId:string;body:Record<string,unknown>})=>apiRequest(`/hr/budgets/${budgetId}/expenses`,{method:'POST',body:JSON.stringify(body)}),onSuccess:()=>invalidate(qc)})
}}
