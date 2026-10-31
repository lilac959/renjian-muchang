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
 intro:{next:'peace',lines:[line('life','欢迎上任，见习上帝。我是生命之神，现在来辅助你。'),line('life','两国正在备战，这可不太妙，选择「和解」，点击标记的国王，促成停火。')]},
 weather_intro:{next:'rain',lines:[line('life','刀剑放下了，双方正在返乡，停止人们之间伤害彼此是你的责任，现在让他们休养生息吧。'),line('weather','选择「气候控制」，选「降雨」，再点任意岛屿。雨水能促进粮食丰收，衣食无忧，便无需纷争。','life','weather')]},
 stewardship:{next:'grow',lines:[line('life','雨来了，一切在向好的方向发展，促使两国总人口达到50，让人类文明茁壮成长吧。','life','weather'),line('life','欢愉能促进生育，让人数快速增长，不过狂欢之后，却会让人停工、吃得更多。所以得先备足粮，再进行赐福。','life','weather')]},
 reveal:{next:'first_soul',lines:[line('life','在你的治理下，人类文明将迈向全新的未来。'),line('death','死亡之神驾到，见习上帝，你的养育完成，接下来需要吸收这些灵魂来维持神力。','life','death'),line('life','等等，你要让上帝杀了他们？可这些孩子才刚安定下来。','life','death'),line('death','这与我无关，我只是公事公办，你现在选择「天气之神 → 闪电」，点一位居民。灵魂入账，就会获得灵力。','life','death')]},
 first_soul_done:{next:'harvest',lines:[line('death','怎么样，很简单吧，你一定一学就会。','life','death'),line('life','……我还记得他们等第一场雨的样子，我还记得他们在田野辛勤劳作，期待着明天的到来。','life','death'),line('death','优柔寡断可不好，你可是生命之神啊，生老病死是常态。现在，聪明的见习上帝，用陨石等技能，合计新增收集10个灵魂。','life','death')]},
 final_instruction:{next:'final_cast',lines:[line('weather','指标已满。这次陨石将化作流星雨。选择「天气之神 → 陨石」，点击城镇。','life','weather'),line('weather','最后，把谢幕交给我。','life','weather'),line('life','……我，我还是不能接受！！！','life','weather')]}
};
export const GOD_LABELS={life:'生命之神',weather:'天气之神',death:'死亡之神'};
export const PHASES=[...Object.keys(DIALOGUES),'peace','rain','grow','first_soul','harvest','final_cast','finale','ready','challenge'];
