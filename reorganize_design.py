from pathlib import Path
import re
import json

src = Path('C:/Users/lilac/Downloads/神明也疯狂 · HTML游戏策划案（手机版）1.md')
out = Path('C:/Users/lilac/Documents/ChatGPT/人间牧场/整理输出')
out.mkdir(exist_ok=True)
lines = src.read_text(encoding='utf-8-sig').splitlines()
used = set()
heads = [(i, s) for i, s in enumerate(lines) if re.match(r'^#{1,3} ', s)]
blocks = {}
for n, (i, title) in enumerate(heads):
    end = heads[n+1][0] if n+1 < len(heads) else len(lines)
    blocks[title.lstrip('# ')] = list(range(i+1, end))

def meaningful(s):
    return bool(s.strip()) and not re.match(r'^(#{1,6} |---\s*$|```(?:markdown)?\s*$|\|[\s:|\-]+\|$)', s)

def emit(ids):
    used.update(ids)
    return '\n'.join(lines[i] for i in ids).strip()

def block(prefix):
    key = next(k for k in blocks if k.startswith(prefix))
    return emit(blocks[key])

def ids(prefix):
    return blocks[next(k for k in blocks if k.startswith(prefix))]

def table_rows(prefix, names=None):
    ii = ids(prefix)
    table = [i for i in ii if lines[i].startswith('|')]
    header = table[:2]
    rows = table[2:]
    if names is not None:
        rows = [i for i in rows if lines[i].split('|')[1].strip() in names]
    return emit(header + rows) if rows else ''

def nontable(prefix):
    return emit([i for i in ids(prefix) if not lines[i].startswith('|')])

parts = []
def add(title, text):
    parts.append(title + '\n\n' + text.strip())

add('# 神明也疯狂 · HTML游戏策划案（手机版）｜结构整理版',
    block('神明也疯狂 · HTML游戏策划案（手机版）'))
add('## 阅读方式', '''本文按「类别 → 系统／功能 → 规则或操作 → 对应反馈」重组。分类、标题、关联说明和末尾的原文疑点说明属于编辑整理，不是新增游戏设计。规则、数值、提示文案及待定内容按原文保留；同一内容在原文承担不同说明用途时，保留其对应表述。

- **一、玩法系统**：游戏目标、生产生存、国家关系、科研、资源、神明技能、气候与组合。
- **二、操作与界面系统**：布局、镜头与手势、施法操作、时间与菜单、信息反馈规范。
- **三、其他支撑系统**：视觉、存读档、设置、手机端实现、配置管理与待定参数。

“对应反馈”包括实际状态变化、世界画面表现、界面提示、音效与触感；只归入原文已经写明的内容。共用反馈集中在“二.7”，各功能处保留其专属反馈。''')
add('## 一、玩法系统', '以下先说明功能如何运作，再列出原文对应的反馈。')
add('### 一.1 游戏定位与核心循环', block('01 '))

mode_ids = ids('02 ')
split = next(i for i in mode_ids if lines[i] == '**时间规则**')
add('### 一.2 模式、目标与对局结算', '#### 功能与胜负条件\n\n' + emit([i for i in mode_ids if i < split]) + '\n\n#### 对应反馈：结算页\n\n' + block('10.7'))
time_rules = emit([i for i in mode_ids if i >= split])

add('### 一.3 双岛生产与居民生存', '#### 功能与规则\n\n' + block('03 ') + '\n\n#### 对应反馈：出生、粮食、住房\n\n' + table_rows('10.5', ['出生','缺粮','饿死','露宿','房屋受损或烧毁']) + '\n\n#### 对应反馈：世界中的可见状态\n\n' + table_rows('11.2', ['粮食存量','住房不足','房屋受损','劳动状态']))
add('### 一.4 国家关系、战争与民变', '#### 功能与规则\n\n' + block('04 ') + '\n\n#### 对应反馈：贸易与冲突事件\n\n' + table_rows('10.5', ['贸易','劫掠','宣战或强征','民变']) + '\n\n#### 对应反馈：战争与领土状态\n\n' + table_rows('11.2', ['战争','国家边界']))
add('### 一.5 科研、时代与封魂工程', '#### 功能与规则\n\n' + block('05 ') + '\n\n#### 对应反馈：学院与时代\n\n' + table_rows('10.5', ['学院建成','时代升级']) + '\n\n#### 对应反馈：封魂工程阶段预警\n\n' + block('10.6') + '\n\n#### 对应反馈：建筑与时代状态\n\n' + table_rows('11.2', ['科研','封魂工程']) + '\n\n封魂工程实际完工后的结算见“一.2”；屏外提示规则见“二.1”。')
add('### 一.6 灵魂与灵力', '#### 功能与结算规则\n\n' + block('06 ') + '\n\n#### 对应反馈：死亡计魂与供奉\n\n' + table_rows('10.5', ['人类死亡','献粮供奉']))

add('### 一.7 神明技能', '''#### 功能阅读约定

下表均为**一级默认值，费用单位为灵力，冷却单位为模拟秒**。每个技能先列效果，再列瞄准、命中及无效反馈。通用施法操作见“二.3”，通用收费和失败判定见“二.7”。''')
skill_ids = ids('技能表')
add('#### 技能编号说明', nontable('技能表'))
skill_names = ['和解','安居乐业','欢愉时刻','气候控制','闪电','陨石','暴怒','瘟疫','亡灵']
for n, name in enumerate(skill_names, 1):
    table = [i for i in skill_ids if lines[i].startswith('|')]
    row = [i for i in table[2:] if lines[i].split('|')[3].strip() == name]
    txt = '**功能与基础效果**\n\n' + emit(table[:2] + row)
    txt += '\n\n**对应反馈**\n\n' + table_rows('10.4', [name] + (['流星雨'] if name == '陨石' else []))
    if name == '闪电':
        txt += '\n\n' + nontable('10.4')
    if name == '陨石':
        txt += '\n\n流星雨为陨石3级形态，升级数值见“一.8”。'
    if name == '气候控制':
        txt += '\n\n温度、云量与火山的具体规则见“一.9”；选项面板操作见“二.3”。'
    add(f'#### 一.7.{n} {name}', txt)

add('### 一.8 技能解锁、升级与默契成就', '#### 功能、入口与规则\n\n' + block('解锁与升级') + '\n\n#### 对应反馈：解锁与升级\n\n' + table_rows('10.2', ['点按未解锁的技能','解锁或升级成功','解锁或升级失败']) + '\n\n#### 对应反馈：默契成就\n\n' + table_rows('10.5', ['默契成就']))
add('### 一.9 气候与火山', '#### 功能与规则\n\n' + block('气候组合') + '\n\n#### 对应反馈：气候、积热与喷发\n\n' + table_rows('11.2', ['气候','火山积热']) + '\n\n' + table_rows('10.5', ['火山喷发']) + '\n\n气候技能的瞄准、成功与无效提示见“一.7.4”。')
add('### 一.10 组合玩法与恐龙彩蛋', '#### 功能与组合规则\n\n' + block('组合玩法') + '\n\n#### 对应反馈：恐龙彩蛋\n\n' + table_rows('10.5', ['恐龙蛋出现','恐龙失控']) + '\n\n其他组合涉及的反馈沿用对应技能及世界事件条目。')

add('## 二、操作与界面系统', '以下按玩家操作对象和流程归类，操作规则与对应反馈就近排列。')
add('### 二.1 界面布局与信息查看', '#### 界面原则\n\n' + block('9.0') + '\n\n#### 功能、位置与交互\n\n' + block('9.1') + '\n\n#### 对应反馈：定位与国家信息\n\n' + table_rows('10.2', ['点按屏外指示','点按王宫']))
add('### 二.2 镜头与基础手势', '#### 镜头功能\n\n' + block('9.2') + '\n\n#### 操作方式与手势判定\n\n' + block('9.3') + '\n\n#### 对应反馈\n\n' + table_rows('10.2', ['拖动或缩放镜头','捏合到总览','总览下点按岛屿']))
add('### 二.3 选择技能、瞄准与施放', '#### 操作流程与模式\n\n' + block('9.4') + '\n\n#### 对应反馈：选择、落点与取消\n\n' + table_rows('10.2', ['点按或滑动神明卡','选中技能','放置落点','取消（✕、再点技能、返回键）']) + '\n\n解锁反馈见“一.8”；暂停反馈见“二.4”；收费校验与施放判定见“二.7”；各技能专属反馈见“一.7”。')
add('### 二.4 模拟时间、暂停与调速', '#### 功能与时间规则\n\n' + time_rules + '\n\n#### 操作入口\n\n' + table_rows('9.5', ['暂停／继续','调速']) + '\n\n#### 对应反馈\n\n' + table_rows('10.2', ['暂停／继续','暂停中点按施放','调速','切到后台再回来']))
add('### 二.5 神权面板', '#### 功能与入口\n\n' + table_rows('9.5', ['神权面板']) + '\n\n' + nontable('9.5') + '\n\n#### 对应反馈\n\n' + table_rows('10.2', ['点按灵力（打开神权面板）']) + '\n\n解锁、升级及默契的规则和结果反馈见“一.8”。')
add('### 二.6 菜单、操作说明与系统入口', '#### 功能与操作\n\n' + table_rows('9.5', ['菜单','事件日志','操作说明','保存／读取','重新开始','全屏']) + '\n\n#### 对应反馈\n\n' + table_rows('10.2', ['菜单中选择“重新开始”','菜单 → 操作说明']) + '\n\n保存与读取的完整规则及反馈见“三.2”；全屏实现约束见“三.4”。')
add('### 二.7 共用反馈、施放校验与事件记录', '#### 共用反馈元素与通用原则\n\n' + block('10.1') + '\n\n#### 施放判定 → 提示文案 → 表现\n\n' + block('10.3') + '\n\n#### 世界事件记录与跳转\n\n' + nontable('10.5') + '\n\n各世界事件的专属反馈已放入“一、玩法系统”的对应功能。')

add('## 三、其他支撑系统', '本类保留视觉、数据与技术约束；原文未规定独立交互反馈的内容，不补写反馈。')
add('### 三.1 视觉方向与状态表达', '#### 总体风格\n\n' + block('11.1') + '\n\n#### 世界状态表达要求\n\n' + nontable('11.2') + '\n\n原状态可视化清单已分别放入“一.3、 一.4、 一.5、 一.9”的对应反馈中。')
add('### 三.2 保存与读取', '以下按原文保留入口、触发条件、恢复内容与对应提示。\n\n' + block('12 '))
add('### 三.3 玩家设置', '#### 可设置功能与默认值\n\n' + block('9.7'))
add('### 三.4 HTML手机端实现约束', block('9.6'))
add('### 三.5 配置管理与更新流程', block('13 '))
add('### 三.6 待定参数', block('14 ').removesuffix('```').rstrip())

# Empty parent chapters contain no substantive content; record their separators only.
for prefix in ['07 ', '08 ', '09 ', '10 ', '11 ']:
    if any(meaningful(lines[i]) for i in ids(prefix)):
        raise RuntimeError('Unexpected chapter introduction: ' + prefix)
    used.update(ids(prefix))

add('## 附：原文需要澄清的表述（未修改规则）', '''下列仅记录原文中的歧义或未衔接处，不增加方案、不确定优先级，也不改变前文规定：

| 关联功能 | 原文情况 | 待澄清点 |
| --- | --- | --- |
| 后台暂停与自动存档 | 后台时自动暂停；神罚未落地时不能保存，要等落地后补存 | 已暂停时，等待落地与补存如何衔接，原文未说明 |
| 后台返回提示 | 基础操作反馈固定提示“已自动暂停并保存，点▶继续”；保存规则允许暂不能保存或保存失败 | 尚未成功保存时是否使用该提示，原文未说明 |
| 封魂工程预警阈值 | 预警表明确列出50%和90%；待定参数又列有“各预警阶段阈值” | 现有比例是确定值还是暂用默认值，原文未明确 |
| 快速模式与气候预览 | 气候选好选项后点按岛屿即施放；技能反馈又写显示“即将施放的气候” | 岛屿高亮约0.2秒与实际施放的先后时序，原文未明确 |

以上内容在原文位置均已保留对应规则，本附录只便于后续确认。''')

# Rewrite old internal references after moving their destinations.
text = '\n\n---\n\n'.join(parts) + '\n'
replacements = {
    '见9.6': '见“三.4”', '见11.2': '见“三.1”及玩法系统各项状态反馈',
    '见9.4': '见“二.3”', '见第12章': '见“三.2”',
    '按9.3的顺序': '按“二.2”手势总表的顺序',
    '显示9.1的竖屏提示': '显示“二.1”的竖屏提示',
    '见9.1': '见“二.1”', '见10.1': '见“二.7”',
    '见10.4': '见“一.7”', '按10.1第5条': '按“二.7”通用原则第5条',
    '见下方气候说明': '见本节下方气候说明',
}
for a,b in replacements.items():
    text = text.replace(a,b)
# Remove an inherited separator from the original wrapper; no prose removed.
text = re.sub(r'\n---\n\s*\n---\n', '\n---\n', text)
missing = [{'line':i+1, 'text':s} for i,s in enumerate(lines) if meaningful(s) and i not in used]
if missing:
    raise RuntimeError(json.dumps(missing, ensure_ascii=False, indent=2))

# Verify that every retained source content line actually appears in the output.
missing_text = []
for i,s in enumerate(lines):
    if not meaningful(s):
        continue
    expected = s
    for a,b in replacements.items():
        expected = expected.replace(a,b)
    if expected not in text:
        missing_text.append({'line':i+1, 'text':s})
if missing_text:
    raise RuntimeError(json.dumps(missing_text, ensure_ascii=False, indent=2))
dest = out / '神明也疯狂·手机版策划案（系统—功能—反馈整理版）.md'
dest.write_text(text, encoding='utf-8-sig')
report = {
    'source':str(src), 'output':str(dest),
    'source_content_lines':sum(meaningful(s) for s in lines),
    'unassigned_content_lines':missing,
    'content_lines_missing_from_output':missing_text,
    'changes':'分类与标题重组；表格按功能拆分并保留原行；修正内部引用；移除外层Markdown代码围栏；增加阅读说明和原文疑点附录。',
    'original_unchanged':True,
}
(out / '内容保留核对.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
