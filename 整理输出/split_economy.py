from pathlib import Path
import re
import json

root = Path('C:/Users/lilac/Documents/ChatGPT/人间牧场/整理输出')
source = root / '神明也疯狂·手机版策划案（系统—功能—反馈整理版）.md'
original = source.read_text(encoding='utf-8-sig')
text = original
# Move whole source sections without rewriting their content.
def extract(section, following):
    global text
    start = text.index(section)
    end = text.index(following, start)
    chunk = text[start:end].rstrip()
    chunk = re.sub(r'\n\n---$', '', chunk)
    return chunk

production = extract('### 一.3 双岛生产与居民生存', '### 一.4')
resources = extract('### 一.6 灵魂与灵力', '### 一.7')
text = text.replace(production, '### 一.3 双岛生产与居民生存\n\n本玩法的生产链、生育与劳动规则，以及粮食、住房、人口的对应反馈，集中归入“二.2”。玩法仍由居民自主执行，资源经济模块负责其参数配置。')
text = text.replace(resources, '### 一.6 灵魂与灵力的玩法连接\n\n灵魂用于胜负判定，灵力用于解锁、升级和施法。资源性质、来源、用途、计魂规则与反馈集中归入“二.1”；资源产耗配置见“二.4—二.5”。')
# Shift all existing section references in one pass, before adding the new chapter.
text = re.sub(r'([二三])(\.)', lambda m: {'二':'三','三':'四'}[m[1]] + m[2], text)
text = text.replace('三、其他支撑系统', '四、其他支撑系统').replace('二、操作与界面系统', '三、操作与界面系统')
text = text.replace('玩法系统', '玩法模块').replace('操作与界面系统','操作与界面模块').replace('其他支撑系统','其他支撑模块')
text = text.replace('｜结构整理版', '｜玩法与资源经济配置版')
text = text.replace('- **一、玩法模块**：游戏目标、生产生存、国家关系、科研、资源、神明技能、气候与组合。', '- **一、玩法模块**：目标与胜负、国家关系、科研、神明技能、气候与组合；生产生存和灵魂灵力的完整规则归入资源经济模块。\n- **二、资源经济模块**：资源来源与去向、生产生存、基础产耗、技能消耗、经济效果修正及配置校验。')
text = text.replace('分类、标题、关联说明和末尾的原文疑点说明属于编辑整理', '分类、标题、关联说明、资源经济配置字段建议和末尾的原文疑点说明属于编辑整理')
# Correct newly inserted references affected by the global chapter shift.
text = text.replace('集中归入“三.2”。玩法', '集中归入“二.2”。玩法')
text = text.replace('集中归入“三.1”；资源产耗配置见“三.4—三.5”', '集中归入“二.1”；资源产耗配置见“二.4—二.5”')
chapter = '''## 二、资源经济模块

本模块集中说明“资源从哪里来、用到哪里去、哪些数值可配置、变化后如何反馈”。灵魂是累计成绩，灵力是可花费资源，粮食是生存与生产资源；人口、劳力、住房分别作为实体数量与容量约束，不增加新货币。

以下“二.1—二.2”保留原文规则与反馈；“二.3—二.7”是按现有内容整理的配置设计。

'''
chapter += resources.replace('### 一.6', '### 二.1') + '\n\n---\n\n'
chapter += production.replace('### 一.3', '### 二.2') + '\n\n---\n\n'
chapter += (root / '资源经济配置章节.md').read_text(encoding='utf-8') + '\n\n---\n\n'
text = text.replace('## 三、操作与界面模块', chapter + '## 三、操作与界面模块')
text = text.replace('“一.3、 一.4、 一.5、 一.9”', '“二.2、 一.4、 一.5、 一.9”')

# All original substantive source lines must survive after chapter renumbering.
base = Path('C:/Users/lilac/Downloads/神明也疯狂 · HTML游戏策划案（手机版）1.md').read_text(encoding='utf-8-sig')
refs = {'见9.6':'见“四.4”', '见11.2':'见“四.1”及玩法模块各项状态反馈', '见9.4':'见“三.3”', '见第12章':'见“四.2”', '按9.3的顺序':'按“三.2”手势总表的顺序', '显示9.1的竖屏提示':'显示“三.1”的竖屏提示', '见9.1':'见“三.1”', '见10.1':'见“三.7”', '见10.4':'见“一.7”', '按10.1第5条':'按“三.7”通用原则第5条', '见下方气候说明':'见本节下方气候说明'}
missing = []
count = 0
for line in base.splitlines():
    if not line.strip() or re.match(r'^(#{1,6} |---\s*$|```(?:markdown)?\s*$|\|[\s:|\-]+\|$)', line):
        continue
    count += 1
    for a,b in refs.items():
        line = line.replace(a,b)
    if line not in text:
        missing.append(line)
assert not missing, missing
assert len(re.findall(r'^```', text, re.M)) == 2
dest = root / '神明也疯狂·手机版策划案（玩法与资源经济配置版）.md'
dest.write_text(text, encoding='utf-8-sig')
(root / '资源经济版内容核对.json').write_text(json.dumps({'原文内容行':count,'遗漏':missing,'配置状态':'文档级配置设计，未生成Excel或运行时JSON','原版与上一版':'保留'}, ensure_ascii=False, indent=2), encoding='utf-8')
print('Created v2; source content lines verified:', count)
