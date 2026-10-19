import { useRef, useState, type DragEvent } from 'react';
import { FileText, UploadCloud, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';

const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;
const MAX_SIZE = 15 * 1024 * 1024;

function size(value: number) {
  return value >= 1024 * 1024 ? `${(value / (1024 * 1024)).toFixed(1)} Mo` : `${Math.ceil(value / 1024)} Ko`;
}

function typeLabel(file: File) {
  if (file.type === 'application/pdf') return 'PDF';
  if (file.type === 'image/png') return 'PNG';
  if (file.type === 'image/jpeg') return 'JPEG';
  return file.type || 'Type inconnu';
}

interface DocumentFileDropFieldProps {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  required?: boolean;
  acceptedTypes?: readonly string[];
  accept?: string;
  maxSize?: number;
  rejectInvalid?: boolean;
  label?: string;
  dropTitle?: string;
  dropText?: string;
  selectText?: string;
  formatsText?: string;
  invalidTypeMessage?: string;
  oversizedMessage?: string;
  warningClassName?: string;
}

export function DocumentFileDropField({file,onChange,disabled=false,required=true,acceptedTypes=ACCEPTED_TYPES,accept='.pdf,.png,.jpg,.jpeg',maxSize=MAX_SIZE,rejectInvalid=false,label='Fichier *',dropTitle='Déposer un fichier',dropText='Glissez-déposez votre document ici ou',selectText='Sélectionner un fichier',formatsText='PDF, PNG ou JPEG — maximum 15 Mo',invalidTypeMessage='Format non reconnu. Le serveur vérifiera le type, l’extension et le contenu.',oversizedMessage='Ce fichier dépasse la limite de 15 Mo.',warningClassName='text-amber-700'}:DocumentFileDropFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [warning, setWarning] = useState('');
  const select = (next?: File) => {
    setWarning('');
    if (!next) return;
    if (!acceptedTypes.includes(next.type)) { setWarning(invalidTypeMessage); if(rejectInvalid)return; }
    else if (next.size > maxSize) { setWarning(oversizedMessage); if(rejectInvalid)return; }
    onChange(next);
  };
  const open = () => { if (!disabled) input.current?.click(); };
  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) select(event.dataTransfer.files[0]);
  };
  const remove = () => {
    if (input.current) input.current.value = '';
    setWarning('');
    onChange(null);
  };
  return <div className="space-y-2">
    <span className="block text-xs font-semibold">{label}</span>
    <input ref={input} required={required} type="file" accept={accept} aria-label={label.replace(/\s*\*$/,'')} className="sr-only" onChange={event => select(event.target.files?.[0])}/>
    {!file ? <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Déposer ou sélectionner un fichier"
      onClick={open}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } }}
      onDragEnter={event => { event.preventDefault(); if (!disabled) setDragging(true); }}
      onDragOver={event => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
      className={`rounded-lg border-2 border-dashed px-6 py-7 text-center transition ${dragging ? 'border-[#8f1722] bg-red-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <UploadCloud className="mx-auto h-8 w-8 text-[#8f1722]"/>
      <p className="mt-2 text-sm font-semibold text-slate-800">{dropTitle}</p>
      <p className="mt-1 text-xs text-slate-500">{dropText}</p>
      <Button type="button" size="sm" variant="outline" className="mt-3" onClick={event => { event.stopPropagation(); open(); }}>{selectText}</Button>
      <p className="mt-3 text-[11px] text-slate-500">{formatsText}</p>
    </div> : <div className="rounded-lg border border-slate-300 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-7 w-7 shrink-0 text-[#8f1722]"/>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{file.name}</p><p className="text-xs text-slate-500">{typeLabel(file)} • {size(file.size)}</p></div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" size="xs" variant="outline" disabled={disabled} onClick={open}>Remplacer</Button>
        <Button type="button" size="xs" variant="outline" disabled={disabled} icon={<X className="h-3 w-3"/>} onClick={remove}>Retirer</Button>
      </div>
    </div>}
    {warning && <p role="alert" className={`text-xs ${warningClassName}`}>{warning}</p>}
  </div>;
}
