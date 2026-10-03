import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, HeartPulse, Award, FileCode } from 'lucide-react';
import { GreekDivider } from '../ui/GreekDivider';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-surface-2 border-t border-border pt-12 pb-24 lg:pb-12 text-text transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-card bg-primary border border-border flex items-center justify-center text-text-on-primary shadow-theme">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h3 className="font-cinzel font-bold text-base tracking-wider text-text">
                MEDISTORE
              </h3>
            </div>
            <p className="font-cormorant text-base text-text-muted leading-relaxed mb-4">
              Consecrated to Asclepius, divinity of healing. Blending ancient botanical traditions with cryptographic batch seals.
            </p>
            <div className="flex items-center gap-2 text-xs font-cinzel text-accent-text font-bold">
              <Award className="w-4 h-4 text-accent" />
              <span>Certified Asclepeion Specimen</span>
            </div>
          </div>

          <div>
            <h3 className="font-cinzel font-bold text-sm uppercase tracking-wider text-text mb-4 border-b border-border pb-1">
              Sanctuary Gates
            </h3>
            <ul className="space-y-2 text-sm font-medium">
              <li>
                <Link to="/" className="hover:text-accent-text transition-colors">
                  Temple Grounds
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-accent-text transition-colors">
                  Apothecary Dispensary
                </Link>
              </li>
              <li>
                <Link to="/oracle" className="hover:text-accent-text transition-colors">
                  Oracle Consultation
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-accent-text transition-colors">
                  Sacred Requisition (Cart)
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-accent-text transition-colors">
                  Pharmacist Log (Restricted)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-cinzel font-bold text-sm uppercase tracking-wider text-text mb-4 border-b border-border pb-1">
              Hallowed Cryptography
            </h3>
            <ul className="space-y-2 text-sm font-medium">
              <li>
                <Link to="/quest" className="hover:text-accent-text transition-colors flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <span>The Forgotten Quest</span>
                </Link>
              </li>
              <li>
                <Link to="/terminal" className="hover:text-accent-text transition-colors flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-accent" />
                  <span>Oracle Console</span>
                </Link>
              </li>
              <li>
                <span className="text-xs text-text-muted block pt-1">
                  EVM Network: Ethereum Sepolia (Chain ID 11155111)
                </span>
              </li>
              <li>
                <span className="text-xs text-text-muted block">
                  Contract: BatchRegistry.sol
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-cinzel font-bold text-sm uppercase tracking-wider text-text mb-4 border-b border-border pb-1">
              Test Invocations
            </h3>
            <div className="bg-surface p-3 rounded-card border border-border text-xs space-y-1.5 font-mono shadow-inner">
              <div className="text-text-muted font-sans font-semibold">Demo Accounts:</div>
              <div className="text-text truncate font-bold">pharmacist@medistore.test</div>
              <div className="text-text truncate font-bold">customer@medistore.test</div>
              <div className="text-text-muted font-sans">Pass: Demo@12345</div>
            </div>
          </div>
        </div>

        <GreekDivider />

        {/* Mandatory Medical Disclaimer Banner */}
        <div className="my-6 p-4 rounded-card border border-border bg-surface text-center shadow-theme">
          <p className="font-cinzel text-xs uppercase tracking-wider font-bold text-accent-text mb-1">
            Official Sanctum Declaration
          </p>
          <p className="text-xs text-text-muted font-medium">
            Demo application. Not medical advice. No real orders.
          </p>
        </div>

        {/* Bottom Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted pt-4 gap-2">
          <p>© {new Date().getFullYear()} MediStore: Temple of Asclepius. All mythological rights reserved.</p>
          <p className="font-cinzel tracking-wider text-[11px] text-accent-text font-bold">
            Apothecary of Antiquity &amp; Oracle Ledger
          </p>
        </div>
      </div>
    </footer>
  );
};
