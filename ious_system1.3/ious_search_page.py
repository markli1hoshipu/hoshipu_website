from PySide2.QtWidgets import QApplication, QMainWindow, QPushButton, QPlainTextEdit, QFileDialog, QScrollArea, QWidget, QVBoxLayout
import all_func as afunc

class ious_search():
    def __init__(self):
        self.cur_data = []

        self.window = QMainWindow()
        self.window.resize(1400, 900)
        self.window.move(200, 15)
        self.window.setWindowTitle('欠条检索与导出程序')

        self.maintitle = QPlainTextEdit(self.window)
        self.maintitle.move(20, 20)
        self.maintitle.resize(1360, 35)
        space = ' '*68
        self.maintitle.setPlainText(f"{space}查询全部信息{space}")
        self.maintitle.setReadOnly(True)

        self.ioustitle = QPlainTextEdit(self.window)
        self.ioustitle.move(20, 60)
        self.ioustitle.resize(1360, 35)
        self.ioustitle.setPlainText("根据欠款信息检索；    状态栏0:未付款 1:未付清 2:已付清 3:欠条金额为负数 4:超额支付欠条，可以组合（例如012）")
        self.ioustitle.setReadOnly(True)

        self.iousdatestr = QPlainTextEdit(self.window)
        self.iousdatestr.move(20, 95)
        self.iousdatestr.resize(100, 35)
        self.iousdatestr.setPlainText("起始日期:")
        self.iousdatestr.setReadOnly(True)

        self.iousdatest = QPlainTextEdit(self.window)
        self.iousdatest.move(120, 95)
        self.iousdatest.resize(80, 35)

        self.iousdateedr = QPlainTextEdit(self.window)
        self.iousdateedr.move(20, 130)
        self.iousdateedr.resize(100, 35)
        self.iousdateedr.setPlainText("结束日期:")
        self.iousdateedr.setReadOnly(True)

        self.iousdateed = QPlainTextEdit(self.window)
        self.iousdateed.move(120, 130)
        self.iousdateed.resize(80, 35)

        self.iousclientr = QPlainTextEdit(self.window)
        self.iousclientr.move(200, 95)
        self.iousclientr.resize(100, 35)
        self.iousclientr.setPlainText("欠款客户:")
        self.iousclientr.setReadOnly(True)

        self.iousclient = QPlainTextEdit(self.window)
        self.iousclient.move(300, 95)
        self.iousclient.resize(200, 35)

        self.ioustktnumr = QPlainTextEdit(self.window)
        self.ioustktnumr.move(200, 130)
        self.ioustktnumr.resize(100, 35)
        self.ioustktnumr.setPlainText("票号:")
        self.ioustktnumr.setReadOnly(True)

        self.ioustktnum = QPlainTextEdit(self.window)
        self.ioustktnum.move(300, 130)
        self.ioustktnum.resize(200, 35)

        self.iousrestr = QPlainTextEdit(self.window)
        self.iousrestr.move(500, 95)
        self.iousrestr.resize(100, 35)
        self.iousrestr.setPlainText("剩余金额:")
        self.iousrestr.setReadOnly(True)

        self.iousrest = QPlainTextEdit(self.window)
        self.iousrest.move(600, 95)
        self.iousrest.resize(80, 35)

        self.iousrestappr = QPlainTextEdit(self.window)
        self.iousrestappr.move(500, 130)
        self.iousrestappr.resize(100, 35)
        self.iousrestappr.setPlainText("正负半径:")
        self.iousrestappr.setReadOnly(True)

        self.iousrestapp = QPlainTextEdit(self.window)
        self.iousrestapp.move(600, 130)
        self.iousrestapp.resize(80, 35)

        self.iousinitr = QPlainTextEdit(self.window)
        self.iousinitr.move(680, 95)
        self.iousinitr.resize(100, 35)
        self.iousinitr.setPlainText("初始金额:")
        self.iousinitr.setReadOnly(True)

        self.iousinit = QPlainTextEdit(self.window)
        self.iousinit.move(780, 95)
        self.iousinit.resize(80, 35)

        self.iousinitappr = QPlainTextEdit(self.window)
        self.iousinitappr.move(680, 130)
        self.iousinitappr.resize(100, 35)
        self.iousinitappr.setPlainText("正负半径:")
        self.iousinitappr.setReadOnly(True)

        self.iousinitapp = QPlainTextEdit(self.window)
        self.iousinitapp.move(780, 130)
        self.iousinitapp.resize(80, 35)
        
        self.iousflightr = QPlainTextEdit(self.window)
        self.iousflightr.move(860, 95)
        self.iousflightr.resize(60, 35)
        self.iousflightr.setPlainText("航段:")
        self.iousflightr.setReadOnly(True)

        self.iousflight = QPlainTextEdit(self.window)
        self.iousflight.move(920, 95)
        self.iousflight.resize(80, 35)

        self.ioustyper = QPlainTextEdit(self.window)
        self.ioustyper.move(860, 130)
        self.ioustyper.resize(60, 35)
        self.ioustyper.setPlainText("状态:")
        self.ioustyper.setReadOnly(True)

        self.ioustype = QPlainTextEdit(self.window)
        self.ioustype.move(920, 130)
        self.ioustype.resize(80, 35)

        self.iousremarkr = QPlainTextEdit(self.window)
        self.iousremarkr.move(1000, 95)
        self.iousremarkr.resize(80, 35)
        self.iousremarkr.setPlainText("备注:")
        self.iousremarkr.setReadOnly(True)

        self.iousremark = QPlainTextEdit(self.window)
        self.iousremark.move(1080, 95)
        self.iousremark.resize(300, 35)

        self.iousiousidr = QPlainTextEdit(self.window)
        self.iousiousidr.move(1000, 130)
        self.iousiousidr.resize(80, 35)
        self.iousiousidr.setPlainText("欠单号:")
        self.iousiousidr.setReadOnly(True)

        self.iousiousid = QPlainTextEdit(self.window)
        self.iousiousid.move(1080, 130)
        self.iousiousid.resize(300, 35)
        
    
        self.searching = QPushButton('开始搜索', self.window)
        self.searching.move(20,190)
        self.searching.resize(560, 50)
        self.searching.clicked.connect(self.search)

        self.exportfilenamer = QPlainTextEdit(self.window)
        self.exportfilenamer.move(600, 180)
        self.exportfilenamer.resize(450, 35)
        self.exportfilenamer.setPlainText("导出文档名:(不含后缀)")
        self.exportfilenamer.setReadOnly(True)

        self.exportfilename = QPlainTextEdit(self.window)
        self.exportfilename.setPlainText("")
        self.exportfilename.move(1050, 180)
        self.exportfilename.resize(200, 35)

        self.exportfilencontr = QPlainTextEdit(self.window)
        self.exportfilencontr.move(600, 215)
        self.exportfilencontr.resize(450, 35)
        self.exportfilencontr.setPlainText("导出类型:全部信息(2)/概括欠条(1)/详细欠条(0)")
        self.exportfilencontr.setReadOnly(True)

        self.exportfilencont = QPlainTextEdit(self.window)
        self.exportfilencont.move(1050, 215)
        self.exportfilencont.resize(200, 35)

        self.exporting = QPushButton('开始导出\nexcel', self.window)
        self.exporting.move(1280,180)
        self.exporting.resize(100, 70)
        self.exporting.clicked.connect(self.export)

        self.fscroll_area = QScrollArea(self.window)
        self.fscroll_area.move(20,295)
        self.fscroll_area.resize(1360, 585)
        self.fscroll_area.setWidgetResizable(True)

        self.inner_widget = QWidget()
        self.inner_layout = QVBoxLayout()
        self.fscroll_area.setWidget(self.inner_widget)
        self.inner_widget.setLayout(self.inner_layout)

        self.fshowious = QPlainTextEdit()
        self.fshowious.setPlainText("总记录出现在这里")
        self.inner_layout.addWidget(self.fshowious)

        

    def search(self):
        iousdatest = self.iousdatest.toPlainText().strip()
        if iousdatest.strip() != '' and (len(iousdatest) != 6 or iousdatest.isdigit() == False):
            self.fshowious.setPlainText('请输入6位yymmdd有效日期\n')
            return 
        if iousdatest.strip() == '':
            iousdatest = '230000'

        iousdateed = self.iousdateed.toPlainText()
        if iousdateed.strip() != '' and (len(iousdateed) != 6 or iousdateed.isdigit() == False):
            self.fshowious.setPlainText('请输入6位yymmdd有效日期\n')
            return 
        if iousdateed.strip() == '':
            iousdateed = '300000'

        list_business = afunc.search_ious_bydate_indata(iousdatest,iousdateed,afunc.get_data())

        iousclient = self.iousclient.toPlainText()
        ioustktnum = self.ioustktnum.toPlainText()

        iousrest = self.iousrest.toPlainText()
        if iousrest == '':
            iousrest = False
        elif not afunc.isnumber(iousrest):
            self.fshowious.setPlainText('请输入有效金额\n')
            return 
        iousrestapp = self.iousrestapp.toPlainText()
        if iousrestapp == '':
            iousrestapp = 0
        elif not afunc.isnumber(iousrestapp):
            self.fshowious.setPlainText('请输入有效金额\n')
            return 
        iousinit = self.iousinit.toPlainText()
        if iousinit == '':
            iousinit = False
        elif not afunc.isnumber(iousinit):
            self.fshowious.setPlainText('请输入有效金额\n')
            return 
        iousinitapp = self.iousinitapp.toPlainText()
        if iousinitapp == '':
            iousinitapp = 0
        elif not afunc.isnumber(iousinitapp):
            self.fshowious.setPlainText('请输入有效金额\n')
            return 

        iousflight = self.iousflight.toPlainText()
        ioustype = str(self.ioustype.toPlainText())
        iousremark = self.iousremark.toPlainText()
        iousid = self.iousiousid.toPlainText()

        iousre = []
        
        for business in list_business:
            
            if iousrest:
                amount = float(iousrest)
                iousrestapp = float(iousrestapp)
                bot = (amount - iousrestapp); top = (amount + iousrestapp)
                if business.rest < bot or business.rest>top:
                    continue

            if iousinit:
                amount = float(iousinit)
                iousinitapp = float(iousinitapp)
                bot = (amount - iousinitapp); top = (amount + iousinitapp)
                if business.ious.total_money < bot or business.ious.total_money>top:
                    continue

            c = 0
            for cli in business.ious.lclient:
                if iousclient in cli:
                    c=1
                    break
            if c == 0:
                continue
         
            c = 0
            for rem in business.ious.remark:
                if iousremark in rem:
                    c=1
                    break
            if c == 0:
                continue
       
            c = 0
            for fli in business.ious.lflight:
                if iousflight in fli:
                    c=1
                    break
            if c == 0:
                continue
         
            c = 0
            for tkt in business.ious.ltktnum:
                if ioustktnum in tkt:
                    c=1
                    break
            if c == 0:
                continue
        
            if iousid not in business.ious.id:
                continue
      
            allowed_type = []
            if ioustype == '':
                allowed_type = ['未付款','未付清','已付清','初始欠条为负','已超额支付']
            else: 
                for no in ioustype:
                    if no == '0':
                        allowed_type.append('未付款')
                    if no == '1':
                        allowed_type.append('未付清')
                    if no == '2':
                        allowed_type.append('已付清')
                    if no == '3':
                        allowed_type.append('初始欠条为负')
                    if no == '4':
                        allowed_type.append('已超额支付')
                

            if business.type not in allowed_type:
                continue

            iousre.append(business)
        

        self.cur_data = iousre
        self.fshowious.setPlainText(afunc.convert_full_ious_text(iousre))


    def export(self):
        filename = self.exportfilename.toPlainText().strip()
        if filename == '':
            self.fshowious.setPlainText('请输入文件名')
        filecont = str(self.exportfilencont.toPlainText().strip())  
        if filecont == '2':    #全部
            afunc.export_fbusiness(self.cur_data,filename)
        elif filecont == '1':  #仅概括欠条
            afunc.export_sious(self.cur_data,filename)
        elif filecont == '0':  #仅详细欠条
            afunc.export_fious(self.cur_data,filename)
        self.fshowious.setPlainText(f'导入{filename}.xls完成')
            
        
if __name__ == "__main__":
    app = QApplication([])
    general = ious_search()
    general.window.show()
    app.exec_()