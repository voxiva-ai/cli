import { c } from "../brand/index.js";
import { loadConfig, patchConfig, type PlanId } from "../config/store.js";
import { PLANS, getPlan } from "../plans/index.js";

export async function planShow(): Promise<void> {
  const config = await loadConfig();
  const current = getPlan(config.plan);

  console.log(c.bold("Plans\n"));
  for (const plan of PLANS) {
    const active = plan.id === config.plan;
    const mark = active ? c.brand("›") : " ";
    console.log(`${mark} ${c.text(plan.id.padEnd(10))} ${c.muted(plan.description)}`);
  }
  console.log("");
  console.log(c.muted("Active:"), c.brand(current.id), c.muted("—"), current.label);
}

export async function planUse(id: string): Promise<void> {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) {
    console.error(c.danger(`Unknown plan: ${id}`));
    console.log(c.muted("Choose:"), PLANS.map((p) => p.id).join(", "));
    process.exitCode = 1;
    return;
  }

  await patchConfig({ plan: plan.id as PlanId });
  console.log(c.ok(`Plan → ${c.brand(plan.id)}`), c.muted(plan.description));
}
