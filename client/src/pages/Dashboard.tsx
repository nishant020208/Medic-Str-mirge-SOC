import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  Search,
  Edit2,
  Check,
  X,
  Lock,
  Boxes,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import { Product, Order } from '../types';
import { useAuthStore } from '../store/authStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import { Tabs } from '../ui/Tabs';
import { GreekDivider } from '../ui/GreekDivider';
import { toast } from '../ui/Toast';
import { formatPrice } from '../lib/utils';
import { SEO } from '../components/SEO';
import { Breadcrumbs } from '../components/Breadcrumbs';

export const DashboardPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState('inventory');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [, setLoadingData] = useState(true);
  const [searchProduct, setSearchProduct] = useState('');
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [stockInputVal, setStockInputVal] = useState<number>(0);

  useEffect(() => {
    if (user?.role !== 'pharmacist') return;

    const loadDashboardData = async () => {
      try {
        setLoadingData(true);
        const [prodRes, ordRes] = await Promise.all([
          fetch('/api/products?limit=100'),
          fetch('/api/orders', {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
          }),
        ]);

        if (prodRes.ok) {
          const data = await prodRes.json();
          setProducts(data.products || []);
        }

        if (ordRes.ok) {
          const data = await ordRes.json();
          setOrders(data.orders || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard records:', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadDashboardData();
  }, [user]);

  // Handle 403 Forbidden for non-pharmacists
  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-pulse">
        <div className="h-8 w-48 bg-surface-2 mx-auto rounded" />
      </div>
    );
  }

  if (!user || user.role !== 'pharmacist') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center flex-grow flex flex-col justify-center">
        <SEO
          title="Sanctum Access Sealed | MediStore Sanctuary"
          description="Restricted administration dashboard for Temple Pharmacists."
          canonicalPath="/dashboard"
          noindex={true}
        />
        <div className="mb-6 text-left">
          <Breadcrumbs items={[{ name: 'Sanctum Dashboard', url: '/dashboard' }]} />
        </div>
        <Card variant="marble" className="p-8 border-2 border-danger shadow-theme">
          <div className="w-16 h-16 rounded-full bg-surface-2 text-danger flex items-center justify-center mx-auto mb-4 border border-border">
            <Lock className="w-8 h-8" />
          </div>
          <span className="font-cinzel text-xs uppercase tracking-widest text-danger font-bold block mb-1">
            Access Prohibited · 403
          </span>
          <h1 className="font-cinzel text-2xl font-bold text-text mb-2">
            The High Sanctum is Sealed
          </h1>
          <p className="font-cormorant text-base text-text-muted leading-relaxed mb-6">
            Only initiated Temple Pharmacists possessing consecrated credentials may inspect the inner apothecary registers and dispensary manifests.
          </p>
          <GreekDivider />
          <div className="flex gap-3 justify-center mt-4">
            <Link to="/login">
              <Button variant="primary" size="sm">
                Authenticate as Pharmacist
              </Button>
            </Link>
            <Link to="/shop">
              <Button variant="outline" size="sm">
                Return to Dispensary
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Analytics computation
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalUnitsInStock = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockItems = products.filter((p) => p.stock < 15);

  const salesByDay = [
    { day: 'Mon', revenue: 420 },
    { day: 'Tue', revenue: 680 },
    { day: 'Wed', revenue: 950 },
    { day: 'Thu', revenue: 810 },
    { day: 'Fri', revenue: 1240 },
    { day: 'Sat', revenue: 1560 },
    { day: 'Sun', revenue: 1390 },
  ];

  const categoryBreakdown = [
    { category: 'Pain Relief', count: 9 },
    { category: 'Cold & Flu', count: 8 },
    { category: 'Digestive', count: 7 },
    { category: 'Vitamins', count: 6 },
    { category: 'First Aid', count: 5 },
    { category: 'Herbal', count: 5 },
  ];

  const handleUpdateStock = async (productId: string) => {
    try {
      const res = await fetch(`/api/products/${productId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ stock: stockInputVal }),
      });

      if (!res.ok) throw new Error('Failed to update stock');

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock: stockInputVal } : p))
      );
      setEditingStockId(null);
      toast.success('Dispensary stock updated in temple ledger', 'Inventory Inscribed');
    } catch (err: any) {
      toast.error(err.message || 'Error updating stock');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error('Failed to update order status');

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
      toast.success(`Consignment marked as ${status}`, 'Order Status Updated');
    } catch (err: any) {
      toast.error(err.message || 'Error updating order status');
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.category.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.batchId.toLowerCase().includes(searchProduct.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-grow">
      <SEO
        title="Pharmacist Sanctum Dashboard | MediStore Sanctuary"
        description="Consecrated administration: inventory management, consignment manifests, and dispensary analytics."
        canonicalPath="/dashboard"
        noindex={true}
      />
      <div className="mb-6">
        <Breadcrumbs items={[{ name: 'Sanctum Dashboard', url: '/dashboard' }]} />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <span className="font-cinzel text-xs uppercase tracking-widest text-accent-text font-bold block mb-1">
            Initiate Level IV Access
          </span>
          <h1 className="font-cinzel text-3xl font-bold text-text">
            Pharmacist Sanctum Dashboard
          </h1>
          <p className="font-cormorant text-sm text-text-muted">
            Consecrated administration: Inventory management, consignment manifests, and financial tithing.
          </p>
        </div>
        <Badge variant="primary" size="md">
          Chief Pharmacist
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card variant="marble" className="p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-cinzel text-text-muted uppercase tracking-wider block">
              Cumulative Tithe
            </span>
            <span className="font-cinzel text-2xl font-bold text-accent-text">
              {formatPrice(totalRevenue)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-full bg-surface-2 text-accent-text border border-border flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </Card>

        <Card variant="marble" className="p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-cinzel text-text-muted uppercase tracking-wider block">
              Consignments
            </span>
            <span className="font-cinzel text-2xl font-bold text-text">
              {orders.length}
            </span>
          </div>
          <div className="w-12 h-12 rounded-full bg-surface-2 text-primary border border-border flex items-center justify-center">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </Card>

        <Card variant="marble" className="p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-cinzel text-text-muted uppercase tracking-wider block">
              Stock Reserves
            </span>
            <span className="font-cinzel text-2xl font-bold text-success">
              {totalUnitsInStock}
            </span>
          </div>
          <div className="w-12 h-12 rounded-full bg-surface-2 text-success border border-border flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
        </Card>

        <Card variant="marble" className="p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-cinzel text-text-muted uppercase tracking-wider block">
              Low Stock Alerts
            </span>
            <span className="font-cinzel text-2xl font-bold text-danger">
              {lowStockItems.length}
            </span>
          </div>
          <div className="w-12 h-12 rounded-full bg-surface-2 text-danger border border-border flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Analytics Charts (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card variant="marble" className="p-6">
          <h3 className="font-cinzel text-base font-bold text-text mb-4">
            Daily Tithe Flow (USD)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesByDay}>
                <defs>
                  <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                    fontFamily: 'Cinzel',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--chart-1)"
                  fillOpacity={1}
                  fill="url(#goldArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card variant="marble" className="p-6">
          <h3 className="font-cinzel text-base font-bold text-text mb-4">
            Formulation Categorization
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown}>
                <XAxis dataKey="category" stroke="var(--text-muted)" fontSize={11} interval={0} angle={-15} textAnchor="end" height={45} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                    fontFamily: 'Cinzel',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tabs: Inventory / Orders / Alerts */}
      <div className="mb-6">
        <Tabs
          tabs={[
            { id: 'inventory', label: 'Inventory Register', count: products.length },
            { id: 'orders', label: 'Order Consignments', count: orders.length },
            { id: 'alerts', label: 'Depletion Warnings', count: lowStockItems.length },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Tab Content: Inventory Table */}
      {activeTab === 'inventory' && (
        <Card variant="marble" className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="w-full sm:w-80 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <Input
                placeholder="Search registry by name, category, batch..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="pl-9 min-h-[38px] text-xs"
              />
            </div>
            <span className="text-xs font-cinzel text-text-muted">
              Showing {filteredProducts.length} remedies
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Remedy Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Batch Hash ID</TableHead>
                <TableHead>Tribute (Price)</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-bold font-cinzel">
                    <Link to={`/shop/${p.id}`} className="hover:text-accent-text">
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" size="sm">
                      {p.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-text-muted">
                    {p.batchId}
                  </TableCell>
                  <TableCell className="font-cinzel font-bold text-accent-text">
                    {formatPrice(p.price)}
                  </TableCell>
                  <TableCell>
                    {editingStockId === p.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={stockInputVal}
                          onChange={(e) => setStockInputVal(Number(e.target.value))}
                          className="w-16 px-2 py-1 text-xs border border-border rounded-card bg-surface-2 font-mono text-text"
                        />
                        <button
                          onClick={() => handleUpdateStock(p.id)}
                          className="p-1 text-success hover:opacity-80"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingStockId(null)}
                          className="p-1 text-danger hover:opacity-80"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`font-mono text-xs font-bold ${
                          p.stock < 15 ? 'text-danger' : 'text-success'
                        }`}
                      >
                        {p.stock} units
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingStockId !== p.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingStockId(p.id);
                          setStockInputVal(p.stock);
                        }}
                        leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Adjust
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Tab Content: Orders */}
      {activeTab === 'orders' && (
        <Card variant="marble" className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requisition ID</TableHead>
                <TableHead>Devotee</TableHead>
                <TableHead>Items Dispensed</TableHead>
                <TableHead>Total Offering</TableHead>
                <TableHead>Consignment Status</TableHead>
                <TableHead className="text-right">Change Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs font-bold">
                    <Link to={`/order-confirmation/${o.id}`} className="hover:text-accent-text">
                      {o.id}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold block text-xs">{o.customerName}</span>
                    <span className="text-[11px] text-text-muted">{o.customerEmail}</span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {o.items.length} items ({o.items.map((i) => i.productName).join(', ')})
                  </TableCell>
                  <TableCell className="font-cinzel font-bold text-accent-text">
                    {formatPrice(o.total)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        o.status === 'Delivered'
                          ? 'success'
                          : o.status === 'Cancelled'
                          ? 'danger'
                          : 'primary'
                      }
                      size="sm"
                    >
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <select
                      value={o.status}
                      onChange={(e) =>
                        handleUpdateOrderStatus(o.id, e.target.value as Order['status'])
                      }
                      className="text-xs px-2 py-1 rounded-card bg-surface-2 border border-border font-cinzel text-text"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Dispensed">Dispensed</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Tab Content: Alerts */}
      {activeTab === 'alerts' && (
        <Card variant="marble" className="p-6">
          <div className="space-y-4">
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-success">All sanctum apothecary stock levels are healthy.</p>
            ) : (
              lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-card border border-border bg-surface-2"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-danger" />
                    <div>
                      <h4 className="font-cinzel font-bold text-sm text-text">
                        {item.name} ({item.category})
                      </h4>
                      <p className="text-xs text-text-muted">
                        Batch {item.batchId} has dropped to {item.stock} remaining doses.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setActiveTab('inventory');
                      setEditingStockId(item.id);
                      setStockInputVal(item.stock);
                    }}
                  >
                    Replenish
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
