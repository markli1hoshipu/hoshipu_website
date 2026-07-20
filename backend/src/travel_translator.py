"""
Travel translation logic - ported from original travel_translate.py
"""
import re
import json

week = {'MO':'周一','TU':'周二','WE':'周三','TH':'周四','FR':'周五','SA':'周六','SU':'周日'}
month = {'JAN':'1月','FEB':'2月','MAR':'3月','APR':'4月','MAY':'5月','JUN':'6月',
        'JUL':'7月','AUG':'8月','SEP':'9月','OCT':'10月','NOV':'11月','DEC':'12月'}
month_num = {'JAN':1,'FEB':2,'MAR':3,'APR':4,'MAY':5,'JUN':6,
             'JUL':7,'AUG':8,'SEP':9,'OCT':10,'NOV':11,'DEC':12}

# City (not full airport) names, keyed by IATA code. Used by the "numbered"
# layout, which shows 大连-武汉 rather than 大连周水子国际机场-武汉天河国际机场.
# City cannot be reliably derived from names like "首都国际机场", hence this map.
AIRPORT_CITY = {
    # Mainland China + Greater China
    'BJS':'北京','PEK':'北京','PKX':'北京','NAY':'北京','CAN':'广州','CGO':'郑州',
    'CGQ':'长春','CKG':'重庆','CSX':'长沙','CTU':'成都','TFU':'成都','DLC':'大连',
    'FOC':'福州','HAK':'海口','HET':'呼和浩特','HFE':'合肥','HGH':'杭州','HRB':'哈尔滨',
    'INC':'银川','KHN':'南昌','KMG':'昆明','KWE':'贵阳','LHW':'兰州','LXA':'拉萨',
    'NGB':'宁波','NKG':'南京','NNG':'南宁','NTG':'南通','SHE':'沈阳','SIA':'西安',
    'XIY':'西安','SJW':'石家庄','SHA':'上海','PVG':'上海','SYX':'三亚','SZX':'深圳',
    'TAO':'青岛','TNA':'济南','TSN':'天津','TYN':'太原','URC':'乌鲁木齐','WUH':'武汉',
    'WUX':'无锡','XMN':'厦门','XNN':'西宁','XUZ':'徐州','HKG':'香港','MFM':'澳门','TSA':'台北',
    # East Asia / SE Asia
    'HND':'东京','NRT':'东京','ITM':'大阪','KIX':'大阪','ICN':'首尔','PUS':'釜山',
    'BKK':'曼谷','SGN':'胡志明市','SIN':'新加坡','KUL':'吉隆坡',
    # Common long-haul hubs
    'DXB':'迪拜','AUH':'阿布扎比','DOH':'多哈','DEL':'新德里','LHR':'伦敦','CDG':'巴黎',
    'FRA':'法兰克福','MUC':'慕尼黑','AMS':'阿姆斯特丹','JFK':'纽约','IAD':'华盛顿',
    'LAX':'洛杉矶','SFO':'旧金山','SEA':'西雅图','ORD':'芝加哥','YYZ':'多伦多','YVR':'温哥华',
    'YUL':'蒙特利尔','SYD':'悉尼','MEL':'墨尔本','AKL':'奥克兰','MOW':'莫斯科','SVO':'莫斯科',
}


def _city_name(code, full_name, cities=None):
    """City name for the numbered layout. Priority: the per-airport city set in the
    DB (editable from the frontend) → the curated map → the airport name with the
    trailing 机场 / 国际机场 stripped (best effort for uncommon airports)."""
    if cities and cities.get(code):
        return cities[code]
    if code in AIRPORT_CITY:
        return AIRPORT_CITY[code]
    name = full_name or code
    for suf in ('国际机场', '机场'):
        if name.endswith(suf):
            return name[: -len(suf)]
    return name

def cleare(ll):
    re = []
    for i in ll:
        if i != '':
            re.append(i)
    return re

def translate_itinerary(input_text: str, template_config: dict, airlines: dict, airports: dict, airport_cities: dict = None) -> str:
    """
    Translate travel itinerary from raw text to formatted output
    """
    temp = ''
    r = template_config.get('greeting', '') + '\n' if not template_config.get('single_line', False) else ''

    lines = input_text.strip().splitlines()
    
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
                # 格式1: 完整格式 (带航站楼信息)
                # 如: MU2978 Y TH 08 JAN DLCCZX RR1 1635 1820 E -- T2
                flight_match = re.match(r'^([A-Z0-9]{2}\d{3,4})\s+([A-Z]\d?)\s+([A-Z]{2})\s*(\d{2})([A-Z]{3})\s+([A-Z]{3})([A-Z]{3})\s+\w+\s+(\d{4})\s+(\d{4})\s+E\s+(--|\w+|T?\d?)\s+([T\d\-]+)', content_after_num)
                if flight_match:
                    flights.append({
                        'line_num': line_num,
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
                    # 格式2: 简化格式 (无 E 和航站楼信息)
                    # 如: MU2978 Y TH08JAN DLCCZX RR1 1635 1820
                    flight_match_simple = re.match(
                        r'^([A-Z0-9]{2}\d{3,4})\s+([A-Z]\d?)\s+([A-Z]{2})\s*(\d{2})([A-Z]{3})\s+([A-Z]{3})([A-Z]{3})\s+\w+\s+(\d{4})\s+(\d{4})\s*$',
                        content_after_num
                    )
                    if flight_match_simple:
                        flights.append({
                            'line_num': line_num,
                            'flight_number': flight_match_simple.group(1),
                            'cabin': flight_match_simple.group(2),
                            'weekday': flight_match_simple.group(3),
                            'day': flight_match_simple.group(4),
                            'month': flight_match_simple.group(5),
                            'route': flight_match_simple.group(6) + flight_match_simple.group(7),
                            'dep_time': flight_match_simple.group(8),
                            'arr_time': flight_match_simple.group(9),
                            'dep_terminal': '--',
                            'arr_terminal': '--'
                        })
            else:
                # 乘客姓名: 中文名 或 西文名(LASTNAME/FIRSTNAME)
                pax_matches = re.finditer(r'(\d+)\.([\u4e00-\u9fa5]+|[A-Z]+/[A-Z]+)', line)
                for match in pax_matches:
                    pax_num = match.group(1)
                    pax_name = match.group(2)
                    # 排除非乘客行: FN/, FP/, TN/, FC/, 机场代码/T 等
                    if pax_name.startswith(('FN/', 'FP/', 'TN/', 'FC/', 'CA/', 'OSI', 'SSR', 'RMK')):
                        continue
                    # 排除 机场代码/航站楼 格式 (如 DLC/T, PEK/T)
                    if re.match(r'^[A-Z]{3}/[A-Z]$', pax_name):
                        continue
                    passengers[pax_num] = pax_name.replace('/', ' ')
        
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
    
    if template_config.get('layout') == 'numbered':
        # Keep the source line numbers: "1.名 2.名" then each flight "N.航班 M.D 城-城 起飞/到达".
        out_lines = []
        pax_str = ' '.join(f'{n}.{passengers[n]}' for n in sorted(passengers, key=lambda x: int(x)))
        if pax_str:
            out_lines.append(pax_str)
        for flight in flights:
            dep_city = _city_name(flight['route'][:3], airports.get(flight['route'][:3], flight['route'][:3]), airport_cities)
            arr_city = _city_name(flight['route'][3:6], airports.get(flight['route'][3:6], flight['route'][3:6]), airport_cities)
            m = month_num.get(flight['month'], flight['month'])
            try:
                d = int(flight['day'])
            except (ValueError, TypeError):
                d = flight['day']
            num = flight.get('line_num', '')
            prefix = f'{num}.' if num else ''
            out_lines.append(
                template_config.get('flight_format',
                    '{num}{flight_number} {month}.{day} {dep_city}-{arr_city} {dep_time}起飞 {arr_time}到达'
                ).format(
                    num=prefix, flight_number=flight['flight_number'],
                    month=m, day=d, dep_city=dep_city, arr_city=arr_city,
                    dep_time=flight['dep_time'], arr_time=flight['arr_time'],
                )
            )
        footer = template_config.get('footer', '')
        if footer:
            out_lines.append(footer)
        return '\n'.join(out_lines)

    if template_config.get('single_line', False):
        result = template_config.get('header', '')
        
        passenger_names = []
        for pax_num in sorted(passengers.keys()):
            passenger_names.append(passengers[pax_num])
        if passenger_names:
            result += template_config.get('passenger_separator', '；').join(passenger_names) + '/'
        
        flight_parts = []
        for flight in flights:
            dep_airport = flight['route'][:3]
            arr_airport = flight['route'][3:6]
            
            dep_name = airports.get(dep_airport, dep_airport)
            arr_name = airports.get(arr_airport, arr_airport)
            
            airline_code = flight['flight_number'][:2]
            airline_name = airlines.get(airline_code, '')
            
            arr_terminal = template_config['terminal_empty'] if flight['arr_terminal'] == '--' else template_config['terminal_format'].format(terminal=flight['arr_terminal'])
            
            dep_hour = flight['dep_time'][:2]
            dep_min = flight['dep_time'][2:4]
            arr_hour = flight['arr_time'][:2]
            arr_min = flight['arr_time'][2:4]
            
            month_name = month.get(flight['month'], flight['month'])
            day = flight['day']
            
            if airline_name:
                flight_line = template_config['flight_format'].format(
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
                flight_line = template_config['flight_format_no_airline'].format(
                    flight_number=flight['flight_number'],
                    month=month_name, day=day,
                    dep_airport=dep_name,
                    arr_airport=arr_name,
                    arr_terminal=arr_terminal,
                    dep_hour=dep_hour, dep_min=dep_min,
                    arr_hour=arr_hour, arr_min=arr_min
                )
            flight_parts.append(flight_line)
        
        result += template_config.get('flight_separator', '；').join(flight_parts)
        
        result += template_config.get('footer', '')
        
        if tickets:
            ticket_list = [tickets[pax_num] for pax_num in sorted(tickets.keys())]
            
            if len(ticket_list) == 1:
                result += template_config.get('tickets_prefix', '/票号') + ticket_list[0]
            else:
                formatted_ticket = ticket_list[0]
                remaining = [t[-2:] for t in ticket_list[1:]]
                if len(remaining) > 0:
                    formatted_ticket += '-' + remaining[0]
                if len(remaining) > 1:
                    formatted_ticket += '/' + '/'.join(remaining[1:])
                result += template_config.get('tickets_prefix', '/票号') + formatted_ticket
        
        if pnr_code and template_config.get('show_pnr_code', True):
            result += ' ' + template_config['pnr_format'].format(pnr_code=pnr_code)
        
        result += '  ' + template_config.get('price_format', '含税')
        
        return result
    
    for flight in flights:
        dep_airport = flight['route'][:3]
        arr_airport = flight['route'][3:6]
        
        dep_name = airports.get(dep_airport, dep_airport)
        arr_name = airports.get(arr_airport, arr_airport)
        
        airline_code = flight['flight_number'][:2]
        airline_name = airlines.get(airline_code, '')
        
        dep_terminal = template_config['terminal_empty'] if flight['dep_terminal'] == '--' else template_config['terminal_format'].format(terminal=flight['dep_terminal'])
        arr_terminal = template_config['terminal_empty'] if flight['arr_terminal'] == '--' else template_config['terminal_format'].format(terminal=flight['arr_terminal'])
        
        dep_hour = flight['dep_time'][:2]
        dep_min = flight['dep_time'][2:4]
        arr_hour = flight['arr_time'][:2]
        arr_min = flight['arr_time'][2:4]
        
        month_name = month.get(flight['month'], flight['month'])
        day = flight['day']
        
        if airline_name:
            flight_line = template_config['flight_format'].format(
                month=month_name, day=day,
                dep_airport=dep_name, dep_terminal=dep_terminal,
                dep_hour=dep_hour, dep_min=dep_min,
                arr_airport=arr_name, arr_terminal=arr_terminal,
                arr_hour=arr_hour, arr_min=arr_min,
                airline_name=airline_name,
                flight_number=flight['flight_number']
            )
        else:
            flight_line = template_config['flight_format_no_airline'].format(
                month=month_name, day=day,
                dep_airport=dep_name, dep_terminal=dep_terminal,
                dep_hour=dep_hour, dep_min=dep_min,
                arr_airport=arr_name, arr_terminal=arr_terminal,
                arr_hour=arr_hour, arr_min=arr_min,
                flight_number=flight['flight_number']
            )
        r += flight_line + '\n'
    
    if pnr_code and template_config.get('show_pnr_code', True):
        r = template_config['pnr_format'].format(pnr_code=pnr_code) + '\n' + r
    
    for pax_num in sorted(tickets.keys()):
        name = passengers.get(pax_num, f'旅客{pax_num}')
        ticket = tickets[pax_num]
        ticket_line = template_config['ticket_format'].format(
            passenger_name=name,
            ticket_number=ticket
        )
        temp += ticket_line + '\n'
    
    r += temp
    return r
