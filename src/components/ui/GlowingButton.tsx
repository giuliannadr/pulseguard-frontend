import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlowingButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'glass' | 'danger';
  children: React.ReactNode;
}

export function GlowingButton({ variant = 'primary', className, children, ...props }: GlowingButtonProps) {
  const variantStyles = {
    primary: 'btn-solid-glow',
    glass: 'btn-glass',
    danger: 'btn-danger'
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      className={cn(variantStyles[variant], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
