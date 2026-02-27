'use client';

import UserInfoCardSkeleton from '@/components/profile/UserInfoCardSkeleton';
import ApiKeySectionSkeleton from '@/components/profile/ApiKeySectionSkeleton';
import HaWebhookSettingsCardSkeleton from '@/components/profile/HaWebhookSettingsCardSkeleton';
import BillingCardSkeleton from '@/components/profile/BillingCardSkeleton';

import UserInfoCard from '@/components/profile/UserInfoCard';
import { useUserContext } from '@/contexts/UserContext';
import { useBillingInfo } from '@/hooks/useBillingInfo';
import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { toast } from 'sonner';
import ApiKeySection from '@/components/profile/ApiKeySection';
import HaWebhookSettingsCard from '@/components/profile/HaWebhookSettingsCard';
import AbrpSettingsCard from '@/components/profile/AbrpSettingsCard';
import AbrpPullSettingsCard from '@/components/profile/AbrpPullSettingsCard';
import BillingCard from '@/components/profile/BillingCard';
import SubscribeCard from '@/components/profile/SubscribeCard';
import TrialCard from '@/components/profile/TrialCard';
import InvoicesList from '@/components/profile/InvoicesList';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, mergedUser, loading, accessToken } = useUserContext();
  const { subscription, invoices, loadingBilling } = useBillingInfo(user?.id, accessToken);

  const [notifyOffline, setNotifyOffline] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);

  const [nameSaveLoading, setNameSaveLoading] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [countrySaveLoading, setCountrySaveLoading] = useState(false);
  const [countryCode, setCountryCode] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (mergedUser?.notify_offline !== undefined) {
      setNotifyOffline(mergedUser.notify_offline);
    }
    if (mergedUser?.name) {
      setDisplayName(mergedUser.name);
    }
    if (mergedUser?.country_code) {
      setCountryCode(mergedUser.country_code);
    }
  }, [mergedUser]);

  // Scroll to hash target after page loads (e.g. #abrp-pull)
  useEffect(() => {
    if (!loading && typeof window !== 'undefined' && window.location.hash) {
      const id = window.location.hash.slice(1);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }, [loading]);


  if (loading || !user || !accessToken) {
    return (
      <div className="container py-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <UserInfoCardSkeleton />
            <ApiKeySectionSkeleton />
            <HaWebhookSettingsCardSkeleton />
          </div>
          <div className="flex flex-col gap-4">
            <BillingCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  const handleToggleNotify = async (checked: boolean) => {
    setNotifyLoading(true);
    // Skicka PATCH till backend
    const { error } = await authFetch(`/user/${user.id}/notify`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ notify_offline: checked }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (error) {
      toast.error('Failed to update notification setting'); /* Hardcoded string */
    } else {
      setNotifyOffline(checked);
      toast.success(
        checked
          ? 'You will now receive email when a vehicle goes offline.' /* Hardcoded string */
          : 'Notifications disabled.' /* Hardcoded string */
      );
    }
    setNotifyLoading(false);
  };

  const handleNameSave = async (newName: string): Promise<boolean> => {
    if (!accessToken) {
      toast.error('Not authenticated');
      return false;
    }

    setNameSaveLoading(true);
    const { error } = await authFetch('/me/name', {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ name: newName }),
      headers: { 'Content-Type': 'application/json' },
    });

    setNameSaveLoading(false);

    if (error) {
      toast.error('Failed to update name');
      return false;
    }

    setDisplayName(newName);
    toast.success('Name updated successfully');
    return true;
  };

  const handleCountrySave = async (code: string): Promise<boolean> => {
    if (!accessToken) {
      toast.error('Not authenticated');
      return false;
    }

    setCountrySaveLoading(true);
    const { error } = await authFetch('/me/country', {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ country_code: code }),
      headers: { 'Content-Type': 'application/json' },
    });

    setCountrySaveLoading(false);

    if (error) {
      toast.error('Failed to update country');
      return false;
    }

    setCountryCode(code);
    toast.success('Country updated');
    return true;
  };


  return (
    <div className="container py-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <UserInfoCard
            userId={user.id}
            name={displayName ?? mergedUser?.name ?? ''}
            email={user.email ?? ''}
            tier={mergedUser?.tier?.toUpperCase() ?? 'FREE'} /* Hardcoded string */
            isOnTrial={mergedUser?.is_on_trial}
            trialEndsAt={mergedUser?.trial_ends_at}
            smsCredits={mergedUser?.sms_credits ?? 0}
            purchasedApiTokens={mergedUser?.purchased_api_tokens ?? 0}
            notifyOffline={notifyOffline}
            notifyLoading={notifyLoading}
            avatarUrl={user.user_metadata?.avatar_url ?? null}
            onNameSave={handleNameSave}
            nameSaveLoading={nameSaveLoading}
            onCountrySave={handleCountrySave}
            countrySaveLoading={countrySaveLoading}
            countryCode={countryCode}
            onToggleNotify={handleToggleNotify}
          />
          <ApiKeySection userId={user.id} accessToken={accessToken} />
          <HaWebhookSettingsCard userId={user.id} accessToken={accessToken} />
          <AbrpSettingsCard userId={user.id} accessToken={accessToken} />
          <AbrpPullSettingsCard userId={user.id} accessToken={accessToken} />
        </div>
        <div className="flex flex-col gap-4">
          {loadingBilling ? (
            <BillingCardSkeleton />
          ) : mergedUser?.is_on_trial ? (
            <TrialCard trialEndsAt={mergedUser.trial_ends_at} />
          ) : subscription ? (
            <BillingCard
              subscriptionPlan={subscription.plan_name ?? 'Free'} /* Hardcoded string */
              price={
                subscription.amount && subscription.currency
                  ? `${(subscription.amount / 100).toFixed(2)} ${subscription.currency.toUpperCase()}`
                  : '—' /* Hardcoded string */
              }
              nextBillingDate={subscription.current_period_end ?? undefined}
              current_period_start={subscription.current_period_start ?? undefined}
              current_period_end={subscription.current_period_end ?? undefined}
              invoices={invoices}
              onManageClick={() => router.push('/billing')} /* Hardcoded string */
            />
          ) : (
            <SubscribeCard />
          )}
        </div>
        {!loadingBilling && invoices.length > 0 && (
          <div className="flex flex-col gap-4">
            <InvoicesList invoices={invoices} />
          </div>
        )}
      </div>
    </div>
  );
}
