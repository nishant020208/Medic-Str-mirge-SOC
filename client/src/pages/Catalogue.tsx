import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, ShoppingCart, ShieldCheck, Check } from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { GreekDivider } from '../ui/GreekDivider';
import { EmptyState } from '../ui/EmptyState';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';
import { useCartStore } from '../store/cartStore';
import { toast } from '../ui/Toast';
import { formatPrice } from '../lib/utils';

export const CataloguePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);

  const categories: ProductCategory[] = [
    'Pain Relief',
    'Cold & Flu',
    'Digestive',
    'Vitamins',
    'First Aid',
    'Herbal',
  ];

  const search = searchParams.get('q') || '';
  const selectedCategory = searchParams.get('category') || 'All';
  const rxFilter = searchParams.get('rx') === 'true';
  const inStockFilter = searchParams.get('inStock') === 'true';
  const sort = searchParams.get('sort') || 'featured';

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.append('q', search);
        if (selectedCategory && selectedCategory !== 'All')
          params.append('category', selectedCategory);
        if (rxFilter) params.append('rx', 'true');
        if (inStockFilter) params.append('inStock', 'true');
        if (sort) params.append('sort', sort);

        const res = await fetch(`/api/products?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        } else {
          setProducts([]);
        }
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [search, selectedCategory, rxFilter, inStockFilter, sort]);

  const updateFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'All' || value === 'false') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product, 1);
    toast.success(`${product.name} deposited into your sacred requisition.`, 'Offering Gathered');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      {/* Title */}
      <div className="text-center mb-8">
        <span className="font-cinzel text-xs uppercase tracking-widest text-accent-text font-bold block mb-1">
          Sanctuary Dispensary
        </span>
        <h1 className="font-cinzel text-3xl sm:text-4xl font-bold text-text">
          The Apothecary Archives
        </h1>
        <p className="font-cormorant text-base text-text-muted max-w-xl mx-auto mt-2">
          Discover Hellenic-inspired therapeutic compounds, each cryptographically verified by the Oracle registry.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-2 p-4 rounded-card border border-border mb-8 space-y-4 shadow-theme">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-96 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              type="text"
              placeholder="Search remedies, herbs, symptoms..."
              value={search}
              onChange={(e) => updateFilter('q', e.target.value || null)}
              className="pl-9 min-h-[40px]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-cinzel font-semibold text-text-muted flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-accent" /> Sort:
            </span>
            <select
              aria-label="Sort remedies by"
              value={sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="text-xs px-2.5 py-2 rounded-card bg-surface border border-border text-text font-cinzel shadow-inner"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Alphabetical</option>
            </select>

            <button
              onClick={() => updateFilter('rx', rxFilter ? null : 'true')}
              className={`px-3 py-1.5 text-xs font-cinzel rounded-card border transition-colors flex items-center gap-1 ${
                rxFilter
                  ? 'bg-danger text-text-on-primary border-border font-bold shadow-theme'
                  : 'bg-surface border-border text-text-muted hover:text-text'
              }`}
            >
              {rxFilter && <Check className="w-3 h-3" />}
              <span>Rx Only</span>
            </button>

            <button
              onClick={() => updateFilter('inStock', inStockFilter ? null : 'true')}
              className={`px-3 py-1.5 text-xs font-cinzel rounded-card border transition-colors flex items-center gap-1 ${
                inStockFilter
                  ? 'bg-success text-text-on-primary border-border font-bold shadow-theme'
                  : 'bg-surface border-border text-text-muted hover:text-text'
              }`}
            >
              {inStockFilter && <Check className="w-3 h-3" />}
              <span>In Stock Only</span>
            </button>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => updateFilter('category', 'All')}
            className={`px-3 py-1 text-xs font-cinzel uppercase tracking-wider rounded-card transition-all whitespace-nowrap ${
              selectedCategory === 'All'
                ? 'bg-primary text-text-on-primary font-bold shadow-theme'
                : 'bg-surface border border-border text-text-muted hover:text-text'
            }`}
          >
            All Remedials
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => updateFilter('category', cat)}
              className={`px-3 py-1 text-xs font-cinzel uppercase tracking-wider rounded-card transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-primary text-text-on-primary font-bold shadow-theme'
                  : 'bg-surface border border-border text-text-muted hover:text-text'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <h2 className="sr-only">Apothecary Collection</h2>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-80 rounded-card bg-surface-2 animate-pulse border border-border shadow-theme"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No Remedies Found"
          description="The Oracle searched all sanctum corridors, but no medicines match your criteria. Try adjusting your search or filters."
          action={
            <Button variant="outline" size="sm" onClick={() => setSearchParams(new URLSearchParams())}>
              Clear All Invocations
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <Link key={product.id} to={`/shop/${product.id}`} className="group block focus:outline-none">
              <SpotlightCard className="h-full flex flex-col p-5 group-hover:border-accent transition-colors floating-card">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Badge variant="info" size="sm">
                    {product.category}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {product.rx && (
                      <Badge variant="danger" size="sm">
                        Rx
                      </Badge>
                    )}
                    {product.stock > 0 ? (
                      <Badge variant="success" size="sm">
                        In Stock ({product.stock})
                      </Badge>
                    ) : (
                      <Badge variant="danger" size="sm">
                        Depleted
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Illustration / Icon Box */}
                <div className="w-full h-40 bg-surface-2 rounded-card border border-border flex items-center justify-center mb-4 group-hover:scale-[1.02] transition-transform shadow-inner">
                  <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center text-accent shadow-inner">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                </div>

                <div className="flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="font-cinzel text-base font-bold text-text group-hover:text-accent-text transition-colors line-clamp-1 mb-1">
                      {product.name}
                    </h3>
                    <p className="font-cormorant text-sm text-text-muted line-clamp-2 leading-relaxed mb-3">
                      {product.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between mt-auto">
                    <div>
                      <span className="text-[10px] uppercase font-cinzel text-text-muted block -mb-0.5">
                        Tribute
                      </span>
                      <span className="font-cinzel text-lg font-bold text-accent-text">
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => handleAddToCart(product, e)}
                      disabled={product.stock <= 0}
                      leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}
                    >
                      Gather
                    </Button>
                  </div>
                </div>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      )}

      <GreekDivider className="my-12" />

      {/* Footer Disclaimer */}
      <div className="text-center text-xs text-text-muted">
        Licensed Apothecary &amp; Dispensary. Consecrated by the Asclepeion.
      </div>
    </div>
  );
};
