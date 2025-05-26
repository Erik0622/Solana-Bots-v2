'use client';

import React from 'react';
import ClientLayout from '@/components/ClientLayout';

export function Providers({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
} 