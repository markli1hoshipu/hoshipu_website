"""测试票号格式化逻辑"""

def format_tickets(ticket_list):
    """找出票号中变化的最小后缀，只保留每个票号最后1位的差异"""
    if len(ticket_list) == 1:
        return ticket_list[0]
    
    # 确保所有票号长度相同
    if len(set(len(t) for t in ticket_list)) > 1:
        # 长度不一致，无法处理，返回原样
        return '-'.join(ticket_list)
    
    ticket_len = len(ticket_list[0])
    
    # 简化策略：只保留最后1位的差异
    # 公共部分是第一个票号去掉最后1位
    common_part = ticket_list[0][:-1]
    
    # 差异部分是每个票号的最后1位
    diff_parts = [t[-1] for t in ticket_list]
    
    # 格式化输出
    return common_part + '/' + '/'.join(diff_parts)

# 测试用例
test_cases = [
    {
        'tickets': ['999-5504257737', '999-5504257738', '999-5504257739', '999-5504257740'],
        'expected': '999-550425773/7/8/9/0'
    },
    {
        'tickets': ['781-5596484812', '781-5596484813', '781-5596484814'],
        'expected': '781-559648481/2/3/4'
    },
    {
        'tickets': ['880-5596484787'],
        'expected': '880-5596484787'
    },
    {
        'tickets': ['123-4567890', '123-4567891', '123-4567892'],
        'expected': '123-456789/0/1/2'
    }
]

print("=" * 60)
print("测试票号格式化")
print("=" * 60)

for i, test in enumerate(test_cases, 1):
    result = format_tickets(test['tickets'])
    status = "PASS" if result == test['expected'] else "FAIL"
    print(f"\n测试 {i}: {status}")
    print(f"  输入: {test['tickets']}")
    print(f"  期望: {test['expected']}")
    print(f"  实际: {result}")
    if result != test['expected']:
        print(f"  错误: 结果不匹配!")

print("\n" + "=" * 60)
