import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { GreekDivider } from '../ui/GreekDivider';
import { EmptyState } from '../ui/EmptyState';
import { formatPrice } from '../lib/utils';
import { SEO } from '../components/SEO';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ProductIllustration } from '../components/ProductIllustration';

export const CartPage: React.FC = () => {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
    getTax,
    getShipping,
    getTotal,
  } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 w-full flex-grow flex flex-col justify-center">
        <SEO
          title="Sacred Cart | MediStore Sanctuary"
          description="View remedies and therapeutic offerings in your sacred requisition cart."
          canonicalPath="/cart"
          noindex={true}
        />
        <div className="mb-6">
          <Breadcrumbs items={[{ name: 'Requisition Cart', url: '/cart' }]} />
        </div>
        <div className="text-center mb-6">
          <h1 className="font-cinzel text-3xl font-bold text-text">
            Sacred Requisition Basket
          </h1>
        </div>
        <EmptyState
          icon={<ShoppingBag className="w-8 h-8" />}
          title="Sacred Requisition Empty"
          description="Your offering basket holds no consecrated remedies. Explore our apothecary archives to gather healing compounds."
          action={
            <Link to="/shop">
              <Button variant="primary" leftIcon={<ShoppingBag className="w-4 h-4" />}>
                Explore Dispensary
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 w-full flex-grow">
      <SEO
        title="Sacred Cart | MediStore Sanctuary"
        description="Review your pharmaceutical formulations and complete your requisition."
        canonicalPath="/cart"
        noindex={true}
      />
      <div className="mb-6">
        <Breadcrumbs items={[{ name: 'Requisition Cart', url: '/cart' }]} />
      </div>
      <div className="text-center mb-6 sm:mb-8">
        <span className="font-cinzel text-xs uppercase tracking-widest text-accent-text font-bold block mb-1">
          Sanctum Offerings
        </span>
        <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-text">
          Sacred Requisition Basket
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="font-cinzel text-xs text-text-muted font-bold uppercase tracking-wider">
              {items.length} Distinct Formulations
            </span>
            <button
              onClick={clearCart}
              className="text-xs text-danger hover:underline font-cinzel uppercase tracking-wider"
            >
              Empty All Offerings
            </button>
          </div>

          {items.map(({ product, quantity }) => (
            <Card
              key={product.id}
              variant="marble"
              className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-center gap-4 justify-between"
            >
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-card bg-surface-2 border border-border flex items-center justify-center text-accent-text shrink-0">
                  <ProductIllustration type={product.illustration} name={product.name} size="sm" />
                </div>
                <div>
                  <Link
                    to={`/shop/${product.id}`}
                    className="font-cinzel font-bold text-sm text-text hover:text-accent-text line-clamp-1"
                  >
                    {product.name}
                  </Link>
                  <span className="text-xs text-text-muted block font-mono">
                    Batch: {product.batchId}
                  </span>
                  <span className="font-cinzel font-bold text-sm text-accent-text block mt-0.5">
                    {formatPrice(product.price)} each
                  </span>
                </div>
              </div>

              {/* Quantity Controls & Total */}
              <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
                <div className="flex items-center border border-border rounded-card bg-surface-2 shadow-inner">
                  <button
                    type="button"
                    onClick={() => updateQuantity(product.id, quantity - 1)}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 text-text-muted hover:text-accent-text focus:outline-none"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-cinzel font-bold text-xs text-text">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(product.id, quantity + 1)}
                    disabled={quantity >= product.stock}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 text-text-muted hover:text-accent-text focus:outline-none disabled:opacity-30"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-right min-w-[70px]">
                  <span className="font-cinzel font-bold text-sm text-text block">
                    {formatPrice(product.price * quantity)}
                  </span>
                </div>

                <button
                  onClick={() => removeItem(product.id)}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 text-text-muted hover:text-danger transition-colors"
                  aria-label={`Remove ${product.name} from cart`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>

        {/* Order Summary Card */}
        <div className="lg:col-span-1">
          <Card variant="papyrus" className="p-4 sm:p-6">
            <h3 className="font-cinzel text-lg font-bold text-text mb-4 border-b border-border pb-2">
              Tribute Computation
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-text-muted">
                <span>Herbal Subtotal</span>
                <span className="font-mono text-text">{formatPrice(getSubtotal())}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Epidaurus Tithe (Tax 8%)</span>
                <span className="font-mono text-text">{formatPrice(getTax())}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Hermes Courier (Shipping)</span>
                <span className="font-mono text-text">{formatPrice(getShipping())}</span>
              </div>

              <GreekDivider className="my-2" symbol={false} />

              <div className="flex justify-between text-base font-bold text-text">
                <span className="font-cinzel">Total Offering</span>
                <span className="font-cinzel text-accent-text text-lg">
                  {formatPrice(getTotal())}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Link to="/checkout" className="block">
                <Button variant="primary" size="lg" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Proceed to Consecration
                </Button>
              </Link>
              <Link to="/shop" className="block text-center text-xs font-cinzel text-text-muted hover:text-accent-text pt-1">
                Continue Apothecary Search
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
