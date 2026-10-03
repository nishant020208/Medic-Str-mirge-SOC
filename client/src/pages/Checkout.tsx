import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck, CreditCard, Lock, ArrowLeft } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { GreekDivider } from '../ui/GreekDivider';
import { formatPrice } from '../lib/utils';
import { toast } from '../ui/Toast';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  street: z.string().min(3, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(4, 'Valid postal code is required'),
  cardNumber: z
    .string()
    .min(16, 'Card number must be 16 digits')
    .max(19, 'Card number too long')
    .regex(/^[0-9\s-]+$/, 'Card number must contain digits only'),
  cardExpiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, 'Format MM/YY required'),
  cardCvc: z.string().regex(/^[0-9]{3,4}$/, 'CVC must be 3 or 4 digits'),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, getSubtotal, getTax, getShipping, getTotal, clearCart } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: user?.email || '',
      fullName: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      cardNumber: '4242 4242 4242 4242',
      cardExpiry: '12/28',
      cardCvc: '123',
    },
  });

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h2 className="font-cinzel text-2xl font-bold mb-4">No Offerings in Basket</h2>
        <Link to="/shop">
          <Button variant="gold">Return to Apothecary</Button>
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: CheckoutFormData) => {
    try {
      setIsSubmitting(true);
      const payload = {
        customerEmail: data.email,
        customerName: data.fullName,
        shippingAddress: {
          fullName: data.fullName,
          street: data.street,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          country: 'Hellas / Greece (Demo)',
        },
        items: items.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          price: i.product.price,
          quantity: i.quantity,
          batchId: i.product.batchId,
        })),
        subtotal: getSubtotal(),
        tax: getTax(),
        shipping: getShipping(),
        total: getTotal(),
        paymentMethod: 'Credit Card (Demo)',
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to record order with temple scribes');
      }

      const orderData = await res.json();
      clearCart();
      toast.success('Your offering has been consecrated by the Asclepeion.', 'Tribute Received');
      navigate(`/order-confirmation/${orderData.order.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Sanctum error during consecration', 'Requisition Interrupted');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-grow">
      <Link
        to="/cart"
        className="inline-flex items-center gap-2 text-xs font-cinzel font-bold text-ink-700 dark:text-marble-300 hover:text-gold-500 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Modify Requisition Basket</span>
      </Link>

      <div className="text-center mb-8">
        <span className="font-cinzel text-xs uppercase tracking-widest text-gold-600 dark:text-gold-400 font-bold block mb-1">
          Final Rite
        </span>
        <h1 className="font-cinzel text-3xl font-bold text-ink-950 dark:text-marble-100">
          Sanctuary Checkout &amp; Consecration
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Courier / Shipping Details */}
            <Card variant="marble" className="p-6 space-y-4">
              <h3 className="font-cinzel text-base font-bold text-ink-950 dark:text-marble-100 flex items-center gap-2 border-b border-marble-200 dark:border-lapis-800 pb-2">
                <span>1. Courier Consignment Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Devotee Name"
                  {...register('fullName')}
                  error={errors.fullName?.message}
                  placeholder="Hippocrates of Kos"
                />
                <Input
                  label="Sanctum Scroll Email"
                  type="email"
                  {...register('email')}
                  error={errors.email?.message}
                  placeholder="devotee@epidaurus.org"
                />
              </div>

              <Input
                label="Street Address / Sanctum Path"
                {...register('street')}
                error={errors.street?.message}
                placeholder="42 Epidaurus Way, Sanctuary Square"
              />

              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="City"
                  {...register('city')}
                  error={errors.city?.message}
                  placeholder="Athens"
                />
                <Input
                  label="State/Region"
                  {...register('state')}
                  error={errors.state?.message}
                  placeholder="Attica"
                />
                <Input
                  label="Postal Code"
                  {...register('zipCode')}
                  error={errors.zipCode?.message}
                  placeholder="10431"
                />
              </div>
            </Card>

            {/* Payment Details */}
            <Card variant="marble" className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-marble-200 dark:border-lapis-800 pb-2">
                <h3 className="font-cinzel text-base font-bold text-ink-950 dark:text-marble-100 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gold-500" />
                  <span>2. Tribute Payment (Sandbox Demo)</span>
                </h3>
                <span className="text-[10px] font-cinzel text-gold-600 dark:text-gold-400 bg-gold-500/10 px-2 py-0.5 rounded border border-gold-500/20">
                  Zero Real Money
                </span>
              </div>

              <div className="p-3 rounded-sm bg-gold-500/10 border border-gold-500/30 text-xs text-ink-800 dark:text-marble-200 flex items-center gap-2">
                <Lock className="w-4 h-4 text-gold-500 shrink-0" />
                <span>
                  Demo Mode: Pre-filled with synthetic test credentials. No actual card will be billed.
                </span>
              </div>

              <Input
                label="Card Number"
                {...register('cardNumber')}
                error={errors.cardNumber?.message}
                placeholder="4242 4242 4242 4242"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Expiry (MM/YY)"
                  {...register('cardExpiry')}
                  error={errors.cardExpiry?.message}
                  placeholder="12/28"
                />
                <Input
                  label="CVC / Security Code"
                  {...register('cardCvc')}
                  error={errors.cardCvc?.message}
                  placeholder="123"
                />
              </div>
            </Card>

            <Button
              type="submit"
              variant="gold"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
              leftIcon={<ShieldCheck className="w-5 h-5" />}
            >
              Seal Requisition &amp; Consecrate ({formatPrice(getTotal())})
            </Button>
          </form>
        </div>

        {/* Order Summary Column */}
        <div className="lg:col-span-5">
          <Card variant="papyrus" className="p-6">
            <h3 className="font-cinzel text-base font-bold text-ink-950 dark:text-marble-100 mb-4 border-b border-marble-300 dark:border-lapis-700 pb-2">
              Consignment Items ({items.length})
            </h3>

            <div className="max-h-64 overflow-y-auto divide-y divide-marble-200 dark:divide-lapis-800 pr-1">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-ink-950 dark:text-marble-100 block">
                      {product.name}
                    </span>
                    <span className="text-ink-600 dark:text-marble-400 font-mono">
                      Qty: {quantity} × {formatPrice(product.price)}
                    </span>
                  </div>
                  <span className="font-bold font-cinzel text-ink-900 dark:text-marble-100">
                    {formatPrice(product.price * quantity)}
                  </span>
                </div>
              ))}
            </div>

            <GreekDivider className="my-3" symbol={false} />

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-ink-700 dark:text-marble-300">
                <span>Subtotal</span>
                <span className="font-mono">{formatPrice(getSubtotal())}</span>
              </div>
              <div className="flex justify-between text-ink-700 dark:text-marble-300">
                <span>Epidaurus Tithe (8%)</span>
                <span className="font-mono">{formatPrice(getTax())}</span>
              </div>
              <div className="flex justify-between text-ink-700 dark:text-marble-300">
                <span>Courier Transmit</span>
                <span className="font-mono">{formatPrice(getShipping())}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-marble-300 dark:border-lapis-700">
                <span className="font-cinzel">Total Tithe</span>
                <span className="font-cinzel text-gold-600 dark:text-gold-400 text-base">
                  {formatPrice(getTotal())}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
