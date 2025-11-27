import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Building2, Loader2 } from './Icons';

const DEFAULT_PASSWORD = 'rentalpro';
const PASSWORD_KEY = 'rentalpro_password';

export default function PasswordScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const storedPassword = localStorage.getItem(PASSWORD_KEY);
    const correctPassword = storedPassword || DEFAULT_PASSWORD;

    // Simulate network delay
    setTimeout(() => {
      if (password === correctPassword) {
        onLoginSuccess();
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-xl border-none">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">RentalPro</CardTitle>
          <p className="text-sm text-slate-500">Property Management System</p>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter the password"
                required
                aria-invalid={!!error}
                aria-describedby="password-error"
              />
            </div>
            {error && (
              <p id="password-error" className="text-sm text-red-600">{error}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Unlock
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}