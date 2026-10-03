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
import { ScrollVelocity } from '../components/reactbits/ScrollVelocity';
import { Magnet } from '../components/reactbits/Magnet';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';
import { StaticAsclepiusHeroFallback } from '../components/AsclepiusHero3D';
import { Product } from '../types';
import { useCartStore } from '../store/cartStore';
import { toast } from '../ui/Toast';
import { formatPrice } from '../lib/utils';

// Lazy load the 3D Canvas to optimize initial load & total JS
const AsclepiusHero3D = lazy(() =>
  import('../components/AsclepiusHero3D').then((m) => ({ default: m.AsclepiusHero3D }))
);

export const HomePage: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
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
  }, []);

  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product, 1);
    toast.success(`${product.name} deposited into your sacred requisition.`, 'Offering Gathered');
  };

  return (
    <div className="flex-grow flex flex-col">
      {/* Hero Section with 3D Canvas */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 overflow-hidden">
        {/* Decorative column flutes */}
        <div className="absolute inset-y-0 left-4 w-12 hidden md:block opacity-20 column-fluted pointer-events-none" />
        <div className="absolute inset-y-0 right-4 w-12 hidden md:block opacity-20 column-fluted pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-7 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-600 dark:text-gold-300 text-xs font-cinzel font-bold mb-6 tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Consecrated Apothecary &amp; Oracle Ledger</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-cinzel font-bold text-ink-950 dark:text-marble-100 tracking-tight leading-tight mb-6">
              <BlurText text="TEMPLE OF ASCLEPIUS" animateBy="words" />
            </h1>

            <p className="font-cormorant text-xl sm:text-2xl text-ink-800 dark:text-marble-200 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed italic">
              "Let medicine be your offering, and healing your devotion." Ancient Hellenic herbal wisdom harmonized with immutable cryptographic batch authenticity.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
              <Magnet>
                <Link to="/shop">
                  <Button variant="gold" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                    Explore Dispensary
                  </Button>
                </Link>
              </Magnet>
              <Magnet>
                <Link to="/oracle">
                  <Button variant="outline" size="lg" leftIcon={<Sparkles className="w-5 h-5" />}>
                    Consult The Oracle
                  </Button>
                </Link>
              </Magnet>
            </div>
          </div>

          {/* Right Column: 3D Rod of Asclepius Emblem */}
          <div className="lg:col-span-5 h-[360px] sm:h-[450px] w-full flex items-center justify-center">
            <Suspense fallback={<StaticAsclepiusHeroFallback />}>
              <AsclepiusHero3D />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Marquee of Herb Names (React Bits) */}
      <section className="border-y border-gold-500/20 bg-marble-200/50 dark:bg-lapis-950/60 py-2">
        <ScrollVelocity texts={sacredHerbs} />
      </section>

      {/* Stats Strip with CountUp (React Bits) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-6 rounded-sm border border-marble-300 dark:border-lapis-800 bg-white/70 dark:bg-lapis-900/60 shadow-sm">
            <div className="font-cinzel text-3xl sm:text-4xl font-bold text-gold-500 mb-1">
              <CountUp to={40} suffix="+" />
            </div>
            <div className="font-cinzel text-xs uppercase tracking-wider text-ink-700 dark:text-marble-300">
              Formulated Remedies
            </div>
          </div>
          <div className="p-6 rounded-sm border border-marble-300 dark:border-lapis-800 bg-white/70 dark:bg-lapis-900/60 shadow-sm">
            <div className="font-cinzel text-3xl sm:text-4xl font-bold text-gold-500 mb-1">
              <CountUp to={100} suffix="%" />
            </div>
            <div className="font-cinzel text-xs uppercase tracking-wider text-ink-700 dark:text-marble-300">
              On-Chain Batch Sealed
            </div>
          </div>
          <div className="p-6 rounded-sm border border-marble-300 dark:border-lapis-800 bg-white/70 dark:bg-lapis-900/60 shadow-sm">
            <div className="font-cinzel text-3xl sm:text-4xl font-bold text-gold-500 mb-1">
              <CountUp to={1250} prefix="" suffix=" BCE" />
            </div>
            <div className="font-cinzel text-xs uppercase tracking-wider text-ink-700 dark:text-marble-300">
              Asclepeion Lineage
            </div>
          </div>
          <div className="p-6 rounded-sm border border-marble-300 dark:border-lapis-800 bg-white/70 dark:bg-lapis-900/60 shadow-sm">
            <div className="font-cinzel text-3xl sm:text-4xl font-bold text-gold-500 mb-1">
              <CountUp to={100} suffix="%" />
            </div>
            <div className="font-cinzel text-xs uppercase tracking-wider text-ink-700 dark:text-marble-300">
              Sandbox Security
            </div>
          </div>
        </div>
      </section>

      {/* Featured Medicines Section */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
            <div>
              <span className="font-cinzel text-xs uppercase tracking-widest text-gold-600 dark:text-gold-400 font-bold block mb-1">
                Selected by the High Priests
              </span>
              <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-ink-950 dark:text-marble-100">
                Consecrated Dispensary Highlights
              </h2>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 font-cinzel text-xs font-bold text-gold-600 dark:text-gold-400 hover:underline"
            >
              <span>View Full Pharmacopeia</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <Link key={product.id} to={`/shop/${product.id}`} className="group block focus:outline-none">
                <SpotlightCard className="h-full flex flex-col p-5 group-hover:border-gold-500 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Badge variant="lapis" size="sm">
                      {product.category}
                    </Badge>
                    <Badge variant="olive" size="sm">
                      Sealed
                    </Badge>
                  </div>

                  <div className="w-full h-36 bg-marble-100 dark:bg-lapis-950 rounded-sm border border-marble-300 dark:border-lapis-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <div className="w-14 h-14 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-500">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                  </div>

                  <div className="flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-cinzel text-sm font-bold text-ink-950 dark:text-marble-100 group-hover:text-gold-500 transition-colors line-clamp-1 mb-1">
                        {product.name}
                      </h3>
                      <p className="font-cormorant text-xs text-ink-700 dark:text-marble-300 line-clamp-2 leading-relaxed mb-3">
                        {product.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-marble-200 dark:border-lapis-800 flex items-center justify-between mt-auto">
                      <span className="font-cinzel font-bold text-gold-600 dark:text-gold-400 text-sm">
                        {formatPrice(product.price)}
                      </span>
                      <Button
                        variant="gold"
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
          <span className="font-cinzel text-xs uppercase tracking-widest text-gold-600 dark:text-gold-400 font-bold block mb-2">
            The Three Sacred Oaths
          </span>
          <h2 className="font-cinzel text-3xl font-bold text-ink-950 dark:text-marble-100">
            Why Seek The Temple
          </h2>
          <GreekDivider className="max-w-xs mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card variant="marble">
            <div className="w-12 h-12 rounded-full bg-gold-500/10 border border-gold-500/40 text-gold-500 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-cinzel text-lg font-bold text-ink-950 dark:text-marble-100 mb-2">
              Cryptographic Provenance
            </h3>
            <p className="font-cormorant text-base text-ink-700 dark:text-marble-300 leading-relaxed">
              Every apothecary batch is hashed into our Ethereum smart contract registry. Counterfeits crumble before the immutable ledger.
            </p>
          </Card>

          <Card variant="marble">
            <div className="w-12 h-12 rounded-full bg-gold-500/10 border border-gold-500/40 text-gold-500 flex items-center justify-center mb-5">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="font-cinzel text-lg font-bold text-ink-950 dark:text-marble-100 mb-2">
              Purity &amp; Epidaurus Heritage
            </h3>
            <p className="font-cormorant text-base text-ink-700 dark:text-marble-300 leading-relaxed">
              Formulations curated under Asclepius traditions, balancing modern pharmaceutical rigor with sacred botanical essences.
            </p>
          </Card>

          <Card variant="marble">
            <div className="w-12 h-12 rounded-full bg-gold-500/10 border border-gold-500/40 text-gold-500 flex items-center justify-center mb-5">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-cinzel text-lg font-bold text-ink-950 dark:text-marble-100 mb-2">
              Oracle Guidance
            </h3>
            <p className="font-cormorant text-base text-ink-700 dark:text-marble-300 leading-relaxed">
              The temple Pythia stands ready. Enquire regarding formulations, herbal synergies, and store requisitions in real time.
            </p>
          </Card>
        </div>
      </section>

      {/* Verified On-Chain Explainer */}
      <section className="bg-marble-200/60 dark:bg-lapis-950/70 border-y border-marble-300 dark:border-lapis-800 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <History className="w-10 h-10 text-gold-500 mx-auto mb-4" />
          <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-ink-950 dark:text-marble-100 mb-4">
            Zero-Trust Pharmaceutical Provenance
          </h2>
          <p className="font-cormorant text-lg text-ink-700 dark:text-marble-300 leading-relaxed mb-6">
            In antiquity, remedies were stamped with the sacred seal of the Epidaurus sanctuary. Today, MediStore combines Keccak-256 hash chains with the Sepolia testnet to safeguard human wellness without moving real funds.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/shop">
              <Button variant="gold" leftIcon={<ShoppingBag className="w-4 h-4" />}>
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
