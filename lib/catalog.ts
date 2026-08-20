/**
 * The kinds of work this network is for.
 *
 * `id` is what goes in `posts.category` and `profiles.skills`; it is stable and
 * must never be renamed once rows exist. The label is looked up through i18n,
 * so the same id reads as "Electrical" or "बिजली का काम" depending on the
 * language.
 */

export interface Category {
  id: string;
  /** A lucide-react icon name, resolved in components/icons.tsx. */
  icon: string;
  /** A hue for the category chip, so the feed is scannable by colour. */
  hue: number;
}

export const CATEGORIES: Category[] = [
  { id: 'electrical', icon: 'Zap', hue: 38 },
  { id: 'plumbing', icon: 'Droplets', hue: 199 },
  { id: 'carpentry', icon: 'Hammer', hue: 25 },
  { id: 'painting', icon: 'Paintbrush', hue: 280 },
  { id: 'cleaning', icon: 'Sparkles', hue: 168 },
  { id: 'cooking', icon: 'ChefHat', hue: 12 },
  { id: 'driving', icon: 'Car', hue: 217 },
  { id: 'gardening', icon: 'Leaf', hue: 142 },
  { id: 'appliance', icon: 'Wrench', hue: 258 },
  { id: 'tailoring', icon: 'Scissors', hue: 330 },
  { id: 'moving', icon: 'Truck', hue: 48 },
  { id: 'security', icon: 'ShieldCheck', hue: 221 },
  { id: 'tutoring', icon: 'BookOpen', hue: 291 },
  { id: 'beauty', icon: 'Heart', hue: 344 },
  { id: 'other', icon: 'Briefcase', hue: 215 },
];

export const CATEGORY_IDS: string[] = CATEGORIES.map((c) => c.id);

export function categoryById(id: string | null | undefined): Category | null {
  if (!id) return null;
  return CATEGORIES.find((c) => c.id === id) ?? null;
}

/** Cities the demo content is written around; `location` is free text, not an enum. */
export const CITIES: string[] = [
  'Bengaluru',
  'Mumbai',
  'Delhi',
  'Chennai',
  'Hyderabad',
  'Pune',
  'Kolkata',
  'Ahmedabad',
  'Kochi',
  'Coimbatore',
  'Vellore',
  'Mysuru',
];
