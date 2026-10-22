import { PageHeader } from '../../components/common/PageHeader';
import { DocumentMarksSettings } from './DocumentMarksSettings';

export function MySignaturePage(){
  return <div className="space-y-6">
    <PageHeader title="Ma signature" subtitle="Gérez votre fac-similé personnel sans accéder aux paramètres de concession." breadcrumbs={[{label:'Accueil',href:'/dashboard'},{label:'Mon profil'},{label:'Ma signature'}]}/>
    <DocumentMarksSettings personalOnly/>
  </div>;
}
