import { login, signup } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface LoginAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginAlert({ open, onOpenChange }: LoginAlertProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsLoading(true);
    try {
      if (isSignUp) {
        await signup(formData);
      } else {
        await login(formData);
      }
      onOpenChange(false);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (err.message.includes('Email not confirmed')) {
          setError('Please check your email to confirm your account.');
        } else if (err.message.includes('User already registered')) {
          setError(
            'An account with this email already exists. Please log in instead.',
          );
        } else {
          setError('An error occurred. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-800/80 backdrop-blur-sm border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {isSignUp
              ? 'Create an account to get started'
              : 'Enter your credentials to access your account'}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" action={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-zinc-200">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
              className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-zinc-600"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password" className="text-zinc-200">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-zinc-600"
            />
          </div>
          {error && (
            <div className="p-3 bg-red-950/50 rounded-md text-sm text-red-400 border border-red-900">
              {error}
            </div>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="cursor-pointer w-full bg-white text-black hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Please wait...' : isSignUp ? 'Sign up' : 'Log in'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="cursor-pointer w-full border-zinc-700 text-zinc-200 hover:bg-zinc-700/50"
          >
            {isSignUp
              ? 'Already have an account? Log in'
              : "Don't have an account? Sign up"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
