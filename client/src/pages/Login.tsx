import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogIn, Wallet, KeyRound } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { GreekDivider } from '../ui/GreekDivider';
import { useAuthStore } from '../store/authStore';
import { toast } from '../ui/Toast';
import { signInWithWallet } from '../web3/wallet';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid sanctum scroll email'),
  password: z.string().min(6, 'Secret passphrase must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsSubmitting(true);
      setFormError(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(data),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || 'Sanctum entry denied. Verify credentials.');
      }

      setUser(resData.user);
      toast.success(`Welcome back, ${resData.user.email}`, 'Sanctum Veil Opened');

      if (resData.user.role === 'pharmacist') {
        navigate('/dashboard');
      } else {
        navigate('/shop');
      }
    } catch (err: any) {
      setFormError(err.message);
      toast.error(err.message, 'Entry Denied');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWalletLogin = async () => {
    try {
      setIsWalletConnecting(true);
      setFormError(null);
      const user = await signInWithWallet();
      setUser(user);
      toast.success(`Wallet connected: ${user.email}`, 'Oracle Seal Verified');
      navigate('/shop');
    } catch (err: any) {
      setFormError(err.message || 'Wallet signing failed');
      toast.error(err.message || 'Wallet signing ceremony failed', 'Wallet Auth Error');
    } finally {
      setIsWalletConnecting(false);
    }
  };

  const fillCredentials = (role: 'pharmacist' | 'customer') => {
    if (role === 'pharmacist') {
      setValue('email', 'pharmacist@medistore.test');
      setValue('password', 'Demo@12345');
    } else {
      setValue('email', 'customer@medistore.test');
      setValue('password', 'Demo@12345');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 w-full flex-grow flex flex-col justify-center">
      <Card variant="marble" className="p-8 border-2 border-border shadow-theme">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-surface-2 border border-border text-accent-text flex items-center justify-center mx-auto mb-3 shadow-sm">
            <KeyRound className="w-7 h-7" />
          </div>
          <span className="font-cinzel text-xs uppercase tracking-widest text-accent-text font-bold block mb-1">
            Inner Sanctum Auth
          </span>
          <h1 className="font-cinzel text-2xl font-bold text-text">
            Enter The Asclepeion
          </h1>
        </div>

        {formError && (
          <div className="mb-5 p-3 rounded-card bg-surface-2 border border-danger text-xs text-danger font-medium text-center">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Sanctum Scroll Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="devotee@epidaurus.org"
          />

          <Input
            label="Secret Passphrase"
            type="password"
            {...register('password')}
            error={errors.password?.message}
            placeholder="••••••••"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isSubmitting}
            leftIcon={<LogIn className="w-4 h-4" />}
          >
            Enter Sanctuary
          </Button>
        </form>

        <GreekDivider className="my-6" />

        {/* Web3 Sign-In */}
        <div>
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full"
            onClick={handleWalletLogin}
            isLoading={isWalletConnecting}
            leftIcon={<Wallet className="w-4 h-4 text-accent-text" />}
          >
            Enter with Web3 Wallet
          </Button>
          <span className="text-[10px] text-center text-text-muted block mt-1.5 font-mono">
            EIP-4361 / Nonce Sign-In (Mock / Sepolia)
          </span>
        </div>

        {/* Demo Fast-Fill helper */}
        <div className="mt-6 pt-4 border-t border-border text-center">
          <span className="text-[11px] font-cinzel text-text-muted uppercase tracking-wider block mb-2 font-bold">
            Hackathon Fast Demo Fill
          </span>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => fillCredentials('pharmacist')}
              className="px-2.5 py-1 text-xs font-mono bg-surface-2 rounded-card border border-border hover:border-accent text-text"
            >
              Pharmacist
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('customer')}
              className="px-2.5 py-1 text-xs font-mono bg-surface-2 rounded-card border border-border hover:border-accent text-text"
            >
              Customer
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-text-muted">
          <span>Unregistered devotee? </span>
          <Link to="/register" className="font-cinzel text-accent-text font-bold hover:underline">
            Consecrate Account
          </Link>
        </div>
      </Card>
    </div>
  );
};
