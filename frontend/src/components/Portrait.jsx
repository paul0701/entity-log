import { useState } from "react";

const initials = (name = "") =>
  name.replace(/^The\s+/i, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export const Portrait = ({ character, className = "", rounded = "rounded-lg" }) => {
  const [failed, setFailed] = useState(false);
  if (!character) return <div className={`portrait-tile ${rounded} ${className}`} />;
  const showImg = character.image && !failed;
  return (
    <div className={`portrait-tile relative overflow-hidden ${rounded} ${className}`}>
      {showImg ? (
        <img
          src={character.image}
          alt={character.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : (
        <span data-testid="portrait-fallback" className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold text-stone-300/80">
          {initials(character.name)}
        </span>
      )}
    </div>
  );
};
