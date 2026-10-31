const url = new URL('./rules.json', import.meta.url);
const rules = typeof window === 'undefined' ? JSON.parse(await (await import('node:fs/promises')).readFile(url, 'utf8')) : await (await fetch(url)).json();
export const CONFIG = Object.freeze(rules.config);
export const SKILLS = Object.freeze(rules.skills);
export const CLIMATE = Object.freeze(rules.climate);
export const TEXT = Object.freeze(rules.texts || {});

export const SETTLEMENT=Object.freeze(rules.settlement);
export const HUSBANDRY=Object.freeze(rules.husbandry);
export const SOCIETY=Object.freeze(rules.society);
export const WILDLIFE=Object.freeze(rules.wildlife);
