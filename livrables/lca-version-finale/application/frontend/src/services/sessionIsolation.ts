import { queryClient } from '../queryClient';
import { useUiStore } from '../stores/uiStore';

/** Remove every piece of client state that may contain data from an authorization context. */
export function clearSessionClientState() {
  queryClient.clear();
  useUiStore.setState({
    mobileMenuOpen: false,
    globalSearchOpen: false,
    quickActionOpen: false,
    activeQuickActionModal: null,
    quickActionContext: null,
    toasts: [],
  });
}
