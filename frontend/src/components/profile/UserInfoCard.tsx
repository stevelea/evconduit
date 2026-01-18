// src/components/profile/UserInfoCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import TooltipInfo from "../TooltipInfo";
import ProfileSettingToggle from './ProfileSettingToggle';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';

import ApiUsageDisplay from "./ApiUsageDisplay"; // IMPORT a new component

type Props = {
  userId: string;
  email: string;
  name: string;
  tier: string;
  isOnTrial?: boolean;
  trialEndsAt?: string | null;
  smsCredits: number;
  purchasedApiTokens: number;
  notifyOffline: boolean;
  notifyLoading: boolean;
  isSubscribed: boolean;
  subscribeLoading: boolean;
  onNameSave?: (name: string) => Promise<boolean>;
  onToggleNotify?: (checked: boolean) => void;
  onToggleSubscribe?: (checked: boolean) => void;
  avatarUrl?: string | null;
  nameSaveLoading?: boolean;
};

export default function UserInfoCard({
  userId,
  email,
  name,
  tier,
  isOnTrial,
  trialEndsAt,
  smsCredits,
  purchasedApiTokens,
  notifyOffline,
  notifyLoading,
  isSubscribed,
  subscribeLoading,
  onNameSave,
  onToggleNotify,
  onToggleSubscribe,
  avatarUrl,
  nameSaveLoading,
}: Props) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [nameError, setNameError] = useState<string | null>(null);

  // If name is empty or "unknown", prompt user to set it
  const nameIsMissing = !name || name === 'unknown';

  useEffect(() => {
    setEditedName(name);
  }, [name]);

  const handleStartEdit = () => {
    setEditedName(name === 'unknown' ? '' : name);
    setNameError(null);
    setIsEditingName(true);
  };

  const handleCancelEdit = () => {
    setEditedName(name);
    setNameError(null);
    setIsEditingName(false);
  };

  const handleSaveName = async () => {
    const trimmedName = editedName.trim();
    if (!trimmedName) {
      setNameError('Name is required');
      return;
    }
    if (onNameSave) {
      const success = await onNameSave(trimmedName);
      if (success) {
        setIsEditingName(false);
        setNameError(null);
      }
    }
  };
  return (
    <Card className="mb-6">
      <CardContent className="pb-6 px-6 pt-1">
        {/* Avatar positioned at top-left with minimal spacing */}
        <div className="flex justify-start mb-2">
          <Avatar className="h-12 w-12">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={name || "User avatar"} />
            ) : (
              <AvatarFallback>
                {name?.[0]?.toUpperCase() ?? "U"}
              </AvatarFallback>
            )}
          </Avatar>
        </div>

        {/* Main info + settings - now left-aligned */}
        <div className="space-y-3">
          {/* Editable Name Field */}
          {isEditingName ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => {
                    setEditedName(e.target.value);
                    if (e.target.value.trim()) {
                      setNameError(null);
                    }
                  }}
                  placeholder="Enter your name"
                  className={`max-w-[200px] h-8 ${nameError ? 'border-red-500' : ''}`}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  disabled={nameSaveLoading}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveName}
                  disabled={nameSaveLoading}
                  className="h-8 w-8 p-0"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                {!nameIsMissing && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    disabled={nameSaveLoading}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </Button>
                )}
              </div>
              {nameError && (
                <p className="text-xs text-red-500">{nameError}</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {nameIsMissing ? (
                <button
                  onClick={handleStartEdit}
                  className="font-semibold text-lg text-amber-600 hover:text-amber-700 underline decoration-dashed cursor-pointer"
                >
                  Set your name
                </button>
              ) : (
                <>
                  <span className="font-semibold text-lg">{name}</span>
                  <button
                    onClick={handleStartEdit}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Edit name"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )}
          <div className="text-xs text-gray-500 -mt-2">ID: {userId}</div>
          <div className="text-muted-foreground text-sm">
            <a href={`mailto:${email}`} className="hover:underline">
              {email}
            </a>
          </div>
          <div className="text-muted-foreground text-xs flex items-center">
            {tier && tier[0].toUpperCase() + tier.slice(1)} User
            {isOnTrial && trialEndsAt && (
              <span className="ml-2 font-semibold">(Trial until {format(new Date(trialEndsAt), 'yyyy-MM-dd')})</span>
            )}
            <TooltipInfo
              content={
                <>
                  <strong>User Tier</strong>
                  <br />
                  Your current subscription tier, determining available features and API limits.
                </>
              }
              className="ml-1"
            />
          </div>
          <div className="text-muted-foreground text-xs flex items-center">
            SMS credits:&nbsp;<span className="font-medium">{smsCredits}</span>
            <TooltipInfo
              content={
                <>
                  <strong>SMS Credits</strong>
                  <br />
                  Remaining SMS credits for notifications.
                </>
              }
              className="ml-1"
            />
          </div>

          

          {/* Real-time API Usage Display */}
          <ApiUsageDisplay
            initialPurchasedApiTokens={purchasedApiTokens}
            userId={userId}
          />

          <div className="flex flex-col gap-2 pt-2">
            <ProfileSettingToggle
              id="notify-offline"
              label="Email when vehicle goes offline"
              tooltipContent={
                <>
                  <strong>Offline notification</strong>
                  <br />
                  Only available for paying users.
                  <br />
                  Enable this to get an email if your vehicle goes offline.
                </>
              }
              checked={notifyOffline}
              disabled={tier?.toLowerCase() === 'free'}
              loading={notifyLoading}
              onToggle={onToggleNotify}
            />
            <ProfileSettingToggle
              id="newsletter"
              label="Subscribed to newsletter"
              tooltipContent={
                <>
                  <strong>Newsletter subscription</strong>
                  <br />
                  Get occasional news and feature updates by email.
                  <br />
                  Unsubscribe at any time.
                  <br />
                  <span className="text-xs text-muted-foreground">
                    No spam. You control your preferences.
                  </span>
                </>
              }
              checked={isSubscribed}
              disabled={false}
              loading={subscribeLoading}
              onToggle={onToggleSubscribe}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
