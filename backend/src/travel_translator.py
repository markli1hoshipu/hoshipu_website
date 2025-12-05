"""
Travel translation logic - ported from original travel_translate.py
"""
import re
import json

week = {'MO':'周一','TU':'周二','WE':'周三','TH':'周四','FR':'周五','SA':'周六','SU':'周日'}
month = {'JAN':'1月','FEB':'2月','MAR':'3月','APR':'4月','MAY':'5月','JUN':'6月',
        'JUL':'7月','AUG':'8月','SEP':'9月','OCT':'10月','NOV':'11月','DEC':'12月'}

def cleare(ll):
    re = []
    for i in ll:
        if i != '':
            re.append(i)
    return re

def translate_itinerary(input_text: str, template_config: dict, airlines: dict, airports: dict) -> str:
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
                flight_match = re.match(r'^([A-Z0-9]{2}\d{3,4})\s+([A-Z]\d?)\s+([A-Z]{2})\s*(\d{2})([A-Z]{3})\s+([A-Z]{3})([A-Z]{3})\s+\w+\s+(\d{4})\s+(\d{4})\s+E\s+(--|\w+|T?\d?)\s+([T\d\-]+)', content_after_num)
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
