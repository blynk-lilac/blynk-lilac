import badgeGold from "@/assets/badge-gold.webp";
import badgePurple from "@/assets/badge-purple.png";
import badgeSilver from "@/assets/badge-silver.webp";

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
      return (
        <svg viewBox="0 0 22 22" className={`${className} text-blue-500`} fill="currentColor">
          <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.27 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.33c-.47 1.39-.2 2.9.8 3.92s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.5 4.88L6.41 12.5l1.41-1.41L10.75 14.07l5.42-5.42 1.41 1.41-6.83 6.82z"/>
        </svg>
      );
  }
}
