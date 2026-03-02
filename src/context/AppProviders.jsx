import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { FavouritesProvider } from './FavouritesContext';
import { ProductsProvider } from './ProductsContext';
import { SiteProvider } from './SiteContext';

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <SiteProvider>
        <ProductsProvider>
          <FavouritesProvider>
            <CartProvider>{children}</CartProvider>
          </FavouritesProvider>
        </ProductsProvider>
      </SiteProvider>
    </AuthProvider>
  );
}
