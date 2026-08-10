import type { DayPlan } from "@/lib/plan-types";

/* ===============================================================
   RECIPES
   ===============================================================
   The plan names dishes; this says how to make them.

   Matched by keyword against whatever ends up in the week, which
   means a dish Claude invented may have no recipe here. That is
   stated in the UI rather than hidden — a recipe book that silently
   covers two thirds of your week is worse than one that says which
   third it missed.

   Written for one portion, at the oil and portion sizes the plan
   assumes. Doubling the ghee doubles the calories the whole plan is
   built on, so the fat is specified rather than left to taste.
   =============================================================== */

export type Recipe = {
  /** Matched against the dish text, lowercased */
  match: RegExp;
  name: string;
  /** Rough hands-on time */
  minutes: number;
  ingredients: string[];
  steps: string[];
  /** The one thing people get wrong */
  tip?: string;
};

export const RECIPES: Recipe[] = [
  {
    match: /poha/,
    name: "Vegetable poha",
    minutes: 15,
    ingredients: [
      "60 g thick poha",
      "1 small onion, chopped",
      "1 potato, small dice (optional)",
      "1 tsp oil",
      "1 tsp mustard seeds, 8–10 curry leaves",
      "1/4 tsp turmeric, salt to taste",
      "2 tbsp roasted peanuts",
      "Lemon and coriander to finish",
    ],
    steps: [
      "Rinse the poha in a colander until just soft, then leave it to drain. Do not soak it.",
      "Heat the oil, crackle the mustard seeds, add curry leaves and onion. Cook until the onion turns translucent.",
      "Add potato if using, cover and cook 5 minutes until tender.",
      "Stir in turmeric and salt, then fold through the drained poha on a low flame for 2 minutes.",
      "Off the heat, add peanuts, lemon and coriander.",
    ],
    tip: "Rinsed, not soaked. Poha left sitting in water turns to paste in the pan.",
  },
  {
    match: /besan chilla|besan cheela/,
    name: "Besan chilla",
    minutes: 15,
    ingredients: [
      "60 g besan",
      "100 ml water",
      "1 small onion and 1 tomato, finely chopped",
      "1 green chilli, coriander",
      "1/4 tsp ajwain, salt, pinch of turmeric",
      "1 tsp oil for the pan",
    ],
    steps: [
      "Whisk the besan with water to a pouring batter with no lumps. Rest it 10 minutes.",
      "Stir in the vegetables, chilli, ajwain, turmeric and salt.",
      "Heat a tawa, brush with a little of the oil, pour a ladle and spread thin.",
      "Cook 2–3 minutes until the edges lift, flip, cook another minute.",
    ],
    tip: "Resting the batter is what stops it tasting raw and floury.",
  },
  {
    match: /moong dal chilla/,
    name: "Moong dal chilla",
    minutes: 20,
    ingredients: [
      "60 g yellow moong dal, soaked 3 hours",
      "1 green chilli, 1 cm ginger",
      "Salt, pinch of hing",
      "1 tsp oil",
      "40 g paneer, crumbled, for stuffing (optional)",
    ],
    steps: [
      "Drain the soaked dal and blend with chilli, ginger and just enough water for a thick batter.",
      "Season with salt and hing.",
      "Spread thin on a hot tawa with a little oil, cook 3 minutes until it lifts cleanly.",
      "Scatter paneer over one half, fold, and cook another minute.",
    ],
    tip: "Higher protein than besan chilla, and it holds a stuffing better.",
  },
  {
    match: /upma|rava/,
    name: "Vegetable upma",
    minutes: 20,
    ingredients: [
      "50 g rava (suji)",
      "1 tsp oil",
      "1 tsp mustard seeds, 1 tsp urad dal, curry leaves",
      "1 onion, 1 carrot, 2 tbsp peas",
      "250 ml hot water, salt",
    ],
    steps: [
      "Dry roast the rava on a low flame until it smells nutty and stops looking chalky. Set aside.",
      "Heat oil, crackle mustard seeds and urad dal, add curry leaves and onion.",
      "Add the vegetables and cook 3–4 minutes.",
      "Pour in the hot water with salt, bring to a boil, then rain in the rava while stirring constantly.",
      "Cover and steam 3 minutes off the heat.",
    ],
    tip: "Hot water, added while stirring. Cold water and a slow hand give you lumps.",
  },
  {
    match: /oats/,
    name: "Masala oats",
    minutes: 12,
    ingredients: [
      "50 g rolled oats",
      "1 tsp oil",
      "1 onion, 1 tomato, chopped",
      "Handful of peas, carrot or capsicum",
      "1/4 tsp turmeric, 1/2 tsp cumin, salt",
      "300 ml water",
    ],
    steps: [
      "Heat oil, cook cumin, then onion until soft.",
      "Add tomato and vegetables, cook until the tomato breaks down.",
      "Add turmeric, salt and water, bring to a boil.",
      "Stir in the oats and simmer 4–5 minutes until thick.",
    ],
    tip: "Rolled oats, not instant. Instant turns to glue at this water ratio.",
  },
  {
    match: /idli/,
    name: "Idli",
    minutes: 20,
    ingredients: ["Idli batter (fermented)", "Oil to grease the moulds"],
    steps: [
      "Grease the idli moulds lightly.",
      "Stir the batter gently — knocking the air out is what makes them dense.",
      "Fill each mould about three quarters full.",
      "Steam 10–12 minutes. A skewer should come out clean.",
      "Rest 2 minutes before unmoulding.",
    ],
    tip: "Shop-bought batter is fine and saves the overnight ferment.",
  },
  {
    match: /dosa/,
    name: "Dosa",
    minutes: 15,
    ingredients: ["Dosa batter (fermented)", "1 tsp oil", "Water to thin the batter"],
    steps: [
      "Thin the batter to a pouring consistency.",
      "Heat the tawa until a flick of water dances. Wipe with half an onion dipped in oil.",
      "Pour a ladle in the centre and spread outward in a spiral.",
      "Drizzle a few drops of oil at the edges, cook until golden and it lifts cleanly.",
    ],
    tip: "The pan must be hot enough that water dances, or the batter sticks and tears.",
  },
  {
    match: /dal tadka|katori dal|mixed dal|toor dal/,
    name: "Dal tadka",
    minutes: 30,
    ingredients: [
      "60 g toor dal (or a mix with masoor)",
      "1/4 tsp turmeric, salt",
      "1 tsp ghee or oil",
      "1 tsp cumin, 2 cloves garlic, 1 dry red chilli",
      "1 tomato, chopped, pinch of hing",
    ],
    steps: [
      "Pressure cook the dal with turmeric and salt in 400 ml water — 3 whistles, then rest.",
      "Whisk the cooked dal smooth and loosen with hot water if needed.",
      "Heat ghee, crackle cumin, add garlic and dry chilli and cook until the garlic turns golden.",
      "Add hing and tomato, cook until it softens, then pour the tadka over the dal.",
      "Simmer 2 minutes and finish with coriander.",
    ],
    tip: "The measured ghee matters — this is where a 1200 kcal day quietly becomes 1500.",
  },
  {
    match: /rajma/,
    name: "Rajma",
    minutes: 40,
    ingredients: [
      "60 g rajma, soaked overnight",
      "1 onion, 2 tomatoes, blended to a paste",
      "1 tsp ginger-garlic paste",
      "1 tsp oil",
      "1/2 tsp each cumin, coriander powder, garam masala; 1/4 tsp turmeric",
      "Salt",
    ],
    steps: [
      "Pressure cook the soaked rajma with salt for 5–6 whistles until it crushes easily.",
      "Heat oil, cook cumin, then the onion-tomato paste until it darkens and pulls from the pan.",
      "Add ginger-garlic and the dry spices, cook 2 minutes.",
      "Add the rajma with its cooking water and simmer 15 minutes.",
      "Mash a spoonful against the side to thicken the gravy.",
    ],
    tip: "The overnight soak is not optional — unsoaked rajma stays hard and is hard on the stomach.",
  },
  {
    match: /chole|chana masala|kabuli/,
    name: "Chana masala",
    minutes: 35,
    ingredients: [
      "60 g kabuli chana, soaked overnight",
      "1 onion, 2 tomatoes, chopped",
      "1 tsp ginger-garlic paste",
      "1 tsp oil",
      "1 tsp chana masala, 1/2 tsp cumin, 1/4 tsp turmeric, salt",
      "1 tsp lemon juice",
    ],
    steps: [
      "Pressure cook the soaked chana with salt for 5 whistles.",
      "Heat oil, cook cumin then onion until golden brown — take this further than feels necessary.",
      "Add ginger-garlic, then tomato, and cook until the oil separates.",
      "Add the spices and the cooked chana with its water, simmer 15 minutes.",
      "Finish with lemon.",
    ],
    tip: "Browning the onion properly is the whole dish. Pale onion gives you pale chana.",
  },
  {
    match: /khichdi/,
    name: "Moong dal khichdi",
    minutes: 25,
    ingredients: [
      "40 g rice, 30 g yellow moong dal",
      "1 tsp ghee",
      "1 tsp cumin, pinch of hing",
      "1/4 tsp turmeric, salt",
      "Carrot, peas, beans — whatever is in the fridge",
      "600 ml water",
    ],
    steps: [
      "Rinse rice and dal together until the water runs clear.",
      "Heat ghee in the cooker, crackle cumin, add hing and the vegetables.",
      "Add rice, dal, turmeric, salt and water.",
      "Pressure cook 3 whistles. Let the pressure drop on its own.",
      "Stir, and loosen with hot water — khichdi should pour, not stand up.",
    ],
    tip: "Loosen it before serving. It thickens dramatically as it sits.",
  },
  {
    match: /paneer bhurji/,
    name: "Paneer bhurji",
    minutes: 15,
    ingredients: [
      "120 g paneer, crumbled",
      "1 onion, 1 tomato, 1 capsicum, chopped fine",
      "1 tsp oil",
      "1/2 tsp cumin, 1/4 tsp turmeric, 1/2 tsp garam masala, salt",
      "Coriander",
    ],
    steps: [
      "Heat oil, cook cumin, then onion until translucent.",
      "Add capsicum and tomato, cook until the tomato collapses.",
      "Add turmeric, garam masala and salt.",
      "Fold in the paneer and cook 2 minutes only.",
      "Finish with coriander.",
    ],
    tip: "Two minutes. Paneer cooked longer goes rubbery and squeaks.",
  },
  {
    match: /palak paneer/,
    name: "Palak paneer",
    minutes: 25,
    ingredients: [
      "250 g spinach",
      "100 g paneer, cubed",
      "1 onion, 1 tomato",
      "1 tsp ginger-garlic paste",
      "1 tsp oil, 1/2 tsp cumin, 1/2 tsp garam masala, salt",
    ],
    steps: [
      "Blanch the spinach 2 minutes, then straight into cold water. Blend to a purée.",
      "Heat oil, cook cumin, onion, then ginger-garlic and tomato until soft.",
      "Add the spinach purée, salt and garam masala. Simmer 5 minutes only.",
      "Fold in the paneer and turn off the heat.",
    ],
    tip: "The cold water after blanching is what keeps it green instead of khaki.",
  },
  {
    match: /tofu/,
    name: "Tofu stir fry",
    minutes: 15,
    ingredients: [
      "150 g firm tofu, pressed and cubed",
      "Capsicum, beans, carrot, broccoli — 200 g total",
      "1 tsp oil",
      "1 tsp soy sauce, 1 clove garlic, chilli flakes",
      "Salt, pepper",
    ],
    steps: [
      "Press the tofu 15 minutes under something heavy, then cube.",
      "Sear the tofu in a hot pan without moving it until each side browns. Remove.",
      "Stir fry the garlic and vegetables on high heat for 3 minutes — they should stay crisp.",
      "Return the tofu, add soy sauce and chilli, toss for 1 minute.",
    ],
    tip: "Press it. Wet tofu steams in the pan instead of browning.",
  },
  {
    match: /soya (chunk|keema|granule)|soya/,
    name: "Soya chunk curry",
    minutes: 25,
    ingredients: [
      "50 g dry soya chunks",
      "1 onion, 2 tomatoes, blended",
      "1 tsp ginger-garlic paste",
      "1 tsp oil",
      "1/2 tsp each cumin, coriander powder, garam masala; 1/4 tsp turmeric, salt",
    ],
    steps: [
      "Boil the soya chunks 5 minutes, drain, and squeeze them out under cold water. Squeeze hard.",
      "Heat oil, cook cumin, then the onion-tomato paste until the oil separates.",
      "Add ginger-garlic and dry spices, cook 2 minutes.",
      "Add the squeezed chunks and 200 ml water, simmer 10 minutes.",
    ],
    tip: "Squeezing them out is what removes the raw soya smell people dislike.",
  },
  {
    match: /egg bhurji|egg curry|omelette|scrambled egg/,
    name: "Egg bhurji",
    minutes: 10,
    ingredients: [
      "2 whole eggs plus 2 whites",
      "1 onion, 1 tomato, 1 green chilli, chopped fine",
      "1 tsp oil",
      "1/4 tsp turmeric, salt, pepper",
      "Coriander",
    ],
    steps: [
      "Heat oil, cook the onion until soft, then chilli and tomato until it collapses.",
      "Add turmeric and salt.",
      "Beat the eggs and pour in, then stir constantly on a low flame.",
      "Take it off while it still looks slightly underdone.",
    ],
    tip: "Low flame, constant stirring, off early. Eggs carry on cooking in the pan.",
  },
  {
    match: /grilled chicken|chicken breast|tandoori chicken|chicken tikka/,
    name: "Grilled chicken",
    minutes: 25,
    ingredients: [
      "150 g chicken breast",
      "2 tbsp curd",
      "1 tsp ginger-garlic paste",
      "1/2 tsp each red chilli, garam masala, salt",
      "1 tsp lemon juice, 1 tsp oil",
    ],
    steps: [
      "Flatten the breast to an even thickness so it cooks through without drying.",
      "Marinate in curd, ginger-garlic, spices and lemon for at least 30 minutes.",
      "Cook on a hot, lightly oiled pan 5–6 minutes a side without moving it.",
      "Rest 5 minutes before slicing.",
    ],
    tip: "Resting it is why restaurant chicken is juicy and yours is not.",
  },
  {
    match: /chicken curry|chicken keema/,
    name: "Chicken curry",
    minutes: 35,
    ingredients: [
      "150 g chicken, bone-in or boneless",
      "1 onion, 2 tomatoes, blended",
      "1 tsp ginger-garlic paste",
      "1 tsp oil",
      "1/2 tsp each turmeric, red chilli, coriander powder, garam masala; salt",
    ],
    steps: [
      "Heat oil, brown the onion paste well, then add ginger-garlic.",
      "Add tomato and the dry spices, cook until the oil separates from the masala.",
      "Add the chicken and coat it in the masala, cooking 5 minutes on high.",
      "Add 200 ml water, cover and simmer 20 minutes.",
    ],
  },
  {
    match: /grilled fish|fish curry|rohu|pomfret|surmai/,
    name: "Pan-grilled fish",
    minutes: 20,
    ingredients: [
      "150 g fish fillet",
      "1 tsp ginger-garlic paste",
      "1/2 tsp turmeric, 1/2 tsp red chilli, salt",
      "1 tsp lemon juice, 1 tsp oil",
    ],
    steps: [
      "Pat the fish completely dry — this decides whether it browns or steams.",
      "Rub with ginger-garlic, spices, salt and lemon. Rest 15 minutes.",
      "Cook on a hot oiled pan 3–4 minutes a side, turning once only.",
    ],
    tip: "Dry fish, hot pan, one turn. Fiddling with it is how fillets fall apart.",
  },
  {
    match: /sprouts/,
    name: "Sprouts chaat",
    minutes: 10,
    ingredients: [
      "150 g mixed sprouts, steamed 5 minutes",
      "1 onion, 1 tomato, 1 cucumber, chopped",
      "1 green chilli",
      "Lemon, chaat masala, salt",
      "Coriander",
    ],
    steps: [
      "Steam the sprouts 5 minutes — raw sprouts are hard to digest.",
      "Cool them, then toss everything together.",
      "Dress with lemon, chaat masala and salt just before eating.",
    ],
    tip: "Dress it at the table. Salt draws water out and turns it into soup within an hour.",
  },
  {
    match: /sambar/,
    name: "Sambar",
    minutes: 35,
    ingredients: [
      "60 g toor dal",
      "Drumstick, pumpkin, brinjal, carrot — 200 g total",
      "1 tbsp tamarind pulp",
      "1.5 tbsp sambar powder, 1/4 tsp turmeric, salt",
      "1 tsp oil, 1 tsp mustard seeds, curry leaves, 1 dry red chilli",
    ],
    steps: [
      "Pressure cook the dal with turmeric until soft, then whisk smooth.",
      "Boil the vegetables with tamarind, sambar powder and salt until tender.",
      "Add the dal and simmer 10 minutes.",
      "Temper mustard seeds, curry leaves and red chilli in oil, and pour over.",
    ],
  },
  {
    match: /raita|curd/,
    name: "Cucumber raita",
    minutes: 5,
    ingredients: [
      "150 g curd",
      "1 cucumber, grated and squeezed",
      "1/4 tsp roasted cumin powder",
      "Salt, black salt, coriander",
    ],
    steps: [
      "Whisk the curd smooth with a splash of water.",
      "Squeeze the water out of the grated cucumber and fold it in.",
      "Season with cumin, salt and coriander.",
    ],
    tip: "Squeeze the cucumber, or the raita is watery within ten minutes.",
  },
  {
    match: /dalia/,
    name: "Vegetable dalia",
    minutes: 25,
    ingredients: [
      "60 g dalia (broken wheat)",
      "1 tsp ghee",
      "1 tsp cumin, 1 onion",
      "Carrot, peas, beans — 150 g",
      "500 ml water, salt",
    ],
    steps: [
      "Dry roast the dalia until it smells nutty.",
      "Heat ghee, crackle cumin, cook the onion, then the vegetables.",
      "Add the dalia, water and salt.",
      "Pressure cook 2 whistles, or simmer covered for 15 minutes.",
    ],
  },
  {
    match: /roti|paratha|atta/,
    name: "Roti",
    minutes: 20,
    ingredients: ["70 g atta", "Warm water", "Pinch of salt"],
    steps: [
      "Add water gradually and knead 5 minutes to a soft, non-sticky dough.",
      "Rest it 20 minutes under a damp cloth.",
      "Divide, roll thin and even.",
      "Cook on a hot tawa until bubbles rise, flip, then press the edges until it puffs.",
    ],
    tip: "Rest the dough. Unrested dough gives you rotis like poppadoms.",
  },
];

export type MatchedRecipe = { recipe: Recipe; dishes: string[] };

/**
 * Things nobody needs a method for.
 *
 * Without this the "dishes without a recipe" count is dominated by
 * salad, almonds and a glass of buttermilk, which makes the recipe
 * book look far patchier than it is and buries the dishes that
 * genuinely are missing one.
 */
const NEEDS_NO_RECIPE =
  /^(salad|lemon and onion|papad|green chutney|coconut chutney)$|^\d+\s*(g\s*)?(almond|walnut|peanut|cashew)|banana|apple|orange|cucumber|fruit|makhana|khakhra|roasted chana|black chana|sprouts salad|chaas|buttermilk|glass of|soy milk|glass milk|green tea|black tea|black coffee|cup of tea|chai|boiled egg|jaggery|chia|flax|whey|sattu/;

/**
 * The recipes worth showing for this week, and the dishes each covers.
 *
 * Deliberately reports what it could not match. A book that quietly
 * covers two thirds of the week reads as complete and is not.
 */
export function recipesForWeek(days: DayPlan[]): {
  matched: MatchedRecipe[];
  /** Dishes you would actually cook that have no recipe here yet */
  unmatchedCount: number;
  coveredCount: number;
} {
  const dishes = new Set<string>();
  for (const day of days) {
    for (const meal of day.meals) {
      for (const item of meal.items) {
        const clean = item.replace(/^\+\s*/, "").trim();
        if (clean) dishes.add(clean);
      }
    }
  }

  const byRecipe = new Map<string, MatchedRecipe>();
  let needingRecipe = 0;
  let covered = 0;

  for (const dish of dishes) {
    const text = dish.toLowerCase();
    const recipe = RECIPES.find((r) => r.match.test(text));

    if (recipe) {
      covered++;
      const existing = byRecipe.get(recipe.name);
      if (existing) existing.dishes.push(dish);
      else byRecipe.set(recipe.name, { recipe, dishes: [dish] });
      continue;
    }

    // Unmatched, but only worth reporting if it is something you cook.
    if (!NEEDS_NO_RECIPE.test(text)) needingRecipe++;
  }

  return {
    matched: [...byRecipe.values()].sort((a, b) => b.dishes.length - a.dishes.length),
    unmatchedCount: needingRecipe,
    coveredCount: covered,
  };
}
