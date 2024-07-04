from PySide2.QtWidgets import QApplication, QMainWindow, QPushButton, QPlainTextEdit,  QScrollArea, QWidget, QVBoxLayout
import all_func as afunc

class payment_mult():
    def __init__(self):
        self.cur = []
        self.window = QMainWindow()
        self.window.resize(1400, 900)
        self.window.move(200, 15)
        self.window.setWindowTitle('付款录入程序')

        self.handaddtitle = QPlainTextEdit(self.window)
        self.handaddtitle.move(20, 20)
        self.handaddtitle.resize(1360, 35)
        space = ' '*67
        self.handaddtitle.setPlainText(f"{space}载入付款信息{space}")
        self.handaddtitle.setReadOnly(True)

        self.iousidr = QPlainTextEdit(self.window)
        self.iousidr.move(20, 55)
        self.iousidr.resize(220, 70)
        self.iousidr.setPlainText("对搜索结果中的所有欠款单依次进行付款")
        self.iousidr.setReadOnly(True)

        self.usernamer = QPlainTextEdit(self.window)
        self.usernamer.move(240, 55)
        self.usernamer.resize(120, 35)
        self.usernamer.setPlainText("用户名:")
        self.usernamer.setReadOnly(True)
        self.username = QPlainTextEdit(self.window)
        self.username.move(240, 90)
        self.username.resize(120, 35)

        self.dater = QPlainTextEdit(self.window)
        self.dater.move(360, 55)
        self.dater.resize(120, 35)
        self.dater.setPlainText("日期:")
        self.dater.setReadOnly(True)
        self.date = QPlainTextEdit(self.window)
        self.date.setPlaceholderText('yymmdd')
        self.date.move(360, 90)
        self.date.resize(120, 35)

        self.clientr = QPlainTextEdit(self.window)
        self.clientr.move(480, 55)
        self.clientr.resize(200, 35)
        self.clientr.setPlainText("付款人:")
        self.clientr.setReadOnly(True)
        self.client = QPlainTextEdit(self.window)
        self.client.move(480, 90)
        self.client.resize(200, 35)
   
        self.amountr = QPlainTextEdit(self.window)
        self.amountr.move(680, 55)
        self.amountr.resize(120, 35)
        self.amountr.setPlainText("金额:")
        self.amountr.setReadOnly(True)
        self.amount = QPlainTextEdit(self.window)
        self.amount.move(680, 90)
        self.amount.resize(120, 35)

        self.remarkr = QPlainTextEdit(self.window)
        self.remarkr.move(800, 55)
        self.remarkr.resize(580, 35)
        self.remarkr.setPlainText("备注:")
        self.remarkr.setReadOnly(True)
        self.remark = QPlainTextEdit(self.window)
        self.remark.move(800, 90)
        self.remark.resize(580, 35)

        self.handaddtitle = QPushButton('上传付款记录 ', self.window)
        self.handaddtitle.move(20, 130)
        self.handaddtitle.resize(1360, 35)
        self.handaddtitle.clicked.connect(self.uploadpayment)


        self.pscroll_area = QScrollArea(self.window)
        self.pscroll_area.move(20,180)
        self.pscroll_area.resize(1360, 160)
        self.pscroll_area.setWidgetResizable(True)

        self.inner_widget = QWidget()
        self.inner_layout = QVBoxLayout()
        self.pscroll_area.setWidget(self.inner_widget)
        self.inner_widget.setLayout(self.inner_layout)

        self.pshowpay = QPlainTextEdit()
        self.pshowpay.setReadOnly(True)
        self.pshowpay.setPlaceholderText("付款记录出现在这里")
        self.inner_layout.addWidget(self.pshowpay)

        self.searchtitle = QPlainTextEdit(self.window)
        self.searchtitle.move(20, 380)
        self.searchtitle.resize(1360, 35)
        more_space = ' '*62
        self.searchtitle.setPlainText(f"{more_space}检索仍需付款的欠条信息{more_space}")
        self.searchtitle.setReadOnly(True)

        self.searchdatestr = QPlainTextEdit(self.window)
        self.searchdatestr.move(20, 415)
        self.searchdatestr.resize(100, 35)
        self.searchdatestr.setPlainText("起始日期:")
        self.searchdatestr.setReadOnly(True)

        self.searchdatest = QPlainTextEdit(self.window)
        self.searchdatest.move(120, 415)
        self.searchdatest.resize(80, 35)

        self.searchdateedr = QPlainTextEdit(self.window)
        self.searchdateedr.move(20, 450)
        self.searchdateedr.resize(100, 35)
        self.searchdateedr.setPlainText("结束日期:")
        self.searchdateedr.setReadOnly(True)

        self.searchdateed = QPlainTextEdit(self.window)
        self.searchdateed.move(120, 450)
        self.searchdateed.resize(80, 35)

        self.searchclientr = QPlainTextEdit(self.window)
        self.searchclientr.move(200, 415)
        self.searchclientr.resize(100, 35)
        self.searchclientr.setPlainText("欠款客户:")
        self.searchclientr.setReadOnly(True)

        self.searchclient = QPlainTextEdit(self.window)
        self.searchclient.move(300, 415)
        self.searchclient.resize(200, 35)

        self.searchtktnumr = QPlainTextEdit(self.window)
        self.searchtktnumr.move(200, 450)
        self.searchtktnumr.resize(100, 35)
        self.searchtktnumr.setPlainText("票号:")
        self.searchtktnumr.setReadOnly(True)

        self.searchtktnum = QPlainTextEdit(self.window)
        self.searchtktnum.move(300, 450)
        self.searchtktnum.resize(200, 35)

        self.searchrestr = QPlainTextEdit(self.window)
        self.searchrestr.move(500, 415)
        self.searchrestr.resize(100, 35)
        self.searchrestr.setPlainText("剩余金额:")
        self.searchrestr.setReadOnly(True)

        self.searchrest = QPlainTextEdit(self.window)
        self.searchrest.setPlaceholderText("自动+-100")
        self.searchrest.move(600, 415)
        self.searchrest.resize(100, 35)
        
        self.searchflightr = QPlainTextEdit(self.window)
        self.searchflightr.move(500, 450)
        self.searchflightr.resize(100, 35)
        self.searchflightr.setPlainText("航段:")
        self.searchflightr.setReadOnly(True)

        self.searchflight = QPlainTextEdit(self.window)
        self.searchflight.move(600, 450)
        self.searchflight.resize(100, 35)

        self.searchremarkr = QPlainTextEdit(self.window)
        self.searchremarkr.move(700, 415)
        self.searchremarkr.resize(500, 35)
        self.searchremarkr.setPlainText("                        备注:")
        self.searchremarkr.setReadOnly(True)

        self.searchremark = QPlainTextEdit(self.window)
        self.searchremark.move(700, 450)
        self.searchremark.resize(500, 35)
        
        self.searchapply = QPushButton('搜索欠条记录', self.window)
        self.searchapply.move(1210, 420)
        self.searchapply.resize(165, 55)
        self.searchapply.clicked.connect(self.searchious)


        self.fscroll_area = QScrollArea(self.window)
        self.fscroll_area.move(20,480)
        self.fscroll_area.resize(1360, 400)
        self.fscroll_area.setWidgetResizable(True)

        self.inner_widget = QWidget()
        self.inner_layout = QVBoxLayout()
        self.fscroll_area.setWidget(self.inner_widget)
        self.inner_widget.setLayout(self.inner_layout)

        self.fshowpay = QPlainTextEdit()
        self.fshowpay.setPlaceholderText("总记录出现在这里")
        self.inner_layout.addWidget(self.fshowpay)

    def uploadpayment(self):
        user_name = self.username.toPlainText().strip()
        if not user_name.isalpha():
            old_text = self.pshowpay.toPlainText()
            self.pshowpay.setPlainText(old_text+'请输入纯字母(2-3位)有效用户名\n')
            return 
        if len(user_name) > 3:
            user_name = user_name[:3]
        user_name = user_name.upper()
        if len(user_name) < 3:
            user_name = 'A'*(3-len(user_name)) + user_name

        date =self.date.toPlainText().strip()
        if len(date) != 6 or date.isdigit() == False:
            old_text = self.pshowpay.toPlainText()
            self.pshowpay.setPlainText(old_text+'请输入6位yymmdd有效日期\n')
            return 

        client = self.client.toPlainText().strip()
        if client =='':
            old_text = self.pshowpay.toPlainText()
            self.pshowpay.setPlainText(old_text+'请输入有效付款人名\n')
            return

        amount = self.amount.toPlainText().strip()
        if not afunc.isnumber(amount):
            old_text = self.pshowpay.toPlainText()
            self.pshowpay.setPlainText(old_text+'请输入有效金额\n')
            return 
        amount = float(amount)
        if amount<=0:
            old_text = self.pshowpay.toPlainText()
            self.pshowpay.setPlainText(old_text+'请输入正数金额\n')
            return 

        remark = self.remark.toPlainText().strip()

        total = 0
        for business in self.cur:
            total += business.rest
        if total < amount:
            past = self.pshowpay.toPlainText()
            new = f'支付失败，多笔导入时付款金额不可以超过欠款金额，当前总欠款为{total}元\n'
            self.pshowpay.setPlainText(past+new)
            afunc.put_history(f'尝试对多笔欠单进行了金额为{amount}的一次支付，失败\n')
            return 

        afunc.put_history(f'对多笔欠单进行了金额为{amount}的一次支付，成功，如下\n')
        for business in self.cur:
            if amount<=0:
                continue
            pay = afunc.create_notlistpayment(user_name, date, client, min(business.rest,amount), business.ious.id, remark)
            amount -= business.rest
            valid = afunc.payment_to_business(pay)
            if valid == True: #成功
                past = self.pshowpay.toPlainText()
                new = afunc.pay_text(pay)
                self.pshowpay.setPlainText(past+'导入如下付款记录\n'+new)
                afunc.put_history(f'导入付款记录\n{new}')
            elif valid == False: #失败,仅仅保留以防万一
                past = self.pshowpay.toPlainText()
                new = '不存在对应欠单，录入失败，但是此情况不应该出现，请停止操作联系程序员\n'
                self.pshowpay.setPlainText(past+new)
                afunc.put_history(f'发生了未知错误，群体付款时找不到欠单号，失败\n')
                break

        self.amount.setPlainText('')

    def searchious(self):
        stdate = self.searchdatest.toPlainText().strip()
        if stdate.strip() != '' and (len(stdate) != 6 or stdate.isdigit() == False):
            self.fshowpay.setPlainText('请输入6位yymmdd有效日期\n')
            return 
        if stdate.strip() == '':
            stdate = '230000'

        eddate = self.searchdateed.toPlainText().strip()
        if eddate.strip() != '' and (len(eddate) != 6 or eddate.isdigit() == False):
            self.fshowpay.setPlainText('请输入6位yymmdd有效日期\n')
            return 
        if eddate.strip() == '':
            eddate = '300000'

        list_business = afunc.search_ious_bydate_indata(stdate,eddate,afunc.get_data())

        client = self.searchclient.toPlainText().strip()
        tktnum = self.searchtktnum.toPlainText().strip()
        amount = self.searchrest.toPlainText().strip()
        if amount == '':
            amount = False
        elif not afunc.isnumber(amount):
            self.fshowpay.setPlainText('请输入有效金额\n')
            return 

        flight = self.searchflight.toPlainText().strip()
        remark = self.searchremark.toPlainText().strip()

        #此处不用afunc,否则数据要运行太多遍
        re = []
        for business in list_business:
            c = 0
            for cli in business.ious.lclient:
                if client in cli:
                    c=1
                    break
            if c == 0:
                continue
            if amount:
                amount = float(amount)
                bot = (amount - 100); top = (amount + 100)
                if business.rest < bot or business.rest>top:
                    continue
            c = 0
            for rem in business.ious.remark:
                if remark in rem:
                    c=1
                    break
            if c == 0:
                continue

            c = 0
            for fli in business.ious.lflight:
                if flight in fli:
                    c=1
                    break
            if c == 0:
                continue

            c = 0
            for tkt in business.ious.ltktnum:
                if tktnum in tkt:
                    c=1
                    break
            if c == 0:
                continue

            if business.type in ['已付清','初始欠条为负','已超额支付']:
                continue

            re.append(business)

        self.cur = re
        self.fshowpay.setPlainText(afunc.convert_full_ious_text(re))
            
        
if __name__ == "__main__":
    app = QApplication([])
    payment = payment_mult()
    payment.window.show()
    app.exec_()