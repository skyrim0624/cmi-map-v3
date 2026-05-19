import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';

import { routes } from './routes';

import { AuthProvider } from '@/contexts/AuthContext';
import { RouteGuard } from '@/components/common/RouteGuard';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <RouteGuard>
          <IntersectObserver />
          <div className="flex h-[100dvh] justify-center overflow-hidden bg-neutral-100/50 dark:bg-neutral-900/50">
            <div className="relative flex h-full min-h-0 w-full max-w-[480px] flex-col overflow-hidden bg-background shadow-xl sm:border-x sm:border-border/40 [transform:translateZ(0)]">
              <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-background [-webkit-overflow-scrolling:touch]">
                <Suspense fallback={
                  <div className="flex h-full min-h-[100dvh] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
                  </div>
                }>
                  <Routes>
                  {routes.map((route, index) => (
                    <Route
                      key={index}
                      path={route.path}
                      element={route.element}
                    />
                  ))}
                  <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </main>
              {/* Toaster is placed inside the restricted container if possible, but sonner handles its own viewport */}
              <Toaster position="top-center" />
            </div>
          </div>
        </RouteGuard>
      </AuthProvider>
    </Router>
  );
};

export default App;
