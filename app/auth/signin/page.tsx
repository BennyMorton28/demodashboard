"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import ReCAPTCHA from 'react-google-recaptcha';
import { toast } from 'react-hot-toast';

export default function SignIn() {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [recaptchaKey, setRecaptchaKey] = useState<string | null>(null);

  useEffect(() => {
    // Set recaptcha key from environment variable
    setRecaptchaKey(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || null);
    
    if (session) {
      console.log("Session already exists, redirecting to dashboard");
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
      } else {
        toast.success("Verification successful");
        router.push('/');
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
            Please verify that you're human to access the AI Demo Dashboard
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
                {recaptchaKey ? (
                  <ReCAPTCHA
                    sitekey={recaptchaKey}
                    onChange={handleVerification}
                    onErrored={() => {
                      setError('Error loading verification. Please refresh the page.');
                    }}
                    onExpired={() => {
                      setError('Verification expired. Please try again.');
                    }}
                  />
                ) : (
                  <div className="p-4 bg-red-50 text-red-600 rounded-md">
                    Error: reCAPTCHA configuration missing. Please check your environment variables.
                  </div>
                )}
              </div>
              <p className="text-center text-xs text-gray-500">
                This helps us prevent automated access to the application
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