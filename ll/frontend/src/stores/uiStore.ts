import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description?: string;
}

interface UiState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  globalSearchOpen: boolean;
  quickActionOpen: boolean;
  activeQuickActionModal: string | null;
  quickActionContext: { customerId?: string; vehicleId?: string } | null;
  toasts: ToastMessage[];

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setGlobalSearchOpen: (open: boolean) => void;
  setQuickActionOpen: (open: boolean) => void;
  setActiveQuickActionModal: (modalId: string | null, context?: { customerId?: string; vehicleId?: string }) => void;
  
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  globalSearchOpen: false,
  quickActionOpen: false,
  activeQuickActionModal: null,
  quickActionContext: null,
  toasts: [],

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),
  setQuickActionOpen: (open) => set({ quickActionOpen: open }),
  setActiveQuickActionModal: (modalId,context) => set({ activeQuickActionModal: modalId,quickActionContext:modalId?(context??null):null }),

  addToast: (toast) => {
    const id = `toast-${Date.now()}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
