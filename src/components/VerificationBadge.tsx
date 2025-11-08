import badgeVerified from "@/assets/badge-verified.svg";

interface VerificationBadgeProps {
  badgeType?: string | null;
  className?: string;
}

export default function VerificationBadge({ badgeType, className = "w-5 h-5" }: VerificationBadgeProps) {
  if (!badgeType) return null;

  return <img src={badgeVerified} alt="Verificado" className={className} />;
}
