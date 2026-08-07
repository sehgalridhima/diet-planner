import type { DayPlan } from "@/lib/plan-types";

/* ===============================================================
   GROCERY LIST
   ===============================================================
   Totals a week of meals into something you can shop from.

   WHAT THIS IS, AND IS NOT.

   Meals are free text — "2 roti", "150g paneer bhurji", "1 katori
   dal" — and that is deliberate, because it is how people describe
   food. It also means this cannot decompose a recipe: "palak
   paneer" does not become paneer, spinach, onion, tomato and
   ginger. Nothing here can know that, and the AI planner invents
   dishes that no ingredient table could cover in advance.

   So this is a PORTION list, not a recipe list. It answers "how
   much paneer do I need this week" — the question that stops you
   buying wrong — and not "what goes in it". The UI says as much,
   because a list that quietly under-reports is worse than no list.

   Anything unrecognised is kept verbatim under Other rather than
   dropped. Silently losing an item from a shopping list is the one
   failure that would make it untrustworthy.
   =============================================================== */

export type GroceryCategory =
  | "Protein"
  | "Dairy"
  | "Grains & flours"
  | "Dals & pulses"
  | "Vegetables & fruit"
  | "Nuts & seeds"
  | "Other";

export const CATEGORY_ORDER: GroceryCategory[] = [
  "Protein",
  "Dals & pulses",
  "Grains & flours",
  "Dairy",
  "Vegetables & fruit",
  "Nuts & seeds",
  "Other",
];

export type GroceryItem = {
  name: string;
  /** Summed across the week, per unit */
  quantity: number;
  /** "g", "katori", "bowl", "glass", "tbsp", or "" for a plain count */
  unit: string;
  category: GroceryCategory;
};

type Rule = { match: RegExp; name: string; category: GroceryCategory };

/*
 * First match wins, so order is the whole design here.
 *
 * Proteins come first on purpose. A dish string often names several
 * things ("moong dal chilla with paneer stuffing") and only one can
 * win. The expensive, deliberately-bought item is the more useful
 * answer for a shopping trip — nobody forgets they need atta, but
 * people do arrive home without the paneer.
 *
 * Within each group, specific patterns precede general ones, or
 * "soy milk" would be counted as milk and "brown rice" as rice.
 */
const RULES: Rule[] = [
  // ---- Protein ----
  { match: /paneer/, name: "Paneer", category: "Protein" },
  { match: /tofu/, name: "Tofu", category: "Protein" },
  { match: /soya/, name: "Soya chunks", category: "Protein" },
  { match: /chicken/, name: "Chicken", category: "Protein" },
  { match: /fish|rohu|pomfret|surmai|basa|tuna|mackerel/, name: "Fish", category: "Protein" },
  { match: /mutton|lamb/, name: "Mutton", category: "Protein" },
  { match: /prawn|shrimp/, name: "Prawns", category: "Protein" },
  { match: /egg/, name: "Eggs", category: "Protein" },

  // ---- Dairy (soy milk before milk) ----
  { match: /soy milk/, name: "Soy milk", category: "Dairy" },
  { match: /buttermilk|chaas/, name: "Buttermilk", category: "Dairy" },
  { match: /curd|raita/, name: "Curd", category: "Dairy" },
  { match: /milk/, name: "Milk", category: "Dairy" },

  // ---- Dals and pulses ----
  { match: /rajma/, name: "Rajma", category: "Dals & pulses" },
  { match: /black chana/, name: "Black chana", category: "Dals & pulses" },
  { match: /roasted chana/, name: "Roasted chana", category: "Dals & pulses" },
  { match: /chole|chana/, name: "Chana (chole)", category: "Dals & pulses" },
  { match: /lobia/, name: "Lobia", category: "Dals & pulses" },
  { match: /sprouts/, name: "Sprouts", category: "Dals & pulses" },
  { match: /moong/, name: "Moong dal", category: "Dals & pulses" },
  { match: /dal|sambar/, name: "Dal", category: "Dals & pulses" },

  // ---- Grains and flours ----
  { match: /besan|chilla/, name: "Besan", category: "Grains & flours" },
  { match: /roti|paratha|atta/, name: "Roti (atta)", category: "Grains & flours" },
  { match: /brown rice/, name: "Brown rice", category: "Grains & flours" },
  { match: /rice|pulao|khichdi/, name: "Rice", category: "Grains & flours" },
  { match: /oats/, name: "Oats", category: "Grains & flours" },
  { match: /poha/, name: "Poha", category: "Grains & flours" },
  { match: /idli|dosa/, name: "Idli / dosa batter", category: "Grains & flours" },
  { match: /dalia|upma|rava|suji/, name: "Dalia / rava", category: "Grains & flours" },
  { match: /ragi/, name: "Ragi", category: "Grains & flours" },
  { match: /khakhra/, name: "Khakhra", category: "Grains & flours" },
  { match: /toast|bread|pav/, name: "Bread", category: "Grains & flours" },
  { match: /pasta|penne|macaroni|spaghetti|noodle/, name: "Pasta", category: "Grains & flours" },

  // ---- Nuts and seeds (peanut butter before peanuts) ----
  { match: /peanut butter/, name: "Peanut butter", category: "Nuts & seeds" },
  { match: /almond/, name: "Almonds", category: "Nuts & seeds" },
  { match: /walnut/, name: "Walnuts", category: "Nuts & seeds" },
  { match: /peanut/, name: "Peanuts", category: "Nuts & seeds" },
  { match: /chia/, name: "Chia seeds", category: "Nuts & seeds" },
  { match: /flax/, name: "Flax seeds", category: "Nuts & seeds" },
  { match: /makhana/, name: "Makhana", category: "Nuts & seeds" },

  // ---- Vegetables and fruit ----
  { match: /banana/, name: "Bananas", category: "Vegetables & fruit" },
  { match: /apple/, name: "Apples", category: "Vegetables & fruit" },
  { match: /cucumber/, name: "Cucumber", category: "Vegetables & fruit" },
  { match: /fruit/, name: "Fruit", category: "Vegetables & fruit" },
  {
    match: /salad|vegetable|sabzi|bhindi|lauki|palak|cabbage|beans|poriyal|stir fry|onion|tomato/,
    name: "Vegetables",
    category: "Vegetables & fruit",
  },

  // ---- Other ----
  { match: /chutney/, name: "Chutney", category: "Other" },
  { match: /papad/, name: "Papad", category: "Other" },
  { match: /jaggery/, name: "Jaggery", category: "Other" },
  { match: /tea|coffee/, name: "Tea / coffee", category: "Other" },
];

const UNITS = ["katori", "bowl", "glass", "cup", "tbsp", "tsp", "small", "large"];

/**
 * Words that describe how a weight was taken rather than what was
 * weighed. "150 g cooked" is 150 g of the dish, not 150 g of a thing
 * called cooked — which is exactly what the shopping list said before
 * this existed.
 */
const QUALIFIERS = /^(cooked|raw|dry|uncooked|boiled|soaked|each|total|approx)$/;

/** Strips a leading count and serving unit: "1 katori dal" -> "dal". */
function stripCount(text: string): string {
  let rest = text.trim().replace(/^\d+(?:\.\d+)?\s+/, "");
  for (const unit of UNITS) {
    if (rest.startsWith(`${unit} `)) {
      rest = rest.slice(unit.length + 1);
      break;
    }
  }
  return rest.trim();
}

type Parsed = { quantity: number; unit: string; text: string };

/**
 * Pulls a quantity and unit off the front of a portion string.
 *
 * "2 roti"        -> 2, "",       "roti"
 * "1 katori dal"  -> 1, "katori", "dal"
 * "150g paneer"   -> 150, "g",    "paneer"
 * "+ 1 tbsp oats" -> 1, "tbsp",   "oats"   (a scaling addition)
 * "salad"         -> 1, "",       "salad"
 */
export function parsePortion(raw: string): Parsed {
  // Scaling additions arrive as "+ 1 roti" and count exactly the same.
  let text = raw.trim().replace(/^\+\s*/, "").toLowerCase();

  /*
   * Portions carry their weight in brackets: "1 katori dal (250 g)",
   * "2 roti (70 g atta)", "1 katori rice (150 g cooked)". The weight is
   * what you shop with, so it beats the spoken count whenever it exists.
   *
   * What follows the number decides what is being weighed:
   *   "(70 g atta)"    -> 70 g of atta, not of roti
   *   "(150 g cooked)" -> 150 g of the dish itself; "cooked" describes
   *                       the weight, it is not an ingredient
   *   "(250 g)"        -> 250 g of the dish itself
   */
  const bracketed = text.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (bracketed) {
    const [, outer, inside] = bracketed;
    const weight = inside.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l)\b\s*([a-z\s]*)/);

    if (weight) {
      const [, n, unit, trailing] = weight;
      const descriptor = trailing.trim();
      const named = descriptor && !QUALIFIERS.test(descriptor) ? descriptor : stripCount(outer);
      return { quantity: Number(n), unit, text: named };
    }
  }

  // Drop any remaining parenthetical so "(less oil)" cannot be mistaken
  // for the dish itself.
  text = text.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();

  // Weight or volume, where the number is glued to the unit: "150g paneer"
  const weight = text.match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|l)\b\s*(.*)$/);
  if (weight) {
    const [, n, unit, rest] = weight;
    return { quantity: Number(n), unit, text: rest.trim() };
  }

  const leading = text.match(/^(\d+(?:\.\d+)?)\s+(.*)$/);
  let quantity = 1;
  if (leading) {
    quantity = Number(leading[1]);
    text = leading[2];
  }

  for (const unit of UNITS) {
    if (text.startsWith(`${unit} `)) {
      return { quantity, unit, text: text.slice(unit.length + 1).trim() };
    }
  }

  return { quantity, unit: "", text: text.trim() };
}

function classify(text: string): Rule | null {
  for (const rule of RULES) {
    if (rule.match.test(text)) return rule;
  }
  return null;
}

/** Sentence case, so "roti (atta)" reads as a shopping list line. */
function titleCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function buildGroceryList(days: DayPlan[]): GroceryItem[] {
  const totals = new Map<string, GroceryItem>();

  for (const day of days) {
    for (const meal of day.meals) {
      for (const item of meal.items) {
        const { quantity, unit, text } = parsePortion(item);
        if (!text) continue;

        const rule = classify(text);
        const name = rule ? rule.name : titleCase(text);
        const category: GroceryCategory = rule ? rule.category : "Other";

        // Same ingredient measured two ways stays on two lines. Adding
        // 7 katori to 300g would invent a number nobody can shop from.
        const key = `${name}|${unit}`;
        const existing = totals.get(key);

        if (existing) {
          existing.quantity += quantity;
        } else {
          totals.set(key, { name, quantity, unit, category });
        }
      }
    }
  }

  return [...totals.values()].sort((a, b) => {
    const byCategory =
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    if (byCategory !== 0) return byCategory;
    return a.name.localeCompare(b.name);
  });
}

export type GroceryLine = {
  name: string;
  category: GroceryCategory;
  /** One entry per unit this ingredient was measured in */
  amounts: { quantity: number; unit: string }[];
};

/**
 * One line per ingredient, with its units kept side by side.
 *
 * Paneer turns up as grams in one dish and katoris in another, and
 * those genuinely cannot be added — but three separate "Paneer" lines
 * is a list nobody can shop from. So they merge into one line reading
 * "400g + 3 katori", which is both honest and usable.
 *
 * Largest unit first, because the big number is the one that decides
 * what you put in the basket.
 */
export function mergeByName(items: GroceryItem[]): GroceryLine[] {
  const lines = new Map<string, GroceryLine>();

  for (const item of items) {
    const existing = lines.get(item.name);
    if (existing) {
      existing.amounts.push({ quantity: item.quantity, unit: item.unit });
    } else {
      lines.set(item.name, {
        name: item.name,
        category: item.category,
        amounts: [{ quantity: item.quantity, unit: item.unit }],
      });
    }
  }

  for (const line of lines.values()) {
    line.amounts.sort((a, b) => b.quantity - a.quantity);
  }

  return [...lines.values()];
}

/** Groups the merged lines for display, skipping empty categories. */
export function groupByCategory(
  items: GroceryItem[],
): { category: GroceryCategory; items: GroceryLine[] }[] {
  const lines = mergeByName(items);
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: lines
      .filter((i) => i.category === category)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((group) => group.items.length > 0);
}

/** "×22", "7 katori", "450g" — one amount as a person would read it. */
export function formatQuantity(amount: { quantity: number; unit: string }): string {
  const n = Number.isInteger(amount.quantity)
    ? String(amount.quantity)
    : amount.quantity.toFixed(1);

  if (amount.unit === "") return `×${n}`;
  if (["g", "kg", "ml", "l"].includes(amount.unit)) return `${n}${amount.unit}`;
  return `${n} ${amount.unit}`;
}

/** "400g + 3 katori + 1 bowl" — every unit this ingredient came in. */
export function formatLine(line: GroceryLine): string {
  return line.amounts.map(formatQuantity).join(" + ");
}
