/// <reference types="vite/client" />

declare module 'lucide-react' {
  import * as React from 'react';

  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    strokeWidth?: number | string;
    color?: string;
    className?: string;
  }

  export type LucideIcon = React.ForwardRefExoticComponent<
    LucideProps & React.RefAttributes<SVGSVGElement>
  >;

  export const Leaf: LucideIcon;
  export const Upload: LucideIcon;
  export const Sparkles: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const ShieldAlert: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Tag: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const Image: LucideIcon;
  export const FileText: LucideIcon;
  export const X: LucideIcon;
  export const Menu: LucideIcon;
  export const Loader2: LucideIcon;
  export const Sprout: LucideIcon;
  export const Activity: LucideIcon;
  export const Check: LucideIcon;
  export const Info: LucideIcon;
  export const Eye: LucideIcon;
  export const Camera: LucideIcon;
  export const Trash2: LucideIcon;
}
