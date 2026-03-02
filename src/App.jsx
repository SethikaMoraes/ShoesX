import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import AppProviders from './context/AppProviders';
import About from './pages/About';
import BlogPage from './pages/BlogPage';
import Contact from './pages/Contact';
import CustomOrder from './pages/CustomOrder';
import Favourites from './pages/Favourites';
import Feedback from './pages/Feedback';
import FaqPage from './pages/FaqPage';
import FitAssurancePage from './pages/FitAssurancePage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import OrderStatus from './pages/OrderStatus';
import Privacy from './pages/Privacy';
import ProductDetail from './pages/ProductDetail';
import ProductsPage from './pages/ProductsPage';
import ProfilePage from './pages/ProfilePage';
import ReturnPolicy from './pages/ReturnPolicy';
import SignInPage from './pages/SignInPage';
import Terms from './pages/Terms';
import ThreeDView from './pages/ThreeDView';
import AdminChat from './pages/admin/AdminChat';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminFAQ from './pages/admin/AdminFAQ';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProducts from './pages/admin/AdminProducts';
import AdminUsers from './pages/admin/AdminUsers';

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/returns" element={<ReturnPolicy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/custom-order" element={<CustomOrder />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/order-status" element={<OrderStatus />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/3d-view" element={<ThreeDView />} />
            <Route path="/favourites" element={<Favourites />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/fit-assurance" element={<FitAssurancePage />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="chat" element={<AdminChat />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="faq" element={<AdminFAQ />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}
