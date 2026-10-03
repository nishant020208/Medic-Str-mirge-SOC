import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, ShoppingBag } from 'lucide-react';
import { Button } from '../ui/Button';
import { GreekDivider } from '../ui/GreekDivider';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex-grow flex items-center justify-center py-20 px-4">
      <div className="max-w-lg w-full text-center p-8 rounded-card border border-border bg-surface shadow-theme backdrop-blur-md">
        <div className="w-20 h-20 rounded-full bg-surface-2 border border-border text-accent-text flex items-center justify-center mx-auto mb-6">
          <Compass className="w-10 h-10" />
        </div>
        <span className="font-cinzel text-xs uppercase tracking-widest text-accent-text font-bold block mb-2">
          Sanctum Deviation · 404
        </span>
        <h1 className="font-cinzel text-3xl sm:text-4xl font-bold text-text mb-4">
          Lost in the Labyrinth
        </h1>
        <p className="font-cormorant text-lg text-text-muted leading-relaxed mb-6">
          The corridor you seek has vanished into mythological obscurity or remains guarded by ancient oaths.
        </p>

        <GreekDivider />

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Link to="/">
            <Button variant="primary" leftIcon={<Home className="w-4 h-4" />}>
              Return to Temple Grounds
            </Button>
          </Link>
          <Link to="/shop">
            <Button variant="outline" leftIcon={<ShoppingBag className="w-4 h-4" />}>
              Apothecary Dispensary
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
