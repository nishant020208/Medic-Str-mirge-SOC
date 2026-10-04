import React from 'react';
import {
  Pill,
  Shield,
  ShieldCheck,
  Zap,
  Lock,
  Droplet,
  Feather,
  Sparkles,
  Flame,
  Leaf,
  Clock,
  Moon,
  Sun,
  Cross,
  Eye,
  Flower2,
  HeartPulse,
} from 'lucide-react';

interface ProductIllustrationProps {
  type?: string;
  name?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ProductIllustration: React.FC<ProductIllustrationProps> = ({
  type = '',
  name = '',
  className = '',
  size = 'md',
}) => {
  const iconSizeClass =
    size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-20 h-20' : 'w-10 h-10';

  const getIcon = () => {
    switch ((type || '').toLowerCase()) {
      case 'pill':
      case 'tablet':
        return <Pill className={iconSizeClass} aria-hidden="true" />;
      case 'shield':
        return <Shield className={iconSizeClass} aria-hidden="true" />;
      case 'shield-check':
        return <ShieldCheck className={iconSizeClass} aria-hidden="true" />;
      case 'lightning':
      case 'zap':
      case 'battery':
        return <Zap className={iconSizeClass} aria-hidden="true" />;
      case 'lock':
        return <Lock className={iconSizeClass} aria-hidden="true" />;
      case 'droplet':
      case 'dropper':
      case 'drop':
        return <Droplet className={iconSizeClass} aria-hidden="true" />;
      case 'feather':
      case 'wind':
        return <Feather className={iconSizeClass} aria-hidden="true" />;
      case 'sparkle':
      case 'sparkles':
      case 'star':
        return <Sparkles className={iconSizeClass} aria-hidden="true" />;
      case 'flame-off':
        return <Flame className={iconSizeClass} aria-hidden="true" />;
      case 'leaf':
      case 'plant':
      case 'tea':
      case 'laurel':
        return <Leaf className={iconSizeClass} aria-hidden="true" />;
      case 'clock':
        return <Clock className={iconSizeClass} aria-hidden="true" />;
      case 'moon':
        return <Moon className={iconSizeClass} aria-hidden="true" />;
      case 'sun':
      case 'citrus':
        return <Sun className={iconSizeClass} aria-hidden="true" />;
      case 'cross':
      case 'bandage':
      case 'tube':
      case 'jar':
        return <Cross className={iconSizeClass} aria-hidden="true" />;
      case 'eye':
        return <Eye className={iconSizeClass} aria-hidden="true" />;
      case 'flower':
      case 'honey':
        return <Flower2 className={iconSizeClass} aria-hidden="true" />;
      default:
        return <HeartPulse className={iconSizeClass} aria-hidden="true" />;
    }
  };

  return (
    <div
      role="img"
      aria-label={`Consecrated apothecary illustration for ${name}`}
      className={`flex items-center justify-center text-accent-text ${className}`}
    >
      {getIcon()}
    </div>
  );
};
