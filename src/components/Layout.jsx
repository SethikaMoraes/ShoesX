import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import CartSidebar from './CartSidebar';
import Footer from './Footer';
import LiveChatWidget from './LiveChatWidget';
import Navbar from './Navbar';

export default function Layout() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const openCart = () => setIsCartOpen(true);
    if (typeof window !== 'undefined') {
      window.addEventListener('open-shoesx-cart', openCart);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-shoesx-cart', openCart);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar onCartOpen={() => setIsCartOpen(true)} />
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <Footer />
      <CartSidebar open={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <LiveChatWidget />
    </div>
  );
}
