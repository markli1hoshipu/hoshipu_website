import xlrd,time,pickle,openpyxl,copy
import business as bs

#用于判断输入金额是否有效，可以float处理
def isnumber(st):
    if type(st) == int or type(st) == float:
        return True
    elif type(st) != str:
        return False
    if len(st) == 0:
        return False
    if len(st) == 1:
        if st[0].isdigit() == False:
            return False
    if st[0].isdigit() == False and st[0]!='.'and st[0]!='-':
        return False
    pt = 0
    for i in st[1:]:
        if i == '.':
            pt+=1
        elif i.isdigit() ==False:
            return False
    if pt>1:
        return False
    return True

#用于判断是否是整数
def isint(st):
    if isnumber(st) == False:
        return False
    else:
        return int(float(str(st))) == float(str(st))

#把一个iouslist初始化为businesslist
def ious_to_business(list_ious):           
    re = []
    for ious in list_ious:
        temp = bs.business(ious, [])
        re.append(temp)
    return re

#获得数据
def get_data():
    f = open('business_data.txt','rb')
    c = f.read(); f.close()
    return pickle.loads(c)

#把listbusiness存入data
def put_data(list_business):
    g = open('import_id.txt','rb')
    d = g.read(); ids = pickle.loads(d); g.close()
    past_data = get_data()
    for business in list_business:
        ids.append(business.ious.id)
        ini_date = business.ious.date
        if ini_date not in past_data:
            past_data[ini_date] = []
        past_data[ini_date].append(business)
    g = open('import_id.txt','wb')
    g.write(pickle.dumps(ids)); g.close()
    f = open('business_data.txt','wb')
    f.write(pickle.dumps(past_data))
    f.close()

#把listbusiness的所有相关数据表示出来
def convert_full_ious_text(list_business):
    re = ''
    for business in list_business:
        ious = business.ious
        pays = business.list_payment
        re += f'{ious.date} {ious.id} 初始{ious.total_money}元 剩{business.rest}元 第一欠款人:{ious.client} 第一备注:{ious.rem}\n'
        for i in range(len(ious.lmoney)): 
            re += f'\t\t{ious.lclient[i]} {ious.lmoney[i]} {ious.lflight[i]} {ious.ltktnum[i]} {ious.remark[i]}\n'
        for i in range(len(pays)):
            re += f'\t\t{pays[i].date} {pays[i].client} {pays[i].amount} {pays[i].remark}\n'
    return re

def convert_key_business_text(business): #用于table展示
    re = ''
    ious = business.ious
    pays = business.list_payment
    re += f'初始{ious.total_money}元 剩{business.rest}元 第一欠款人:{ious.client} 第一备注:{ious.rem}\n'
    for i in range(len(ious.lmoney)): 
        re += f'\t\t{ious.lclient[i]} {ious.lmoney[i]} {ious.lflight[i]} {ious.ltktnum[i]} {ious.remark[i]}\n'
    for i in range(len(pays)):
        re += f'\t\t{pays[i].date} {pays[i].client} {pays[i].amount} {pays[i].remark}\n'    
    return re

#把listbusiness中ious相关的关键信息表示出来
def convert_short_ious_text(list_business):
    re = ''
    for business in list_business:
        ious = business.ious
        re += f'{ious.date} {ious.id} 初始{ious.total_money}元 剩{business.rest}元 第一欠款人:{ious.client} 第一备注:{ious.rem}\n'
    return re

#把指定内容存入文档
def put_history(cont):
    t = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
    f = open('history.txt','a',encoding='utf8')
    if type(cont) != str:
        cont = '试图录入非文本内容'
    f.write(t+' '+cont+'\n')
    f.close()

#根据用户名找到可以写入的下一个手写欠条
def find_next_handid(date,username):
    if len(username)>3:
        username = username[:3]
    while len(username) < 3:
        username = 'a' + username
    username = username.upper()
    f = open('import_id.txt','rb')
    c = f.read(); ids = pickle.loads(c); f.close()
    
    for i in range(1,100):
        if i <10:
            i = '0'+str(i)
        else:
            i = str(i)
        possible_id = f'{username}{date}H{i}'
        if possible_id not in ids:
            return possible_id
    return False

#传入的信息非列表，创建一个长度为1的ious列表
def create_oneious(user, date, client, id, money, flight, tktnum, remark):
    temp = bs.ious(user, str(date), [client], id, [str(money)], [flight], [str(tktnum)], [remark])
    return [temp]


#--------------------------ious
#功能1 从表格导入欠条
def list_follow(target_length, need):       #把一个列表补全到需要的长度
    d = target_length-len(need)
    re = []
    if d<=0:
        return need
    else:
        for i in range(len(need)):
            re.append(need[i])
        for j in range(d):
            re.append('')
        return re

def stringwise(listofe):    #把一个列表的每个元素str化，然后返回
    re = []
    for i in listofe:
        re.append(str(i))
    return re

def give_all_at_idx(list_of_list,idx):      #提取一个list_of_list指定idx的所有值
    re = []
    for i in list_of_list:
        re.append(i[idx])
    return re

def classify(name):                         #根据表格title名字判断表格的种类
    if 'BSP国内' in name:
        return 'D'
    elif 'BSP国际' in name:
        return 'I'
    elif 'cz' in name or 'CZ' in name:
        return 'C'
    elif 'mu' in name or 'MU' in name:
        return 'M'
    elif '外航' in name:
        return 'W'
    return 'N'

#指定文件,表格名读取ious; 需要注意的是不可读取/信息不全，重复录入的情况
def read_bsp(filename,sheetname,user):     #指定文件,表格名读取ious
    book = xlrd.open_workbook(filename)
    sheet = book.sheet_by_name(sheetname)
    #找到种类
    title = sheet.cell_value(rowx=0,colx=0)
    tp = classify(title)
    if tp == 'N':
        #print('type')
        return [], False
    #更新用户名称，并生成用于制作欠单号的user_i
    user_i = user
    while len(user_i) <= 2:
        user_i = 'a' + user_i
    if len(user_i) > 3:
        user_i = user[:3]
    user_i = user_i.upper()

    date = str(sheet.cell_value(4,0)).strip()
    if isint(date) == False:
        #print(date)
        return [], False
    date = str(int(float(date)))
    if len(date) != 6:
        return [], False

    #找到票单数量
    num_of_tickets = str(sheet.cell_value(1,1)).strip()
    if isint(num_of_tickets) == False:
        return [], False
    num_of_tickets = int(float(str(num_of_tickets)))
    if num_of_tickets == 0:
        #print(0)
        return [], True
    #开始读取
    list_flight = sheet.col_values(colx=1)[4:]          #航程 
    list_ticketnumber = sheet.col_values(colx=2)[4:]    #票号
    list_receive = sheet.col_values(colx=3)[4:]         #应收款
    list_client_name = sheet.col_values(colx=15)[4:]    #客户名称
    list_ious_idx = sheet.col_values(colx=16)[4:]       #欠单编号, LZY230210W01
    list_remark = sheet.col_values(colx=17)[4:]         #备注

    #用于防止日后表格修改后，读取空数据的问题
    list_flight = stringwise(list_follow(num_of_tickets,list_flight)[:num_of_tickets])
    list_ticketnumber = stringwise(list_follow(num_of_tickets,list_ticketnumber)[:num_of_tickets])
    list_receive = list_follow(num_of_tickets,list_receive)[:num_of_tickets]
    list_client_name = stringwise(list_follow(num_of_tickets,list_client_name)[:num_of_tickets])
    list_remark = stringwise(list_follow(num_of_tickets,list_remark)[:num_of_tickets])
    list_ious_idx = list_follow(num_of_tickets,list_ious_idx)[:num_of_tickets]

    ious_id_type = f'{user_i}{date}{tp}'
    f = open('import_id.txt','rb')
    c = f.read(); ids = pickle.loads(c); f.close()
    for id in ids:
        if ious_id_type in id:
            #print('rpt')
            return [],False


    #把欠条号进行生成
    list_ious = []
    for num in list_ious_idx:
        if isnumber(num) == False:
            print('id',num,type(num))
            return [], False
        num = int(float(str(num)))
        if num not in range(1,100):
            return [], False
        if num<10:
            num = '0'+str(num)
        else:
            num = str(num)
        list_ious.append(f'{user_i}{date}{tp}{num}')
    #例如LZY230120D01


    #首先存入字典，方便合并同一欠条
    ious_info = {}

    #储存欠条数据
    for i in range(num_of_tickets):
        if list_ious_idx[i] == '':
            continue
        if list_ious[i] not in ious_info:
            ious_info[list_ious[i]] = []
        ious_info[list_ious[i]].append((date,list_receive[i],list_client_name[i],user,\
                                        list_flight[i],list_ticketnumber[i],list_remark[i])) 
                    # list of () #date, val, client, user, flight, tkt
    
    #把字典中的欠条信息转移成ious形式，存储到列表中
    ious_list = []
    for ious_id, ious_cont_list in ious_info.items():
        new_ious = bs.ious(user,date,give_all_at_idx(ious_cont_list,2),ious_id,give_all_at_idx(ious_cont_list,1),\
                            give_all_at_idx(ious_cont_list,4), give_all_at_idx(ious_cont_list,5), \
                                give_all_at_idx(ious_cont_list,6))
        ious_list.append(new_ious)
    #返回这个ious列表
    return ious_list, True

#--------------------pay
#手动生成一条付款记录,非列表
def create_notlistpayment(user, date, client, amount, ious_id, remark):
    temp = bs.payment(user, str(date), client, float(amount), ious_id, remark)
    return temp

#把data存入data
def update_data(data):
    f = open('business_data.txt','wb');
    f.write(pickle.dumps(data))
    f.close()

#把一个付款记录载入数据库
def payment_to_business(payment):
    data = get_data()
    copy = {}
    id = payment.ious_id
    find = False
    for date, list_business in data.items():
        for idx in range(len(list_business)):
            if date not in copy:
                copy[date] = []
            if not find:
                if id == list_business[idx].ious.id:
                    print('test?')
                    temp = list_business[idx]
                    temp = temp.addpayment(payment)
                    copy[date].append(temp)
                    find = True
                else:
                    copy[date].append(list_business[idx])
            else:
                copy[date].append(list_business[idx])
    update_data(copy)
    return find
   
#表示一个付款的信息
def pay_text(pay):
    return f'{pay.date} 负责人:{pay.user} 付款人:{pay.client} {pay.amount}元 付给{pay.ious_id} 备注:{pay.remark}\n'

#给定日期范围,data找list_business
def search_ious_bydate_indata(st,ed,data):
    st = str(st); ed = str(ed)
    re = []
    for date in range(int(st),int(ed)+1):
        if str(date) in data:
            re += data[str(date)]
    return re

#4种不同导出

#功能5 导出excel
def export_sious(list_business, filename):
    book = openpyxl.Workbook()
    sh = book.active
    sh.title = filename
    sh.cell(1,1).value = '日期' ; sh.cell(1,2).value = '初始金额' ; sh.cell(1,3).value = '剩余金额'
    sh.cell(1,4).value = '欠款人';sh.cell(1,5).value = '负责人';sh.cell(1,6).value = '欠单号';sh.cell(1,7).value = '备注'
    row = 2
    for business in list_business:
        sh.cell(row,1).value = business.ious.date
        sh.cell(row,2).value = business.ious.total_money
        sh.cell(row,3).value = business.rest
        sh.cell(row,4).value = business.ious.client
        sh.cell(row,5).value = business.ious.user
        sh.cell(row,6).value = business.ious.id
        sh.cell(row,7).value = business.ious.rem
        row += 1
    book.save(f'{filename}.xls')

def export_spayment(payments, filename):
    book = openpyxl.Workbook()
    sh = book.active
    sh.title = filename
    sh.cell(1,1).value = '日期' ; sh.cell(1,2).value = '付款金额' ; sh.cell(1,3).value = '付款人'
    sh.cell(1,4).value = '负责人';sh.cell(1,5).value = '对应欠单号'; sh.cell(1,6).value = '备注'
    row = 2
    for pay in payments:
        sh.cell(row,1).value = pay.date
        sh.cell(row,2).value = pay.amount
        sh.cell(row,3).value = pay.client
        sh.cell(row,4).value = pay.user
        sh.cell(row,5).value = pay.ious_id
        sh.cell(row,6).value = pay.remark
        row += 1
    book.save(f'{filename}.xls')

def export_fious(list_business, filename):
    #print(2)
    book = openpyxl.Workbook()
    sh = book.active
    sh.title = filename
    sh.cell(1,1).value = '日期' ; sh.cell(1,2).value = '总初始金额' ; sh.cell(1,3).value = '剩余金额'
    sh.cell(1,4).value = '欠款人';sh.cell(1,5).value = '负责人';sh.cell(1,6).value = '欠单号'
    sh.cell(1,7).value = '票号'; sh.cell(1,8).value = '航段'; sh.cell(1,9).value = '分别欠款'; sh.cell(1,10).value = '备注'
    #print(3)
    row = 2
    for business in list_business:
        sh.cell(row,1).value = business.ious.date
        sh.cell(row,2).value = business.ious.total_money
        sh.cell(row,3).value = business.rest
        sh.cell(row,4).value = business.ious.client
        sh.cell(row,5).value = business.ious.user
        sh.cell(row,6).value = business.ious.id
        fir = row
        for idx in range(len(business.ious.lmoney)):
            sh.cell(fir,4).value = business.ious.lclient[idx]
            sh.cell(fir,7).value = business.ious.ltktnum[idx]
            sh.cell(fir,8).value = business.ious.lflight[idx]
            sh.cell(fir,9).value = business.ious.lmoney[idx]
            sh.cell(fir,10).value = business.ious.remark[idx]
            fir+=1
        row = fir
        row += 1
    #print(34)
    book.save(f'{filename}.xls')
 
def export_fbusiness(list_business, filename):
    #print(2)
    book = openpyxl.Workbook()
    sh = book.active
    sh.title = filename
    sh.cell(1,1).value = '日期' ; sh.cell(1,2).value = '总初始金额' ; sh.cell(1,3).value = '剩余金额'
    sh.cell(1,4).value = '欠款人';sh.cell(1,5).value = '负责人';sh.cell(1,6).value = '欠单号'
    sh.cell(1,7).value = '票号'; sh.cell(1,8).value = '航段'; sh.cell(1,9).value = '分别欠款'; sh.cell(1,10).value = '备注'
    sh.cell(1,11).value = '付款日期'; sh.cell(1,12).value = '付款金额'; sh.cell(1,13).value = '付款人'; sh.cell(1,14).value = '备注'
    #print(3)
    row = 2
    for business in list_business:
        sh.cell(row,1).value = business.ious.date
        sh.cell(row,2).value = business.ious.total_money
        sh.cell(row,3).value = business.rest
        sh.cell(row,4).value = business.ious.client
        sh.cell(row,5).value = business.ious.user
        sh.cell(row,6).value = business.ious.id
        fir = row; sec = row
        for idx in range(len(business.ious.lmoney)):
            sh.cell(fir,4).value = business.ious.lclient[idx]
            sh.cell(fir,7).value = business.ious.ltktnum[idx]
            sh.cell(fir,8).value = business.ious.lflight[idx]
            sh.cell(fir,9).value = business.ious.lmoney[idx]
            sh.cell(fir,10).value = business.ious.remark[idx]
            fir+=1

        for pay in business.list_payment:
            sh.cell(sec,11).value = pay.date
            sh.cell(sec,12).value = pay.amount
            sh.cell(sec,13).value = pay.client
            sh.cell(sec,14).value = pay.remark
            sec+=1
        row = max(fir,sec)
        row += 1
    #print(34)
    book.save(f'{filename}.xls')
 
#转换付款信息表示
def convert_pay_text(list_pay):
    re = ''
    for pay in list_pay:
        re += pay_text(pay)
    return re

#清理数据
def cleann_data():       #返回剩余没有付清的list_business，以及已经付清的list_business
    data = get_data()
    rest_lb = []
    clean_lb = []
    for date, business_list in data.items():
        for business in business_list:
            temp = copy.deepcopy(business)
            if temp.rest == 0:
                clean_lb.append(temp)
            else:
                rest_lb.append(temp) 
    return rest_lb, clean_lb

def true_clean():
    new = {}
    rest, clean = cleann_data()
    f = open('business_data.txt','wb');
    f.write(pickle.dumps(new))
    f.close()
    put_data(rest)

    f = open('past_data.txt','rb')
    c = f.read(); f.close()
    past_cleandata = pickle.loads(c)
    for business in clean:
        ini_date = business.ious.date
        if ini_date not in past_cleandata:
            past_cleandata[ini_date] = []
        past_cleandata[ini_date].append(business)
    f = open('past_data.txt','wb')
    f.write(pickle.dumps(past_cleandata))
    f.close()

#--------------------------------------------------------

#功能x0 根据id返回business
def get_business_byid(id):
    data = get_data()
    date = str(id[3:9])
    for business in data[date]:
        if business.ious.id == id:
            return business
    return False

#--------------------------------------------------------
#功能x1 手动删除一个欠条, 此功能未经测试，永远不使用
def delete_ious(ious_id,data):
    date = ious_id[3:9]
    c = -1
    business = ''
    for idx in range(len(data[date])):
        if date ==data[date][idx].ious.date:
            business = data[date][idx]
            c = idx
            break
    if business == '':      #未找到当前欠单/欠单不存在
        return -1
    if len(business.list_payment)>0:
        return -2            #已经存在付款记录
    else:
        del (data[date])[c]

#功能x2 检查data中是否有重复id，这一点很重要,没有投入使用
def check_repeat_id_date(date,data):
    date = str(date)
    ids = []; repeats = []
    list_business = data[date]
    for business in list_business:
        if business.ious.id in ids:
            repeats.append(business.ious.id)
        else:
            ids.append(business.ious.id)
    return repeats==[], repeats

def check_repeat_id(data):
    repeats = []
    for date, list_business in data.items():
        repeats+=check_repeat_id(date,data)[1]
    return repeats==[], repeats


