import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';

// Lazy-loaded route chunks to minimize initial JavaScript bundle size
const HomePage = lazy(() => import('./pages/Home').then((m) => ({ default: m.HomePage })));
const CataloguePage = lazy(() =>
  import('./pages/Catalogue').then((m) => ({ default: m.CataloguePage }))
);
const ProductDetailPage = lazy(() =>
  import('./pages/ProductDetail').then((m) => ({ default: m.ProductDetailPage }))
);
const CartPage = lazy(() => import('./pages/Cart').then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() =>
  import('./pages/Checkout').then((m) => ({ default: m.CheckoutPage }))
);
const OrderConfirmationPage = lazy(() =>
  import('./pages/OrderConfirmation').then((m) => ({ default: m.OrderConfirmationPage }))
);
const LoginPage = lazy(() => import('./pages/Login').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import('./pages/Register').then((m) => ({ default: m.RegisterPage }))
);
const DashboardPage = lazy(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.DashboardPage }))
);
const OraclePage = lazy(() => import('./pages/Oracle').then((m) => ({ default: m.OraclePage })));
const QuestPage = lazy(() => import('./pages/Quest').then((m) => ({ default: m.QuestPage })));
const TerminalPage = lazy(() =>
  import('./pages/Terminal').then((m) => ({ default: m.TerminalPage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFound').then((m) => ({ default: m.NotFoundPage }))
);

const PageFallback: React.FC = () => (
  <div className="w-full min-h-[60vh] flex items-center justify-center p-12">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-2 border-border border-t-primary rounded-full animate-spin" />
      <span className="font-cinzel text-xs text-accent-text tracking-widest uppercase font-bold">
        Consulting Oracle...
      </span>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="shop" element={<CataloguePage />} />
              <Route path="shop/:id" element={<ProductDetailPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="order-confirmation/:id" element={<OrderConfirmationPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="oracle" element={<OraclePage />} />
              <Route path="quest" element={<QuestPage />} />
              <Route path="terminal" element={<TerminalPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
