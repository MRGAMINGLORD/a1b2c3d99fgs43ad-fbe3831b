import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GameCardProps {
  title: string;
  description: string;
  cover?: string;
  icon?: string;
  available?: boolean;
  playUrl?: string;
  credits?: string;
  onClick?: () => void;
}

const GameCard = ({ title, description, cover, icon, available = false, playUrl, credits, onClick }: GameCardProps) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if (!available) return;
    if (playUrl) {
      if (playUrl.startsWith("/") && !playUrl.startsWith("//")) {
        navigate(playUrl);
      } else {
        window.open(playUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={`group relative w-full overflow-hidden rounded-lg border text-left transition-transform duration-300 ${
        available
          ? "border-primary/40 bg-card cursor-pointer hover:scale-[1.03] hover:border-primary animate-border-pulse"
          : "border-border bg-card/50 cursor-not-allowed opacity-60"
      }`}
    >
      <div className="relative mx-auto aspect-[3/2] w-full max-h-40 overflow-hidden bg-muted sm:max-h-48">
        {cover ? (
          <img
            src={cover}
            alt={`${title} cover art`}
            loading="lazy"
            width={768}
            height={512}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">{icon}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
      </div>
      <div className="p-5">
        <h3 className="mb-1 font-display text-xl uppercase tracking-wide text-primary">
          {title}
        </h3>
        {credits && credits.trim() && (
          <p className="mb-2 font-display text-[11px] uppercase tracking-wider text-muted-foreground">
            by <span className="text-primary/80">{credits}</span>
          </p>
        )}
        <p className="text-sm text-muted-foreground">{description}</p>
        {available && (
          <span className="mt-4 inline-block font-display text-sm uppercase tracking-wider text-primary">
            ▶ Play
          </span>
        )}
      </div>
      {!available && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="h-5 w-5" />
            <span className="font-display text-sm uppercase tracking-wider">Coming Soon</span>
          </div>
        </div>
      )}
    </button>
  );
};

export default GameCard;
