def sum_payment(list_payment):
    re = 0
    for payment in list_payment:
        re += payment.amount
    return re

def stringing(l):
    re = []
    for i in l:
        re.append(str(i))
    return re

def numbering(l):
    re = []
    for i in l:
        re.append(float(i))
    return re

class ious:
    def __init__(self, user, date, lclient, id, lmoney, lflight, ltktnum, lremark): 
        self.id = id
        self.user = user
        self.date = str(date)
        self.lclient = lclient
        self.client = ''
        if self.lclient!=[]:
            self.client = lclient[0]
        self.lmoney = numbering(lmoney)
        self.total_money = sum(self.lmoney)
        self.lflight = lflight 
        self.ltktnum = stringing(ltktnum)
        self.remark = lremark
        self.rem = ''
        if lremark != []:
            self.rem = lremark[0]

        

class payment:
    def __init__(self, user, date, client, amount, ious_id, remark):
        self.user = user
        self.date = str(date)
        self.client = client
        self.amount = float(amount) 
        self.ious_id = ious_id
        self.remark = remark


class business:
    def __init__(self,ious,list_payment):
        self.ious = ious
        self.list_payment = list_payment
        self.paid = 0
        self.rest = ious.total_money 
        self.type = '未付款'
        self = self.update()
    
    def update(self):
        cur = 0
        for pay in self.list_payment:
            cur += float(pay.amount)
        self.paid = cur

        self.rest = self.ious.total_money  - self.paid

        if self.rest == 0:
            self.type = '已付清'
        elif self.rest > 0:
            if len(self.list_payment) == 0:
                self.type = '未付款'
            else:
                self.type = '未付清'
        elif self.rest<0:
            if (self.ious.total_money) < 0:
                self.type = '初始欠条为负'
            if (self.ious.total_money) >= 0:
                self.type = '已超额支付'
        else:
            self.type = '程序报错'
        return self

    def addpayment(self, payment):
        self.list_payment.append(payment)
        print('add pay')
        self.update()
        return self
    