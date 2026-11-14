import React from 'react';
import { useStorefrontCommerce } from '../context/StorefrontCommerceContext';
import { PublicOrderTracker } from '../PublicOrderTracker';

export const StorefrontOrderTrackingPage: React.FC = () => {
  const { lang, setActiveView, tenantInfo, trackingPrefill } = useStorefrontCommerce();

  return (
    <div className="min-h-screen py-8">
      <PublicOrderTracker
        lang={lang}
        onNavigateHome={() => setActiveView('home')}
        tenantIdentifier={tenantInfo?.id}
        initialOrderNumber={trackingPrefill?.orderNumber}
        initialPhone={trackingPrefill?.phone}
      />
    </div>
  );
};
