import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('sync_config', ROOT/'scripts/sync_config.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ConfigValidation(unittest.TestCase):
    def setUp(self):
        self.workbook=ROOT/'配置表/人间牧场·可配置表.xlsx'
        self.rows=module.read_workbook(self.workbook)
        self.temp=tempfile.TemporaryDirectory()
        self.output=Path(self.temp.name)/'rules.json'
        self.original=(ROOT/'game/rules.json').read_bytes()
        self.output.write_bytes(self.original)
    def tearDown(self): self.temp.cleanup()
    def row(self, key):
        return next(c for rows in self.rows.values() for c in rows.values() if c.get('A')==key)
    def test_actual_workbook_matches_runtime(self):
        self.assertEqual(module.sync(self.workbook,self.output,True),[])
    def test_blank_preserves_previous_value(self):
        self.row('duration')['C']=None
        with patch.object(module,'read_workbook',return_value=self.rows): module.sync(self.workbook,self.output)
        self.assertEqual(json.loads(self.output.read_text(encoding='utf-8'))['config']['duration'],300)
    def test_invalid_value_preserves_valid_file(self):
        self.row('duration')['C']=-10
        with patch.object(module,'read_workbook',return_value=self.rows),self.assertRaisesRegex(ValueError,'全局参数 第.*行 策划值'):
            module.sync(self.workbook,self.output)
        self.assertEqual(self.output.read_bytes(),self.original)
    def test_duplicate_id_rejected(self):
        self.rows['全局参数'][200]=copy.deepcopy(self.row('duration'))
        with patch.object(module,'read_workbook',return_value=self.rows),self.assertRaisesRegex(ValueError,'重复ID'):
            module.sync(self.workbook,self.output)
        self.assertEqual(self.output.read_bytes(),self.original)
    def test_units_and_required_deletion_are_checked(self):
        self.row('duration')['D']='年'
        self.row('mana')['F']='删除'
        with patch.object(module,'read_workbook',return_value=self.rows),self.assertRaisesRegex(ValueError,'单位'):
            module.sync(self.workbook,self.output)
        self.assertEqual(self.output.read_bytes(),self.original)

if __name__=='__main__': unittest.main()
