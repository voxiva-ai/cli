import { c } from "../brand/index.js";
import { loadConfig, patchConfig } from "../config/store.js";
import { PLANS, getPlan } from "../plans/index.js";
export async function planShow() {
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
export async function planUse(id) {
    const plan = PLANS.find((p) => p.id === id);
    if (!plan) {
        console.error(c.danger(`Unknown plan: ${id}`));
        console.log(c.muted("Choose:"), PLANS.map((p) => p.id).join(", "));
        process.exitCode = 1;
        return;
    }
    await patchConfig({ plan: plan.id });
    console.log(c.ok(`Plan → ${c.brand(plan.id)}`), c.muted(plan.description));
}
