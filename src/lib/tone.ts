export type Tone = {
  bg: string;
  soft: string;
  text: string;
  border: string;
};

const TONES: Tone[] = [
  { bg: "bg-accent", soft: "bg-accent-soft", text: "text-accent", border: "border-accent" },
  { bg: "bg-hot", soft: "bg-hot-soft", text: "text-hot", border: "border-hot" },
  { bg: "bg-cobalt", soft: "bg-cobalt-soft", text: "text-cobalt", border: "border-cobalt" },
  { bg: "bg-gold", soft: "bg-gold-soft", text: "text-gold", border: "border-gold" },
  { bg: "bg-plum", soft: "bg-plum-soft", text: "text-plum", border: "border-plum" },
];

/**
 * A stable colour per event, so the same night looks the same on the home
 * page, its own page and the admin list. Derived from the slug, which never
 * changes after creation.
 */
export function eventTone(seed: string): Tone {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return TONES[hash % TONES.length];
}
