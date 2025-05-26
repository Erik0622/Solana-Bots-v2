import React, { FC } from 'react';
import Link from 'next/link';

const Footer: FC = () => {
  return (
    <footer className="bg-dark px-6 py-12 border-t border-dark-lighter">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="text-lg font-bold text-white mb-4">SolBotQuants</h4>
            <p className="text-white/60 mb-4">
              Intelligent trading bots for the Solana blockchain with proven profitability and modern risk management.
            </p>
            <p className="text-white/60 text-sm">
              Developer Wallet: <br />
              <span className="text-primary">81EWHKqwf2bfVfFn71VcLY1VvnxDXsHQAyy85PZLc38D</span>
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-bold text-white mb-4">Trading Bots</h4>
            <ul className="space-y-2 text-white/60">
              <li><Link href="/#bots" className="hover:text-primary transition-colors">Volume Tracker</Link></li>
              <li><Link href="/#bots" className="hover:text-primary transition-colors">Momentum Bot</Link></li>
              <li><Link href="/#bots" className="hover:text-primary transition-colors">Dip Hunter</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-bold text-white mb-4">Links</h4>
            <ul className="space-y-2 text-white/60">
              <li><a href="https://x.com/solbotquants?s=21" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">X</a></li>
              <li><Link href="/api-docs" className="hover:text-primary transition-colors">API</Link></li>
              <li><Link href="/#faq" className="hover:text-primary transition-colors">FAQ</Link></li>
              <li><a href="mailto:contact@solbotquants.io" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-dark-lighter mt-12 pt-8 text-center text-white/60">
          <p>© {new Date().getFullYear()} SolBotQuants. All rights reserved.</p>
          <p className="mt-2 text-sm">
            Trading bots involve inherent risks. Past performance is not indicative of future results.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 