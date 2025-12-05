import re

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

def translatefull(full):

    airline = get_airline('航司对照表.txt')
    airport = get_airport('机场对照表.txt')

    temp = ''
    r = '尊敬的客户，您的行程如下，请按机场要求提前抵达办理登机。\n'

    lines = full.strip().splitlines()
    
    passengers = {}
    flights = []
    tickets = {}
    
    for line in lines:
        line = line.strip()
        
        if not line or line.startswith('RT:') or line.startswith('**'):
            continue
        
        parts = cleare(line.split())
        if not parts:
            continue
        
        first_part = parts[0]
        
        if re.match(r'^\d+\.', first_part):
            line_num = first_part.split('.')[0]
            content_after_num = line.split('.', 1)[1].strip() if '.' in line else ''
            
            if re.match(r'^[A-Z0-9]{2}\d{3,4}\s', content_after_num):
                flight_match = re.match(r'^([A-Z0-9]{2}\d{3,4})\s+([A-Z]\d?)\s+([A-Z]{2})(\d{2})([A-Z]{3})\s+([A-Z]{3})([A-Z]{3})\s+\w+\s+(\d{4})\s+(\d{4})\s+E\s+(--|\w+|T?\d?)\s+([T\d\-]+)', content_after_num)
                if flight_match:
                    flights.append({
                        'flight_number': flight_match.group(1),
                        'cabin': flight_match.group(2),
                        'weekday': flight_match.group(3),
                        'day': flight_match.group(4),
                        'month': flight_match.group(5),
                        'route': flight_match.group(6) + flight_match.group(7),
                        'dep_time': flight_match.group(8),
                        'arr_time': flight_match.group(9),
                        'dep_terminal': flight_match.group(10),
                        'arr_terminal': flight_match.group(11)
                    })
            else:
                pax_matches = re.finditer(r'(\d+)\.([\u4e00-\u9fa5]+|[A-Z]+/[A-Z]+)', line)
                for match in pax_matches:
                    pax_num = match.group(1)
                    pax_name = match.group(2).replace('/', ' ')
                    passengers[pax_num] = pax_name
        
        if 'SSR TKNE' in line:
            ticket_match = re.search(r'(\d{13})/\d+/P(\d+)', line)
            if ticket_match:
                ticket_number = ticket_match.group(1)
                passenger_num = ticket_match.group(2)
                tickets[passenger_num] = ticket_number
        
        if line.startswith(tuple(f'{i}.TN/' for i in range(1, 200))):
            ticket_match = re.search(r'TN/(\d{3}-\d{10})/P(\d+)', line)
            if ticket_match:
                ticket_number = ticket_match.group(1)
                passenger_num = ticket_match.group(2)
                tickets[passenger_num] = ticket_number
    
    for flight in flights:
        dep_airport = flight['route'][:3]
        arr_airport = flight['route'][3:6]
        
        dep_name = airport.get(dep_airport, dep_airport)
        arr_name = airport.get(arr_airport, arr_airport)
        
        airline_code = flight['flight_number'][:2]
        airline_name = airline.get(airline_code, '')
        
        dep_terminal = '' if flight['dep_terminal'] == '--' else f"(航站楼{flight['dep_terminal']})"
        arr_terminal = '' if flight['arr_terminal'] == '--' else f"(航站楼{flight['arr_terminal']})"
        
        dep_hour = flight['dep_time'][:2]
        dep_min = flight['dep_time'][2:4]
        arr_hour = flight['arr_time'][:2]
        arr_min = flight['arr_time'][2:4]
        
        month_name = month.get(flight['month'], flight['month'])
        day = flight['day']
        
        r += f"{month_name}{day}日: {dep_name}{dep_terminal}{dep_hour}点{dep_min}分出发 --  {arr_name}{arr_terminal}{arr_hour}点{arr_min}分到达; "
        if airline_name:
            r += f" {airline_name} 航班号：{flight['flight_number']}\n"
        else:
            r += f" 航班号：{flight['flight_number']}\n"
    
    for pax_num in sorted(tickets.keys()):
        name = passengers.get(pax_num, f'旅客{pax_num}')
        ticket = tickets[pax_num]
        temp += f'{name}: {ticket}\n'
    
    r += temp
    return r


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
    print("测试新格式PNR解析")
    print("=" * 60)
    print("\n输入:")
    print(test_input)
    print("\n" + "=" * 60)
    
    try:
        airline = get_airline('航司对照表.txt')
        airport = get_airport('机场对照表.txt')
        
        lines = test_input.strip().splitlines()
        pnr_code = ''
        passengers = {}
        flights = []
        tickets = {}
        
        for line in lines:
            line = line.strip()
            
            if not line or line.startswith('**'):
                continue
            
            if line.startswith('RT:'):
                pnr_match = re.search(r'RT:([A-Z0-9]+)', line)
                if pnr_match:
                    pnr_code = pnr_match.group(1)
                continue
            
            parts = cleare(line.split())
            if not parts:
                continue
            
            first_part = parts[0]
            
            if re.match(r'^\d+\.', first_part):
                line_num = first_part.split('.')[0]
                content_after_num = line.split('.', 1)[1].strip() if '.' in line else ''
                
                if re.match(r'^[A-Z0-9]{2}\d{3,4}\s', content_after_num):
                    flight_match = re.match(r'^([A-Z0-9]{2}\d{3,4})\s+([A-Z])\s+([A-Z]{2})(\d{2})([A-Z]{3})\s+([A-Z]{3})([A-Z]{3})\s+\w+\s+(\d{4})\s+(\d{4})\s+E\s+(--|\w+)\s+([T\d\-]+)', content_after_num)
                    if flight_match:
                        flights.append({
                            'flight_number': flight_match.group(1),
                            'cabin': flight_match.group(2),
                            'weekday': flight_match.group(3),
                            'day': flight_match.group(4),
                            'month': flight_match.group(5),
                            'route': flight_match.group(6) + flight_match.group(7),
                            'dep_time': flight_match.group(8),
                            'arr_time': flight_match.group(9),
                            'dep_terminal': flight_match.group(10),
                            'arr_terminal': flight_match.group(11)
                        })
                else:
                    pax_matches = re.finditer(r'(\d+)\.([\u4e00-\u9fa5]+|[A-Z]+/[A-Z]+)', line)
                    for match in pax_matches:
                        pax_num = match.group(1)
                        pax_name = match.group(2).replace('/', ' ')
                        passengers[pax_num] = pax_name
            
            if 'SSR TKNE' in line:
                ticket_match = re.search(r'(\d{13})/\d+/P(\d+)', line)
                if ticket_match:
                    ticket_number = ticket_match.group(1)
                    passenger_num = ticket_match.group(2)
                    tickets[passenger_num] = ticket_number
        
        print("\n提取的信息:")
        print("=" * 60)
        
        if pnr_code:
            print(f"\nPNR编号: {pnr_code}")
        
        print(f"\n乘客信息 (共{len(passengers)}人):")
        for pax_num, pax_name in sorted(passengers.items()):
            print(f"  P{pax_num}: {pax_name}")
        
        print(f"\n航班信息 (共{len(flights)}个航段):")
        for i, flight in enumerate(flights, 1):
            print(f"\n  航段 {i}:")
            print(f"    航班号: {flight['flight_number']}")
            print(f"    舱位: {flight['cabin']}")
            print(f"    日期: {flight['weekday']}{flight['day']}{flight['month']}")
            print(f"    航线: {flight['route'][:3]} → {flight['route'][3:6]}")
            print(f"    起飞时间: {flight['dep_time']}")
            print(f"    到达时间: {flight['arr_time']}")
            print(f"    出发航站楼: {flight['dep_terminal']}")
            print(f"    到达航站楼: {flight['arr_terminal']}")
        
        print(f"\n票号信息 (共{len(tickets)}张):")
        for pax_num, ticket in sorted(tickets.items()):
            pax_name = passengers.get(pax_num, f'旅客{pax_num}')
            print(f"  P{pax_num} ({pax_name}): {ticket}")
        
        print("\n" + "=" * 60)
        print("最终输出:")
        print("=" * 60)
        result = translatefull(test_input)
        print(result)
        print("\n" + "=" * 60)
        print("测试成功！")
    except Exception as e:
        print(f"\n错误: {str(e)}")
        import traceback
        traceback.print_exc()
        print("\n" + "=" * 60)
        print("测试失败！")
