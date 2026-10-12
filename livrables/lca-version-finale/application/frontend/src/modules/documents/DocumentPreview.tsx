import React,{useEffect,useState}from'react';
import{Download}from'lucide-react';
import{Button}from'../../components/ui/Button';
import{Modal}from'../../components/ui/Modal';
import{apiDownload}from'../../services/apiClient';

export type PreviewDocument={id:string;title?:string;fileName:string;mimeType?:string|null};
const previewKind=(mime?:string|null)=>mime==='application/pdf'?'pdf':mime==='image/png'||mime==='image/jpeg'?'image':'unsupported';

export function DocumentPreview({document,onClose,onDownload}:{document:PreviewDocument|null;onClose:()=>void;onDownload?:(document:PreviewDocument)=>void}){
  const[url,setUrl]=useState<string|null>(null),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(false),kind=previewKind(document?.mimeType);
  useEffect(()=>{let active=true,objectUrl:string|null=null;if(!document||kind==='unsupported'){setUrl(null);setError(null);setLoading(false);return}setLoading(true);setError(null);void apiDownload(`/documents/${document.id}/preview`).then(blob=>{if(!active)return;objectUrl=URL.createObjectURL(blob);setUrl(objectUrl)}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'Aperçu impossible')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl)}},[document?.id,kind]);
  return <Modal isOpen={Boolean(document)} onClose={onClose} title={document?.title||document?.fileName||'Aperçu du document'} maxWidth="full"><div className="space-y-3"><div className="flex min-h-[60vh] items-center justify-center overflow-hidden rounded border bg-slate-100">{loading&&<p className="text-sm text-slate-500">Chargement de l’aperçu…</p>}{error&&<p role="alert" className="p-6 text-sm text-red-700">{error}</p>}{!loading&&!error&&kind==='unsupported'&&<p className="p-6 text-center text-sm text-slate-600">Aperçu indisponible pour ce format. Vous pouvez télécharger le document.</p>}{url&&kind==='pdf'&&<iframe title={document?.title||'Document PDF'} src={url} className="h-[65vh] w-full bg-white"/>}{url&&kind==='image'&&<img src={url} alt={document?.title||document?.fileName||'Document'} className="max-h-[65vh] max-w-full object-contain"/>}</div><div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Fermer</Button>{document&&onDownload&&<Button icon={<Download className="h-4 w-4"/>} onClick={()=>onDownload(document)}>Télécharger</Button>}</div></div></Modal>
}
