from PySide2.QtWidgets import QApplication, QMainWindow, QPushButton,  QPlainTextEdit
import re
'''
airline = {'OZ':'韩亚航空', 'CA':'中国国航', 'CZ':'南方航空','MU':'东方航空', 'KE':'大韩航空',\
        'JL':'日本航空', 'NH':'全日空', 'HO':'吉祥航空', 'AC':'加拿大航空', 'AA':'美国航空', '3U':'四川航空',\
        'CX':'国泰航空', 'DL':'达美航空', 'EK':'阿联酋航空','EY':'阿提哈德','NZ':'新西兰航空',\
        'QR':'卡塔尔航空', 'SQ':'新加坡航空', 'SU':'俄罗斯航空', 'TK':'土耳其航空', 'TR':'酷航',\
        'UA':'美联航', 'HU':'海南航空','GS':'天津航空','ZH':'深圳航空','LH':'汉莎航空','GJ':'长龙航空',\
        'KL':'荷兰航空','MF':'厦门航空','SC':'山东航空','AF':'法国航空','SK':'北欧航空','OS':'奥地利航空'}

airport = {
            'HKG': '香港国际机场', 'MFM': '澳门国际机场', 'TSA': '台北松山机场', 'PEK': '首都国际机场', 'BJS': '首都国际机场', 'NAY': '北京南苑机场',\
            'PKX': '北京大兴国际机场', 'TSN': '天津滨海国际机场', 'PVG': '上海浦东国际机场', 'SHA': '上海虹桥国际机场', 'CAN': '广州白云国际机场', \
            'SZX': '深圳宝安国际机场', 'NKG': '南京禄口国际机场', 'CTU': '成都双流国际机场', 'TFU': '成都天府国际机场', 'CKG': '重庆江北国际机场', \
            'KMG': '昆明长水国际机场', 'HGH': '杭州萧山国际机场', 'XIY': '西安咸阳国际机场', 'SIA': '西安咸阳国际机场', 'WUH': '武汉天河国际机场', \
            'CGO': '新郑国际机场', 'CGQ': '长春龙嘉国际机场', 'CSX': '长沙黄花国际机场', 'TYN': '太原武宿国际机场', 'DLC': '大连周水子国际机场',\
            'FOC': '福州长乐国际机场', 'XMN': '厦门高崎国际机场', 'HAK': '海口美兰国际机场', 'SYX': '三亚凤凰国际机场', 'HET': '呼和浩特白塔国际机场',\
            'HFE': '合肥新桥国际机场', 'HRB': '哈尔滨太平国际机场', 'LHW': '兰州中川机场', 'URC': '乌鲁木齐地窝堡国际机场', 'SJW': '石家庄正定国际机场',\
            'SHE': '沈阳桃仙国际机场', 'TNA': '济南遥墙国际机场', 'INC': '银川河东机场', 'KWE': '贵阳龙洞堡机场', 'NNG': '南宁吴圩国际机场', \
            'KHN': '南昌昌北国际机场', 'XNN': '西宁曹家堡机场', 'LXA': '拉萨贡嘎机场', 'TAO': '青岛胶东国际机场', 'NGB': '宁波栎社国际机场',\
            'YOW': '渥太华国际机场', 'YUL': '蒙特利尔特鲁多国际机场', 'YVR': '温哥华国际机场', 'YYZ': '多伦多皮尔森国际机场', 'IAD': '杜勒斯国际机场', \
            'BOS': '洛根国际机场', 'ORD': '奥黑尔国际机场', 'JFK': '肯尼迪国际机场', 'SFO': '旧金山国际机场', 'LAX': '洛杉矶国际机场', 'MIA': '迈阿密国际机场', \
            'ATL': '哈兹菲尔德-杰克逊亚特兰大国际机场', 'CAE': '哥伦比亚国际机场', 'CLE': '克利夫兰机场', 'CLT': '夏洛特国际机场', 'DEN': '丹佛国际机场',\
            'DFW': '达拉斯沃思堡机场', 'DTW': '底特律大都会机场', 'IAH': '布什国际机场', 'MCO': '奥兰多国际机场', 'MEM': '孟菲斯国际机场', \
            'SEA': '西雅图-塔科马国际机场', 'MEX': '墨西哥城机场', 'HAV': '哈瓦那何塞·马蒂国际机场', 'BSB': '巴西利亚国际机场', 'GRU': '圣保罗国际机场', \
            'RIO': '里约热内卢国际机场','GIG': '里约热内卢国际机场', 'EZE': '布宜诺斯艾利斯埃塞萨国际机场', 'LHR': '伦敦希思罗机场', 'LPL': '利物浦雷侬国际机场',\
            'MAN': '曼彻斯特机场', 'BRU': '布鲁塞尔国际机场', 'LUX': '卢森堡国际机场', 'AMS': '阿姆斯特丹史基浦机场', 'RTM': '鹿特丹机场', 'CPH': '哥本哈根凯斯楚普机场', \
            'TXL': '泰格尔机场', 'MUC': '慕尼黑机场', 'BRE': '不莱梅机场', 'FRA': '法兰克福-莱茵-美因国际机场', 'STR': '斯图加特机场', 'HAM': '汉堡国际机场', \
            'NUE': '纽伦堡机场', 'CGN': '科隆机场', 'CDG': '戴高乐机场', 'MRS': '马赛机场', 'LYS': '里昂机场', 'BRN': '贝尔普伯尔尼机场', 'GVA': '日内瓦国际机场', \
            'ZRH': '苏黎世国际机场', 'BSL': '巴塞尔机场', 'MAD': '马德里巴拉哈斯机场', 'BCN': '巴塞罗那安普拉特机场', 'VLC': '巴伦西亚机场', 'SVQ': '塞维利亚机场', \
            'LIS': '里斯本机场', 'OPO': '奥波多机场', 'FCO': '罗马菲乌米奇诺机场', 'MXP': '米兰马尔彭萨机场', 'VCE': '威尼斯马可·波罗国际机场', 'FLR': '佛罗伦萨机场', \
            'TRN': '都灵机场', 'ATH': '雅典国际机场', 'VIE': '维也纳施韦夏特机场', 'PRG': '布拉格鲁济涅机场', 'HEL': '赫尔辛基万塔机场', 'ARN': '斯德哥尔摩阿兰达机场', \
            'OSL': '奥斯陆加勒穆恩机场', 'BEG': '贝尔格莱德机场', 'BUH': '布加勒斯特机场', 'ZAG': '萨格勒布机场', 'BUD': '布达佩斯费里海吉机场', 'WAW': '华沙奥肯切机场', \
            'SVO': '谢列梅捷沃亚历山大·普希金国际机场', 'DME':'多莫杰多沃机场', 'KBP': '基辅机场', 'IEV':'基辅茹良尼国际机场', 'CAI': '开罗国际机场', 'DKR': '达喀尔机场', \
            'JNB': '约翰内斯堡国际机场', 'TUN': '突尼斯迦太基国际机场', 'NBO': '乔莫·肯雅塔国际机场', 'CBR': '堪培拉机场', 'MEL': '墨尔本国际机场', \
            'SYD': '悉尼金斯福德·史密斯机场', 'WLG': '惠灵顿机场', 'AKL':'奥克兰机场', 'NRT': '成田国际机场', 'HND': '东京国际机场（羽田机场）', 'ITM': '大阪伊丹国际机场', \
            'KIX': '大阪关西国际机场', 'ICN': '仁川国际机场', 'PUS': '釜山金海国际机场', 'SIN': '新加坡樟宜国际机场', 'KUL': '吉隆坡国际机场', 'SGN': '胡志明市新山机场', \
            'BKK': '素万那普国际机场', 'DEL': '英迪拉·甘地国际机场', 'THR': '德黑兰梅赫拉巴德国际机场', 'RUH': '哈利德国王国际机场', 'AUH': '阿布扎比国际机场', \
            'DXB': '迪拜国际机场', 'DOH': '多哈国际机场', 'ESB': '安卡拉埃森博阿机场', 'IST': '伊斯坦布尔国际机场'
            }
'''
week = {'MO':'周一','TU':'周二','WE':'周三','TH':'周四','FR':'周五','SA':'周六','SU':'周日'}
month = {'JAN':'1月','FEB':'2月','MAR':'3月','APR':'4月','MAY':'5月','JUN':'6月',\
        'JUL':'7月','AUG':'8月','SEP':'9月','OCT':'10月','NOV':'11月','DEC':'12月'}

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

def follow(st,target):
    if len(st) >= target:
        return st[:target]
    else:
        for i in range(target-len(st)):
            st+=' '
        return st

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



def translatefull(full):

    # 载入'机场'和'航司'对照表
    # 文件名分别为 '机场对照表.txt' ， '航司对照表.txt'
    # 其文件格式为纯文本的 '代号 实际名'
    airline = get_airline('航司对照表.txt')
    airport = get_airport('机场对照表.txt')

    temp = ''

    while full[0:2] != '1.':
        full = full[1:]

    num = len(re.compile(r'SSR TKNE(.*)/P[0-9]').findall(full))
    r = '尊敬的客户，您的行程如下，请按机场要求提前抵达办理登机。\n'
    if num != 0:
        for i in range(1,1+num):
            name = re.compile(fr'{str(i)}.(.*?) ').findall(full)[0]
            tkt = re.compile(fr'SSR TKNE (.*)/1/P{str(i)}').findall(full)[0]
            tkt = tkt.split(' ')[-1]
            temp += f'{name}: {tkt}\n'
        while full[0:2] != f'{str(num+1)}.':
            full = full[1:]
    
    if len(cleare(full.splitlines()[0].split(' '))[-1]) == 6:
        full = strjoinline(full.splitlines()[1:])

    #第一行是记录上
    for line in full.splitlines():
        new,tp = translate(airport,airline,line)
        if tp:
            break
        r += new
    r += temp
    return r


def translate(airport,airline,st):
    r = ''
    valid = cleare(st.split(' '))
    if valid[-1][-1] == 'E':
        stp = '';        edp = ''
        if pair[0:3] not in airport:
            r += f'{month[date[4:7]]}{date[2:4]}日: {pair[0:3]}{stp}{st[:2]}点{st[2:4]}分出发 '
        else:
            r += f'{month[date[4:7]]}{date[2:4]}日: {airport[pair[0:3]]}{stp}{st[:2]}点{st[2:4]}分出发 '
        n = ''
        if len(ed) > 4:
            n += '('
            if ed[4] == '+':
                n += f'第{str(int(ed[5])+1)}天'
            elif ed[4] == '-':
                n += f'前{ed[5]}天'
            n += ')'
        if pair[3:6] not in airport:
            r += f' --  {pair[3:6]}{edp}{ed[:2]}点{ed[2:4]}分{n}到达; '
        else:
            r += f' --  {airport[pair[3:6]]}{edp}{ed[:2]}点{ed[2:4]}分{n}到达; '
        
        if flight[0:2] not in airline:
            r += f'  航班号：{flight}\n'
        else:
            r += f'  {airline[flight[0:2]]} 航班号：{flight}\n'
        return r,False
    if valid[-2][-1] == 'E' or valid[-3][-1] == 'E':
        st += '        '
        while st[-7:-5] != 'E ':
            st = st[:-1]
        stp = st[-5:-3]
        edp = st[-3:-1]
        flight = valid[1];  date = valid[3];  pair = valid[4]
        st = valid[6]; ed = valid[7]
        if stp == '--':
            stp = ''
        else:
            stp = f'(航站楼{stp})'

        if edp == '--':
            edp = ''
        else:
            edp = f'(航站楼{edp})'
        if pair[0:3] not in airport:
            r += f'{month[date[4:7]]}{date[2:4]}日: {pair[0:3]}{stp}{st[:2]}点{st[2:4]}分出发 '
        else:
            r += f'{month[date[4:7]]}{date[2:4]}日: {airport[pair[0:3]]}{stp}{st[:2]}点{st[2:4]}分出发 '
        n = ''
        if len(ed) > 4:
            n += '('
            if ed[4] == '+':
                n += f'第{str(int(ed[5])+1)}天'
            elif ed[4] == '-':
                n += f'前{ed[5]}天'
            n += ')'
        if pair[3:6] not in airport:
            r += f' --  {pair[3:6]}{edp}{ed[:2]}点{ed[2:4]}分{n}到达; '
        else:
            r += f' --  {airport[pair[3:6]]}{edp}{ed[:2]}点{ed[2:4]}分{n}到达; '
        
        if flight[0:2] not in airline:
            r += f'  航班号：{flight}\n'
        else:
            r += f'  {airline[flight[0:2]]} 航班号：{flight}\n'
        return r,False
    else:
        return '',True

    

    
    
class client_ATG():

    def __init__(self):
        self.window = QMainWindow()
        self.window.resize(1400, 500)
        self.window.move(250, 150)
        self.window.setWindowTitle('客户行程自动翻译系统')

        self.travelEdit = QPlainTextEdit(self.window)
        self.travelEdit.setPlaceholderText("粘贴行程到此处（包含序号）")
        self.travelEdit.move(20, 20)
        self.travelEdit.resize(1200, 150)

        self.specEdit = QPlainTextEdit(self.window)
        self.specEdit.setPlaceholderText("此处显示输出内容")
        self.specEdit.move(20, 185)
        self.specEdit.resize(1360, 300)

        self.button = QPushButton('开始生成', self.window)
        self.button.move(1235, 20)
        self.button.resize(150,65)
        self.button.clicked.connect(self.generate)

        self.textEdit = QPlainTextEdit(self.window)
        self.textEdit.setPlaceholderText("made by Zhiyuan Li\n*hoshipu")
        self.textEdit.move(1235, 100)
        self.textEdit.resize(150, 70)

    def generate(self):
        user_input = self.travelEdit.toPlainText()
        self.specEdit.setPlainText("程序正在运行")
        output = translatefull(user_input)
        self.specEdit.setPlainText(output)
    

        
if __name__ == "__main__":
    app = QApplication([])
    client_ATG = client_ATG()
    client_ATG.window.show()
    app.exec_()