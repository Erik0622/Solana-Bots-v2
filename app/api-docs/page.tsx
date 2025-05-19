import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ApiDocsPage() {
  return (
    <main className="bg-dark text-white min-h-screen">
      <Header />
      <div className="py-32 px-6 min-h-[60vh]">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">API Documentation</h2>
          <div className="bg-dark-lighter p-8 rounded-lg max-w-2xl mx-auto">
            <p className="text-xl mb-4">Coming Soon</p>
            <p className="text-white/80">
              Our API documentation is currently under development. 
              Check back soon for comprehensive guides on integrating with SolBotQuants.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
} 