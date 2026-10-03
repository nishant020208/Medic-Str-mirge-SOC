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
          // If server not yet running or demo fallback, fetch failed
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
        <span className="font-cinzel text-xs uppercase tracking-widest text-gold-600 dark:text-gold-400 font-bold block mb-1">
          Sanctuary Dispensary
        </span>
        <h1 className="font-cinzel text-3xl sm:text-4xl font-bold text-ink-950 dark:text-marble-100">
          The Apothecary Archives
        </h1>
        <p className="font-cormorant text-base text-ink-700 dark:text-marble-300 max-w-xl mx-auto mt-2">
          Discover Hellenic-inspired therapeutic compounds, each cryptographically verified by the Oracle registry.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-marble-200/50 dark:bg-lapis-900/50 p-4 rounded-sm border border-marble-300 dark:border-lapis-700/60 mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-96 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-600 dark:text-marble-400" />
            <Input
              type="text"
              placeholder="Search remedies, herbs, symptoms..."
              value={search}
              onChange={(e) => updateFilter('q', e.target.value || null)}
              className="pl-9 min-h-[40px]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-cinzel font-semibold text-ink-700 dark:text-marble-300 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="text-xs px-2.5 py-2 rounded-sm bg-marble-50 dark:bg-lapis-950 border border-marble-300 dark:border-lapis-700 text-ink-900 dark:text-marble-100 font-cinzel"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Alphabetical</option>
            </select>

            <button
              onClick={() => updateFilter('rx', rxFilter ? null : 'true')}
              className={`px-3 py-1.5 text-xs font-cinzel rounded-sm border transition-colors flex items-center gap-1 ${
                rxFilter
                  ? 'bg-terracotta-500 text-white border-terracotta-600 font-bold'
                  : 'bg-marble-100 dark:bg-lapis-950 border-marble-300 dark:border-lapis-700 text-ink-700 dark:text-marble-300'
              }`}
            >
              {rxFilter && <Check className="w-3 h-3" />}
              <span>Rx Only</span>
            </button>

            <button
              onClick={() => updateFilter('inStock', inStockFilter ? null : 'true')}
              className={`px-3 py-1.5 text-xs font-cinzel rounded-sm border transition-colors flex items-center gap-1 ${
                inStockFilter
                  ? 'bg-olive-500 text-white border-olive-600 font-bold'
                  : 'bg-marble-100 dark:bg-lapis-950 border-marble-300 dark:border-lapis-700 text-ink-700 dark:text-marble-300'
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
            className={`px-3 py-1 text-xs font-cinzel uppercase tracking-wider rounded-sm transition-all whitespace-nowrap ${
              selectedCategory === 'All'
                ? 'bg-gold-500 text-ink-950 font-bold shadow-sm'
                : 'bg-marble-100 dark:bg-lapis-950 border border-marble-300 dark:border-lapis-700 text-ink-700 dark:text-marble-300 hover:text-gold-500'
            }`}
          >
            All Remedials
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => updateFilter('category', cat)}
              className={`px-3 py-1 text-xs font-cinzel uppercase tracking-wider rounded-sm transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-gold-500 text-ink-950 font-bold shadow-sm'
                  : 'bg-marble-100 dark:bg-lapis-950 border border-marble-300 dark:border-lapis-700 text-ink-700 dark:text-marble-300 hover:text-gold-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-80 rounded-sm bg-marble-300/40 dark:bg-lapis-800/40 animate-pulse border border-marble-300/60"
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
              <SpotlightCard className="h-full flex flex-col p-5 group-hover:border-gold-500 transition-colors">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Badge variant="lapis" size="sm">
                    {product.category}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {product.rx && (
                      <Badge variant="terracotta" size="sm">
                        Rx
                      </Badge>
                    )}
                    {product.stock > 0 ? (
                      <Badge variant="olive" size="sm">
                        In Stock ({product.stock})
                      </Badge>
                    ) : (
                      <Badge variant="terracotta" size="sm">
                        Depleted
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Illustration / Icon Box */}
                <div className="w-full h-40 bg-gradient-to-br from-marble-100 to-marble-200 dark:from-lapis-950 dark:to-lapis-900 rounded-sm border border-marble-300/60 dark:border-lapis-800 flex items-center justify-center mb-4 group-hover:scale-[1.02] transition-transform">
                  <div className="w-16 h-16 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-500 shadow-inner">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                </div>

                <div className="flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="font-cinzel text-base font-bold text-ink-950 dark:text-marble-100 group-hover:text-gold-500 transition-colors line-clamp-1 mb-1">
                      {product.name}
                    </h3>
                    <p className="font-cormorant text-sm text-ink-700 dark:text-marble-300 line-clamp-2 leading-relaxed mb-3">
                      {product.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-marble-200 dark:border-lapis-800/80 flex items-center justify-between mt-auto">
                    <div>
                      <span className="text-[10px] uppercase font-cinzel text-ink-600 dark:text-marble-400 block -mb-0.5">
                        Tribute
                      </span>
                      <span className="font-cinzel text-lg font-bold text-gold-600 dark:text-gold-400">
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    <Button
                      variant="gold"
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
      <div className="text-center text-xs text-ink-600 dark:text-marble-400">
        Demo application. Not medical advice. No real orders.
      </div>
    </div>
  );
};
