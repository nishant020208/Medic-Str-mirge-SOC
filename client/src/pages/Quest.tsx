import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Terminal, Compass } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { GreekDivider } from '../ui/GreekDivider';
import { SEO } from '../components/SEO';
import { Breadcrumbs } from '../components/Breadcrumbs';

export const QuestPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 w-full flex-grow flex flex-col items-center">
      <SEO
        title="The Riddle of the Broken Seal | MediStore Sanctum"
        description="Sanctum epigraph and challenge instructions for investigative inquiries and temple defense trials."
        canonicalPath="/quest"
      />
      <div className="w-full max-w-2xl mb-6">
        <Breadcrumbs items={[{ name: 'Asclepeion Trials', url: '/quest' }]} />
      </div>
      <Card
        variant="papyrus"
        className="p-4 sm:p-12 border-2 border-border shadow-theme relative overflow-hidden text-center max-w-2xl w-full"
      >
        {/* Glow & Motif */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-surface-2 border-2 border-border text-accent-text flex items-center justify-center mx-auto mb-6 shadow-theme">
          <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        <span className="font-cinzel text-xs uppercase tracking-widest text-accent-text font-bold block mb-2">
          Sanctum Epigraph · For Hackathon Inquisitors
        </span>

        <h1 className="font-cinzel text-2xl sm:text-4xl font-bold text-text mb-4 sm:mb-6">
          The Riddle of the Broken Seal
        </h1>

        <div className="bg-surface-2 p-4 sm:p-6 rounded-card border border-border text-left space-y-4 mb-6 sm:mb-8">
          <p className="font-cormorant text-lg sm:text-xl text-text italic leading-relaxed">
            "The old sanctum was never fully sealed. Seek the forgotten paths...
            <span className="text-accent-text font-mono not-italic font-bold"> /admin-old</span>,
            <span className="text-accent-text font-mono not-italic font-bold"> /.env</span>, or the
            <span className="text-accent-text font-mono not-italic font-bold"> Oracle Console</span>."
          </p>

          <p className="text-xs text-text-muted font-sans leading-relaxed border-t border-border pt-3">
            Legend whispers that uninitiated adversaries probe these ancient corridors in search of forgotten administrative ledgers.
            Within this repository, the honeypot traps remain dormant until awakened by the <strong className="text-accent-text">MirageSOC</strong> defensive fortress.
          </p>
        </div>

        <GreekDivider className="my-6" />

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link to="/terminal" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full sm:w-auto justify-center" leftIcon={<Terminal className="w-5 h-5" />}>
              Open Oracle Console
            </Button>
          </Link>
          <Link to="/shop" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto justify-center" leftIcon={<Compass className="w-5 h-5" />}>
              Return to Dispensary
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
