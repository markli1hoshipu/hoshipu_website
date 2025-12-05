import sys
import re
import yaml

# 复制必要的函数
week = {'MO':'周一','TU':'周二','WE':'周三','TH':'周四','FR':'周五','SA':'周六','SU':'周日'}
month = {'JAN':'1月','FEB':'2月','MAR':'3月','APR':'4月','MAY':'5月','JUN':'6月',\
        'JUL':'7月','AUG':'8月','SEP':'9月','OCT':'10月','NOV':'11月','DEC':'12月'}

def cleare(ll):
    re_list = []
    for i in ll:
        if i != '':
            re_list.append(i)
    return re_list

def get_airline(filename):
    f = open(filename,'r',encoding = 'utf8')
    cont = f.read()
    f.close()
    re_dict = {}
    for line in cont.splitlines():
        line = line.strip()
        if line == 'END123':
            break
        re_dict[line.split()[0].strip()] = line.split()[1].strip()
    return re_dict

def get_airport(filename):
    f = open(filename,'r',encoding = 'utf8')
    cont = f.read()
    f.close()
    re_dict = {}
    for line in cont.splitlines():
        line = line.strip()
        if line == 'END123':
            break
        re_dict[line.split()[0].strip()] = line.split()[1].strip()
    return re_dict

def load_output_template(template_name='2023式模板'):
    try:
        with open('output_templates.yaml', 'r', encoding='utf8') as f:
            config = yaml.safe_load(f)
            return config['templates'].get(template_name, config['templates']['2023式模板'])
    except:
        return None

# 简化版translatefull用于测试
from travel_translate import translatefull

test_input = """RT:KVS07X
**ELECTRONIC TICKET PNR**
1.SAWA/HIROFUNE 2.YANG/JING 3.ZE/BOMAO CHD 4.ZE/BOQIN CHD HED5ZS 
5.CA8903 L1 SU11JAN DLCPEK RR4 0900 1010 E -- T3 
6.CA189 L1 SU11JAN PEKTPE RR4 1340 1720 E T3 2 
7.CA196 L2 TU20JAN TPEPVG RR4 1505 1710 E 2 T2 
8.CA8912 L2 TU20JAN PVGDLC RR4 2045 2230 E T2 -- 
82.TN/999-5504257737/P1 
83.TN/999-5504257738/P2 
84.TN/999-5504257739/P3 
85.TN/999-5504257740/P4"""

if __name__ == '__main__':
    print("=" * 80)
    print("测试新模板：民航信息式")
    print("=" * 80)
    
    try:
        print("\n使用 '民航信息式模板' 输出:")
        print("-" * 80)
        result = translatefull(test_input, '民航信息式模板')
        print(result)
        print("\n" + "=" * 80)
        
        print("\n对比 '2023式模板' 输出:")
        print("-" * 80)
        result2 = translatefull(test_input, '2023式模板')
        print(result2)
        print("\n" + "=" * 80)
        print("测试成功！")
    except Exception as e:
        print(f"\n错误: {str(e)}")
        import traceback
        traceback.print_exc()
        print("\n测试失败！")
