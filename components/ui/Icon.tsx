import type { LucideIcon, LucideProps } from "lucide-react";

type IconProps = LucideProps & {
  icon: LucideIcon;
};

export function Icon({ icon: Lucide, size = 20, strokeWidth = 1.75, ...props }: IconProps) {
  return <Lucide size={size} strokeWidth={strokeWidth} {...props} />;
}
