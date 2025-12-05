import re
import yaml

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

def translatefull(full, template_name='2023式模板'):
    airline = get_airline('航司对照表.txt')
    airport = get_airport('机场对照表.txt')
    template = load_output_template(template_name)
    
    if not template:
        template = {
            'greeting': '尊敬的客户，您的行程如下，请按机场要求提前抵达办理登机。',
            'show_pnr_code': True,
            'pnr_format': '编号：{pnr_code}',
            'flight_format': '{month}{day}日: {dep_airport}{dep_terminal}{dep_hour}点{dep_min}分出发 --  {arr_airport}{arr_terminal}{arr_hour}点{arr_min}分到达; {airline_name} 航班号：{flight_number}',
            'flight_format_no_airline': '{month}{day}日: {dep_airport}{dep_terminal}{dep_hour}点{dep_min}分出发 --  {arr_airport}{arr_terminal}{arr_hour}点{arr_min}分到达; 航班号：{flight_number}',
            'terminal_format': '(航站楼{terminal})',
            'terminal_empty': '',
            'ticket_format': '{passenger_name}: {ticket_number}'
        }

    temp = ''
    r = template.get('greeting', '') + '\n' if not template.get('single_line', False) else ''

    lines = full.strip().splitlines()
    
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
                flight_match = re.match(r'^([A-Z0-9]{2}\d{3,4})\s+([A-Z]\d?)\s+([A-Z]{2})(\d{2})([A-Z]{3})\s+([A-Z]{3})([A-Z]{3})\s+\w+\s+(\d{4})\s+(\d{4})\s+E\s+(--|w+|T?\d?)\s+([T\d\-]+)', content_after_num)
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
    
    if template.get('single_line', False):
        result = template.get('header', '')
        
        passenger_names = []
        for pax_num in sorted(passengers.keys()):
            passenger_names.append(passengers[pax_num])
        if passenger_names:
            result += template.get('passenger_separator', '；').join(passenger_names) + '/'
        
        flight_parts = []
        for flight in flights:
            dep_airport = flight['route'][:3]
            arr_airport = flight['route'][3:6]
            
            dep_name = airport.get(dep_airport, dep_airport)
            arr_name = airport.get(arr_airport, arr_airport)
            
            airline_code = flight['flight_number'][:2]
            airline_name = airline.get(airline_code, '')
            
            arr_terminal = template['terminal_empty'] if flight['arr_terminal'] == '--' else template['terminal_format'].format(terminal=flight['arr_terminal'])
            
            dep_hour = flight['dep_time'][:2]
            dep_min = flight['dep_time'][2:4]
            arr_hour = flight['arr_time'][:2]
            arr_min = flight['arr_time'][2:4]
            
            month_name = month.get(flight['month'], flight['month'])
            day = flight['day']
            
            if airline_name:
                flight_line = template['flight_format'].format(
                    airline_name=airline_name,
                    flight_number=flight['flight_number'],
                    month=month_name, day=day,
                    dep_airport=dep_name,
                    arr_airport=arr_name,
                    arr_terminal=arr_terminal,
                    dep_hour=dep_hour, dep_min=dep_min,
                    arr_hour=arr_hour, arr_min=arr_min
                )
            else:
                flight_line = template['flight_format_no_airline'].format(
                    flight_number=flight['flight_number'],
                    month=month_name, day=day,
                    dep_airport=dep_name,
                    arr_airport=arr_name,
                    arr_terminal=arr_terminal,
                    dep_hour=dep_hour, dep_min=dep_min,
                    arr_hour=arr_hour, arr_min=arr_min
                )
            flight_parts.append(flight_line)
        
        result += template.get('flight_separator', '；').join(flight_parts)
        
        result += template.get('footer', '')
        
        if tickets:
            ticket_list = [tickets[pax_num] for pax_num in sorted(tickets.keys())]
            
            if len(ticket_list) == 1:
                result += template.get('tickets_prefix', '/票号') + ticket_list[0]
            else:
                formatted_ticket = ticket_list[0]
                remaining = [t[-2:] for t in ticket_list[1:]]
                if len(remaining) > 0:
                    formatted_ticket += '-' + remaining[0]
                if len(remaining) > 1:
                    formatted_ticket += '/' + '/'.join(remaining[1:])
                result += template.get('tickets_prefix', '/票号') + formatted_ticket
        
        if pnr_code and template.get('show_pnr_code', True):
            result += ' ' + template['pnr_format'].format(pnr_code=pnr_code)
        
        result += '  ' + template.get('price_format', '含税')
        
        return result
    
    for flight in flights:
        dep_airport = flight['route'][:3]
        arr_airport = flight['route'][3:6]
        
        dep_name = airport.get(dep_airport, dep_airport)
        arr_name = airport.get(arr_airport, arr_airport)
        
        airline_code = flight['flight_number'][:2]
        airline_name = airline.get(airline_code, '')
        
        dep_terminal = template['terminal_empty'] if flight['dep_terminal'] == '--' else template['terminal_format'].format(terminal=flight['dep_terminal'])
        arr_terminal = template['terminal_empty'] if flight['arr_terminal'] == '--' else template['terminal_format'].format(terminal=flight['arr_terminal'])
        
        dep_hour = flight['dep_time'][:2]
        dep_min = flight['dep_time'][2:4]
        arr_hour = flight['arr_time'][:2]
        arr_min = flight['arr_time'][2:4]
        
        month_name = month.get(flight['month'], flight['month'])
        day = flight['day']
        
        if airline_name:
            flight_line = template['flight_format'].format(
                month=month_name, day=day,
                dep_airport=dep_name, dep_terminal=dep_terminal,
                dep_hour=dep_hour, dep_min=dep_min,
                arr_airport=arr_name, arr_terminal=arr_terminal,
                arr_hour=arr_hour, arr_min=arr_min,
                airline_name=airline_name,
                flight_number=flight['flight_number']
            )
        else:
            flight_line = template['flight_format_no_airline'].format(
                month=month_name, day=day,
                dep_airport=dep_name, dep_terminal=dep_terminal,
                dep_hour=dep_hour, dep_min=dep_min,
                arr_airport=arr_name, arr_terminal=arr_terminal,
                arr_hour=arr_hour, arr_min=arr_min,
                flight_number=flight['flight_number']
            )
        r += flight_line + '\n'
    
    if pnr_code and template.get('show_pnr_code', True):
        r = template['pnr_format'].format(pnr_code=pnr_code) + '\n' + r
    
    for pax_num in sorted(tickets.keys()):
        name = passengers.get(pax_num, f'旅客{pax_num}')
        ticket = tickets[pax_num]
        ticket_line = template['ticket_format'].format(
            passenger_name=name,
            ticket_number=ticket
        )
        temp += ticket_line + '\n'
    
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
    print("=" * 80)
    print("测试民航信息式模板")
    print("=" * 80)
    
    try:
        print("\n使用 '民航信息式模板' 输出:")
        print("-" * 80)
        result = translatefull(test_input, '民航信息式模板')
        print(result)
        print("\n" + "=" * 80)
        print("测试成功！")
    except Exception as e:
        print(f"\n错误: {str(e)}")
        import traceback
        traceback.print_exc()
        print("\n测试失败！")
