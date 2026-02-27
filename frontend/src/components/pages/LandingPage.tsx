'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Map, Zap, MessageCircle, Bot, ExternalLink, Globe,
  Link2, BookOpen, Star, Heart, Gift, Coffee,
  Car, Wrench, Shield, Bell, Mail, Phone,
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import HeroSection from '@/components/landing/HeroSection';
import PricingSection from '@/components/landing/PricingSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import SupportSection from '@/components/landing/SupportSection';
import { Separator } from '@/components/ui/separator';

const ICON_MAP: Record<string, LucideIcon> = {
  Map, Zap, MessageCircle, Bot, ExternalLink, Globe,
  Link2, BookOpen, Star, Heart, Gift, Coffee,
  Car, Wrench, Shield, Bell, Mail, Phone,
};

type UsefulLink = {
  id: string;
  label: string;
  url: string;
  icon: string | null;
  is_external: boolean;
  sort_order: number;
};

function BannerLink({ link }: { link: UsefulLink }) {
  const IconComponent = link.icon ? ICON_MAP[link.icon] : null;
  const content = (
    <>
      {IconComponent && <IconComponent className="h-3.5 w-3.5" />}
      {link.label}
    </>
  );

  if (link.is_external) {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 hover:text-indigo-200 transition-colors"
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={link.url}
      className="flex items-center gap-1.5 hover:text-indigo-200 transition-colors"
    >
      {content}
    </Link>
  );
}

export default function LandingPage() {
  const [links, setLinks] = useState<UsefulLink[]>([]);
  const [othersOpen, setOthersOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    fetch(`${apiUrl}/public/useful-links`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setLinks(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOthersOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const primaryLinks = links.slice(0, 4);
  const otherLinks = links.slice(4);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Community tools banner */}
      {links.length > 0 && (
        <div className="bg-indigo-900 text-white text-sm">
          <div className="max-w-5xl mx-auto px-6 py-2 flex items-center justify-center gap-6 flex-wrap">
            <span className="text-indigo-300 hidden sm:inline">Community Tools:</span>
            {primaryLinks.map((link, i) => (
              <span key={link.id} className="contents">
                {i > 0 && <span className="text-indigo-600">|</span>}
                <BannerLink link={link} />
              </span>
            ))}
            {otherLinks.length > 0 && (
              <>
                <span className="text-indigo-600">|</span>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setOthersOpen(prev => !prev)}
                    className="flex items-center gap-1 hover:text-indigo-200 transition-colors"
                  >
                    Others
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${othersOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {othersOpen && (
                    <div className="absolute top-full mt-1 right-0 bg-indigo-800 border border-indigo-700 rounded-md shadow-lg py-1 min-w-[200px] z-50">
                      {otherLinks.map((link) => (
                        <div key={link.id} className="px-3 py-1.5 hover:bg-indigo-700 transition-colors">
                          <BannerLink link={link} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <HeroSection />
      <PricingSection />
      <FeaturesSection />
      <SupportSection />
      <Separator />
    </main>
  );
}
