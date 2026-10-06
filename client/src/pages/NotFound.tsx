import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, ShoppingBag, Sparkles, ScrollText, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { GreekDivider } from '../ui/GreekDivider';
import { SEO } from '../components/SEO';
import { Breadcrumbs } from '../components/Breadcrumbs';

export const NotFoundPage: React.FC = () => {
  const popularCategories = [
    { name: 'Sacred Botanicals', path: '/shop?category=Botanicals' },
    { name: 'Divine Panaceas', path: '/shop?category=Panaceas' },
    { name: 'Holistic Elixirs', path: '/shop?category=Elixirs' },
    { name: 'Sanctified Balms', path: '/shop?category=Balms' },
  ];

  return (
    <div className="flex-grow flex flex-col items-center justify-center py-6 sm:py-12 px-3 sm:px-4 max-w-4xl mx-auto w-full">
      <SEO
        title="404 - Sacred Path Lost | MediStore Sanctuary"
        description="The chamber or formulation you sought could not be found within the Temple of Asclepius archives."
        canonicalPath="/404"
        noindex={true}
      />

      <div className="w-full mb-6">
        <Breadcrumbs items={[{ name: 'Chamber Not Found (404)', url: '/404' }]} />
      </div>

      <div className="w-full text-center p-5 sm:p-12 rounded-card border border-border bg-surface shadow-theme backdrop-blur-md">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-surface-2 border border-border text-accent-text flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Compass className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        <span className="font-cinzel text-xs uppercase tracking-widest text-accent-text font-bold block mb-2">
          Sanctum Deviation · 404
        </span>

        <h1 className="font-cinzel text-2xl sm:text-4xl font-bold text-text mb-4">
          Lost in the Labyrinth
        </h1>

        <p className="font-cormorant text-base sm:text-lg text-text-muted leading-relaxed max-w-xl mx-auto mb-6 sm:mb-8">
          The corridor you seek has vanished into mythological obscurity or remains guarded by ancient oaths. Let the Asclepeion guide you back to wellness.
        </p>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center mb-8">
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="primary" className="w-full sm:w-auto justify-center" leftIcon={<Home className="w-4 h-4" />}>
              Return to Temple Grounds
            </Button>
          </Link>
          <Link to="/shop" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto justify-center" leftIcon={<ShoppingBag className="w-4 h-4" />}>
              Apothecary Dispensary
            </Button>
          </Link>
          <Link to="/oracle" className="w-full sm:w-auto">
            <Button variant="ghost" className="w-full sm:w-auto justify-center" leftIcon={<Sparkles className="w-4 h-4 text-accent" />}>
              Consult the Oracle
            </Button>
          </Link>
          <Link to="/quest" className="w-full sm:w-auto">
            <Button variant="ghost" className="w-full sm:w-auto justify-center" leftIcon={<ScrollText className="w-4 h-4 text-accent" />}>
              Asclepeion Trials
            </Button>
          </Link>
        </div>

        <GreekDivider className="my-8" />

        {/* Deep Internal Links Section */}
        <div className="text-left mt-8">
          <h2 className="font-cinzel text-sm uppercase tracking-wider font-bold text-text mb-4 text-center">
            Explore Verified Sanctum Formulations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {popularCategories.map((cat) => (
              <Link
                key={cat.name}
                to={cat.path}
                className="p-3 rounded-card border border-border bg-surface-2 hover:border-accent hover:bg-surface transition-all flex items-center justify-between text-xs font-cinzel font-bold text-text group"
              >
                <span>{cat.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-accent-text group-hover:translate-x-1 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
