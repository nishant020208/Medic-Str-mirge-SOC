import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  HeartHandshake,
  ArrowRight,
  History,
  ShoppingCart,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { GreekDivider } from '../ui/GreekDivider';
import { BlurText } from '../components/reactbits/BlurText';
import { CountUp } from '../components/reactbits/CountUp';
import { Magnet } from '../components/reactbits/Magnet';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';
import { StaticAsclepiusHeroFallback } from '../components/StaticAsclepiusHeroFallback';
import { Product } from '../types';
import { useCartStore } from '../store/cartStore';
import { toast } from '../ui/Toast';
import { formatPrice } from '../lib/utils';
import { SEO } from '../components/SEO';
import { ProductIllustration } from '../components/ProductIllustration';
import { getPharmacySchema, getWebSiteSchema } from '../utils/seo';

// Lazy load the 3D Canvas and ScrollVelocity to optimize initial load & keep mobile lightweight
const AsclepiusHero3D = lazy(() =>
  import('../components/AsclepiusHero3D').then((m) => ({ default: m.AsclepiusHero3D }))
);
const ScrollVelocity = lazy(() =>
  import('../components/reactbits/ScrollVelocity').then((m) => ({ default: m.ScrollVelocity }))
);

export const HomePage: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [mount3D, setMount3D] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const sacredHerbs = [
    'Silphium of Cyrene',
    'Olympian Mountain Tea',
    'Moly of Circe',
    'Ambrosial Honey',
    'Attic Thyme',
    'Dittany of Crete',
    'Delphic Laurel Leaves',
    'Epidaurus Chamomile',
  ];

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await fetch('/api/products?sort=featured');
        if (res.ok) {
          const data = await res.json();
          // Pick top 4 featured
          setFeaturedProducts((data.products || []).slice(0, 4));
        }
      } catch {
        // Fallback gracefully
      }
    };
    fetchFeatured();

    // Mount static SVG hero first; initialize 3D canvas after first paint via requestIdleCallback/setTimeout
    // Keep it hidden on mobile and low-end devices
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isLowTier = (navigator.hardwareConcurrency || 4) <= 2;

      if (!isMobile && !isReduced && !isLowTier) {
        const handle = 'requestIdleCallback' in window
          ? (window as any).requestIdleCallback(() => setMount3D(true), { timeout: 2000 })
          : setTimeout(() => setMount3D(true), 1200);

        return () => {
          if ('cancelIdleCallback' in window) {
            (window as any).cancelIdleCallback(handle);
          } else {
            clearTimeout(handle);
          }
        };
      }
    }
  }, []);

  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product, 1);
    toast.success(`${product.name} deposited into your sacred requisition.`, 'Offering Gathered');
  };

  return (
    <div className="flex-grow flex flex-col">
      <SEO
        title="MediStore: Temple of Asclepius | Consecrated Ancient Pharmacopeia"
        description="Sanctified botanical apothecary and decentralized pharmaceutical dispensary. High-potency herbal remedies with on-chain Ethereum batch provenance."
        canonicalPath="/"
        jsonLd={[getPharmacySchema(), getWebSiteSchema()]}
      />
      {/* Hero Section with Static SVG first, deferred 3D Canvas */}
      <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center px-3 sm:px-6 lg:px-8 py-8 sm:py-12 overflow-hidden">
        {/* Decorative column flutes */}
        <div className="absolute inset-y-0 left-4 w-12 hidden md:block opacity-20 column-fluted pointer-events-none" />
        <div className="absolute inset-y-0 right-4 w-12 hidden md:block opacity-20 column-fluted pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-7 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-border text-accent-text text-xs font-cinzel font-bold mb-4 sm:mb-6 tracking-widest uppercase shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Consecrated Apothecary &amp; Oracle Ledger</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-cinzel font-bold text-text tracking-tight leading-tight mb-4 sm:mb-6">
              <BlurText text="TEMPLE OF ASCLEPIUS" animateBy="words" />
            </h1>

            <p className="font-cormorant text-lg sm:text-2xl text-text-muted max-w-xl mx-auto lg:mx-0 mb-6 sm:mb-8 leading-relaxed italic">
              "Let medicine be your offering, and healing your devotion." Ancient Hellenic herbal wisdom harmonized with immutable cryptographic batch authenticity.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start items-center w-full">
              <Magnet className="w-full sm:w-auto">
                <Link to="/shop" className="w-full sm:w-auto block">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto justify-center" rightIcon={<ArrowRight className="w-5 h-5" />}>
                    Explore Dispensary
                  </Button>
                </Link>
              </Magnet>
              <Magnet className="w-full sm:w-auto">
                <Link to="/oracle" className="w-full sm:w-auto block">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto justify-center" leftIcon={<Sparkles className="w-5 h-5" />}>
                    Consult The Oracle
                  </Button>
                </Link>
              </Magnet>
            </div>
          </div>

          {/* Right Column: 3D Rod of Asclepius Emblem (Deferred or Static) */}
          <div className="lg:col-span-5 h-[260px] sm:h-[380px] lg:h-[450px] w-full flex items-center justify-center">
            {mount3D ? (
              <Suspense fallback={<StaticAsclepiusHeroFallback />}>
                <AsclepiusHero3D />
              </Suspense>
            ) : (
              <StaticAsclepiusHeroFallback />
            )}
          </div>
        </div>
      </section>

      {/* Marquee of Herb Names (React Bits - Lazy Loaded) */}
      <section className="border-y border-border bg-surface-2 py-2">
        <Suspense fallback={<div className="h-10" />}>
          <ScrollVelocity texts={sacredHerbs} />
        </Suspense>
      </section>

      {/* Stats Strip with CountUp (React Bits) */}
      <section className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 text-center">
          <div className="p-3.5 sm:p-6 rounded-card border border-border bg-surface shadow-theme floating-card">
            <div className="font-cinzel text-2xl sm:text-4xl font-bold text-accent-text mb-1">
              <CountUp to={40} suffix="+" />
            </div>
            <div className="font-cinzel text-[11px] sm:text-xs uppercase tracking-wider text-text-muted font-bold">
              Formulated Remedies
            </div>
          </div>
          <div className="p-3.5 sm:p-6 rounded-card border border-border bg-surface shadow-theme floating-card">
            <div className="font-cinzel text-2xl sm:text-4xl font-bold text-accent-text mb-1">
              <CountUp to={100} suffix="%" />
            </div>
            <div className="font-cinzel text-[11px] sm:text-xs uppercase tracking-wider text-text-muted font-bold">
              On-Chain Batch Sealed
            </div>
          </div>
          <div className="p-3.5 sm:p-6 rounded-card border border-border bg-surface shadow-theme floating-card">
            <div className="font-cinzel text-2xl sm:text-4xl font-bold text-accent-text mb-1">
              <CountUp to={1250} prefix="" suffix=" BCE" />
            </div>
            <div className="font-cinzel text-[11px] sm:text-xs uppercase tracking-wider text-text-muted font-bold">
              Asclepeion Lineage
            </div>
          </div>
          <div className="p-3.5 sm:p-6 rounded-card border border-border bg-surface shadow-theme floating-card">
            <div className="font-cinzel text-2xl sm:text-4xl font-bold text-accent-text mb-1">
              <CountUp to={100} suffix="%" />
            </div>
            <div className="font-cinzel text-[11px] sm:text-xs uppercase tracking-wider text-text-muted font-bold">
              Sanctum Security
            </div>
          </div>
        </div>
      </section>

      {/* Featured Medicines Section */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
            <div>
              <span className="font-cinzel text-xs uppercase tracking-widest text-accent-text font-bold block mb-1">
                Selected by the High Priests
              </span>
              <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-text">
                Consecrated Dispensary Highlights
              </h2>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 font-cinzel text-xs font-bold text-accent-text hover:underline"
            >
              <span>View Full Pharmacopeia</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <Link key={product.id} to={`/shop/${product.id}`} className="group block focus:outline-none">
                <SpotlightCard className="h-full flex flex-col p-5 group-hover:border-accent transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Badge variant="info" size="sm">
                      {product.category}
                    </Badge>
                    <Badge variant="success" size="sm">
                      Sealed
                    </Badge>
                  </div>

                  <div className="w-full h-36 bg-surface-2 rounded-card border border-border flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <div className="w-14 h-14 rounded-full bg-surface border border-border flex items-center justify-center shadow-inner">
                      <ProductIllustration type={product.illustration} name={product.name} size="md" />
                    </div>
                  </div>

                  <div className="flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-cinzel text-sm font-bold text-text group-hover:text-accent-text transition-colors line-clamp-1 mb-1">
                        {product.name}
                      </h3>
                      <p className="font-cormorant text-xs text-text-muted line-clamp-2 leading-relaxed mb-3">
                        {product.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between mt-auto">
                      <span className="font-cinzel font-bold text-accent-text text-sm">
                        {formatPrice(product.price)}
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => handleQuickAdd(product, e)}
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
        </section>
      )}

      {/* Why The Temple Pillars */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="text-center mb-12">
          <span className="font-cinzel text-xs uppercase tracking-widest text-accent-text font-bold block mb-2">
            The Three Sacred Oaths
          </span>
          <h2 className="font-cinzel text-3xl font-bold text-text">
            Why Seek The Temple
          </h2>
          <GreekDivider className="max-w-xs mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card variant="marble">
            <div className="w-12 h-12 rounded-full bg-surface-2 border border-border text-accent flex items-center justify-center mb-5 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-cinzel text-lg font-bold text-text mb-2">
              Cryptographic Provenance
            </h3>
            <p className="font-cormorant text-base text-text-muted leading-relaxed">
              Every apothecary batch is hashed into our Ethereum smart contract registry. Counterfeits crumble before the immutable ledger.
            </p>
          </Card>

          <Card variant="marble">
            <div className="w-12 h-12 rounded-full bg-surface-2 border border-border text-accent flex items-center justify-center mb-5 shadow-inner">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="font-cinzel text-lg font-bold text-text mb-2">
              Purity &amp; Epidaurus Heritage
            </h3>
            <p className="font-cormorant text-base text-text-muted leading-relaxed">
              Formulations curated under Asclepius traditions, balancing modern pharmaceutical rigor with sacred botanical essences.
            </p>
          </Card>

          <Card variant="marble">
            <div className="w-12 h-12 rounded-full bg-surface-2 border border-border text-accent flex items-center justify-center mb-5 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-cinzel text-lg font-bold text-text mb-2">
              Oracle Guidance
            </h3>
            <p className="font-cormorant text-base text-text-muted leading-relaxed">
              The temple Pythia stands ready. Enquire regarding formulations, herbal synergies, and store requisitions in real time.
            </p>
          </Card>
        </div>
      </section>

      {/* Verified On-Chain Explainer */}
      <section className="bg-surface-2 border-y border-border py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <History className="w-10 h-10 text-accent mx-auto mb-4" />
          <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-text mb-4">
            Zero-Trust Pharmaceutical Provenance
          </h2>
          <p className="font-cormorant text-lg text-text-muted leading-relaxed mb-6">
            In antiquity, remedies were stamped with the sacred seal of the Epidaurus sanctuary. Today, MediStore combines Keccak-256 hash chains with the Sepolia testnet to safeguard human wellness without moving real funds.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/shop">
              <Button variant="primary" leftIcon={<ShoppingBag className="w-4 h-4" />}>
                Inspect The Registry
              </Button>
            </Link>
            <Link to="/quest">
              <Button variant="outline" leftIcon={<ShieldCheck className="w-4 h-4" />}>
                Read The Prophecy
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
