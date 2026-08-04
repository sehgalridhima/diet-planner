import { buildNutritionPlan, type UserInput } from "../src/lib/nutrition";

const cases: { name: string; input: UserInput }[] = [
  { name: "Woman 28, 160cm, 70kg, sedentary, lose", input: { age: 28, sex: "female", heightCm: 160, weightKg: 70, activity: "sedentary", goal: "lose" } },
  { name: "Woman 30, 150cm, 48kg, sedentary, lose (should clamp)", input: { age: 30, sex: "female", heightCm: 150, weightKg: 48, activity: "sedentary", goal: "lose" } },
  { name: "Woman 25, 165cm, 45kg, light, lose (underweight!)", input: { age: 25, sex: "female", heightCm: 165, weightKg: 45, activity: "light", goal: "lose" } },
  { name: "Man 32, 175cm, 85kg, moderate, lose", input: { age: 32, sex: "male", heightCm: 175, weightKg: 85, activity: "moderate", goal: "lose" } },
  { name: "Man 24, 178cm, 62kg, active, gain", input: { age: 24, sex: "male", heightCm: 178, weightKg: 62, activity: "active", goal: "gain" } },
];

for (const c of cases) {
  const p = buildNutritionPlan(c.input);
  const macroCals = p.macros.proteinG * 4 + p.macros.carbsG * 4 + p.macros.fatG * 9;
  console.log(`\n=== ${c.name}`);
  console.log(`  BMR ${p.bmr} | TDEE ${p.tdee} | target ${p.calories} kcal`);
  console.log(`  BMI ${p.bmi} (${p.bmiCategory}) | healthy range ${p.healthyWeightRange.min}-${p.healthyWeightRange.max}kg`);
  console.log(`  P ${p.macros.proteinG}g  C ${p.macros.carbsG}g  F ${p.macros.fatG}g  -> ${macroCals} kcal (target ${p.calories}, drift ${macroCals - p.calories})`);
  console.log(`  weekly change: ${p.weeklyChangeKg} kg`);
  if (p.warnings.length) p.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
}
