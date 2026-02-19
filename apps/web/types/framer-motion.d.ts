import 'framer-motion';

// Augment framer-motion types for React 19 compatibility
// framer-motion v10 types don't include className on motion components
// when used with @types/react v19
declare module 'framer-motion' {
  interface MotionProps {
    className?: string;
  }
}
