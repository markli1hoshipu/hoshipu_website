"""
修复business_data.txt文件的脚本
如果当前文件损坏，此脚本将创建一个备份并尝试重新生成一个空的或修复的数据文件
"""
import pickle
import shutil
from datetime import datetime

def create_backup():
    """创建当前文件的备份"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    try:
        shutil.copy('business_data.txt', f'business_data_backup_{timestamp}.txt')
        print(f'[OK] Created backup: business_data_backup_{timestamp}.txt')
        return True
    except Exception as e:
        print(f'[FAIL] Backup failed: {e}')
        return False

def create_empty_data():
    """创建一个空的数据文件"""
    empty_data = {}
    try:
        with open('business_data_new.txt', 'wb') as f:
            f.write(pickle.dumps(empty_data, protocol=4))
        print('[OK] Created new empty data file: business_data_new.txt')
        print('  You can rename this file to business_data.txt')
        return True
    except Exception as e:
        print(f'[FAIL] Create failed: {e}')
        return False

def test_load_file(filename):
    """测试是否能加载文件"""
    try:
        with open(filename, 'rb') as f:
            data = pickle.load(f)
        print(f'[OK] File {filename} loaded successfully')
        print(f'  Data type: {type(data)}')
        if isinstance(data, dict):
            print(f'  Number of dates: {len(data.keys())}')
            if len(data.keys()) > 0:
                sample_dates = list(data.keys())[:3]
                print(f'  Sample dates: {sample_dates}')
        return True
    except Exception as e:
        print(f'[FAIL] File {filename} cannot be loaded: {e}')
        return False

if __name__ == '__main__':
    print('=== Business Data File Repair Tool ===\n')

    print('1. Testing current file...')
    current_ok = test_load_file('business_data.txt')

    if not current_ok:
        print('\n2. Current file is corrupted, creating backup...')
        create_backup()

        print('\n3. Creating new empty data file...')
        create_empty_data()

        print('\nRepair suggestions:')
        print('- If you have a backup, restore from backup')
        print('- If you want to start fresh:')
        print('  1) Delete or rename current business_data.txt')
        print('  2) Rename business_data_new.txt to business_data.txt')
        print('- If you need to recover data, contact system administrator')
    else:
        print('\n[OK] Current file is fine, no repair needed')

    print('\nDone!')
