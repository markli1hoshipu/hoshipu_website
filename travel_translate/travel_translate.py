from PySide6.QtWidgets import QApplication, QMessageBox,QPushButton
from PySide6.QtUiTools import QUiLoader
import json, re

uiLoader = QUiLoader()

week = {'MO':'周一','TU':'周二','WE':'周三','TH':'周四','FR':'周五','SA':'周六','SU':'周日'}
month = {'JAN':'1月','FEB':'2月','MAR':'3月','APR':'4月','MAY':'5月','JUN':'6月',\
        'JUL':'7月','AUG':'8月','SEP':'9月','OCT':'10月','NOV':'11月','DEC':'12月'}
short_month = {'JAN':'01','FEB':'02','MAR':'03','APR':'04','MAY':'05','JUN':'06',\
        'JUL':'07','AUG':'08','SEP':'09','OCT':'10','NOV':'11','DEC':'12'}

#下两者本质代码一样，仅仅是区别函数名
def get_airline(filename):
    f = open(filename,'r',encoding = 'utf8')

    cont = f.read()
    f.close()

    re = {}
    for line in cont.splitlines():
        line = line.strip()
        if line == 'END123':
            break
        re[line.split()[0].strip()] = line.split()[1].strip()
    return re

def get_airport(filename):
    f = open(filename,'r',encoding = 'utf8')
    cont = f.read()
    f.close()

    re = {}
    for line in cont.splitlines():
        line = line.strip()
        if line == 'END123':
            break
        re[line.split()[0].strip()] = line.split()[1].strip()
    return re


def strjoinline(l):
    re = ''
    for i in l[:-1]:
        re+=i
        re+='\n'
    re+=l[-1]
    return re

def cleare(ll):
    re = []
    for i in ll:
        if i != '':
            re.append(i)
    return re


def seperate_flightline(flightline):
    # airline, flightno, date, start, end, sttime, edtime,stterminal, edterminal;
    valid = flightline.strip()
    infos = cleare(valid.split(' '))
    flightno = infos[1]; airline = flightno[:2]
    date = infos[3]
    start = infos[4][:3]
    end = infos[4][3:]
    sttime = infos[6]
    edtime = infos[7]
    if 'E' not in infos[8]:
        print('error')
        return False
    # 航站楼读取只能按照位数，比较复杂
    idx = len(flightline)-1
    while flightline[idx] != 'E':
        idx -= 1
    terminals = flightline[idx:] + '     '
    stterminal = terminals[2:4]
    edterminal = terminals[4:6]
    if stterminal.strip() in ['', '-','--']:
        stterminal = ''
    if edterminal.strip() in ['', '-','--']:
        edterminal = ''

    return airline, flightno, date, start, end, sttime,edtime,stterminal, edterminal

def process_flightline(airports,short_airports,airlines,flightline):
    ret = {}
    airline, flightno, date, start, end, sttime,edtime,stterminal, edterminal = seperate_flightline(flightline)
    ret['{航班号}'] = flightno
    if airline in airlines:
        ret['{航司}'] = airlines[airline]
    else:
        ret['{航司}'] = airline
    ret['{中文日期}'] = f'{month[date[4:7]]}{date[2:4]}日'
    ret['{数字日期}'] = f'{short_month[date[4:7]]}/{date[2:4]}'
    ret['{中文起飞时间}'] = f'{sttime[:2]}点{sttime[2:4]}分'
    ret['{数字起飞时间}'] = f'{sttime[:2]}:{sttime[2:4]}'
    n = ''
    if len(edtime) > 4:
        n += '('
        if edtime[4] == '+':
            n += f'第{str(int(edtime[5])+1)}天'
        elif edtime[4] == '-':
            n += f'前{edtime[5]}天'
        n += ')'
    ret['{中文落地时间}'] = f'{edtime[:2]}点{edtime[2:4]}分{n}'
    ret['{数字落地时间}'] = f'{edtime[:2]}:{edtime[2:]}'

    if start in short_airports:
        ret['{简要始发地}'] = short_airports[start]
    else:
        ret['{简要始发地}'] = start
    if end in short_airports:
        ret['{简要目的地}'] = short_airports[end]
    else:
        ret['{简要目的地}'] = end

    if start in airports:
        ret['{完整始发地}'] = airports[start]
    else:
        ret['{完整始发地}'] = start
    if end in airports:
        ret['{完整目的地}'] = airports[end]
    else:
        ret['{完整目的地}'] = end

    ret['{始发地航站楼}'] = stterminal
    ret['{目的地航站楼}'] = edterminal      
    return ret

def get_all_info(user_input):
    #user_input是eterm的输入

    flights = []    # airline, flightno, date, start, end, sttime, edtime,stterminal, edterminal;
    passengers = [] # name, id


    # 用于分割旅客名、航段与后续重要信息
    seperate_key = '0411-82798787/DALIAN YUHANG INTERNATIONAL FORWARDING CO.,LTD.'

    flight_lines = []

    #分割完之后，start通常会包含无效信息，而end中多出的几行可以不不予处理
    start,end = user_input.split(seperate_key)[0], user_input.split(seperate_key)[1]
    while start[-1] != '\n':
        start = start[:-1]
    
    # 先处理航段
    startlines = start.splitlines()
    for line in startlines[::-1]:
        if len(re.compile(r'\d{4} \d{4}').findall(line)) != 1:
            break
        else: 
            flight_lines.append(line)
            startlines.remove(line)
    print(flight_lines)
    for flight in flight_lines[::-1]:
        flights.append(process_flightline(get_airport('airports.txt'),\
            get_airport('airports_short.txt'),get_airline('airlines.txt'),flight))
    
    # 找到旅客总数和名字，均在startlines
    nms = ''.join(startlines)
    passenger_names = re.compile(r'\d\.(.*?) ').findall(nms)
    #处理并读取
    total_lines = []
    for l in end.splitlines():
        total_lines.append(l.strip())
    end = '\n'.join(total_lines)
    lend = list(end)
    for idx in range(len(lend)-1):
        if lend[idx] == '\n' and not end[idx+1].isdigit():
            lend[idx] = ''
    end = ''.join(lend)
    for i in range(1,len(passenger_names)+1):        
        tkt = re.compile(fr'SSR TKNE (.*?)/1/P{str(i)}').findall(end)
        if tkt:
            tkt = tkt[0].split(' ')[-1]
        else:
            tkt = ''
        idid = re.compile(fr'SSR .*? NI(.*?)/P{str(i)}').findall(end)
        passid = re.compile(fr'SSR .*? P/(.*?)/P{str(i)}').findall(end)
        if idid:
            id = idid[0]
        elif passid:
            id = passid[0]
        else: 
            id = ''
        passengers.append({'{旅客姓名}':passenger_names[i-1],'{旅客证件}':id,'{票号}':tkt})
    return passengers,flights

def init_json():
    re = {'content':'123','passenger':'456','flight':'789'}
    with open('tt_format.json', 'w', encoding='utf-8') as json_file:
        json.dump(re, json_file, ensure_ascii=False, indent=4)
    return re

class FTT:
    def __init__(self):
        
        # 加载界面
        self.ui = uiLoader.load('travel_translate_full.ui')

        self.keys = ['{旅客}', 	'{旅客姓名}', '{旅客证件}','{票号}',\
                    '{航程}', 	'{中文日期}', '{数字日期}',  '{航司}', '{航班号}', \
                    '{简要始发地}', '{简要目的地}', '{完整始发地}', '{完整目的地}', \
	    '{中文起飞时间}', '{中文落地时间}', '{数字起飞时间}', '{数字落地时间}', '{始发地航站楼}', '{目的地航站楼}']
        # 格式初始化
        self.format = {}

        # 处理其他内容
        self.ui.btn_gen.clicked.connect(self.generate)
        self.ui.btn_sav.clicked.connect(self.save)
        self.update()

    def update(self):
        self.ui.txt_out.setPlaceholderText('行程翻译结果在这里')
        self.ui.txt_in.setPlaceholderText('eterm信息输入在这里')
        self.format_update()

    def format_update(self):
        with open('tt_format.json', 'r', encoding='utf-8') as json_file:
            self.format = json.load(json_file)
        self.ui.txt_cont.setPlainText(self.format['content'])
        self.ui.txt_pass.setPlainText(self.format['passenger'])
        self.ui.txt_flight.setPlainText(self.format['flight'])

    def save(self):
        re = {}
        re['content'] = self.ui.txt_cont.toPlainText()
        re['passenger'] = self.ui.txt_pass.toPlainText()
        re['flight'] = self.ui.txt_flight.toPlainText()
        with open('tt_format.json', 'w', encoding='utf-8') as json_file:
            json.dump(re, json_file, ensure_ascii=False, indent=4)
        self.format_update()
        return re

    def generate(self):
        user_input = self.ui.txt_in.toPlainText()
        passengers,flights = get_all_info(user_input)
        pass_text = '' ; flight_text = ''
        for passenger in passengers:
            pass_text += self.ui.txt_pass.toPlainText() + '\n'
            for key in self.keys:
                if key in passenger:
                    pass_text = pass_text.replace(key,passenger[key])
        for flight in flights:
            flight_text += self.ui.txt_flight.toPlainText() + '\n'
            for key in self.keys:
                if key in flight:
                    flight_text = flight_text.replace(key,flight[key])
        output = self.ui.txt_cont.toPlainText().replace('{旅客}',pass_text).replace('{航程}',flight_text)
        self.ui.txt_out.setPlainText(output)

if __name__ == '__main__':
    # init_json()
    app = QApplication([])
    stats = FTT()
    stats.ui.show()
    app.exec() # PySide6 是 exec 而不是 exec_

#pyinstaller --noconsole --onefile --icon=translate.ico travel_translate.py


        

    
