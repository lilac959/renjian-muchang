// Mobile adaptation: retain the three-god reveal, use current mobile skill names.
export const PROLOGUE = Object.freeze({
 initialPopulation:12, populationTarget:50, populationLimit:80,
 initialFood:120, initialMana:60, houseCapacityFactor:1, initialSheep:18, initialHouses:3, initialFields:2,
 foodUseFactor:1, birthFactor:3, speed:3,
 harvestTarget:10, finaleSeconds:10, showerStrikes:14, showerInterval:.45,
 finaleSurvivorsPerIsland:8, challengeSeconds:300, challengeSouls:100,
 challengeMana:40, charactersPerSecond:38
});
const line=(speaker,text,left='life',right='')=>({speaker,text,left,right});
export const DIALOGUES={
 intro:{next:'peace',lines:[line('life','欢迎上任，见习上帝。我是生命之神，先教你让人平安回家。'),line('life','两国正在备战。选择「和解」，点击标记的国王，促成双方停火。')]},
 weather_intro:{next:'rain',lines:[line('life','刀剑放下了，双方正在返乡。我请天气之神来帮忙。'),line('weather','选择「气候控制」，选「降雨」，再点任意岛屿。雨水能帮助生产。','life','weather')]},
 stewardship:{next:'grow',lines:[line('life','雨来了。照顾粮食和房屋，让两国总人口达到50。养成教学期间以3倍速发展。','life','weather'),line('life','欢愉能促进生育，却会让人停工、吃得更多。先备粮，再赐福。','life','weather')]},
 reveal:{next:'first_soul',lines:[line('life','你照顾的每一户，都有了明天。'),line('death','死亡之神，灵魂归档科。养育完成，接下来是收魂考核。','life','death'),line('life','等等，他们才刚安定下来。','life','death'),line('death','选择「天气之神 → 闪电」，点一位居民。灵魂入账，就会获得灵力。','life','death')]},
 first_soul_done:{next:'harvest',lines:[line('death','一魂已归档，灵力到账。流程就是这样。','life','death'),line('life','……我还记得他们等第一场雨的样子。','life','death'),line('death','用陨石等技能，合计新增收集10魂。自然死亡和动物不算考核。','life','death')]},
 final_instruction:{next:'final_cast',lines:[line('weather','指标已满。这次陨石将化作流星雨。选择「天气之神 → 陨石」，点击城镇。','life','weather'),line('weather','把谢幕交给我。','life','weather'),line('life','……','life','weather')]}
};
export const GOD_LABELS={life:'生命之神',weather:'天气之神',death:'死亡之神'};
export const PHASES=[...Object.keys(DIALOGUES),'peace','rain','grow','first_soul','harvest','final_cast','finale','ready','challenge'];
