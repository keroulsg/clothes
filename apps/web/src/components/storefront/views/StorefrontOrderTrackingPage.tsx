import React from 'react';
import { useStorefrontCommerce } from '../context/StorefrontCommerceContext';
import { PublicOrderTracker } from '../PublicOrderTracker';

export const StorefrontOrderTrackingPage: React.FC = () => {
  const { lang, setActiveView, tenantInfo } = useStorefrontCommerce();

  return (
    <div className="min-h-screen py-8">
      <PublicOrderTracker
        lang={lang}
        onNavigateHome={() => setActiveView('home')}
        tenantIdentifier={tenantInfo?.id}
      />
    </div>
  );
};
