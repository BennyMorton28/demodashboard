"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import ReCAPTCHA from 'react-google-recaptcha';

export default function SignIn() {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (session) {
      router.push('/');
    }
  }, [session, router]);

  const handleVerification = async (token: string | null) => {
    if (!token) {
      setError('Please complete the verification');
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);
      
      const result = await signIn('credentials', {
        captchaToken: token,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      }
    } catch (error) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Human Verification Required
          </h2>
          <p className="mt-3 text-sm text-gray-600">
            Please verify that you're human to access the BMSD Transportation Case Study
          </p>
        </div>

        <div className="flex flex-col items-center">
          {isVerifying ? (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
              <p className="mt-4 text-sm font-medium text-gray-900">Verifying your response...</p>
              <p className="mt-1 text-xs text-gray-500">This will only take a moment</p>
            </div>
          ) : (
            <div className="w-full">
              <div className="flex justify-center mb-6">
                <ReCAPTCHA
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                  onChange={handleVerification}
                  onErrored={() => {
                    setError('Error loading verification. Please refresh the page.');
                  }}
                  onExpired={() => {
                    setError('Verification expired. Please try again.');
                  }}
                />
              </div>
              <p className="text-center text-xs text-gray-500">
                This helps us prevent automated access to the case study
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 text-center text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
            {error}
          </div>
        )}
      </div>
    </div>
  );
} 