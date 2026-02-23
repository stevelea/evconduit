'use client';

import Link from 'next/link';
import { Map, Zap, MessageCircle, Bot } from 'lucide-react';
import HeroSection from '@/components/landing/HeroSection';
import PricingSection from '@/components/landing/PricingSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import SupportSection from '@/components/landing/SupportSection';
import { Separator } from '@/components/ui/separator';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Community tools banner */}
      <div className="bg-indigo-900 text-white text-sm">
        <div className="max-w-5xl mx-auto px-6 py-2 flex items-center justify-center gap-6 flex-wrap">
          <span className="text-indigo-300 hidden sm:inline">Community Tools:</span>
          <Link
            href="/tomtom"
            className="flex items-center gap-1.5 hover:text-indigo-200 transition-colors"
          >
            <Map className="h-3.5 w-3.5" />
            TomTom Map Update
          </Link>
          <span className="text-indigo-600">|</span>
          <Link
            href="/xcombo"
            className="flex items-center gap-1.5 hover:text-indigo-200 transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            XCombo Catalog
          </Link>
          <span className="text-indigo-600">|</span>
          <a
            href="https://chatgpt.com/g/g-6821a8a535288191971bed6a27dd5277-xpeng-oracle"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-indigo-200 transition-colors"
          >
            <Bot className="h-3.5 w-3.5" />
            Xpeng Oracle (Roel)
          </a>
          <span className="text-indigo-600">|</span>
          <a
            href="https://discord.gg/6BzmqfZaAf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-indigo-200 transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Join Discord
          </a>
        </div>
      </div>
      <HeroSection />
      <PricingSection />
      <FeaturesSection />
      <SupportSection />
      <Separator />
    </main>
  );
}