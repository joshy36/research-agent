import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login, signup } from './actions';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 p-4">
      <Card className="w-full max-w-md bg-zinc-800/80 backdrop-blur-sm border-zinc-700">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Welcome Back</CardTitle>
          <CardDescription className="text-zinc-400">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4">
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
              <div className="flex items-center">
                <Label htmlFor="password" className="text-zinc-200">
                  Password
                </Label>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-zinc-600"
              />
            </div>
            <Button
              formAction={login}
              className="cursor-pointer w-full bg-white text-black"
            >
              Log in
            </Button>
            <Button
              formAction={signup}
              variant="outline"
              className="cursor-pointer w-full border-zinc-700 text-zinc-200 hover:bg-zinc-700/50"
            >
              Sign up
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
