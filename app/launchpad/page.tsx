import React from 'react';
import Header from '@/components/Header';
import BotCreator from '@/components/BotCreator';
import Footer from '@/components/Footer';

export default function LaunchpadPage() {
  return (
    <main className="bg-dark text-white min-h-screen">
      <Header />
      <div className="pt-20">
        <BotCreator />
      </div>
      <Footer />
    </main>
  );
} 