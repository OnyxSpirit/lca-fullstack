import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { GlobalSearchModal } from './GlobalSearchModal';
import { QuickActionModal } from './QuickActionModal';
import { ToastContainer } from '../ui/Toast';
import { RouteErrorBoundary } from './RouteErrorBoundary';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f5f4f2] flex flex-col antialiased text-[#111113]">
      <div className="flex flex-1 min-h-screen">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Right Main Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <Header />

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1520px] w-full mx-auto">
            <RouteErrorBoundary><Outlet /></RouteErrorBoundary>
          </main>
        </div>
      </div>

      {/* Global Modals and Notifications */}
      <GlobalSearchModal />
      <QuickActionModal />
      <ToastContainer />
    </div>
  );
};
