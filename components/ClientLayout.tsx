'use client';

import React from 'react';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <div className="min-h-screen bg-dark">
      {children}
    </div>
  );
} 