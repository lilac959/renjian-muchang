"""Generate a display LUT from Blender's own OCIO config. Needs PyOpenColorIO.
python export-color-lut.py /path/to/Blender/datafiles/colormanagement/config.ocio OUTPUT
No source blend or application preference is modified.
"""
import sys,math
from array import array
from pathlib import Path
import PyOpenColorIO as ocio
config=ocio.Config.CreateFromFile(sys.argv[1]);view=ocio.DisplayViewTransform(src=config.getRoleColorSpace('scene_linear'),display='sRGB',view='AgX')
pipeline=ocio.LegacyViewingPipeline();pipeline.setDisplayViewTransform(view);pipeline.setLooksOverride('AgX - Medium High Contrast');pipeline.setLooksOverrideEnabled(True)
processor=pipeline.getProcessor(config).getDefaultCPUProcessor();size=65;values=array('f');exposure=2**.35
for z in range(size):
 for y in range(size):
  for x in range(size):values.extend([(65**(v/(size-1))-1)*exposure for v in [x,y,z]])
processor.apply(ocio.PackedImageDesc(values,size**3,1,3));result=bytearray()
for i in range(0,len(values),3):result.extend([max(0,min(255,round(v*255))) for v in values[i:i+3]]+[255])
Path(sys.argv[2]).write_bytes(result);print('Source AgX Medium High Contrast / exposure +0.35 / sRGB:',len(result),'bytes')
