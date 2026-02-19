'use client';

import { useEffect, useState } from 'react';
import RegisterForm from '@/components/register/RegisterForm';
import RegisterInterestForm from '@/components/register/RegisterInterestForm';
import RegisterSuccess from '@/components/register/RegisterSuccess';

export default function RegisterPage() {
  const [allowRegister, setAllowRegister] = useState<boolean | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [email, setEmail] = useState('');

  const [capacityFull, setCapacityFull] = useState(false);

  useEffect(() => {
    const checkRegistration = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backend.evconduit.com/api';
        const [regRes, capRes] = await Promise.all([
          fetch(`${apiUrl}/public/registration-allowed`),
          fetch(`${apiUrl}/public/vehicle-capacity`),
        ]);
        const regJson = await regRes.json();
        const capJson = capRes.ok ? await capRes.json() : {};

        if (capJson.is_full === true) {
          setCapacityFull(true);
          setAllowRegister(false);
        } else {
          setAllowRegister(regJson.allowed === true);
        }
      } catch (err) {
        console.error('❌ Failed to check registration status:', err); /* Hardcoded string */
        setAllowRegister(false);
      }
    };
    checkRegistration();
  }, []);

  if (allowRegister === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        {/* Hardcoded string */}
        <p className="text-gray-500 text-sm">Checking registration status...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-white px-4">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        {/* Hardcoded string */}
        <h1 className="text-2xl font-extrabold text-indigo-700 mb-4 text-center">
          {allowRegister ? 'Create Account' : capacityFull ? 'We\'re at Full Capacity' : 'Stay Updated'}
        </h1>

        {magicLinkSent ? (
          <RegisterSuccess email={email} />
        ) : allowRegister ? (
          <RegisterForm setMagicLinkSent={setMagicLinkSent} setEmail={setEmail} />
        ) : (
          <RegisterInterestForm />
        )}

        {/* Hardcoded string */}
        <p className="text-center text-xs text-gray-500 mt-4">
          {allowRegister ? (
            <>
              Already have an account?{' '}
              <a href="/login" className="text-indigo-600 hover:underline">
                Log In
              </a>
            </>
          ) : (
            <>{capacityFull
              ? 'All vehicle slots are currently taken. Check back soon or subscribe to be notified when spots open up.'
              : 'EVConduit is currently under development. You\u0027ll be the first to know when we launch.'
          }</>
          )}
        </p>
      </div>
    </main>
  );
}
