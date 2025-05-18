import React from 'react';
import Header from '@/components/Header';
import Dashboard from '@/components/Dashboard';
import Footer from '@/components/Footer';

export default function DashboardPage() {
  return (
    <main className="bg-dark text-white min-h-screen">
      <Header />
      <div className="pt-20">
        <Dashboard />
      </div>
      <Footer />
    </main>
  );
} 