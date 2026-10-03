import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { HomePage } from './pages/Home';
import { CataloguePage } from './pages/Catalogue';
import { ProductDetailPage } from './pages/ProductDetail';
import { CartPage } from './pages/Cart';
import { CheckoutPage } from './pages/Checkout';
import { OrderConfirmationPage } from './pages/OrderConfirmation';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { DashboardPage } from './pages/Dashboard';
import { OraclePage } from './pages/Oracle';
import { QuestPage } from './pages/Quest';
import { TerminalPage } from './pages/Terminal';
import { NotFoundPage } from './pages/NotFound';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
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
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
