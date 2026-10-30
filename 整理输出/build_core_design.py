from pathlib import Path
import re

root = Path('C:/Users/lilac/Documents/ChatGPT/人间牧场/整理输出')
text = (root / '神明也疯狂·手机版策划案（精简版）.md').read_text(encoding='utf-8-sig')

def section(start, end, replacement=''):
    global text
    a = text.index(start)
    b = text.index(end, a)
    text = text[:a] + replacement.rstrip() + '\n\n' + text[b:]

section('### 一.4 科研', '### 一.5')
section('### 三.5 神权', '### 三.6')
section('### 一.6 技能解锁', '### 一.7', '''### 一.6 技能解锁

- **入口**：点按锁定技能，弹出解锁确认。
- **资源**：解锁消耗灵力，费用见“二.5”。

| 操作 | 对应反馈 |
| --- | --- |
| 点按锁定技能 | 显示费用和当前灵力；灵力不足时确认按钮置灰，显示“差X” |
| 解锁成功 | 技能图标闪金光；灵力数字下跳，显示红色浮字“−X”；Toast提示“瘟疫已解锁” |
| 解锁失败 | 按钮抖动，提示“灵力不足（差X）” |

---''')
section('### 一.3 国家关系', '### 一.5', '''### 一.3 国家冲突与停火

#### 功能与规则

- **劫掠**：一方缺粮且关系紧张时，会派小队烧屋抢粮。
- **战争流程**：动员 → 粮食补给 → 实际行军 → 交战。
- **暴怒**：提高国王的宣战倾向；是否出兵取决于兵员和局势。
- **和解**：对国王使用使两国停火并撤回接战军令；对士兵使用使其脱战返乡。
- 战斗造成实际人类死亡后，按统一规则结算灵魂与灵力。

#### 对应反馈

| 事件／状态 | 反馈 |
| --- | --- |
| 劫掠 | 红色预警条“X国小队正在劫掠Y国”，点按定位 |
| 宣战 | 短横幅“X国向Y国宣战”、战鼓音效；点按跳到战场；战场在屏幕外时显示指示 |
| 行军与交战 | 战旗、实际行军队列及命中表现 |
| 停火与返乡 | 战旗变白旗、停火倒计时、军队返回箭头；士兵头顶白鸽并转身返乡 |
| 国家边界 | 总览视角下用淡色描边区分两国领土 |

---''')
# Remove the dinosaur branch, retaining the four existing skill combinations.
section('- **恐龙蛋（彩蛋）**', '## 二、资源经济模块', '---')

# Extract existing skill data into the single configuration table.
skill_rows = re.findall(r'^\| [1-9]\s+\|.*$', text, re.M)
assert len(skill_rows) == 9
skill_rows = [s.replace('，学士停研推搡', '') for s in skill_rows]
unlock = ['初始可用','20','初始可用','初始可用','初始可用','初始可用','初始可用','18','18']
config_rows = []
for row, cost in zip(skill_rows, unlock):
    cells = [c.strip() for c in row.strip('|').split('|')]
    config_rows.append('| ' + ' | '.join(cells[:4]+[cost]+cells[4:]) + ' |')
skill_config = '''### 二.5 技能配置

费用与解锁费用单位为灵力，冷却和持续时间单位为模拟秒。反馈中的数值随配置读取。

| 编号 | 神明 | 技能 | 施法费用／冷却 | 解锁费用 | 目标／范围 | 效果参数与结算规则 |
| --- | --- | --- | --- | --- | --- | --- |
''' + '\n'.join(config_rows) + '''

建议字段：`skill_id`、`cast_cost`、`cooldown_seconds`、`initially_available`、`unlock_cost`、`target_type`、`radius`、`duration_seconds`及对应效果参数。每个技能一行，放入“技能基础”。

| 费用结算情况 | 规则与反馈 |
| --- | --- |
| 施放成功 | 灵力“−X”，开始冷却，播放落点动画及实际命中反馈 |
| 校验失败 | 不扣费、不进入冷却、不播放施法动画，显示具体原因 |
| 放置落点、拖动准星、选择气候选项 | 不收费 |
| 亡灵范围内无尸体 | 不收费，提示“范围内没有可用尸体” |
| 闪电无合法目标或点到房屋 | 不施放、不收费，显示对应原因 |

'''
section('### 二.5 技能资源', '### 二.6', skill_config)
descriptions = [
    '对国王施放，使两国停火并撤回接战军令；对士兵施放，使其脱战返乡。',
    '改善范围内居民心情，提高可工作者的效率；不使失能居民恢复劳动。',
    '加快范围内人类、羊、野兽繁殖。人类先停工，再进入食欲翻倍阶段；羊没有这两项代价。',
    '选择温度与云量，对岛屿施放气候，影响生产、繁殖、火势及火山积热。',
    '击杀单个室外人物或野兽、消灭亡灵、引燃燃料；不能命中屋内居民。',
    '清理范围内树林、击杀生物、损坏建筑并引火。',
    '使国王倾向宣战、居民停工伤人、野兽主动袭人。',
    '感染范围内居民，使其患病停工并可能传染；之后康复或死亡，康复者短暂免疫。',
    '复苏范围内仍保留的尸体成为亡灵，限时袭击活人；没有可用尸体时不收费。',
]
pattern = r'\*\*功能与基础效果\*\*\n\n(?:\|[^\n]*\n){3}'
counter = iter(descriptions)
text, n = re.subn(pattern, lambda m:'**功能与规则**\n\n'+next(counter)+'\n', text)
assert n == 9, n

# Remove duplicate production parameters; their authoritative values remain in section 2.4.
section('**基础数值**', '**规则**')
section('### 四.2 保存与读取', '### 四.3', '''### 四.2 自动存档与继续游戏

- **自动存档**：每5个游戏年自动保存，切到后台时也自动保存。
- **继续游戏**：从主界面恢复自动存档。恢复人口、粮食、住房、兵员、灾害、气候、冷却、灵魂、灵力、已解锁技能和剩余时间等对局状态。
- **暂不能保存**：神罚尚未落地时暂缓保存；本局结束后不保存进行中的对局。若切后台时神罚尚未落地，保留补存请求，回来继续游戏并落地后补存。
- **后台返回**：保持暂停；成功保存时提示“已自动暂停并保存，点▶继续”，尚未保存时提示“已自动暂停，点▶继续”。
- **保存成功**：Toast提示“已保存（时间）”。
- **恢复成功**：自动暂停，提示“已读取存档，点▶继续”。
- **存储方式**：localStorage或IndexedDB；空间不足提示“存储空间不足，保存失败”。

---''')
section('#### 世界事件记录与跳转', '## 四、其他支撑模块', '''#### 事件定位

重要事件的Toast或横幅可点按跳转；战场在屏幕外时显示指示。选中和解或暴怒时，额外指示屏幕外的两国国王。

---''')

drop_rows = ['沙盒','沙盒结束','流星雨','学院人口门槛','恐龙照料上限','事件日志','确认按钮位置（左／右）','自动放大瞄准','打开神权面板时自动暂停','高级：各技能施放模式（两步确认／快速）']
text = '\n'.join(s for s in text.splitlines() if not (s.startswith('|') and s.split('|')[1].strip() in drop_rows))
replacements = {
 '观察局势 → 选择神明与技能 → 放置落点并预览 → 确认施放 → 查看实际结果 → 调整策略':'维持人口与生产 → 用神力干预 → 产生实际死亡并收魂 → 获得灵力继续干预 → 在期限内完成目标',
 '人口越多，可收的灵魂越多，但粮食和住房压力也越大；文明越发达，越可能建成封魂工程':'人口越多，可收的灵魂越多，但粮食和住房压力也越大；杀死过多人口会损害生产，维持人口太久又可能无法按期完成目标',
 '居民自主生产、建房、生育、研究、贸易和打仗':'居民自主生产、建房、生育和打仗',
 '模式、目标与对局结算':'目标与对局结算',
 '或封魂工程完工':'', '或X国封魂工程完工':'', '、已达成的默契':'',
 '结算页提供三个按钮：再来一局、返回主界面、查看日志。':'结算页提供两个按钮：再来一局、返回主界面。',
 '**一级默认值；费用单位：灵力；冷却单位：模拟秒。**':'费用、冷却、范围与效果参数见“二.5”。',
 '组合玩法与恐龙彩蛋':'组合玩法', '陨石或流星击中火山':'陨石击中火山',
 '羊、野兽、恐龙、亡灵':'羊、野兽、亡灵', '解锁、升级、施法':'解锁、施法',
 '解锁与升级费用':'解锁费用', '施放模式、振动等':'音效、振动等',
 '战争、贸易、劫掠阈值':'战争、劫掠阈值', '货船、预警条、宣战横幅等':'预警条、宣战横幅等',
 '医学具体寿命与致死率变化、学院所需余粮及富余劳力阈值、恐龙孵化喂养的具体粮食和劳力消耗、':'',
 '技能基础／技能等级':'技能基础',
 '日志记录“X国有居民饿死”，同时按死亡流程计魂':'按死亡流程计魂并显示灵魂与灵力变化',
 '；后续传染单独记录到日志':'',
 '屏幕震动（强度受设置控制）并出现红色闪光，日志列出伤亡':'屏幕震动（受开关控制）并出现红色闪光，实际死亡按计魂流程反馈',
 '快速模式：点按即劈下，并吸附室外可命中目标。两步模式：只高亮室外目标':'点按即劈下，并吸附室外可命中目标',
 '；两步模式确认空地则仍收费，并提示“闪电落空”':'',
 '挑战模式显示“灵魂 123／300 · 剩38年”；沙盒模式显示“灵魂 123 · 第12年”，不显示目标和剩余时间':'显示“灵魂 123／300 · 剩38年”',
 '。**点按打开神权面板**（取代独立的神权按钮）':'，显示当前灵力',
 '，长按弹出三档直接选择':'', '；长按弹出三档直接选择':'',
 '等级和完整说明在长按详情中查看':'完整说明、费用与冷却在长按详情中查看',
 '、进度≥50%的封魂工程、恐龙蛋、失控的恐龙':'',
 '。可在设置中改到左侧':'',
 '、科研进度、封魂工程进度':'',
 '可在设置中逐项改为快速；陨石和流星雨改为快速时，需要二次确认':'放置落点并预览后确认施放',
 '此功能可在设置中关闭；关闭后改为显示提示“放大后瞄准更精确”。':'',
 '显示名称、等级、说明；技能详情卡带升级按钮':'显示名称与说明；技能详情卡显示费用与冷却',
 '，并且不计入默契次数':'', '灰色Toast，不计入默契':'灰色Toast',
 '范围技能、流星雨，以及产生多项结果的施法':'范围技能及产生多项结果的施法',
 '—（自动放大）；关闭自动放大时提示“放大后瞄准更精确”':'—（自动放大）',
 '共用反馈、施放校验与事件记录':'共用反馈与施放校验',
 '等级不在图标上常驻显示，只在详情卡和神权面板中显示。':'',
 '气候、科研、工程、战争':'气候、战争',
 '| 屏幕震动强度           | 中    |':'| 屏幕震动 | 开 |',
 '各技能默认施放模式、':'', '确认区默认位置、':'',
 '火山恢复期、恐龙照料上限、':'火山恢复期、',
 '战争、贸易、劫掠的触发阈值':'战争、劫掠的触发阈值',
 '保存／读取 | 在菜单中操作，见“四.2”':'返回主界面 | 在菜单中操作；恢复自动存档见“四.2”',
 '提示“已自动暂停并保存，点▶继续”':'按保存结果提示，见“四.2”',
}
for a,b in replacements.items():
    text = text.replace(a,b)
text = '\n'.join(s for s in text.splitlines() if not any(s.startswith(p) for p in [
 '- 两步模式下确认在空地上：', '- 技能等级（每级一行）',
 '- 除陨石外各技能二、三级的费用与效果', '- 封魂工程的触发条件',
]))
# Add challenge parameters to the existing global configuration.
anchor = '| 初始灵力 |'
pos = text.index(anchor)
text = text[:pos] + '''| 挑战期限 | challenge.duration_years | 数值／游戏年 | 50 | 期限届满未达标则失败 | 剩余年数、结算页 |
| 灵魂目标 | challenge.soul_target | 整数／魂 | 300 | 累计达到目标立即成功 | 顶部灵魂进度、结算页 |
''' + text[pos:]
# Keep one copy of economic effect parameters: skill-specific values are in 2.5.
remove_effect_rows = ['安居乐业工作效率','安居乐业持续时间','欢愉的人类停工','欢愉的人类食欲倍率','欢愉的食欲持续时间','气候持续时间']
text = '\n'.join(s for s in text.splitlines() if not (s.startswith('|') and s.split('|')[1].strip() in remove_effect_rows))
# Retain presentation examples while putting climate balance numbers only in configuration.
text = text.replace('无雨；田产65%，人和羊繁殖60%；积热','无雨；田产和人、羊繁殖降低；积热')
text = text.replace('下雨；羊繁育1.5倍，促进农田；灭火','下雨；促进羊繁育和农田；灭火')
text = text.replace('下雪；田产65%，羊繁育80%；灭火','下雪；田产和羊繁育降低；灭火')
# Add existing volcano constants to configurable parameters.
pos = text.index('| 战争、劫掠阈值')
text = text[:pos] + '''| 火山积热触发时间 | volcano.heat_seconds | 45模拟秒 | 本岛连续高温；重复高温不归零，恒温或低温归零 | 积热进度条、火山烟雾 |
| 火山恢复期 | volcano.recovery_seconds | 待定 | 喷发后的恢复时间；同段连续高温仅喷发一次 | 火山状态 |
''' + text[pos:]
# Restore compact chapter numbering and references after removals.
mapping1 = {'1':'1','2':'2','3':'3','5':'4','6':'5','7':'6','8':'7'}
mapping3 = {'1':'1','2':'2','3':'3','4':'4','6':'5','7':'6'}
text = re.sub(r'一\.(\d+)',lambda m:'一.'+mapping1[m[1]],text)
text = re.sub(r'三\.(\d+)',lambda m:'三.'+mapping3[m[1]],text)
text = text.replace('成功保存时按保存结果提示，见“四.2”', '成功保存时提示“已自动暂停并保存，点▶继续”')
text = text.replace('**各技能的默认施放模式**', '**各技能的施放方式**').replace('| 默认模式 ', '| 施放方式 ')
text = text.replace('**两步确认模式（默认）**', '**两步确认（除闪电、气候控制外）**')
text = re.sub(r'\n{3,}', '\n\n', text).strip()+'\n'
text = re.sub(r'(## [一二三四]、[^\n]+)\n\n---\n',r'\1\n',text)

dest = root / '神明也疯狂·手机版策划案（核心循环版）.md'
dest.write_text(text,encoding='utf-8-sig')
for term in ['沙盒','科研','学院','学士','医学','时代','封魂','恐龙','默契','贸易','驻军','占领','民变','强征','桥头','补给据点','升级','等级','流星雨','日志','神权','快速保存','快速读取','手动存档','关闭自动放大','切换施放模式']:
    hits = [s for s in text.splitlines() if term in s]
    if hits:
        print('RESIDUAL',term,repr(hits))
print('Created:',dest.name,'characters:',len(text))

# Check links between sections, Markdown table structure, and unchanged skill costs.
headings = set(re.findall(r'^#{3,4} ([一二三四]\.\d+(?:\.\d+)?) ', text, re.M))
references = re.findall(r'[“见按]([一二三四]\.\d+(?:\.\d+)?)',text)
assert all(x in headings for x in references), set(references)-headings
assert text.count('```') == 2
expected_costs = ['4／6','8／12','10／24','4／4','1／1','12／12','6／8','10／15','8／8']
rows = re.findall(r'^\| ([1-9]) \|.*$',text,re.M)
assert len(rows) == 9
for i,cost in enumerate(expected_costs,1):
    row = next(x for x in text.splitlines() if x.startswith(f'| {i} |'))
    assert row.split('|')[4].strip() == cost
width = None
for line in text.splitlines():
    if line.startswith('|'):
        cells = line.count('|')
        if width is None:
            width = cells
        assert cells == width, line
    else:
        width = None
print('Verified: 9 skill costs, section references, table columns, code fences.')
