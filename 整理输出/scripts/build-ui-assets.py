from pathlib import Path
from PIL import Image
import json
G=Path(__file__).resolve().parents[1]/'game'
report={}
for folder in ['assets/ui','assets/gods/portraits']:
 out=G/folder/'compact';out.mkdir(exist_ok=True)
 for p in (G/folder).glob('*.png'):
  if p.name=='prologue-main-menu.png':continue
  im=Image.open(p).convert('RGBA');before=im.size
  limit=768 if folder.endswith('portraits') or p.name.startswith('painted-') else 1024 if p.name.startswith('approved-') else 768
  im.thumbnail((limit,limit),Image.Resampling.LANCZOS)
  dest=out/(p.stem+'.webp');im.save(dest,'WEBP',quality=88,method=6)
  report[str(p.relative_to(G)).replace('\\','/')]={'originalBytes':p.stat().st_size,'downloadBytes':dest.stat().st_size,'originalSize':before,'size':im.size,'rgbaBytes':im.width*im.height*4}
(G/'assets/ui/compact/manifest.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('Download bytes:',sum(x['originalBytes'] for x in report.values()),'->',sum(x['downloadBytes'] for x in report.values()))
print('RGBA bytes:',sum(x['originalSize'][0]*x['originalSize'][1]*4 for x in report.values()),'->',sum(x['rgbaBytes'] for x in report.values()))
