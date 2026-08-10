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
  /* =============================================================
     REGIONAL FIRST.
     ============================================================= 
     Matching runs top to bottom and takes the first hit, so the
     specific dishes have to sit above the generic ones. Without this,
     "curd rice" is caught by the raita rule and "makki roti" by the
     roti rule, and a South Indian week gets a North Indian method.
     ============================================================= */

  // ---------------- South Indian ----------------
  {
    match: /pesarattu/,
    name: "Pesarattu",
    minutes: 25,
    ingredients: [
      "70 g whole green moong, soaked 4 hours",
      "1 green chilli, 1 cm ginger, 1/2 tsp cumin",
      "Salt",
      "1 onion, chopped fine, to scatter",
      "1 tsp oil",
    ],
    steps: [
      "Blend the soaked moong with chilli, ginger, cumin and just enough water for a thick, pourable batter.",
      "Season with salt. No fermenting needed — this is made fresh.",
      "Spread thick on a hot tawa, thicker than a dosa.",
      "Scatter chopped onion over the top and press it in.",
      "Cook 3–4 minutes until the base is crisp, flip for a minute.",
    ],
    tip: "Thicker than a dosa on purpose. Spread it thin and it tears.",
  },
  {
    match: /ragi mudde|ragi ball|ragi sangati/,
    name: "Ragi mudde",
    minutes: 20,
    ingredients: ["80 g ragi flour", "400 ml water", "Salt", "1 tsp ghee (optional)"],
    steps: [
      "Boil the water with salt.",
      "Rain in a quarter of the ragi while whisking hard to make a slurry with no lumps.",
      "Add the rest, cover, and cook on low 5 minutes without stirring.",
      "Now beat it with a wooden spoon against the side of the pan until it comes together as one smooth mass.",
      "Wet your hands and roll into balls.",
    ],
    tip: "Swallow it in pieces with saaru rather than chewing — that is how it is eaten, and it sits far lighter.",
  },
  {
    match: /pongal/,
    name: "Ven pongal",
    minutes: 25,
    ingredients: [
      "50 g raw rice, 30 g split yellow moong dal",
      "1 tsp ghee",
      "1 tsp whole black pepper, 1 tsp cumin",
      "1 cm ginger, curry leaves, 10 cashews",
      "500 ml water, salt",
    ],
    steps: [
      "Dry roast the moong dal until it smells nutty, then rinse with the rice.",
      "Pressure cook rice and dal with water and salt for 4 whistles — it should be soft and loose.",
      "Heat ghee, fry cashews, then pepper, cumin, ginger and curry leaves.",
      "Pour the tempering over and mash everything together.",
    ],
    tip: "Whole pepper, not powder. Biting into one is the point of the dish.",
  },
  {
    match: /curd rice|thayir sadam/,
    name: "Curd rice",
    minutes: 15,
    ingredients: [
      "60 g rice, cooked soft",
      "200 g curd",
      "1 tsp oil, 1 tsp mustard seeds, 1 dry red chilli, curry leaves",
      "1 cm ginger, grated",
      "Salt, coriander",
    ],
    steps: [
      "Mash the warm cooked rice with the back of a spoon until it loses its grain.",
      "Let it cool to room temperature, then fold in the curd and salt.",
      "Temper mustard seeds, red chilli, curry leaves and ginger in oil.",
      "Stir through and rest 10 minutes.",
    ],
    tip: "Cool the rice first. Hot rice splits the curd and turns it grainy.",
  },
  {
    match: /rasam/,
    name: "Rasam",
    minutes: 20,
    ingredients: [
      "1 tbsp tamarind pulp",
      "2 tomatoes, crushed",
      "2 tsp rasam powder, 1/4 tsp turmeric, salt",
      "2 cloves garlic, crushed",
      "1 tsp ghee, 1 tsp mustard seeds, curry leaves",
      "Coriander, 400 ml water",
    ],
    steps: [
      "Simmer tamarind, tomato, rasam powder, turmeric and salt in the water for 10 minutes.",
      "It should froth at the edges. Do not let it boil hard.",
      "Temper mustard seeds, garlic and curry leaves in ghee and pour over.",
      "Finish with coriander and turn the heat off immediately.",
    ],
    tip: "Never boil rasam. Once it rolls it goes bitter and flat.",
  },
  {
    match: /avial/,
    name: "Avial",
    minutes: 30,
    ingredients: [
      "300 g mixed vegetables (drumstick, carrot, beans, raw banana, ash gourd), cut in batons",
      "1/2 cup grated coconut, 1 green chilli, 1/2 tsp cumin",
      "100 g curd",
      "1 tbsp coconut oil, curry leaves, salt",
    ],
    steps: [
      "Cook the vegetables with turmeric, salt and a little water until just tender — they should hold their shape.",
      "Coarsely grind coconut with chilli and cumin.",
      "Stir the paste through and cook 3 minutes.",
      "Off the heat, fold in the curd, then the raw coconut oil and curry leaves.",
    ],
    tip: "Coconut oil goes in raw at the end. Cooking it loses the whole aroma.",
  },
  {
    match: /uttapam/,
    name: "Uttapam",
    minutes: 15,
    ingredients: [
      "Dosa batter, slightly thick",
      "1 onion, 1 tomato, 1 green chilli, chopped fine",
      "Coriander, 1 tsp oil",
    ],
    steps: [
      "Pour a thick round of batter on a medium tawa — do not spread it thin.",
      "Scatter the vegetables on top and press them in with the back of a ladle.",
      "Drizzle oil at the edges and cook covered 4 minutes until the top sets.",
      "Flip and give it 2 minutes on the vegetable side.",
    ],
    tip: "Medium heat, covered. High heat browns the base before the top cooks.",
  },
  {
    match: /lemon rice|chitranna/,
    name: "Lemon rice",
    minutes: 15,
    ingredients: [
      "60 g rice, cooked and cooled",
      "1 tsp oil, 1 tsp mustard seeds, 1 tsp chana dal, 1 tsp urad dal",
      "2 tbsp peanuts, curry leaves, 1 dry red chilli",
      "1/4 tsp turmeric, juice of half a lemon, salt",
    ],
    steps: [
      "Spread the cooked rice out to cool and dry — warm rice goes mushy.",
      "Temper mustard seeds, both dals and peanuts in oil until golden.",
      "Add curry leaves, red chilli and turmeric.",
      "Fold through the rice with salt, then take it off the heat before adding the lemon.",
    ],
    tip: "Lemon goes in off the heat. Cooked lemon juice turns bitter.",
  },

  // ---------------- Bengali ----------------
  {
    match: /macher jhol|maacher jhol|fish jhol/,
    name: "Macher jhol",
    minutes: 30,
    ingredients: [
      "200 g rohu or any firm fish, cut into steaks",
      "1/2 tsp turmeric and salt, to rub",
      "1 potato, quartered lengthways",
      "1 tsp panch phoron, 1 bay leaf",
      "1 tsp ginger paste, 1 tomato",
      "1 tbsp mustard oil, 1/2 tsp turmeric, salt",
    ],
    steps: [
      "Rub the fish with turmeric and salt, rest 10 minutes.",
      "Heat mustard oil until it smokes, then cool it slightly. Fry the fish 2 minutes a side and set aside.",
      "In the same oil, fry the potato, then add panch phoron and bay leaf.",
      "Add ginger, tomato, turmeric and salt, then 400 ml water. Simmer until the potato is tender.",
      "Slide the fish back in for the last 5 minutes only.",
    ],
    tip: "Smoke the mustard oil first. Raw mustard oil is harsh and takes over the dish.",
  },
  {
    match: /shukto/,
    name: "Shukto",
    minutes: 30,
    ingredients: [
      "300 g mixed vegetables including bitter gourd, raw banana, drumstick, potato",
      "1 tsp panch phoron, 1 bay leaf",
      "1 tbsp poppy seed and mustard paste",
      "100 ml milk",
      "1 tbsp mustard oil, 1/2 tsp ginger paste, salt",
    ],
    steps: [
      "Fry the bitter gourd separately until it browns, and keep it aside.",
      "Temper panch phoron and bay leaf in mustard oil.",
      "Add the remaining vegetables with ginger, salt and a little water. Cover and cook until tender.",
      "Stir in the poppy-mustard paste and the milk, and simmer 5 minutes.",
      "Return the bitter gourd at the very end.",
    ],
    tip: "Bitter gourd fried separately and added last — cooked through the whole dish it turns everything bitter.",
  },
  {
    match: /cholar dal/,
    name: "Cholar dal",
    minutes: 35,
    ingredients: [
      "60 g chana dal, soaked 1 hour",
      "1 bay leaf, 1 dry red chilli, 1/2 tsp cumin seeds",
      "2 tbsp coconut, cut in small pieces",
      "1/2 tsp ginger paste, 1/4 tsp turmeric",
      "1 tsp ghee, 1 tsp sugar, salt",
    ],
    steps: [
      "Pressure cook the chana dal with turmeric and salt for 3 whistles — it should hold its shape, not collapse.",
      "Fry the coconut pieces in ghee until golden and set aside.",
      "In the same ghee, temper bay leaf, red chilli and cumin.",
      "Add the dal, ginger and sugar, and simmer 5 minutes.",
      "Scatter the fried coconut over the top.",
    ],
    tip: "The dal should stay whole. Cholar dal collapsed into a purée is just dal.",
  },
  {
    match: /ghugni/,
    name: "Ghugni",
    minutes: 35,
    ingredients: [
      "60 g dried white peas, soaked overnight",
      "1 onion, 1 tomato, chopped",
      "1 tsp ginger paste, 1/2 tsp cumin powder, 1/4 tsp turmeric",
      "1 tsp oil, 1/2 tsp roasted cumin powder to finish",
      "Salt, lemon, chopped onion and coriander to serve",
    ],
    steps: [
      "Pressure cook the soaked peas with salt and turmeric for 4 whistles.",
      "Fry the onion until golden, add ginger, tomato and cumin powder, cook until the oil separates.",
      "Add the peas with their water and simmer 10 minutes, mashing a few against the side.",
      "Finish with roasted cumin, lemon, raw onion and coriander.",
    ],
  },
  {
    match: /posto|aloo posto/,
    name: "Aloo posto",
    minutes: 25,
    ingredients: [
      "3 tbsp poppy seeds, soaked 30 minutes",
      "2 potatoes, cubed",
      "2 green chillies",
      "1 tbsp mustard oil, 1/4 tsp nigella seeds, salt",
    ],
    steps: [
      "Grind the soaked poppy seeds with the chillies and a little water to a smooth paste.",
      "Heat mustard oil, crackle nigella seeds, add the potato and fry 5 minutes.",
      "Add the poppy paste and salt, then a splash of water.",
      "Cover and cook on low until the potato is tender and the paste clings to it.",
    ],
    tip: "Soak the poppy seeds properly or the paste stays gritty.",
  },

  // ---------------- Gujarati ----------------
  {
    match: /dhokla/,
    name: "Khaman dhokla",
    minutes: 30,
    ingredients: [
      "60 g besan",
      "1 tsp ginger-chilli paste, 1 tsp sugar, salt",
      "1 tsp lemon juice, 100 ml water",
      "1 tsp eno fruit salt",
      "For tempering: 1 tsp oil, 1 tsp mustard seeds, 2 slit chillies, curry leaves, 1 tsp sugar in 50 ml water",
    ],
    steps: [
      "Whisk besan, ginger-chilli, sugar, salt, lemon and water to a smooth lump-free batter.",
      "Get the steamer hot and the tin greased before the next step.",
      "Add eno, stir for five seconds only, and pour straight into the tin.",
      "Steam 15 minutes. A skewer should come out clean.",
      "Temper mustard seeds, chillies and curry leaves, add the sugar water, and pour over the cut dhokla.",
    ],
    tip: "Eno goes in last, gets five seconds of stirring, and goes straight to the steamer. Stir it longer and the air is gone.",
  },
  {
    match: /thepla/,
    name: "Methi thepla",
    minutes: 25,
    ingredients: [
      "70 g atta, 1 tbsp besan",
      "1 cup methi leaves, chopped fine",
      "2 tbsp curd",
      "1/4 tsp turmeric, 1/2 tsp red chilli, 1/2 tsp ginger-chilli paste, salt",
      "1 tsp oil, plus a little for cooking",
    ],
    steps: [
      "Mix everything into a dough using the curd and the water the methi releases. Add plain water only if needed.",
      "Rest 15 minutes.",
      "Roll thin — thinner than a roti.",
      "Cook on a medium tawa with a few drops of oil until brown spots appear on both sides.",
    ],
    tip: "Thin and slow. Thick theplas stay soft for an hour; thin ones keep for days.",
  },
  {
    match: /handvo/,
    name: "Handvo",
    minutes: 45,
    ingredients: [
      "60 g handvo flour (or rice and dal, coarsely ground)",
      "100 g curd",
      "1 cup grated bottle gourd, squeezed",
      "1 tsp ginger-chilli paste, 1/4 tsp turmeric, salt, 1 tsp sugar",
      "1 tsp eno",
      "1 tbsp oil, 1 tsp mustard and sesame seeds",
    ],
    steps: [
      "Mix the flour with curd and rest 4 hours to sour slightly.",
      "Fold in the squeezed gourd, ginger-chilli, turmeric, salt and sugar.",
      "Add eno, stir briefly.",
      "Temper mustard and sesame in oil in a pan, pour the batter over, cover and cook on low 20 minutes.",
      "Flip carefully and cook another 10 until both sides are crusted.",
    ],
    tip: "Low heat and patience. The crust is the dish, and it will not form in a hurry.",
  },
  {
    match: /gujarati kadhi|^kadhi$|katori kadhi/,
    name: "Gujarati kadhi",
    minutes: 20,
    ingredients: [
      "200 g curd, slightly sour",
      "2 tbsp besan",
      "400 ml water",
      "1 tsp ginger-chilli paste, 1 tsp sugar, salt",
      "1 tsp ghee, 1 tsp mustard and cumin seeds, curry leaves, 1 dry red chilli, pinch of hing",
    ],
    steps: [
      "Whisk curd, besan and water together until completely smooth. Any lump now is a lump forever.",
      "Add ginger-chilli, sugar and salt, and bring to a simmer stirring constantly in one direction.",
      "Once it simmers, lower the heat and cook 10 minutes.",
      "Temper the spices in ghee and pour over.",
    ],
    tip: "Stir constantly until it comes to a simmer, or the curd splits.",
  },

  // ---------------- Maharashtrian ----------------
  {
    match: /misal|usal/,
    name: "Misal",
    minutes: 40,
    ingredients: [
      "60 g moth beans or mixed sprouts",
      "1 onion, 1 tomato, 2 tbsp grated coconut",
      "1 tbsp goda or misal masala, 1/4 tsp turmeric",
      "1 tsp oil, salt",
      "To serve: chopped onion, coriander, lemon, farsan, 1 pav",
    ],
    steps: [
      "Pressure cook the sprouts with salt and turmeric for 3 whistles.",
      "Dry roast onion and coconut until deep brown, then grind with tomato to a paste.",
      "Fry the paste in oil with the masala until the oil separates — this is the kat.",
      "Add the cooked sprouts and enough water for a thin gravy, simmer 10 minutes.",
      "Top with onion, coriander, farsan and lemon at the table.",
    ],
    tip: "Roast the coconut until genuinely dark. Pale coconut gives you a pale, flat kat.",
  },
  {
    match: /thalipeeth/,
    name: "Thalipeeth",
    minutes: 25,
    ingredients: [
      "70 g bhajani flour (or a mix of jowar, bajra, besan and rice flour)",
      "1 onion, chopped fine",
      "1 tsp ginger-chilli paste, 1/4 tsp turmeric, salt, coriander",
      "1 tsp oil",
    ],
    steps: [
      "Mix everything with warm water into a soft dough. It will not be as elastic as atta — that is normal.",
      "Wet your palm and pat the dough directly into a round on a greased tawa or on foil.",
      "Make a hole in the centre so the middle cooks.",
      "Cook covered on medium with oil around the edges, 4 minutes a side.",
    ],
    tip: "Patted with a wet hand, not rolled. This dough tears under a rolling pin.",
  },
  {
    match: /zunka|pithla/,
    name: "Zunka",
    minutes: 15,
    ingredients: [
      "60 g besan",
      "2 onions, chopped",
      "1 tsp oil, 1 tsp mustard seeds, pinch of hing",
      "2 green chillies, 1/4 tsp turmeric, salt",
      "150 ml water, coriander",
    ],
    steps: [
      "Temper mustard seeds and hing in oil, add onion and chillies, and cook until soft.",
      "Add turmeric and salt, then the water and bring to a boil.",
      "Rain in the besan while stirring hard to keep it lump-free.",
      "Cook on low 5 minutes until it comes away from the pan.",
    ],
    tip: "Besan into boiling water while stirring — the other way round gives you lumps you cannot fix.",
  },

  // ---------------- Punjabi ----------------
  {
    match: /saag|sarson/,
    name: "Sarson da saag",
    minutes: 50,
    ingredients: [
      "400 g mustard greens, 150 g spinach, 50 g bathua",
      "1 cm ginger, 2 green chillies",
      "2 tbsp makki flour",
      "1 tsp ghee, 1 onion, 2 cloves garlic, 1 tomato",
      "Salt",
    ],
    steps: [
      "Pressure cook the greens with ginger, chillies, salt and a little water for 5 whistles.",
      "Blend coarsely — it should still have texture.",
      "Return to the pan, sprinkle in the makki flour while stirring, and simmer 20 minutes.",
      "Fry onion, garlic and tomato in ghee until browned, and stir through.",
    ],
    tip: "The makki flour is not optional — it is what stops saag being watery.",
  },
  {
    match: /makki roti|makki di roti/,
    name: "Makki di roti",
    minutes: 25,
    ingredients: ["70 g makki flour", "Hot water", "Salt", "1 tsp ghee"],
    steps: [
      "Knead the flour with hot water and salt. It will feel crumbly, not stretchy — makki has no gluten.",
      "Pat between two sheets of plastic or on a damp cloth rather than rolling.",
      "Cook on a hot tawa, turning carefully — it cracks easily.",
      "Finish with ghee.",
    ],
    tip: "Hot water, and pat rather than roll. Cold water gives you a dough that falls apart in your hands.",
  },
  {
    match: /kadhi pakora|punjabi kadhi/,
    name: "Punjabi kadhi pakora",
    minutes: 45,
    ingredients: [
      "200 g sour curd, 3 tbsp besan, 500 ml water",
      "1/2 tsp turmeric, salt",
      "For pakoras: 40 g besan, 1 onion, pinch of soda, 1 tsp oil to shallow fry",
      "1 tsp ghee, 1 tsp cumin, 1 dry red chilli, pinch of hing, 1/2 tsp red chilli powder",
    ],
    steps: [
      "Whisk curd, besan, turmeric, salt and water until completely smooth.",
      "Bring to a simmer stirring constantly, then cook uncovered on low for 30 minutes until it thickens and darkens.",
      "Meanwhile make thick onion pakora batter and shallow fry small ones.",
      "Add the pakoras for the last 10 minutes so they soak but keep their shape.",
      "Temper cumin, red chilli and hing in ghee and pour over.",
    ],
    tip: "Thirty minutes of slow cooking is what separates kadhi from besan soup. There is no shortcut.",
  },

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
