import yaml
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
    print("=" * 60)
    print("测试YAML模板系统")
    print("=" * 60)
    
    try:
        with open('output_templates.yaml', 'r', encoding='utf8') as f:
            config = yaml.safe_load(f)
            print("\n已加载的模板:")
            for template_name in config['templates'].keys():
                print(f"  - {template_name}")
        
        print("\n" + "=" * 60)
        print("使用 '2023式模板' 输出:")
        print("=" * 60)
        result = translatefull(test_input, '2023式模板')
        print(result)
        
        print("\n" + "=" * 60)
        print("测试成功！模板系统运行正常。")
        print("=" * 60)
    except Exception as e:
        print(f"\n错误: {str(e)}")
        import traceback
        traceback.print_exc()
        print("\n测试失败！")
