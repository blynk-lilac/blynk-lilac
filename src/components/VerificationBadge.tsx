import badgeGold from "@/assets/badge-gold.webp";
import badgePurple from "@/assets/badge-purple.png";
import badgeSilver from "@/assets/badge-silver.webp";
import badgeBlue from "@/assets/badge-blue.svg";

interface VerificationBadgeProps {
  badgeType?: string | null;
  className?: string;
}

export default function VerificationBadge({ badgeType, className = "w-5 h-5" }: VerificationBadgeProps) {
  if (!badgeType) return null;

  switch (badgeType) {
    case 'gold':
      return <img src={badgeGold} alt="Verificado Ouro" className={className} />;
    case 'purple':
      return <img src={badgePurple} alt="Verificado Roxo" className={className} />;
    case 'silver':
      return <img src={badgeSilver} alt="Verificado Prata" className={className} />;
    case 'blue':
    default:
      return <img src={badgeBlue} alt="Verificado Azul" className={className} />;
  }
}
