import{useEffect,useState}from'react';
import{useNavigate}from'react-router-dom';
import{Download,Eye,Link2,Printer,Unlink,UploadCloud,UserRound}from'lucide-react';
import{type Employee,useEligibleUsersQuery,useEmployeeQuery,useHrActions}from'../../api/hrHooks';
import{useEntityDocuments}from'../../api/documentHooks';
import{Badge}from'../../components/ui/Badge';
import{Button}from'../../components/ui/Button';
import{Modal}from'../../components/ui/Modal';
import{apiDownload,assetUrl}from'../../services/apiClient';
import{downloadAuthenticatedPdf,previewAuthenticatedPdf,printAuthenticatedPdf}from'../../services/pdfActions';
import{useAuthStore}from'../../stores/authStore';
import{useUiStore}from'../../stores/uiStore';
import type{DocumentRecord}from'../../types/documents';
import{DocumentPreview}from'../documents/DocumentPreview';
import{UploadModal}from'../documents/DocumentsGedPage';
import{EmployeeContractsSection}from'./EmployeeContractsSection';
import{ContractTypesManager}from'./ContractTypesManager';
import{EmployeeLeavesSection}from'./EmployeeLeavesSection';
import{LeaveTypesManager}from'./LeaveTypesManager';
import{BonusTypesManager}from'./BonusTypesManager';
import{EmployeeBonusesSection}from'./EmployeeBonusesSection';

const input='w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs';
const dateLabel=(value:string)=>new Intl.DateTimeFormat('fr-FR').format(new Date(`${value.slice(0,10)}T00:00:00`));

function EmployeeAvatar({employee}:{employee:Employee}){
 const[failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[employee.avatar_path]);
 const label=`Photo de ${employee.first_name} ${employee.last_name}`;
 return <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-slate-400" aria-label={label}>{employee.avatar_path&&!failed?<img className="h-full w-full object-cover" src={assetUrl(employee.avatar_path)} alt={label} onError={()=>setFailed(true)}/>:<UserRound className="h-9 w-9" aria-hidden="true"/>}</div>;
}

export function EmployeeRecordModal({employee,onClose}:{employee:Employee|null;onClose:()=>void}){
 const navigate=useNavigate();
 const can=useAuthStore(s=>s.can),toast=useUiStore(s=>s.addToast),actions=useHrActions(),detail=useEmployeeQuery(employee?.id,Boolean(employee)),current=detail.data??employee;
 const eligible=useEligibleUsersQuery(Boolean(current&&!current.user_id&&can('hr.employee.account.manage'))),documents=useEntityDocuments('employee',current?.id,Boolean(current)),[userId,setUserId]=useState(''),[upload,setUpload]=useState(false),[preview,setPreview]=useState<DocumentRecord|null>(null),[pdfMode,setPdfMode]=useState<'standard'|'complete'>('standard');
 const act=async(promise:Promise<unknown>,title:string)=>{try{await promise;await detail.refetch();toast({type:'success',title,description:'Le dossier employé a été actualisé.'})}catch(error){toast({type:'error',title:'Action impossible',description:error instanceof Error?error.message:'Erreur API'})}};
 const download=async(file:{id:string;fileName:string})=>{const blob=await apiDownload(`/documents/${file.id}/download`),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.fileName;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const employeePdf=()=>`/hr/employees/${current!.id}/pdf?mode=${pdfMode}`;
 const pdf=async(action:'preview'|'print'|'download')=>{try{const path=employeePdf(),name=`fiche-employe-${current!.employee_number}.pdf`;if(action==='preview')await previewAuthenticatedPdf(path);else if(action==='print')await printAuthenticatedPdf(path);else await downloadAuthenticatedPdf(path,name)}catch(error){toast({type:'error',title:'Document indisponible',description:error instanceof Error?error.message:'Erreur PDF'})}};
 const entity=current?{entityType:'employee' as const,entityId:current.id,agencyId:current.agency_id,agencyName:current.agency_name,label:`${current.first_name} ${current.last_name}`,businessId:current.employee_number}:undefined;
 return <><Modal isOpen={Boolean(employee)} onClose={onClose} title={`Dossier employé · ${current?.employee_number??''}`}><div className="space-y-5">
  {detail.isLoading&&<p className="text-xs text-slate-500">Chargement du dossier…</p>}
  {current&&<><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><EmployeeAvatar employee={current}/><div><h3 className="text-lg font-bold">{current.first_name} {current.last_name}</h3><p className="text-xs text-slate-500">{current.position_title??'Fonction non renseignée'} · embauche le {dateLabel(current.hire_date)}</p></div></div><div className="flex flex-wrap items-center gap-2"><Badge variant={current.employment_status==='active'?'success':'default'}>{current.employment_status==='active'?'Actif':current.employment_status==='inactive'?'Inactif':'Sorti'}</Badge><select aria-label="Mode de la fiche employé" className={input} value={pdfMode} onChange={e=>setPdfMode(e.target.value as 'standard'|'complete')}><option value="standard">Fiche standard</option>{can('hr.salary.view')&&<option value="complete">Fiche complète (confidentielle)</option>}</select><Button size="xs" variant="outline" icon={<Eye className="h-3 w-3"/>} onClick={()=>void pdf('preview')}>Prévisualiser</Button><Button size="xs" variant="outline" icon={<Printer className="h-3 w-3"/>} onClick={()=>void pdf('print')}>Imprimer</Button><Button size="xs" variant="outline" icon={<Download className="h-3 w-3"/>} onClick={()=>void pdf('download')}>Télécharger le PDF</Button></div></div>
  <div className="grid gap-3 rounded-md bg-slate-50 p-3 text-xs sm:grid-cols-2"><div><span className="text-slate-500">Affectation</span><strong className="block">{current.agency_name??'Structure centrale'} · {current.concession_name}</strong></div><div><span className="text-slate-500">Coordonnées RH</span><strong className="block">{current.email??'E-mail non renseigné'} · {current.phone??'Téléphone non renseigné'}</strong></div></div>
  <section className="space-y-3"><h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Compte ERP facultatif</h4>{current.user_id?<div className="flex items-center justify-between rounded-md border p-3 text-xs"><div><strong>{current.account_email}</strong><p className="text-slate-500">{current.account_active?'Compte actif':'Compte désactivé'}{current.account_roles?.length?` · ${current.account_roles.join(', ')}`:''}</p></div><div className="flex gap-2">{can('activity.view')&&<Button size="xs" variant="outline" onClick={()=>{onClose();navigate(`/activity?userId=${encodeURIComponent(current.user_id!)}`)}}>Voir l’activité</Button>}{can('hr.employee.account.manage')&&<Button size="xs" variant="outline" icon={<Unlink className="h-3 w-3"/>} onClick={()=>void act(actions.unlinkEmployeeUser.mutateAsync(current.id),'Compte ERP dissocié')}>Dissocier le compte ERP</Button>}</div></div>:<div className="rounded-md border p-3 text-xs"><p className="mb-2 text-slate-500">Aucun compte ERP lié. Le dossier RH reste pleinement utilisable.</p>{can('hr.employee.account.manage')&&<div className="flex gap-2"><select aria-label="Compte ERP éligible" className={input} value={userId} onChange={e=>setUserId(e.target.value)}><option value="">Sélectionner un compte actif non lié</option>{eligible.data?.map(user=><option key={user.id} value={user.id}>{user.last_name} {user.first_name} · {user.email} · {user.agency_name}</option>)}</select><Button size="xs" icon={<Link2 className="h-3 w-3"/>} disabled={!userId} onClick={()=>void act(actions.linkEmployeeUser.mutateAsync({id:current.id,userId}),'Compte ERP lié')}>Lier</Button></div>}</div>}</section>
  <section className="space-y-3"><div className="flex items-center justify-between"><h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Documents GED</h4>{can('ged.upload')&&<Button size="xs" variant="outline" icon={<UploadCloud className="h-3 w-3"/>} onClick={()=>setUpload(true)}>Ajouter</Button>}</div>{documents.isLoading&&<p className="text-xs text-slate-500">Chargement des documents…</p>}{documents.data?.map(document=><div key={document.id} className="flex items-center justify-between rounded-md border p-3 text-xs"><span><strong>{document.title}</strong><br/><small className="text-slate-500">{document.documentType} · {document.fileName}</small></span><span className="flex gap-1"><Button size="xs" variant="outline" icon={<Eye className="h-3 w-3"/>} onClick={()=>setPreview(document)}>Voir</Button><Button size="xs" variant="outline" icon={<Download className="h-3 w-3"/>} onClick={()=>void download(document)}>Télécharger</Button></span></div>)}{documents.isSuccess&&!documents.data.length&&<p className="rounded-md bg-slate-50 p-3 text-center text-xs text-slate-500">Aucun document rattaché.</p>}</section></>}
 {current&&<><ContractTypesManager employee={current}/><EmployeeContractsSection employee={current}/><LeaveTypesManager employee={current}/><EmployeeLeavesSection employee={current}/><BonusTypesManager employee={current}/><EmployeeBonusesSection employee={current}/></>}</div></Modal>{entity&&<UploadModal open={upload} close={()=>setUpload(false)} initialEntity={entity} onSuccess={()=>void documents.refetch()}/>}<DocumentPreview document={preview} onClose={()=>setPreview(null)} onDownload={document=>void download(document)}/></>;
}
