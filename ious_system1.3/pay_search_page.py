from PySide2.QtWidgets import QApplication, QMainWindow, QPushButton, QPlainTextEdit, QFileDialog, QScrollArea, QWidget, QVBoxLayout
import all_func as afunc
import time

def randomanswer():
    ans = ['恭喜你找到了秘钥！', '辛苦啦~', '好好工作！', '继续努力！', '加油加油！']
    ticks = time.time()
    return ans[int(ticks) % len(ans)]

class pay_search():
    def __init__(self):
        self.cur_data = []
        self.pay = []

        self.window = QMainWindow()
        self.window.resize(1400, 900)
        self.window.move(200, 15)
        self.window.setWindowTitle('付款记录检索与记录清理')

        self.maintitle = QPlainTextEdit(self.window)
        self.maintitle.move(20, 20)
        self.maintitle.resize(1360, 35)
        space = ' '*68
        self.maintitle.setPlainText(f"{space}查询付款信息{space}")
        self.maintitle.setReadOnly(True)


        self.paytitle = QPlainTextEdit(self.window)
        self.paytitle.move(20, 70)
        self.paytitle.resize(580, 35)
        self.paytitle.setPlainText(f"根据付款信息检索")
        self.paytitle.setReadOnly(True)

        self.paydatestr = QPlainTextEdit(self.window)
        self.paydatestr.move(20, 105)
        self.paydatestr.resize(100, 35)
        self.paydatestr.setPlainText("起始日期:")
        self.paydatestr.setReadOnly(True)

        self.paydatest = QPlainTextEdit(self.window)
        self.paydatest.move(120, 105)
        self.paydatest.resize(80, 35)

        self.paydateedr = QPlainTextEdit(self.window)
        self.paydateedr.move(20, 140)
        self.paydateedr.resize(100, 35)
        self.paydateedr.setPlainText("结束日期:")
        self.paydateedr.setReadOnly(True)

        self.paydateed = QPlainTextEdit(self.window)
        self.paydateed.move(120, 140)
        self.paydateed.resize(80, 35)

        self.payclientr = QPlainTextEdit(self.window)
        self.payclientr.move(200, 105)
        self.payclientr.resize(100, 35)
        self.payclientr.setPlainText("付款客户:")
        self.payclientr.setReadOnly(True)

        self.payclient = QPlainTextEdit(self.window)
        self.payclient.move(300, 105)
        self.payclient.resize(300, 35)

        self.payremarkr = QPlainTextEdit(self.window)
        self.payremarkr.move(200, 140)
        self.payremarkr.resize(100, 35)
        self.payremarkr.setPlainText("备注:")
        self.payremarkr.setReadOnly(True)

        self.payremark = QPlainTextEdit(self.window)
        self.payremark.move(300, 140)
        self.payremark.resize(300, 35)
        
    
        self.searching = QPushButton('开始搜索', self.window)
        self.searching.move(620,70)
        self.searching.resize(100, 105)
        self.searching.clicked.connect(self.search)

        self.exportfilenamer = QPlainTextEdit(self.window)
        self.exportfilenamer.move(900, 70)
        self.exportfilenamer.resize(350, 35)
        self.exportfilenamer.setPlainText("导出文档名:(不含后缀)")
        self.exportfilenamer.setReadOnly(True)

        self.exportfilename = QPlainTextEdit(self.window)
        self.exportfilename.setPlainText("")
        self.exportfilename.move(900, 105)
        self.exportfilename.resize(350, 35)
  
        self.exporting = QPushButton('开始导出\nexcel', self.window)
        self.exporting.move(1280,70)
        self.exporting.resize(100, 70)
        self.exporting.clicked.connect(self.export)

        self.sscroll_area = QScrollArea(self.window)
        self.sscroll_area.move(20,185)
        self.sscroll_area.resize(1360, 250)
        self.sscroll_area.setWidgetResizable(True)

        self.inner_widget = QWidget()
        self.inner_layout = QVBoxLayout()
        self.sscroll_area.setWidget(self.inner_widget)
        self.inner_widget.setLayout(self.inner_layout)

        self.sshowious = QPlainTextEdit()
        self.sshowious.setPlaceholderText("付款记录出现在这里")
        self.inner_layout.addWidget(self.sshowious)

    
        self.search_clear = QPushButton('查找已付清记录', self.window)
        self.search_clear.move(20,490)
        self.search_clear.resize(400, 35)
        self.search_clear.clicked.connect(self.searchclear)

        self.clear = QPushButton('清空已付款记录', self.window)
        self.clear.move(700,490)
        self.clear.resize(400, 35)
        self.clear.clicked.connect(self.clearing)

        self.pswd = QPlainTextEdit(self.window)
        self.pswd.move(1200, 490)
        self.pswd.resize(180, 35)
        self.pswd.setPlaceholderText("输入对话秘钥:")


        self.fscroll_area = QScrollArea(self.window)
        self.fscroll_area.move(20,530)
        self.fscroll_area.resize(1360, 350)
        self.fscroll_area.setWidgetResizable(True)

        self.inner_widget = QWidget()
        self.inner_layout = QVBoxLayout()
        self.fscroll_area.setWidget(self.inner_widget)
        self.inner_widget.setLayout(self.inner_layout)

        self.fshowious = QPlainTextEdit()
        self.fshowious.setPlaceholderText("需要清空的记录出现在这里")
        self.inner_layout.addWidget(self.fshowious)

        

    def search(self):
        list_business = afunc.search_ious_bydate_indata('230000','300000',afunc.get_data())

        paydatest = self.paydatest.toPlainText().strip()
        if paydatest.strip() != '' and (len(paydatest) != 6 or paydatest.isdigit() == False):
            self.sshowious.setPlainText('请输入6位yymmdd有效日期\n')
            return 
        if paydatest.strip() == '':
            paydatest = '230000'

        paydateed = self.paydateed.toPlainText().strip()
        if paydateed.strip() != '' and (len(paydateed) != 6 or paydateed.isdigit() == False):
            self.sshowious.setPlainText('请输入6位yymmdd有效日期\n')
            return 
        if paydateed.strip() == '':
            paydateed = '300000'


        payclient = self.payclient.toPlainText().strip()
        payremark = self.payremark.toPlainText().strip()

        payre =[]; iousre = []
        
        for business in list_business:
        
            c = 0
            for payment in business.list_payment:
                if payclient in payment.client:
                    c=1
                    break
            if c == 0:
                continue

            c = 0
            for payment in business.list_payment:
                if payremark in payment.remark:
                    c=1
                    break
            if c == 0:
                continue

            c = 0
            for payment in business.list_payment:
                if int(payment.date) >= int(paydatest) and int(payment.date) <= int(paydateed):
                    c = 1
            if c == 0:
                continue
            iousre.append(business)

        for business in iousre:
            for payment in business.list_payment:
                if payclient not in payment.client:
                    continue
                if payremark not in payment.remark:
                    continue
                if int(payment.date) < int(paydatest) or int(payment.date) > int(paydateed):
                    continue
                payre.append(payment)

        self.pay = payre
        self.sshowious.setPlainText(afunc.convert_pay_text(self.pay))

    def export(self):
        filename = self.exportfilename.toPlainText().strip()
        if filename == '':
            self.sshowious.setPlainText('请输入文件名')
        afunc.export_spayment(self.pay,filename)
        self.sshowious.setPlainText(f'导入{filename}.xls完成')

    def searchclear(self):
        list_business = afunc.search_ious_bydate_indata('230000','300000',afunc.get_data())
        iousre = []
        for business in list_business:
            if business.type != '已付清':
                continue
            iousre.append(business)
        self.cur_data = iousre
        self.fshowious.setPlainText(afunc.convert_full_ious_text(iousre))

    def clearing(self):
        self.fshowious.setPlainText('等我回来才可以清理数据！ :)')
        afunc.put_history('尝试清理了一次数据，要等我回来哦\n')

        pswd = str(self.pswd.toPlainText())
        if 'hsp' in pswd or 'hoshipu' in pswd:
            self.fshowious.setPlainText(randomanswer())

        '''
        afunc.true_clean()
        self.fshowious.setPlainText('清理完毕')
        afunc.put_history('清理了一次数据\n')
        '''
            
        
if __name__ == "__main__":
    app = QApplication([])
    general = pay_search()
    general.window.show()
    app.exec_()