import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { erpKeys, useAgenciesQuery, useUsersQuery } from '../api/erpHooks';
import { connectRealtime, disconnectRealtime } from '../services/realtime';
import { useAuthStore } from '../stores/authStore';

const eventKeys: Record<string, readonly string[]> = {
  'sales:created': erpKeys.sales, 'sales:status': erpKeys.sales,
  'reservations:created': erpKeys.vehicles, 'reservations:cancelled': erpKeys.vehicles,
  'vehicles:created': erpKeys.vehicles, 'vehicles:updated': erpKeys.vehicles, 'vehicles:status-changed': erpKeys.vehicles, 'vehicles:transferred': erpKeys.vehicles, 'vehicles:archived': erpKeys.vehicles, 'vehicles:image-added': erpKeys.vehicles,
  'workshop:repair-order-created': erpKeys.repairOrders, 'workshop:status': erpKeys.repairOrders,
  'workshop:repair-order-updated': erpKeys.repairOrders, 'workshop:invoiced': erpKeys.repairOrders,
  'parts:stock-changed': erpKeys.parts,
  'deliveries:created': erpKeys.deliveries, 'deliveries:checklist': erpKeys.deliveries, 'deliveries:delivered': erpKeys.deliveries,
  'deliveries:status': erpKeys.deliveries, 'deliveries:rescheduled': erpKeys.deliveries, 'deliveries:document': erpKeys.deliveries,
  'billing:invoice-created': erpKeys.invoices, 'billing:payment': erpKeys.invoices,
  'billing:invoice-updated': erpKeys.invoices, 'billing:credit-note': erpKeys.invoices, 'billing:payment-refunded': erpKeys.invoices,
  'notifications:created': ['notifications'],
  'showroom:visitor-created': ['showroom'], 'showroom:assigned': ['showroom'], 'showroom:takeover': ['showroom'],
  'showroom:completed': ['showroom'], 'showroom:cancelled': ['showroom'], 'showroom:converted': ['showroom'],
  'showroom:test-drive-started': ['showroom'], 'showroom:test-drive-completed': ['showroom'], 'showroom:test-drive-cancelled': ['showroom'],
  'documents:created':['documents'],'documents:archived':['documents'],'documents:restored':['documents'],'documents:versioned':['documents'],
  'users:created':['users'],'users:updated':['users'],'users:status-changed':['users'],
  'settings:updated':['settings'],'agencies:updated':['agencies'],
};
const planningEvents=['workshop:assigned','workshop:schedule-updated','workshop:schedule-cancelled','workshop:session-started','workshop:session-stopped','workshop:resources-changed'];

export function AppBootstrap() {
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const setDirectory = useAuthStore((s) => s.setDirectory);
  const logout = useAuthStore((s) => s.logout);
  const users = useUsersQuery(); const agencies = useAgenciesQuery(); const qc = useQueryClient();
  useEffect(() => { if (users.data && agencies.data) setDirectory(users.data, agencies.data); }, [users.data, agencies.data, setDirectory]);
  useEffect(() => {
    const token = localStorage.getItem('lca-access-token'); if (!authenticated || !token) return;
    const socket = connectRealtime(token);
    Object.entries(eventKeys).forEach(([event,key]) => socket.on(event, () => { void qc.invalidateQueries({ queryKey: key }); if(event==='parts:stock-changed'){void qc.invalidateQueries({queryKey:['purchase-orders']});void qc.invalidateQueries({queryKey:['parts']});} if(event==='settings:updated'){void qc.invalidateQueries({queryKey:['concession-current']});void qc.invalidateQueries({queryKey:['billing-config']});void qc.invalidateQueries({queryKey:['workshop-config']});} }));
    planningEvents.forEach(event=>socket.on(event,()=>{void qc.invalidateQueries({queryKey:['workshop-planning']});void qc.invalidateQueries({queryKey:['workshop-stats']});void qc.invalidateQueries({queryKey:['workshop-bays']});void qc.invalidateQueries({queryKey:['technicians']});void qc.invalidateQueries({queryKey:['workshop-unavailabilities']});}));
    return () => { [...Object.keys(eventKeys),...planningEvents].forEach((event) => socket.off(event)); disconnectRealtime(); };
  }, [authenticated, qc]);
  useEffect(()=>{const expired=()=>logout();window.addEventListener('lca:session-expired',expired);return()=>window.removeEventListener('lca:session-expired',expired)},[logout]);
  return null;
}
