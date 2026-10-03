import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, ShoppingBag, Printer } from 'lucide-react';
import { Order } from '../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { GreekDivider } from '../ui/GreekDivider';
import { formatPrice } from '../lib/utils';

export const OrderConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/orders/${id}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order);
        }
      } catch (err) {
        console.error('Error fetching order receipt:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-pulse">
        <div className="h-12 w-12 bg-gold-500/20 rounded-full mx-auto mb-4" />
        <div className="h-8 w-64 bg-marble-300 dark:bg-lapis-800 mx-auto rounded mb-2" />
        <div className="h-4 w-48 bg-marble-300 dark:bg-lapis-800 mx-auto rounded" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h2 className="font-cinzel text-2xl font-bold mb-4">Consecration Receipt Not Found</h2>
        <Link to="/shop">
          <Button variant="gold">Return to Apothecary</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-grow">
      {/* Sanctum Receipt Card */}
      <Card variant="papyrus" className="p-8 border-2 border-gold-500/50 shadow-2xl relative">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-olive-500/20 border-2 border-olive-500 text-olive-600 dark:text-olive-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="font-cinzel text-xs uppercase tracking-widest text-gold-600 dark:text-gold-400 font-bold block mb-1">
            Epidaurus Sacred Archives
          </span>
          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-ink-950 dark:text-marble-100">
            Consecration Confirmed
          </h1>
          <p className="font-cormorant text-base text-ink-700 dark:text-marble-300 mt-1">
            Your sacred requisition has been registered in the Temple Ledger.
          </p>
        </div>

        <GreekDivider className="my-4" />

        {/* Order Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-sm bg-marble-100/60 dark:bg-lapis-950/60 text-xs mb-6 font-cinzel">
          <div>
            <span className="text-ink-600 dark:text-marble-400 block uppercase text-[10px]">Requisition ID</span>
            <span className="font-bold text-ink-950 dark:text-marble-100 font-mono">{order.id}</span>
          </div>
          <div>
            <span className="text-ink-600 dark:text-marble-400 block uppercase text-[10px]">Consigned To</span>
            <span className="font-bold text-ink-950 dark:text-marble-100 truncate block">{order.customerName}</span>
          </div>
          <div>
            <span className="text-ink-600 dark:text-marble-400 block uppercase text-[10px]">Sanctum Status</span>
            <Badge variant="olive" size="sm">
              {order.status}
            </Badge>
          </div>
          <div>
            <span className="text-ink-600 dark:text-marble-400 block uppercase text-[10px]">Tribute Method</span>
            <span className="font-bold text-gold-600 dark:text-gold-400">{order.paymentMethod}</span>
          </div>
        </div>

        {/* Items List */}
        <div className="mb-6">
          <h4 className="font-cinzel text-xs uppercase tracking-wider font-bold text-ink-900 dark:text-marble-100 mb-3 border-b border-marble-300 dark:border-lapis-800 pb-1">
            Formulations Dispensed
          </h4>
          <div className="divide-y divide-marble-200 dark:divide-lapis-800">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-ink-950 dark:text-marble-100 block">
                    {item.productName}
                  </span>
                  <span className="text-ink-600 dark:text-marble-400 font-mono text-[11px]">
                    Batch: {item.batchId} · Qty: {item.quantity}
                  </span>
                </div>
                <span className="font-cinzel font-bold text-ink-900 dark:text-marble-100">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-marble-200/40 dark:bg-lapis-900/60 p-4 rounded-sm space-y-1.5 text-xs mb-6">
          <div className="flex justify-between text-ink-700 dark:text-marble-300">
            <span>Subtotal</span>
            <span className="font-mono">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-700 dark:text-marble-300">
            <span>Epidaurus Tithe (8%)</span>
            <span className="font-mono">{formatPrice(order.tax)}</span>
          </div>
          <div className="flex justify-between text-ink-700 dark:text-marble-300">
            <span>Courier Dispensation</span>
            <span className="font-mono">{formatPrice(order.shipping)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-2 border-t border-marble-300 dark:border-lapis-700">
            <span className="font-cinzel">Total Consecrated</span>
            <span className="font-cinzel text-gold-600 dark:text-gold-400 text-base">
              {formatPrice(order.total)}
            </span>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="text-xs text-ink-700 dark:text-marble-300 mb-8 p-3 rounded-sm border border-marble-300/80 dark:border-lapis-800">
          <span className="font-cinzel font-bold uppercase tracking-wider block mb-1 text-ink-900 dark:text-marble-100">
            Delivery Sanctum Destination:
          </span>
          <p>{order.shippingAddress.fullName}</p>
          <p>{order.shippingAddress.street}</p>
          <p>
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
          </p>
          <p>{order.shippingAddress.country}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Sacred Scroll
          </Button>
          <Link to="/shop">
            <Button variant="gold" size="sm" leftIcon={<ShoppingBag className="w-4 h-4" />}>
              Return to Apothecary
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
