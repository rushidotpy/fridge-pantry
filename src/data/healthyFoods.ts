import type { Category, Location } from '../lib/types'

export type HealthTag = 'protein' | 'fiber' | 'omega-3' | 'vitamins' | 'probiotic' | 'whole grain' | 'healthy fat' | 'iron' | 'calcium' | 'antioxidants'

export interface HealthyFood {
  name: string
  category: Category
  location: Location
  why: string
  tags: HealthTag[]
  /** Other names to match against inventory. */
  aliases?: string[]
}

export const HEALTHY_FOODS: HealthyFood[] = [
  { name: 'Spinach', category: 'produce', location: 'fridge', why: 'Iron, folate, vitamin K. Wilts into almost anything.', tags: ['iron', 'vitamins'], aliases: ['baby spinach'] },
  { name: 'Broccoli', category: 'produce', location: 'fridge', why: 'Fiber and vitamin C; roasts in 15 minutes.', tags: ['fiber', 'vitamins'] },
  { name: 'Kale', category: 'produce', location: 'fridge', why: 'Dense in vitamins A, C and K.', tags: ['vitamins', 'antioxidants'] },
  { name: 'Carrots', category: 'produce', location: 'fridge', why: 'Beta-carotene, cheap, and last for weeks.', tags: ['vitamins', 'fiber'] },
  { name: 'Bell peppers', category: 'produce', location: 'fridge', why: 'More vitamin C than oranges.', tags: ['vitamins', 'antioxidants'], aliases: ['red pepper', 'peppers'] },
  { name: 'Tomatoes', category: 'produce', location: 'fridge', why: 'Lycopene and vitamin C.', tags: ['antioxidants', 'vitamins'], aliases: ['cherry tomatoes'] },
  { name: 'Avocado', category: 'produce', location: 'fridge', why: 'Monounsaturated fat and potassium.', tags: ['healthy fat', 'fiber'], aliases: ['avocados'] },
  { name: 'Berries', category: 'produce', location: 'fridge', why: 'Among the most antioxidant-rich fruits.', tags: ['antioxidants', 'fiber'], aliases: ['blueberries', 'strawberries', 'raspberries'] },
  { name: 'Bananas', category: 'produce', location: 'pantry', why: 'Potassium and quick energy.', tags: ['vitamins'], aliases: ['banana'] },
  { name: 'Apples', category: 'produce', location: 'fridge', why: 'Fiber-rich, keeps for a month in the fridge.', tags: ['fiber'], aliases: ['apple'] },
  { name: 'Oranges', category: 'produce', location: 'fridge', why: 'Vitamin C and hydration.', tags: ['vitamins'], aliases: ['orange', 'clementines', 'mandarins'] },
  { name: 'Sweet potatoes', category: 'produce', location: 'pantry', why: 'Beta-carotene and slow-release carbs.', tags: ['fiber', 'vitamins'], aliases: ['sweet potato'] },
  { name: 'Garlic', category: 'produce', location: 'pantry', why: 'Flavor base with immune-supporting compounds.', tags: ['antioxidants'] },
  { name: 'Onions', category: 'produce', location: 'pantry', why: 'Quercetin; base of most savory dishes.', tags: ['antioxidants'], aliases: ['onion', 'red onion'] },
  { name: 'Mushrooms', category: 'produce', location: 'fridge', why: 'Vitamin D and umami without meat.', tags: ['vitamins'] },
  { name: 'Eggs', category: 'eggs', location: 'fridge', why: 'Complete protein, choline, fast meals.', tags: ['protein'] },
  { name: 'Greek yogurt', category: 'dairy', location: 'fridge', why: 'Protein plus live cultures.', tags: ['protein', 'probiotic', 'calcium'], aliases: ['yogurt', 'yoghurt'] },
  { name: 'Cottage cheese', category: 'dairy', location: 'fridge', why: 'Very high protein per calorie.', tags: ['protein', 'calcium'] },
  { name: 'Milk', category: 'dairy', location: 'fridge', why: 'Calcium and vitamin D.', tags: ['calcium', 'protein'], aliases: ['whole milk', 'oat milk', 'soy milk'] },
  { name: 'Kefir', category: 'dairy', location: 'fridge', why: 'Wider range of probiotics than yogurt.', tags: ['probiotic', 'calcium'] },
  { name: 'Chicken breast', category: 'meat', location: 'fridge', why: 'Lean protein staple.', tags: ['protein'], aliases: ['chicken', 'chicken thighs'] },
  { name: 'Salmon', category: 'seafood', location: 'freezer', why: 'Omega-3s; frozen fillets keep for months.', tags: ['omega-3', 'protein'] },
  { name: 'Canned tuna', category: 'canned', location: 'pantry', why: 'Shelf-stable protein and omega-3.', tags: ['protein', 'omega-3'], aliases: ['tuna'] },
  { name: 'Sardines', category: 'canned', location: 'pantry', why: 'Omega-3, calcium, and very affordable.', tags: ['omega-3', 'calcium'] },
  { name: 'Tofu', category: 'legumes', location: 'fridge', why: 'Plant protein that takes any flavor.', tags: ['protein', 'calcium'] },
  { name: 'Lentils', category: 'legumes', location: 'pantry', why: 'Protein, fiber, iron; cooks in 20 minutes.', tags: ['protein', 'fiber', 'iron'] },
  { name: 'Chickpeas', category: 'canned', location: 'pantry', why: 'Fiber and protein; hummus, salads, roasting.', tags: ['protein', 'fiber'], aliases: ['garbanzo beans'] },
  { name: 'Black beans', category: 'canned', location: 'pantry', why: 'Fiber and folate.', tags: ['fiber', 'protein'], aliases: ['beans', 'kidney beans'] },
  { name: 'Edamame', category: 'frozen', location: 'freezer', why: 'Complete plant protein snack.', tags: ['protein', 'fiber'] },
  { name: 'Oats', category: 'grains', location: 'pantry', why: 'Beta-glucan fiber for cholesterol.', tags: ['whole grain', 'fiber'], aliases: ['oatmeal', 'rolled oats'] },
  { name: 'Brown rice', category: 'grains', location: 'pantry', why: 'Whole grain base for bowls.', tags: ['whole grain', 'fiber'] },
  { name: 'Quinoa', category: 'grains', location: 'pantry', why: 'Complete protein grain.', tags: ['whole grain', 'protein'] },
  { name: 'Whole grain bread', category: 'bakery', location: 'pantry', why: 'Fiber; freeze half the loaf.', tags: ['whole grain', 'fiber'], aliases: ['bread', 'whole wheat bread'] },
  { name: 'Whole wheat pasta', category: 'grains', location: 'pantry', why: 'More fiber than white pasta.', tags: ['whole grain', 'fiber'], aliases: ['pasta'] },
  { name: 'Nuts', category: 'snacks', location: 'pantry', why: 'Healthy fats and satiety.', tags: ['healthy fat', 'protein'], aliases: ['almonds', 'walnuts', 'cashews', 'peanuts'] },
  { name: 'Peanut butter', category: 'condiments', location: 'pantry', why: 'Protein and fat; check for no added sugar.', tags: ['protein', 'healthy fat'], aliases: ['almond butter'] },
  { name: 'Chia seeds', category: 'grains', location: 'pantry', why: 'Omega-3 and fiber.', tags: ['omega-3', 'fiber'] },
  { name: 'Flaxseed', category: 'grains', location: 'pantry', why: 'Plant omega-3; grind before use.', tags: ['omega-3', 'fiber'], aliases: ['flax'] },
  { name: 'Olive oil', category: 'condiments', location: 'pantry', why: 'Cornerstone healthy fat.', tags: ['healthy fat', 'antioxidants'], aliases: ['extra virgin olive oil'] },
  { name: 'Frozen vegetables', category: 'frozen', location: 'freezer', why: 'Same nutrients, zero waste.', tags: ['fiber', 'vitamins'], aliases: ['frozen peas', 'frozen broccoli', 'mixed vegetables'] },
  { name: 'Frozen berries', category: 'frozen', location: 'freezer', why: 'Smoothies and oats, no spoilage.', tags: ['antioxidants', 'fiber'] },
  { name: 'Hummus', category: 'condiments', location: 'fridge', why: 'Fiber and protein dip.', tags: ['fiber', 'protein'] },
  { name: 'Kimchi', category: 'condiments', location: 'fridge', why: 'Fermented; probiotics and vitamin K.', tags: ['probiotic'], aliases: ['sauerkraut'] },
  { name: 'Green tea', category: 'beverages', location: 'pantry', why: 'Catechins; gentle caffeine.', tags: ['antioxidants'] },
  { name: 'Dark chocolate', category: 'snacks', location: 'pantry', why: '70%+ has flavanols; a treat that counts.', tags: ['antioxidants'] },
  { name: 'Turmeric', category: 'spices', location: 'pantry', why: 'Curcumin; pair with black pepper.', tags: ['antioxidants'] },
  { name: 'Cinnamon', category: 'spices', location: 'pantry', why: 'Flavor with no sugar.', tags: ['antioxidants'] },
  { name: 'Lemons', category: 'produce', location: 'fridge', why: 'Brightens everything; vitamin C.', tags: ['vitamins'], aliases: ['lemon', 'limes'] },
  { name: 'Ginger', category: 'produce', location: 'fridge', why: 'Anti-nausea, anti-inflammatory.', tags: ['antioxidants'] },
  { name: 'Cucumber', category: 'produce', location: 'fridge', why: 'Hydrating, crunchy, low effort.', tags: ['vitamins'] },
]

export const HEALTH_TAGS: HealthTag[] = ['protein', 'fiber', 'omega-3', 'vitamins', 'probiotic', 'whole grain', 'healthy fat', 'iron', 'calcium', 'antioxidants']
