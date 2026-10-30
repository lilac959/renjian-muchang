"""Validate the planner workbook before atomically replacing runtime JSON (stdlib only)."""
import argparse
import copy
import json
import math
import os
from pathlib import Path
import tempfile
import sys
if hasattr(sys.stdout, "reconfigure"): sys.stdout.reconfigure(encoding="utf-8")
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def read_workbook(path):
    with zipfile.ZipFile(path) as z:
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            strings = [''.join(e.itertext()) for e in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si', NS)]
        rels = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
        result = {}
        for sheet in ET.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet', NS):
            target = rels[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
            target = target.lstrip('/') if target.startswith('/') else 'xl/' + target
            rows = {}
            for row in ET.fromstring(z.read(target)).findall('s:sheetData/s:row', NS):
                values = {}
                for cell in row.findall('s:c', NS):
                    col = ''.join(c for c in cell.attrib['r'] if c.isalpha())
                    val = cell.find('s:v', NS)
                    if cell.find('s:f', NS) is not None:
                        raise ValueError(f"{sheet.attrib['name']} {cell.attrib['r']}: 策划输入必须是值，不能是公式")
                    v = val.text if val is not None else None
                    if cell.attrib.get('t') == 's' and v is not None:
                        v = strings[int(v)]
                    elif cell.attrib.get('t') == 'inlineStr':
                        v = ''.join(cell.find('s:is', NS).itertext())
                    elif v is not None and cell.attrib.get('t') not in ('str', 'e'):
                        v = float(v)
                        if v.is_integer(): v = int(v)
                    values[col] = v
                rows[int(row.attrib['r'])] = values
            result[sheet.attrib['name']] = rows
        return result

def sync(workbook, output, dry_run=False):
    current = json.loads(output.read_text(encoding='utf-8-sig'))
    result = copy.deepcopy(current)
    schema = json.loads((ROOT/'配置表/配置目录.json').read_text(encoding='utf-8'))
    sheets = read_workbook(workbook)
    errors, changes, seen = [], [], set()
    definitions = {p['id']: p for p in schema['parameters']}
    def error(sheet, row, field, text): errors.append(f'{sheet} 第{row}行 {field}: {text}')
    def assign(obj, key, value, sheet, row, field):
        if value is None or value == '': return
        if obj.get(key) != value:
            changes.append(f'{sheet} 第{row}行 {field}: {obj.get(key)!r} → {value!r}')
            obj[key] = value
    for name in ['全局参数', '居民与生产', '操作设置']:
        if name not in sheets: errors.append(f'缺少工作表 {name}'); continue
        for row, cells in sheets[name].items():
            if row < 5: continue
            key, value = cells.get('A'), cells.get('C')
            if not key: continue
            d = definitions.get(key)
            if not d or d['sheet'] != name: error(name,row,'ID','未知ID或错误工作表'); continue
            if key in seen: error(name,row,'ID','重复ID'); continue
            seen.add(key)
            if cells.get('F'): error(name,row,'删除标记','必需运行字段不能删除'); continue
            if cells.get('D') != d['unit']: error(name,row,'单位',f"应为 {d['unit']}"); continue
            if value is None or value == '': continue
            if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or not d['min'] <= value <= d['max']:
                error(name,row,'策划值',f"应为 {d['min']} 至 {d['max']} 的有限数值"); continue
            if key in ['duration','year','birthSeconds','growthSeconds','buildSeconds','offerInterval','attackInterval','fireInterval','starveInterval','saveInterval','walkSpeed','soldierSpeed'] and value <= 0:
                error(name,row,'策划值','必须大于0'); continue
            assign(result['config'],key,value,name,row,'策划值')
    for key in definitions.keys()-seen: errors.append(f'缺少必需ID {key}')
    known = {s['id']: s for s in result['skills']}
    seen_skills = set()
    for row, cells in sheets.get('技能基础',{}).items():
        if row < 5 or not cells.get('B'): continue
        key = cells['B']
        if key not in known or key in seen_skills: error('技能基础',row,'ID','未知或重复ID'); continue
        seen_skills.add(key); skill=known[key]
        if cells.get('A') != skill['number'] or cells.get('D') != skill['group']:
            error('技能基础',row,'编号/神明','编号和神明归属不可变更')
        for col, field in [('E','cost'),('F','cd'),('G','r'),('H','unlock')]:
            value=cells.get(col)
            if value is None or value == '': continue
            if not isinstance(value,(int,float)) or not math.isfinite(value) or value<0: error('技能基础',row,field,'应为非负有限数值'); continue
            assign(skill,field,value,'技能基础',row,field)
        for col,field in [('C','name'),('I','desc')]:
            if cells.get(col) is not None and not isinstance(cells[col],str): error('技能基础',row,field,'应为文本')
            else: assign(skill,field,cells.get(col),'技能基础',row,field)
    if seen_skills != set(known): errors.append('技能基础缺少保留技能，1—9不得删除')
    seen_climate=set()
    for row,cells in sheets.get('气候',{}).items():
        if row<5 or not cells.get('A'): continue
        key=cells['A']
        if key not in result['climate'] or key in seen_climate: error('气候',row,'ID','未知或重复ID'); continue
        seen_climate.add(key)
        for col,field in [('B','field'),('C','human'),('D','sheep')]:
            value=cells.get(col)
            if value is None or value=='': continue
            if not isinstance(value,(int,float)) or not math.isfinite(value) or value<0: error('气候',row,field,'应为非负有限倍率'); continue
            assign(result['climate'][key],field,value,'气候',row,field)
    if seen_climate != set(result['climate']): errors.append('气候缺少必需组合')
    texts=result.setdefault('texts',{})
    for row,cells in sheets.get('界面文本',{}).items():
        if row<5 or not cells.get('A'): continue
        if cells.get('B') is not None and not isinstance(cells['B'],str): error('界面文本',row,'文本','应为文本'); continue
        assign(texts,cells['A'],cells.get('B'),'界面文本',row,'文本')
    if result['config']['penInitial']>result['config']['penLimit']: errors.append('初始栏位不得超过最大栏位')
    if result['config']['raidSize']>=result['config']['raidAdults'] or result['config']['warSize']>=result['config']['warAdults']: errors.append('出兵人数必须小于兵员门槛，以保留生产人口')
    if errors: raise ValueError('\n'.join(errors))
    print('\n'.join(changes) if changes else '校验通过，无数值差异。')
    if not dry_run:
        with tempfile.NamedTemporaryFile('w',encoding='utf-8',dir=output.parent,delete=False) as f:
            json.dump(result,f,ensure_ascii=False,indent=2); f.write('\n'); temporary=f.name
        os.replace(temporary,output)
    return changes

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--workbook',type=Path,default=ROOT/'配置表/人间牧场·可配置表.xlsx')
    parser.add_argument('--output',type=Path,default=ROOT/'game/rules.json')
    parser.add_argument('--dry-run',action='store_true')
    args=parser.parse_args()
    try: sync(args.workbook,args.output,args.dry_run)
    except (ValueError,KeyError,zipfile.BadZipFile) as exc:
        parser.exit(1,f'配置未更新，保留上一份有效JSON。\n{exc}\n')
