'use client';

import React, { useState } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';

type UserTier = "free" | "basic" | "pro";

type Plan = {
  id: string;
  name: string;
  priceEUR: number; // Base price in EUR
  description: string;
  selectable: boolean;
  interval?: string; // For subscription plans
};

// Base prices in EUR - Free and Basic are shaded out, Pro is default with free 12 month access
const subscriptionPlansBase: Plan[] = [
  {
    id: 'free',
    name: 'Free Plan',
    priceEUR: 0,
    description: 'Not available',
    selectable: false,
  },
  {
    id: 'basic_monthly',
    name: 'Basic Plan',
    priceEUR: 0,
    description: 'Not available',
    selectable: false,
  },
  {
    id: 'pro_monthly',
    name: 'Pro Plan',
    priceEUR: 0,
    description: 'Rolling 12 Month Free Access - 2 connected devices, 10000 API Calls Per Month, TBA Log retention, As Soon As I Can Support.',
    selectable: false, // No payment needed - auto-granted
  },
];

const smsAddOnsBase: Plan[] = [
  {
    id: 'sms_50',
    name: '50 SMS Pack', /* Hardcoded string */
    priceEUR: 10,
    description: '50 SMS notifications for offline vehicle alerts.', /* Hardcoded string */
    selectable: true,
  },
  {
    id: 'sms_100',
    name: '100 SMS Pack', /* Hardcoded string */
    priceEUR: 18,
    description: '100 SMS notifications for offline vehicle alerts.', /* Hardcoded string */
    selectable: true,
  },
];

const apiTokenAddOnsBase: Plan[] = [
  {
    id: 'token_2500',
    name: '2,500 API Tokens', /* Hardcoded string */
    priceEUR: 4.99,
    description: '2,500 API calls, used after monthly allowance is exhausted.', /* Hardcoded string */
    selectable: true,
  },
  {
    id: 'token_10000',
    name: '10,000 API Tokens', /* Hardcoded string */
    priceEUR: 14.99,
    description: '10,000 API calls, used after monthly allowance is exhausted.', /* Hardcoded string */
    selectable: true,
  },
  {
    id: 'token_50000',
    name: '50,000 API Tokens', /* Hardcoded string */
    priceEUR: 49.99,
    description: '50,000 API calls, used after monthly allowance is exhausted.', /* Hardcoded string */
    selectable: true,
  },
];

import { authFetch } from '@/lib/authFetch';

export default function BillingPage() {
  const { mergedUser, loading: authLoading, accessToken } = useAuth({
    requireAuth: true,
    redirectTo: '/login',
  });
  const stripe = useStripe();
  const currency = useCurrency();
  const tier: UserTier = (mergedUser?.tier as UserTier) || "free";

  // Bestäm default markerad plan utifrån användarens nuvarande nivå
  // Hardcoded string: "Bestäm default markerad plan utifrån användarens nuvarande nivå"
  const defaultPlan = subscriptionPlansBase.find((plan) => {
    if (plan.id === 'basic_monthly' && tier === 'basic') return true;
    if (plan.id === 'pro_monthly' && tier === 'pro') return true;
    if (plan.id === 'free' && tier === 'free') return true;
    return false;
  }) || subscriptionPlansBase[0];

  const [selected, setSelected] = useState<string>(defaultPlan.id);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (authLoading || !mergedUser || currency.isLoading) {
    return (
      // Hardcoded string: "Loading..."
      <div className="p-4 text-center text-lg text-gray-600">Loading...</div>
    );
  }

  // Format price helper function
  const formatPrice = (plan: Plan): string => {
    // Special handling for subscription plans
    if (plan.id === 'pro_monthly') {
      return 'Rolling 12 Month Free Access';
    }
    if (plan.id === 'free' || plan.id === 'basic_monthly') {
      return 'Not Available';
    }
    if (plan.priceEUR === 0) {
      return `${currency.symbol}0`;
    }
    const formattedPrice = currency.convertAndFormat(plan.priceEUR);
    return plan.interval ? `${formattedPrice} / ${plan.interval}` : formattedPrice;
  };

  // Check if plan is shaded out
  const isShadedPlan = (planId: string): boolean => {
    return planId === 'free' || planId === 'basic_monthly';
  };

  // Hjälpfunktioner
  // Hardcoded string: "Hjälpfunktioner"
  const isCurrentPlan = (planId: string) => {
    if (planId === 'free' && tier === 'free') return true;
    if (planId === 'basic_monthly' && tier === 'basic') return true;
    if (planId === 'pro_monthly' && tier === 'pro') return true;
    return false;
  };

  // Om användaren redan har abonnemang: "change_plan", annars "subscribe"
  // Hardcoded string: "Om användaren redan har abonnemang: "change_plan", annars "subscribe""
  const currentIsPaid = tier === 'pro' || tier === 'basic';
  const selectedIsPaid = selected === 'pro_monthly' || selected === 'basic_monthly';

  // Submit-funktion
  // Hardcoded string: "Submit-funktion"
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!accessToken) {
      setError("Not logged in"); /* Hardcoded string */
      return;
    }
    if (!stripe) {
      setError('Stripe has not loaded yet.'); /* Hardcoded string */
      return;
    }
    setLoading(true);

    const action =
      selected.startsWith('sms_') || selected.startsWith('token_') ? 'purchase_add_on'
      : (currentIsPaid && selectedIsPaid && !isCurrentPlan(selected)) ? 'change_plan'
      : (!currentIsPaid && selectedIsPaid) ? 'subscribe'
      : null;

    if (!action) {
      setError("Nothing to do"); /* Hardcoded string */
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await authFetch('/payments/checkout', {
      method: 'POST',
      accessToken,
      body: JSON.stringify({
        action,
        planId: selected,
      }),
    });

    if (fetchError) {
      setError(fetchError.message || 'Failed to initiate checkout'); /* Hardcoded string */
      setLoading(false);
      return;
    }

    // SMS-köp/planbyte/nyteckning: olika flöden
    // Hardcoded string: "SMS-köp/planbyte/nyteckning: olika flöden"
    if (action === "subscribe" || action === "purchase_add_on") {
      if (!data?.clientSecret) {
        setError("Failed to start Stripe Checkout"); /* Hardcoded string */
        setLoading(false);
        return;
      }
      const sessionId = data.clientSecret;
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
      if (stripeError) {
        setError(stripeError.message || 'Failed to redirect to checkout'); /* Hardcoded string */
      }
    } else if (action === "change_plan") {
      toast.success("Subscription updated! You may need to reload the page to see new features."); /* Hardcoded string */
      window.location.reload();
    }

    setLoading(false);
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg"
    >
      {/* Hardcoded string */}
      <h1 className="text-2xl font-bold mb-4">Choose Your Plan</h1>

      {/* Subscription plans */}
      <h2 className="text-xl font-bold mb-2">Subscription Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {subscriptionPlansBase.map((plan) => {
          const isShaded = isShadedPlan(plan.id);
          const isPro = plan.id === 'pro_monthly';
          return (
            <div
              key={plan.id}
              className={`p-4 border rounded-lg text-left relative transition
                ${isPro ? 'border-green-600 bg-green-50 ring-2 ring-green-500' : 'border-gray-200'}
                ${isShaded ? 'opacity-40 grayscale bg-gray-100' : ''}`}
              style={{ minHeight: 170 }}
            >
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className={`font-medium ${isPro ? 'text-green-600' : 'text-gray-400'}`}>{formatPrice(plan)}</p>
              <p className="text-sm text-gray-500">{plan.description}</p>
              {isPro && (
                <span className="absolute top-3 right-3 bg-green-200 text-green-800 px-2 py-1 text-xs rounded font-bold">
                  Your Plan
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Buy Me a Coffee link */}
      <div className="my-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
        <p className="text-gray-700 mb-3">Enjoying EVConduit? Support the project!</p>
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

      {/* API Token add-ons */}
      <h2 className="text-lg font-bold mb-2 mt-8">Add-on: API Tokens</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {apiTokenAddOnsBase.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setSelected(plan.id)}
            className={`p-4 border rounded-lg text-left transition
              ${selected === plan.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
          >
            <h2 className="text-lg font-semibold">{plan.name}</h2>
            <p className="text-gray-700">{formatPrice(plan)}</p>
            <p className="text-sm text-gray-500">{plan.description}</p>
          </button>
        ))}
      </div>

      {/* SMS add-ons */}
      {/* Hardcoded string */}
      <h2 className="text-lg font-bold mb-2 mt-8">Add-on: SMS Notifications</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {smsAddOnsBase.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setSelected(plan.id)}
            className={`p-4 border rounded-lg text-left transition
              ${selected === plan.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
          >
            <h2 className="text-lg font-semibold">{plan.name}</h2>
            <p className="text-gray-700">{formatPrice(plan)}</p>
            <p className="text-sm text-gray-500">{plan.description}</p>
          </button>
        ))}
      </div>

      {/* Buy Add-on form - only show when an add-on is selected */}
      {(selected.startsWith('sms_') || selected.startsWith('token_')) && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-600">{error}</div>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Processing...' : 'Buy Add-on'}
          </Button>
        </form>
      )}
    </motion.main>
  );
}
