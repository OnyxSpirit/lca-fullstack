import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { erpKeys, useAgenciesQuery, useUsersQuery } from '../api/erpHooks';
import { connectRealtime, disconnectRealtime } from '../services/realtime';
import { useAuthStore } from '../stores/authStore';

const eventKeys: Record<string, readonly string[]> = {
  'sales:created': erpKeys.sales, 'sales:status': erpKeys.sales,
  'reservations:created': erpKeys.vehicles, 'reservations:cancelled': erpKeys.vehicles,
  'workshop:repair-order-created': erpKeys.repairOrders, 'workshop:status': erpKeys.repairOrders, 'workshop:assigned': erpKeys.repairOrders,
  'parts:stock-changed': erpKeys.parts,
  'deliveries:created': erpKeys.deliveries, 'deliveries:checklist': erpKeys.deliveries, 'deliveries:delivered': erpKeys.deliveries,
  'billing:invoice-created': erpKeys.invoices, 'billing:payment': erpKeys.invoices,
  'notifications:created': ['notifications'],
};

export function AppBootstrap() {
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const setDirectory = useAuthStore((s) => s.setDirectory);
  const logout = useAuthStore((s) => s.logout);
  const users = useUsersQuery(); const agencies = useAgenciesQuery(); const qc = useQueryClient();
  useEffect(() => { if (users.data && agencies.data) setDirectory(users.data, agencies.data); }, [users.data, agencies.data, setDirectory]);
  useEffect(() => {
    const token = localStorage.getItem('lca-access-token'); if (!authenticated || !token) return;
    const socket = connectRealtime(token);
    Object.entries(eventKeys).forEach(([event,key]) => socket.on(event, () => void qc.invalidateQueries({ queryKey: key })));
    return () => { Object.keys(eventKeys).forEach((event) => socket.off(event)); disconnectRealtime(); };
  }, [authenticated, qc]);
  useEffect(()=>{const expired=()=>logout();window.addEventListener('lca:session-expired',expired);return()=>window.removeEventListener('lca:session-expired',expired)},[logout]);
  return null;
}
