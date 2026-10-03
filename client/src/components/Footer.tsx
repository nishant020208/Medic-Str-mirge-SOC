import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, HeartPulse, Award, FileCode } from 'lucide-react';
import { GreekDivider } from '../ui/GreekDivider';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-marble-200/80 dark:bg-lapis-950/90 border-t border-marble-300 dark:border-lapis-800 pt-12 pb-24 lg:pb-12 text-ink-800 dark:text-marble-200 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-sm bg-lapis-900 border border-gold-500/50 flex items-center justify-center text-gold-400">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h4 className="font-cinzel font-bold text-base tracking-wider text-ink-950 dark:text-marble-100">
                MEDISTORE
              </h4>
            </div>
            <p className="font-cormorant text-base text-ink-700 dark:text-marble-300 leading-relaxed mb-4">
              Consecrated to Asclepius, divinity of healing. Blending ancient botanical traditions with cryptographic batch seals.
            </p>
            <div className="flex items-center gap-2 text-xs font-cinzel text-gold-600 dark:text-gold-400">
              <Award className="w-4 h-4" />
              <span>Certified Asclepeion Specimen</span>
            </div>
          </div>

          <div>
            <h5 className="font-cinzel font-bold text-sm uppercase tracking-wider text-ink-950 dark:text-gold-300 mb-4 border-b border-gold-500/30 pb-1">
              Sanctuary Gates
            </h5>
            <ul className="space-y-2 text-sm font-medium">
              <li>
                <Link to="/" className="hover:text-gold-500 transition-colors">
                  Temple Grounds
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-gold-500 transition-colors">
                  Apothecary Dispensary
                </Link>
              </li>
              <li>
                <Link to="/oracle" className="hover:text-gold-500 transition-colors">
                  Oracle Consultation
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-gold-500 transition-colors">
                  Sacred Requisition (Cart)
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-gold-500 transition-colors">
                  Pharmacist Log (Restricted)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-cinzel font-bold text-sm uppercase tracking-wider text-ink-950 dark:text-gold-300 mb-4 border-b border-gold-500/30 pb-1">
              Hallowed Cryptography
            </h5>
            <ul className="space-y-2 text-sm font-medium">
              <li>
                <Link to="/quest" className="hover:text-gold-500 transition-colors flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-gold-500" />
                  <span>The Forgotten Quest</span>
                </Link>
              </li>
              <li>
                <Link to="/terminal" className="hover:text-gold-500 transition-colors flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-gold-500" />
                  <span>Oracle Console</span>
                </Link>
              </li>
              <li>
                <span className="text-xs text-ink-600 dark:text-marble-400 block pt-1">
                  EVM Network: Ethereum Sepolia (Chain ID 11155111)
                </span>
              </li>
              <li>
                <span className="text-xs text-ink-600 dark:text-marble-400 block">
                  Contract: BatchRegistry.sol
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-cinzel font-bold text-sm uppercase tracking-wider text-ink-950 dark:text-gold-300 mb-4 border-b border-gold-500/30 pb-1">
              Test Invocations
            </h5>
            <div className="bg-marble-100 dark:bg-lapis-900/60 p-3 rounded-sm border border-marble-300 dark:border-lapis-700 text-xs space-y-1.5 font-mono">
              <div className="text-ink-600 dark:text-marble-300 font-sans font-semibold">Demo Accounts:</div>
              <div className="text-gold-700 dark:text-gold-300 truncate">pharmacist@medistore.test</div>
              <div className="text-gold-700 dark:text-gold-300 truncate">customer@medistore.test</div>
              <div className="text-ink-600 dark:text-marble-300 font-sans">Pass: Demo@12345</div>
            </div>
          </div>
        </div>

        <GreekDivider />

        {/* Mandatory Medical Disclaimer Banner */}
        <div className="my-6 p-4 rounded-sm border border-gold-500/30 bg-gold-500/5 text-center">
          <p className="font-cinzel text-xs uppercase tracking-wider font-bold text-gold-700 dark:text-gold-300 mb-1">
            Official Sanctum Declaration
          </p>
          <p className="text-xs text-ink-700 dark:text-marble-300 font-medium">
            Demo application. Not medical advice. No real orders.
          </p>
        </div>

        {/* Bottom Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-ink-600 dark:text-marble-400 pt-4 gap-2">
          <p>© {new Date().getFullYear()} MediStore: Temple of Asclepius. All mythological rights reserved.</p>
          <p className="font-cinzel tracking-wider text-[11px] text-gold-600 dark:text-gold-400">
            Apothecary of Antiquity &amp; Oracle Ledger
          </p>
        </div>
      </div>
    </footer>
  );
};
