import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Terminal, Compass } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { GreekDivider } from '../ui/GreekDivider';

export const QuestPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex-grow flex items-center justify-center">
      <Card
        variant="papyrus"
        className="p-8 sm:p-12 border-2 border-gold-500/50 shadow-2xl relative overflow-hidden text-center max-w-2xl w-full"
      >
        {/* Glow & Motif */}
        <div className="w-20 h-20 rounded-full bg-gold-500/10 border-2 border-gold-500 text-gold-500 flex items-center justify-center mx-auto mb-6 shadow-gold-glow animate-pulse-subtle">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <span className="font-cinzel text-xs uppercase tracking-widest text-gold-600 dark:text-gold-400 font-bold block mb-2">
          Sanctum Epigraph · For Hackathon Inquisitors
        </span>

        <h1 className="font-cinzel text-3xl sm:text-4xl font-bold text-ink-950 dark:text-marble-100 mb-6">
          The Riddle of the Broken Seal
        </h1>

        <div className="bg-marble-200/50 dark:bg-lapis-950/60 p-6 rounded-sm border border-gold-500/30 text-left space-y-4 mb-8">
          <p className="font-cormorant text-xl text-ink-900 dark:text-marble-100 italic leading-relaxed">
            "The old sanctum was never fully sealed. Seek the forgotten paths...
            <span className="text-gold-600 dark:text-gold-400 font-mono not-italic font-bold"> /admin-old</span>,
            <span className="text-gold-600 dark:text-gold-400 font-mono not-italic font-bold"> /.env</span>, or the
            <span className="text-gold-600 dark:text-gold-400 font-mono not-italic font-bold"> Oracle Console</span>."
          </p>

          <p className="text-xs text-ink-700 dark:text-marble-300 font-sans leading-relaxed border-t border-marble-300 dark:border-lapis-800 pt-3">
            Legend whispers that uninitiated adversaries probe these ancient corridors in search of forgotten administrative ledgers.
            Within this repository, the honeypot traps remain dormant until awakened by the <strong className="text-gold-600 dark:text-gold-400">MirageSOC</strong> defensive fortress.
          </p>
        </div>

        <GreekDivider className="my-6" />

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/terminal">
            <Button variant="gold" size="lg" leftIcon={<Terminal className="w-5 h-5" />}>
              Open Oracle Console (/terminal)
            </Button>
          </Link>
          <Link to="/shop">
            <Button variant="outline" size="lg" leftIcon={<Compass className="w-5 h-5" />}>
              Return to Dispensary
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
