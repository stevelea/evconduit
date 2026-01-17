// src/components/landing/PricingSection.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/hooks/useUser';
import { useTranslation } from 'react-i18next';
import NewsBox from './NewsBox';
import VehicleCapacity from './VehicleCapacity';

export default function PricingSection() {
  const { isLoggedIn, loading } = useUser();
  const { t } = useTranslation();

  type PlanKey = 'free' | 'basic' | 'pro' | 'custom';
  const plans: PlanKey[] = ['free', 'basic', 'pro', 'custom'];

  // Plans that are shaded out (not available)
  const shadedPlans: PlanKey[] = ['free', 'basic', 'custom'];

  const planConfig: Record<PlanKey, {
    title: string;
    price: string;
    features: readonly string[];
    getButton: () => { label: string; href: string; disabled: boolean; badge: string | null };
  }> = {
    free: {
      title: t('landing.pricing.plans.free.title'),
      price: 'Not Available',
      features: t('landing.pricing.plans.free.features', { returnObjects: true }) as string[],
      getButton: () => ({ label: 'Not Available', href: '#', disabled: true, badge: null }),
    },
    basic: {
      title: t('landing.pricing.plans.basic.title'),
      price: 'Not Available',
      features: t('landing.pricing.plans.basic.features', { returnObjects: true }) as string[],
      getButton: () => ({ label: 'Not Available', href: '#', disabled: true, badge: null }),
    },
    pro: {
      title: t('landing.pricing.plans.pro.title'),
      price: 'Rolling 12 Month Free Access',
      features: t('landing.pricing.plans.pro.features', { returnObjects: true }) as string[],
      getButton: () => {
        if (loading) {
          return { label: t('landing.pricing.buttons.loading'), href: '#', disabled: true, badge: null };
        }
        if (!isLoggedIn) {
          return { label: t('landing.pricing.buttons.register'), href: '/register?plan=pro', disabled: false, badge: 'Default' };
        }
        return { label: t('landing.pricing.buttons.currentPlan'), href: '#', disabled: true, badge: t('landing.pricing.badges.currentPlan') };
      },
    },
    custom: {
      title: t('landing.pricing.plans.custom.title'),
      price: t('landing.pricing.plans.custom.price'),
      features: t('landing.pricing.plans.custom.features', { returnObjects: true }) as string[],
      getButton: () => ({ label: t('landing.pricing.buttons.contactUs'), href: '/contact', disabled: true, badge: t('landing.pricing.badges.comingSoon') }),
    },
  };

  return (
    <section className="relative z-20 -mt-100 max-w-6xl mx-auto px-6 py-10 text-center">
      <h2 className="text-2xl font-bold mb-6 text-white">{t('landing.pricing.title')}</h2>
      <div className="grid gap-4 md:grid-cols-4">
        {plans.map((key) => {
          const cfg = planConfig[key];
          const btn = cfg.getButton();
          const isShaded = shadedPlans.includes(key);
          return (
            <Card
              key={key}
              className={`relative border shadow-md bg-white ${isShaded ? 'bg-muted/50 opacity-50 grayscale' : ''} ${key === 'pro' ? 'ring-2 ring-green-500' : ''}`}
            >
              {btn.badge && (
                <Badge variant="secondary" className="absolute top-2 right-2 z-10 text-xs">
                  {btn.badge}
                </Badge>
              )}
              <CardHeader className="pt-6">
                <CardTitle className={`text-xl font-semibold uppercase ${btn.badge ? 'mt-1' : ''}`}>{cfg.title}</CardTitle>
                <div className={`mt-2 text-lg font-bold ${key === 'pro' ? 'text-green-600' : 'text-gray-400'}`}>{cfg.price}</div>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-sm text-left text-gray-700 space-y-1">
                  {cfg.features.map((f) => (
                    <li key={f}>✔ {f}</li>
                  ))}
                </ul>
                <Button className="w-full" disabled={btn.disabled} asChild>
                  <Link href={btn.href}>{btn.label}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* News Box */}
      <div className="mt-6">
        <NewsBox />
      </div>

      {/* Vehicle Capacity */}
      <div className="mt-4">
        <VehicleCapacity />
      </div>

      {/* Buy Me a Coffee link */}
      <div className="mt-8 text-center">
        <p className="text-white/80 mb-3">Enjoying EVConduit? Support the project!</p>
        <a
          href="https://www.buymeacoffee.com/stevelea"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-3 rounded-full transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.111.431l.319 1.484a.237.237 0 01-.199.284h-.003c-.037.006-.075.01-.112.015a36.704 36.704 0 01-4.743.295 37.059 37.059 0 01-4.699-.304c-.14-.017-.293-.042-.417-.06-.326-.048-.649-.108-.973-.161-.393-.065-.768-.032-1.123.161-.29.16-.527.404-.675.701-.154.316-.199.66-.267 1-.069.34-.176.707-.135 1.056.087.753.613 1.365 1.37 1.502a39.69 39.69 0 0011.343.376.483.483 0 01.535.53l-.071.697-1.018 9.907c-.041.41-.047.832-.125 1.237-.122.637-.553 1.028-1.182 1.171-.577.131-1.165.2-1.756.205-.656.004-1.31-.025-1.966-.022-.699.004-1.556-.06-2.095-.58-.475-.458-.54-1.174-.605-1.793l-.731-7.013-.322-3.094c-.037-.351-.286-.695-.678-.678-.336.015-.718.3-.678.679l.228 2.185.949 9.112c.147 1.344 1.174 2.068 2.446 2.272.742.12 1.503.144 2.257.156.966.016 1.942.053 2.892-.122 1.408-.258 2.465-1.198 2.616-2.657.34-3.332.683-6.663 1.024-9.995l.215-2.087a.484.484 0 01.39-.426c.402-.078.787-.212 1.074-.518.455-.488.546-1.124.385-1.766zm-1.478.772c-.145.137-.363.201-.578.233-2.416.359-4.866.54-7.308.46-1.748-.06-3.477-.254-5.207-.498-.17-.024-.353-.055-.47-.18-.22-.236-.111-.71-.054-.995.052-.26.152-.609.463-.646.484-.057 1.046.148 1.526.22.577.088 1.156.159 1.737.212 2.48.226 5.002.19 7.472-.14.45-.06.899-.13 1.345-.21.399-.072.84-.206 1.08.206.166.281.188.657.162.974a.544.544 0 01-.169.364z"/>
          </svg>
          Buy Me a Coffee
        </a>
      </div>
    </section>
  );
}
