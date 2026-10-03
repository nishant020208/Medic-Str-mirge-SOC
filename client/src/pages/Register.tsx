import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { GreekDivider } from '../ui/GreekDivider';
import { useAuthStore } from '../store/authStore';
import { toast } from '../ui/Toast';

const registerSchema = z
  .object({
    email: z.string().email('Please enter a valid sanctum scroll email'),
    password: z.string().min(6, 'Passphrase must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passphrases do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsSubmitting(true);
      setFormError(null);

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          role: 'customer',
        }),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || 'Sanctum registration rejected');
      }

      setUser(resData.user);
      toast.success('Your identity is consecrated in the temple ledger.', 'Devotee Registered');
      navigate('/shop');
    } catch (err: any) {
      setFormError(err.message);
      toast.error(err.message, 'Registration Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 w-full flex-grow flex flex-col justify-center">
      <Card variant="marble" className="p-8 border-2 border-border shadow-theme">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-surface-2 border border-border text-accent-text flex items-center justify-center mx-auto mb-3 shadow-sm">
            <UserPlus className="w-7 h-7" />
          </div>
          <span className="font-cinzel text-xs uppercase tracking-widest text-accent-text font-bold block mb-1">
            Initiate Devotion
          </span>
          <h1 className="font-cinzel text-2xl font-bold text-text">
            Sanctuary Inscription
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
            label="Create Secret Passphrase"
            type="password"
            {...register('password')}
            error={errors.password?.message}
            placeholder="••••••••"
          />

          <Input
            label="Confirm Passphrase"
            type="password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
            placeholder="••••••••"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isSubmitting}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Consecrate Identity
          </Button>
        </form>

        <GreekDivider className="my-6" />

        <div className="text-center text-xs text-text-muted">
          <span>Already consecrated? </span>
          <Link to="/login" className="font-cinzel text-accent-text font-bold hover:underline">
            Enter Sanctuary
          </Link>
        </div>
      </Card>
    </div>
  );
};
