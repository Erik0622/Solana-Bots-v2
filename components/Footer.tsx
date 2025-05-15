import React, { FC } from 'react';

const Footer: FC = () => {
  return (
    <footer className="bg-dark px-6 py-12 border-t border-dark-lighter">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-lg font-bold text-white mb-4">SolBotQuants</h4>
            <p className="text-white/60 mb-4">
              Intelligente Trading-Bots für die Solana-Blockchain mit nachgewiesener Rentabilität und modernem Risikomanagement.
            </p>
            <p className="text-white/60 text-sm">
              Developer Wallet: <br />
              <span className="text-primary">Aa7LPoDswnoy511YgJYAxo652vHn4SRBz6zeaAzUDzaF</span>
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-bold text-white mb-4">Trading Bots</h4>
            <ul className="space-y-2 text-white/60">
              <li><a href="#" className="hover:text-primary transition-colors">Volume Tracker</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Trend Surfer</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Arbitrage Finder</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-bold text-white mb-4">Links</h4>
            <ul className="space-y-2 text-white/60">
              <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">API</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-bold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-white/60">
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Risk Disclosure</a></li>
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