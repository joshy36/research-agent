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

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 p-4">
      <Card className="w-full max-w-md bg-zinc-800/80 backdrop-blur-sm border-zinc-700">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Login Error</CardTitle>
          <CardDescription className="text-zinc-400">
            {error.message}
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
