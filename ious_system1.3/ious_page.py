from PySide2.QtWidgets import QApplication, QMainWindow, QPushButton, QPlainTextEdit, QFileDialog, QScrollArea, QWidget, QVBoxLayout
import xlrd
import all_func as afunc

class ious_main():
    def __init__(self):
        self.window = QMainWindow()
        self.window.resize(1400, 900)
        self.window.move(200, 15)
        self.window.setWindowTitle('欠条自动录入程序 ')

        self.usernamer = QPlainTextEdit(self.window)
        self.usernamer.move(20, 20)
        self.usernamer.resize(100, 85)
        self.usernamer.setPlainText("用户名：")
        self.usernamer.setReadOnly(True)

        self.username = QPlainTextEdit(self.window)
        self.username.move(20, 70)
        self.username.resize(100, 75)

        self.remark_text = QPlainTextEdit(self.window)
        self.remark_text.move(220, 20)
        self.remark_text.resize(570, 35)
        self.remark_text.setPlainText("\t\t     通过excel导入")
        self.remark_text.setReadOnly(True)

        self.fileselect = QPushButton('选择Excel文件 ', self.window)
        self.fileselect.move(220,65)
        self.fileselect.resize(200, 35)
        self.fileselect.clicked.connect(self.selectfile)
        
        self.sheetname = QPlainTextEdit(self.window)
        self.sheetname.move(430, 65)
        self.sheetname.resize(150, 35)
        self.sheetname.setPlaceholderText("Sheet名:")

        self.fileupload = QPushButton('导入Excel文件 ', self.window)
        self.fileupload.move(590,65)
        self.fileupload.resize(200, 35)
        self.fileupload.clicked.connect(self.uploadfile)

        self.filepath = QPlainTextEdit(self.window)
        self.filepath.move(220, 110)
        self.filepath.resize(570, 35)
        self.filepath.setPlainText("文件路径：（自动生成）")
        self.filepath.setReadOnly(True)


        self.status_text = QPlainTextEdit(self.window)
        self.status_text.move(895, 20)
        self.status_text.resize(480, 125)
        self.status_text.setPlainText("本程序依赖于history.txt business_data.txt import_id.txt past_data.txt运行, 请确保运行程序时三者是关闭的\n\n\
made by Zhiyuan Li *hoshipu")
        self.status_text.setReadOnly(True)


        self.handaddtitle = QPlainTextEdit(self.window)
        self.handaddtitle.move(20, 175)
        self.handaddtitle.resize(1360, 35)
        space = ' '*58
        self.handaddtitle.setPlainText(f"{space}手动添加欠条信息,请注意类型为H{space}")
        self.handaddtitle.setReadOnly(True)


        self.handdater = QPlainTextEdit(self.window)
        self.handdater.move(20, 210)
        self.handdater.resize(150, 35)
        self.handdater.setPlainText("日期:")
        self.handdater.setReadOnly(True)

        self.handnamer = QPlainTextEdit(self.window)
        self.handnamer.move(20, 245)
        self.handnamer.resize(150, 35)
        self.handnamer.setPlainText("客户名：")
        self.handnamer.setReadOnly(True)

        self.handmoneyr = QPlainTextEdit(self.window)
        self.handmoneyr.move(20, 280)
        self.handmoneyr.resize(150, 35)
        self.handmoneyr.setPlainText("金额：")
        self.handmoneyr.setReadOnly(True)

        self.handdate = QPlainTextEdit(self.window)
        self.handdate.setPlaceholderText('yymmdd')
        self.handdate.move(170, 210)
        self.handdate.resize(300, 35)

        self.handname = QPlainTextEdit(self.window)
        self.handname.move(170, 245)
        self.handname.resize(300, 35)

        self.handmoney = QPlainTextEdit(self.window)
        self.handmoney.move(170, 280)
        self.handmoney.resize(300, 35)

        self.handflightr = QPlainTextEdit(self.window)
        self.handflightr.move(470, 210)
        self.handflightr.resize(150, 35)
        self.handflightr.setPlainText("航程：")
        self.handflightr.setReadOnly(True)

        self.handtktnr = QPlainTextEdit(self.window)
        self.handtktnr.move(470, 245)
        self.handtktnr.resize(150, 35)
        self.handtktnr.setPlainText("票号：")
        self.handtktnr.setReadOnly(True)

        self.handremarkr = QPlainTextEdit(self.window)
        self.handremarkr.move(470, 280)
        self.handremarkr.resize(150, 35)
        self.handremarkr.setPlainText("备注：")
        self.handremarkr.setReadOnly(True)

        self.handflight = QPlainTextEdit(self.window)
        self.handflight.move(620, 210)
        self.handflight.resize(300, 35)

        self.handtktn = QPlainTextEdit(self.window)
        self.handtktn.move(620, 245)
        self.handtktn.resize(300, 35)

        self.handremark = QPlainTextEdit(self.window)
        self.handremark.move(620, 280)
        self.handremark.resize(300, 35)

        self.handconfirm = QPushButton('确认生成欠条', self.window)
        self.handconfirm.move(930,220)
        self.handconfirm.resize(450,85)
        self.handconfirm.clicked.connect(self.uploadhand)


        self.scroll_area = QScrollArea(self.window)
        self.scroll_area.move(20,360)
        self.scroll_area.resize(1360, 530)
        self.scroll_area.setWidgetResizable(True)

        self.inner_widget = QWidget()
        self.inner_layout = QVBoxLayout()
        self.scroll_area.setWidget(self.inner_widget)
        self.inner_widget.setLayout(self.inner_layout)

        self.showious = QPlainTextEdit()
        self.showious.setReadOnly(True)
        self.showious.setPlaceholderText("欠条记录出现在这里")
        self.inner_layout.addWidget(self.showious)

    def selectfile(self):
        file_name, _ = QFileDialog.getOpenFileName(self.window, '选择文件', '', 'excel文件(*.xls *.xlsx)')
        self.filepath.setPlainText(file_name)



    def uploadfile(self):
        file_name = self.filepath.toPlainText().strip()
        book = xlrd.open_workbook(file_name)
        sheet_name = self.sheetname.toPlainText().strip()
        if sheet_name not in book.sheet_names():
            old_text = self.showious.toPlainText()
            self.showious.setPlainText(old_text+'此sheet名不存在\n')
            return 
        user_name = self.username.toPlainText().strip()
        if not user_name.isalpha():
            old_text = self.showious.toPlainText()
            self.showious.setPlainText(old_text+'请输入纯字母(2-3位)有效用户名\n')
            return 
        if len(user_name) > 3:
            user_name = user_name[:3]
        user_name = user_name.upper()
        if len(user_name) < 3:
            user_name = 'A'*(3-len(user_name)) + user_name


        list_ious,valid = afunc.read_bsp(file_name,sheet_name,user_name)
        if valid == False:
            old_text = self.showious.toPlainText()
            self.showious.setPlainText(old_text+'导入失败；请确认表格格式信息，或此用户名下此日期此种类已经导入过\n')
            return 
        list_business = afunc.ious_to_business(list_ious)
        afunc.put_data(list_business)
        ious_text = afunc.convert_short_ious_text(list_business)
        old_text = self.showious.toPlainText()
        self.showious.setPlainText(old_text+'导入了如下欠条\n'+ious_text)
        afunc.put_history(f'导入了{file_name}文件的{sheet_name}表格\n包含:{ious_text} ')
        
        self.sheetname.setPlaceholderText('Sheet名:')



    def uploadhand(self):
        date = self.handdate.toPlainText().strip()
        if len(date) != 6 or date.isdigit() == False:
            old_text = self.showious.toPlainText()
            self.showious.setPlainText(old_text+'请输入6位yymmdd有效日期\n')
            return 
        client = self.handname.toPlainText().strip()
        if client =='':
            old_text = self.showious.toPlainText()
            self.showious.setPlainText(old_text+'请输入有效客户名\n')
            return
        money = self.handmoney.toPlainText().strip()
        if not afunc.isnumber(money):
            old_text = self.showious.toPlainText()
            self.showious.setPlainText(old_text+'请输入有效金额\n')
            return 
        tkt_num = self.handtktn.toPlainText().strip()
        flight = self.handflight.toPlainText().strip()
        remark = self.handremark.toPlainText().strip()
        user_name = self.username.toPlainText().strip()
        if not user_name.isalpha():
            old_text = self.showious.toPlainText()
            self.showious.setPlainText(old_text+'请输入纯字母(2-3位)有效用户名\n')
            return 
        if len(user_name) > 3:
            user_name = user_name[:3]
        user_name = user_name.upper()
        if len(user_name) < 3:
            user_name = 'A'*(3-len(user_name)) + user_name


        ious_id = afunc.find_next_handid(date,user_name)
        if ious_id == False:
            old_text = self.showious.toPlainText()
            self.showious.setPlainText(old_text+'此用户名下此日期手写欠条数已达上限\n')
            return 

        list_business = afunc.ious_to_business(afunc.create_oneious(user_name, date, client, ious_id, money, flight, tkt_num, remark))
        afunc.put_data(list_business)
        afunc.put_history(f'手动导入了{ious_id}欠条\n')
        ious_text = afunc.convert_short_ious_text(list_business)
        old_text = self.showious.toPlainText()
        self.showious.setPlainText(old_text+'导入了如下欠条\n'+ious_text)

        self.handmoney.setPlainText('')
        self.handtktn.setPlainText('')

        


        

if __name__ == "__main__":
    app = QApplication([])
    ious = ious_main()
    ious.window.show()
    app.exec_()