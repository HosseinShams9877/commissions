'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, LogIn, User, Lock } from 'lucide-react';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Translate common next-auth errors to Persian
        switch (result.error) {
          case 'CredentialsSignin':
            setError('نام کاربری یا رمز عبور اشتباه است');
            break;
          default:
            // The error from our authorize function is passed through
            setError(result.error || 'خطا در ورود به سیستم');
        }
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('خطا در ارتباط با سرور');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-0 shadow-2xl shadow-emerald-900/10 bg-white/90 backdrop-blur-xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <LogIn className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-emerald-900">
          ورود به سیستم
        </CardTitle>
        <CardDescription className="text-emerald-600/70">
          برای دسترسی به محاسبه‌گر پورسانت وارد شوید
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-1 duration-300">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username" className="text-emerald-800 font-semibold text-sm">
              نام کاربری
            </Label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="نام کاربری خود را وارد کنید"
                className="pr-10 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/20 bg-emerald-50/30 placeholder:text-emerald-300"
                disabled={isLoading}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-emerald-800 font-semibold text-sm">
              رمز عبور
            </Label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="رمز عبور خود را وارد کنید"
                className="pr-10 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/20 bg-emerald-50/30 placeholder:text-emerald-300"
                disabled={isLoading}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-l from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98]"
            disabled={isLoading || !username || !password}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin ml-2" />
                در حال ورود...
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5 ml-2" />
                ورود
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
