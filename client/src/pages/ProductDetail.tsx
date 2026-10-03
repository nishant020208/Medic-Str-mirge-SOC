import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShoppingCart,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Minus,
} from 'lucide-react';
import { Product } from '../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { GreekDivider } from '../ui/GreekDivider';
import { useCartStore } from '../store/cartStore';
import { toast } from '../ui/Toast';
import { formatPrice } from '../lib/utils';
import { verifyBatchOnChain } from '../web3/verifier';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data.product);
          setRelated(data.related || []);
        }
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleVerify = async () => {
    if (!product) return;
    setIsVerifying(true);
    setIsModalOpen(true);
    try {
      const result = await verifyBatchOnChain(product.batchId);
      setVerificationResult(result);
    } catch (err: any) {
      setVerificationResult({
        batchId: product.batchId,
        isRegistered: false,
        error: err.message || 'Verification ritual failed',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, quantity);
    toast.success(
      `Added ${quantity} × ${product.name} to your sacred requisition.`,
      'Sacred Offering Added'
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 w-full animate-pulse">
        <div className="h-6 w-32 bg-surface-2 rounded mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="h-96 bg-surface-2 rounded-card" />
          <div className="space-y-4">
            <div className="h-10 w-3/4 bg-surface-2 rounded" />
            <div className="h-6 w-1/4 bg-surface-2 rounded" />
            <div className="h-32 bg-surface-2 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h2 className="font-cinzel text-2xl font-bold mb-4 text-text">Remedy Not Found in Archives</h2>
        <Link to="/shop">
          <Button variant="primary">Return to Apothecary</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      {/* Back Link */}
      <Link
        to="/shop"
        className="inline-flex items-center gap-2 text-xs font-cinzel font-bold text-text-muted hover:text-text mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Apothecary Dispensary</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-16">
        {/* Left: Product Visual Presentation */}
        <div className="rounded-card border border-border bg-surface p-8 shadow-theme relative overflow-hidden flex flex-col items-center justify-center min-h-[420px] floating-card">
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge variant="info">{product.category}</Badge>
            {product.rx && <Badge variant="danger">Rx Prescription</Badge>}
          </div>

          <div className="w-48 h-48 rounded-full bg-surface-2 border-2 border-border flex items-center justify-center text-accent my-8 shadow-inner">
            <ShieldCheck className="w-24 h-24" />
          </div>

          <div className="text-center">
            <span className="font-mono text-xs text-accent-text font-bold block tracking-wider">
              Batch ID: {product.batchId}
            </span>
            <span className="text-[11px] text-text-muted block mt-0.5">
              Consecrated under Sepolia Registry
            </span>
          </div>
        </div>

        {/* Right: Info & Actions */}
        <div className="flex flex-col space-y-6">
          <div>
            <span className="font-cinzel text-xs uppercase tracking-widest text-accent-text font-bold block mb-1">
              Sanctum Formulation
            </span>
            <h1 className="font-cinzel text-3xl sm:text-4xl font-bold text-text mb-3">
              {product.name}
            </h1>
            <div className="flex items-center gap-4">
              <span className="font-cinzel text-3xl font-bold text-accent-text">
                {formatPrice(product.price)}
              </span>
              {product.stock > 0 ? (
                <Badge variant="success">In Stock ({product.stock} available)</Badge>
              ) : (
                <Badge variant="danger">Depleted</Badge>
              )}
            </div>
          </div>

          <Card variant="papyrus" className="p-4">
            <h2 className="font-cinzel text-xs uppercase tracking-wider font-bold text-text mb-2">
              Asclepeion Description
            </h2>
            <p className="font-cormorant text-lg text-text leading-relaxed">
              {product.description}
            </p>
          </Card>

          {/* Dosage & Administration */}
          <div className="p-4 rounded-card border border-border bg-surface-2">
            <h2 className="font-cinzel text-xs uppercase tracking-wider font-bold text-accent-text mb-1">
              Ritual Dosage &amp; Protocol
            </h2>
            <p className="text-xs text-text font-medium">
              {product.dosage}
            </p>
          </div>

          {/* Quantity and Add to Cart */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center pt-2">
            <div className="flex items-center border border-border rounded-card bg-surface-2 shadow-inner">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-3 text-text-muted hover:text-text focus:outline-none"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-cinzel font-bold text-sm text-text">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                disabled={quantity >= product.stock}
                className="p-3 text-text-muted hover:text-text focus:outline-none disabled:opacity-30"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              leftIcon={<ShoppingCart className="w-5 h-5" />}
            >
              Deposit Into Sacred Cart
            </Button>
          </div>

          {/* Web3 Batch Verification Button */}
          <div className="pt-2">
            <Button
              variant="outline"
              size="md"
              className="w-full"
              onClick={handleVerify}
              isLoading={isVerifying}
              leftIcon={<ShieldCheck className="w-4 h-4 text-accent" />}
            >
              Verify Authenticity On Chain (Ethereum / Mock)
            </Button>
            <p className="text-[11px] text-center text-text-muted mt-1 font-mono">
              Keccak-256 batch validation via smart contract
            </p>
          </div>
        </div>
      </div>

      {/* Mandatory Medical Disclaimer Banner */}
      <div className="p-4 rounded-card border border-border bg-surface text-center my-8 shadow-theme">
        <p className="font-cinzel text-xs uppercase tracking-wider font-bold text-accent-text mb-1">
          Temple Oracle Declaration
        </p>
        <p className="text-xs text-text-muted font-medium">
          Demo application. Not medical advice. No real orders.
        </p>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="font-cinzel text-xl font-bold text-text mb-6">
            Harmonious Sanctum Remedies
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {related.map((item) => (
              <Link key={item.id} to={`/shop/${item.id}`} className="group block focus:outline-none">
                <Card variant="marble" className="h-full flex flex-col justify-between group-hover:border-accent">
                  <div>
                    <Badge variant="info" size="sm" className="mb-2">
                      {item.category}
                    </Badge>
                    <h3 className="font-cinzel font-bold text-sm text-text group-hover:text-accent-text mb-1">
                      {item.name}
                    </h3>
                    <p className="font-cormorant text-sm text-text-muted line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                    <span className="font-cinzel font-bold text-accent-text">
                      {formatPrice(item.price)}
                    </span>
                    <span className="text-xs font-cinzel text-accent-text font-bold group-hover:underline">
                      Inspect →
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* On-Chain Verification Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Oracle On-Chain Verification"
      >
        <div className="space-y-4">
          {isVerifying ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin mx-auto" />
              <p className="font-cinzel text-sm font-bold text-text">
                Interrogating Ethereum Registry...
              </p>
              <p className="text-xs text-text-muted font-mono">
                Hashing Batch: {product.batchId}
              </p>
            </div>
          ) : verificationResult?.isRegistered ? (
            <div className="text-center py-4 space-y-4">
              {/* Gold Stamp Animation */}
              <div className="w-20 h-20 rounded-full bg-surface-2 border-2 border-border text-accent flex items-center justify-center mx-auto shadow-glow animate-bounce">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-cinzel font-bold bg-surface-2 text-accent-text border border-border uppercase tracking-wider shadow-inner">
                  {verificationResult.network === 'mock' ? 'Demo Ledger' : 'Sepolia Confirmed'}
                </span>
                <h3 className="font-cinzel text-xl font-bold text-text mt-2">
                  Sealed by the Oracle
                </h3>
                <p className="font-cormorant text-base text-text-muted mt-1">
                  This pharmaceutical batch hash is genuinely stamped into the Asclepius ledger. Zero adulteration detected.
                </p>
              </div>

              <div className="bg-surface-2 p-3 rounded-card border border-border text-left text-xs font-mono space-y-1 shadow-inner">
                <div>
                  <span className="text-text-muted">Batch ID: </span>
                  <span className="text-text font-bold">{verificationResult.batchId}</span>
                </div>
                <div className="truncate">
                  <span className="text-text-muted">Keccak Hash: </span>
                  <span className="text-accent-text font-bold">{verificationResult.hash}</span>
                </div>
                {verificationResult.contractAddress && (
                  <div className="truncate">
                    <span className="text-text-muted">Contract: </span>
                    <span className="text-text">{verificationResult.contractAddress}</span>
                  </div>
                )}
                {verificationResult.txHash && (
                  <div className="truncate">
                    <span className="text-text-muted">Tx Hash: </span>
                    <span className="text-text">{verificationResult.txHash}</span>
                  </div>
                )}
              </div>

              {verificationResult.txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${verificationResult.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-cinzel text-accent-text font-bold hover:underline"
                >
                  <span>View Proof on Sepolia Etherscan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-surface-2 text-danger border border-danger/30 flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h4 className="font-cinzel text-lg font-bold text-danger">
                Not Found in the Temple Ledger
              </h4>
              <p className="font-cormorant text-base text-text-muted">
                The cryptographic hash for batch {product.batchId} does not match any sealed consignment in the Asclepeion registry.
              </p>
            </div>
          )}

          <GreekDivider className="my-4" />

          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
              Close Sanctum Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
