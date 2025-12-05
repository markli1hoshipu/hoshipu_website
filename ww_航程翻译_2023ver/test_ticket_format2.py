"""测试票号格式化逻辑 - 修正版"""

def format_tickets(ticket_list):
    """
    票号压缩规则：
    - 单票号：直接显示
    - 多票号：显示第一个完整票号，后续票号只显示最后两位，用-分隔
    例如：['781-5596484812', '781-5596484813', '781-5596484809']
    输出：781-5596484812-13/09
    """
    if len(ticket_list) == 1:
        return ticket_list[0]
    
    # 第一个票号完整显示
    result = ticket_list[0]
    
    # 后续票号只显示最后两位，用-或/连接
    remaining = []
    for ticket in ticket_list[1:]:
        remaining.append(ticket[-2:])
    
    # 用-连接第一个后续票号，其余用/连接
    if len(remaining) > 0:
        result += '-' + remaining[0]
    if len(remaining) > 1:
        result += '/' + '/'.join(remaining[1:])
    
    return result

# 测试用例
test_cases = [
    {
        'tickets': ['781-5596484812', '781-5596484813', '781-5596484809'],
        'expected': '781-5596484812-13/09'
    },
    {
        'tickets': ['999-5504257737', '999-5504257738', '999-5504257739', '999-5504257740'],
        'expected': '999-5504257737-38/39/40'
    },
    {
        'tickets': ['880-5596484787'],
        'expected': '880-5596484787'
    },
    {
        'tickets': ['123-4567890', '123-4567891'],
        'expected': '123-4567890-91'
    }
]

print("=" * 60)
print("测试票号格式化（修正版）")
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
