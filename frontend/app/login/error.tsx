'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  const handleTryAgain = () => {
    reset(); // Reset the error boundary
    router.refresh(); // Refresh the current route
  };

  // If this is a signup success message, show the success UI
  if (error.message === 'CHECK_EMAIL') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 p-4">
        <Card className="w-full max-w-md bg-zinc-800/80 backdrop-blur-sm border-zinc-700">
          <CardHeader>
            <CardTitle className="text-2xl text-white">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-zinc-400">
              We&apos;ve sent you a confirmation email. Please check your inbox
              and follow the instructions to complete your registration.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              onClick={handleTryAgain}
              className="cursor-pointer w-full bg-white text-black"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 p-4">
      <Card className="w-full max-w-md bg-zinc-800/80 backdrop-blur-sm border-zinc-700">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Login Error</CardTitle>
          <CardDescription className="text-zinc-400">
            Invalid email or password. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            onClick={handleTryAgain}
            className="cursor-pointer w-full bg-white text-black"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
