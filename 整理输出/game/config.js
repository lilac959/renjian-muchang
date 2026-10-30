export const CONFIG = Object.freeze({duration:300,goal:300,year:6,mana:30,saveInterval:30});
export const SKILLS = [
 {id:'peace',name:'和解',group:0,icon:'☮',cost:4,cd:10,r:2,desc:'点选王宫或士兵。停火15秒，军队返乡。'},
 {id:'bless',name:'安居乐业',group:0,icon:'✦',cost:6,cd:15,r:6,unlock:12,desc:'范围居民工作效率提高40%，持续20秒。'},
 {id:'joy',name:'欢愉时刻',group:0,icon:'♡',cost:8,cd:24,r:5,desc:'繁殖翻倍。人类先停工4秒，随后18秒食欲翻倍。'},
 {id:'weather',name:'气候控制',group:1,icon:'☁',cost:5,cd:12,r:0,desc:'选择温度与云量，再点岛屿。持续30秒。恒温多云促进生产并灭火。'},
 {id:'lightning',name:'闪电',group:1,icon:'ϟ',cost:2,cd:3,r:1.8,desc:'点选生物立即击杀。只有人类死亡产生灵魂。'},
 {id:'meteor',name:'陨石',group:1,icon:'☄',cost:16,cd:30,r:5,desc:'范围生物100伤害、房屋60伤害，并引发火灾。'},
 {id:'rage',name:'暴怒',group:2,icon:'♨',cost:8,cd:22,r:5,desc:'范围生物停工攻击人类，持续15秒；命中王宫促使国王尝试宣战。'},
 {id:'plague',name:'瘟疫',group:2,icon:'✣',cost:12,cd:28,r:3,unlock:16,desc:'感染并传播，病程12秒，30%死亡；康复后免疫30秒。'},
 {id:'undead',name:'亡灵',group:2,icon:'♜',cost:10,cd:24,r:6,unlock:16,desc:'复苏最多8具尸体，攻击活人20秒。亡灵不重复计魂。'}
];
