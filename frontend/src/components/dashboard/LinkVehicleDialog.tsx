'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import VendorSelect from '@/components/VendorSelect';
import { authFetch } from '@/lib/authFetch';
import { useAuth } from '@/hooks/useAuth';

interface LinkVehicleDialogProps {
  accessToken: string;
  hasEnodeAccount: boolean;
}

export default function LinkVehicleDialog({ accessToken, hasEnodeAccount }: LinkVehicleDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState('');
  const { isApproved } = useAuth();
  const [capacityFull, setCapacityFull] = useState(false);

  useEffect(() => {
    if (hasEnodeAccount) return;

    const checkCapacity = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const res = await fetch(`${apiUrl}/public/vehicle-capacity`);
        if (res.ok) {
          const data = await res.json();
          setCapacityFull(data.is_full === true);
        }
      } catch {
        // Ignore errors, default to allowing
      }
    };

    checkCapacity();
  }, [hasEnodeAccount]);

  const isDisabled = !isApproved || (!hasEnodeAccount && capacityFull);

  const handleLinkVehicle = async () => {
    if (!selectedVendor || !accessToken) {
      toast.error('Missing vendor selection or session.');
      return;
    }

    try {
      window.umami?.track('Link Vehicle');
      const { data, error } = await authFetch('/user/link-vehicle', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({ vendor: selectedVendor }),
      });

      if (error || !data?.url || !data?.linkToken) {
        toast.error('Failed to initiate vehicle linking.');
        return;
      }

      localStorage.setItem('linkToken', data.linkToken);
      window.location.href = data.url;
    } catch (error) {
      console.error('Link vehicle error:', error);
      toast.error('Unexpected error during vehicle linking.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="relative">
        <DialogTrigger asChild>
          <Button variant="default" disabled={isDisabled}>Link Vehicle</Button>
        </DialogTrigger>
        {isDisabled && !isApproved ? null : isDisabled && (
          <p className="text-xs text-amber-600 mt-1">
            Vehicle capacity is full. Join the Discord for updates.
          </p>
        )}
      </div>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link a new vehicle</DialogTitle>
          <DialogDescription>
            Choose a vendor to start linking your vehicle.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <VendorSelect
            selectedVendor={selectedVendor}
            onChange={(value) => setSelectedVendor(value)}
          />
          <Button
            variant="default"
            onClick={handleLinkVehicle}
            disabled={!selectedVendor}
          >
            Link Now
          </Button>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
