import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  UploadCloud,
  FileCheck,
  Eye,
  Trash2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { useUiStore } from '../../stores/uiStore';
import { useDocumentsQuery, useUploadDocument } from '../../api/erpHooks';
import { apiDownload } from '../../services/apiClient';

export const DocumentsGedPage: React.FC = () => {
  const { addToast } = useUiStore();
  const documentsQuery=useDocumentsQuery(); const uploadDocument=useUploadDocument();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [file,setFile]=useState<File|null>(null); const [category,setCategory]=useState('vehicle'); const [entityId,setEntityId]=useState(''); const [title,setTitle]=useState('');
  const documents=(documentsQuery.data??[]).map((d:any)=>({id:String(d.id),title:d.document_type||d.file_name,category:d.entity_type,relatedEntity:`${d.entity_type} #${d.entity_id}`,fileType:(d.mime_type||'fichier').split('/').pop()?.toUpperCase(),fileSize:`${Math.ceil(Number(d.file_size||0)/1024)} Ko`,uploadDate:new Date(d.created_at).toLocaleDateString('fr-CG'),status:'VALIDE'}));

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.relatedEntity.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || d.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!file)return;const body=new FormData();body.append('file',file);body.append('documentType',title);body.append('entityType',category);body.append('entityId',entityId);try{await uploadDocument.mutateAsync(body);addToast({
      type: 'success',
      title: 'Document archivé en GED',
      description: 'Le fichier a été indexé et rattaché avec succès.',
    });
    setIsUploadModalOpen(false);setFile(null); }catch(error){addToast({type:'error',title:'Archivage impossible',description:error instanceof Error?error.message:'Erreur API'});}
  };
  const download=async(doc:any)=>{try{const blob=await apiDownload(`/documents/${doc.id}/download`);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=doc.title;a.click();URL.revokeObjectURL(url)}catch(error){addToast({type:'error',title:'Téléchargement impossible',description:error instanceof Error?error.message:'Erreur API'})}};

  return (
    <div className="space-y-6">
      <PageHeader
        title="GED & Gestion Électronique des Documents Automobile"
        subtitle="Archivage légal des cartes grises, permis, contrats de vente, justificatifs et rapports CT."
        breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Outils' }, { label: 'GED Documents' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<UploadCloud className="w-4 h-4" />}
            onClick={() => setIsUploadModalOpen(true)}
          >
            Déposer un Document
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre de document, immat, client..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none"
          >
            <option value="ALL">Toutes catégories</option>
            <option value="vehicle">Véhicules</option><option value="sale">Ventes</option><option value="customer">Clients</option><option value="repair_order">Atelier</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4">Élément Rattaché</th>
                <th className="py-3 px-4">Format & Poids</th>
                <th className="py-3 px-4">Date Dépôt</th>
                <th className="py-3 px-4">Conformité</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-bold text-slate-900">{doc.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">{doc.category}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{doc.relatedEntity}</td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{doc.fileType} • {doc.fileSize}</td>
                  <td className="py-3 px-4 text-slate-600">{doc.uploadDate}</td>
                  <td className="py-3 px-4">
                    <Badge variant={doc.status === 'VALIDE' ? 'success' : 'warning'} size="sm">
                      {doc.status === 'VALIDE' ? 'Conforme' : 'À vérifier'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="xs" variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={()=>download(doc)}>
                        Télécharger
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Téléverser un Document dans la GED"
        description="Rattachement automatique au dossier client, véhicule ou vente."
        maxWidth="md"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <label className="block p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center hover:bg-slate-100 cursor-pointer transition-colors">
            <UploadCloud className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-800">Cliquez ou glissez-déposez le fichier ici</p>
            <p className="text-[11px] text-slate-400 mt-1">PDF, PNG, JPG jusqu'à 15 Mo</p>
            <input required type="file" accept=".pdf,.png,.jpg,.jpeg" className="mt-3 text-xs" onChange={e=>setFile(e.target.files?.[0]??null)}/>
          </label>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie de document</label>
            <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white">
              <option value="vehicle">Véhicule</option><option value="sale">Vente</option><option value="customer">Client</option><option value="repair_order">Ordre de réparation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nom du Document</label>
            <input
              type="text"
              required
              value={title}
              onChange={e=>setTitle(e.target.value)}
              placeholder="ex: Certificat d'immatriculation provisoire"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
            />
          </div>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1">Identifiant du dossier rattaché</label><input required inputMode="numeric" value={entityId} onChange={e=>setEntityId(e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white" /></div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsUploadModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" type="submit" loading={uploadDocument.isPending} disabled={!file||!entityId||!title}>
              Archiver le document
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
