import React from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useNotificationActions, useNotificationsQuery } from '../../api/erpHooks';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '../../stores/uiStore';

export const NotificationsPage: React.FC = () => {
  const notifications=useNotificationsQuery().data??[]; const {markAsRead,markAllAsRead,deleteNotification}=useNotificationActions();
  const navigate=useNavigate();const addToast=useUiStore(s=>s.addToast);const safe=async(action:()=>Promise<unknown>,route?:string)=>{try{await action();if(route)navigate(route)}catch(error){addToast({type:'error',title:'Notification non mise à jour',description:error instanceof Error?error.message:'Erreur API'})}};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Alertes commerciales, atelier, stock et finance."
        breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Notifications' }]}
        actions={<Button size="sm" variant="outline" icon={<CheckCheck className="w-4 h-4" />} onClick={()=>safe(markAllAsRead)}>Tout marquer comme lu</Button>}
      />
      <Card padding="none">
        <div className="divide-y divide-slate-100">
          {notifications.map((notification) => (
            <div key={notification.id} className={`p-4 flex gap-3 ${notification.isRead ? 'bg-white' : 'bg-blue-50/40'}`}>
              <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
              <button className="flex-1 text-left" onClick={() => safe(()=>markAsRead(notification.id),notification.linkRoute)}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900">{notification.title}</span>
                  <Badge size="xs" variant={notification.priority === 'urgent' ? 'danger' : 'default'}>{notification.category}</Badge>
                </div>
                <p className="text-xs text-slate-600 mt-1">{notification.message}</p>
                <span className="text-[10px] text-slate-400">{notification.timestamp}</span>
              </button>
              <Button size="xs" variant="ghost" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => safe(()=>deleteNotification(notification.id))}>Supprimer</Button>
            </div>
          ))}
          {notifications.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Aucune notification.</p>}
        </div>
      </Card>
    </div>
  );
};
