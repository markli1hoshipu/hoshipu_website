# pyside6-designer 

from PySide6.QtWidgets import QApplication, QMessageBox
from PySide6.QtUiTools import QUiLoader
import client_atg_helpers as cah

class Client_atg:

    def __init__(self):

        
        # 加载界面
        self.ui = uiLoader.load('client_atg.ui')
        self.display = ''
        self.data = {}

        # 初始化
        self.initialize()
        self.ui.button_refresh.clicked.connect(self.initialize)
        self.ui.button_update.clicked.connect(self.update)
        self.ui.button_generate.clicked.connect(self.generate)
        self.ui.button_rtimport.clicked.connect(self.importrt)

        self.ui.radio_id.toggled.connect(self.di_follow)
        self.ui.radio_pass.toggled.connect(self.di_follow)
        self.ui.radio_international.toggled.connect(self.di_force)

    def update(self):
        re = cah.update_data(dataname=self.ui.line_filepath.text())
        if re != True:
            QMessageBox.critical(self.ui, "错误", re)
            return
        self.initialize()
        self.display += '数据更新已完成!\n'
        self.update_display()
    
    def update_display(self):
        self.ui.plaintext_systemoutput.setPlainText(self.display)
    
    def di_force(self):
        if self.ui.radio_international.isChecked():
            self.ui.radio_pass.setChecked(True)

    def di_follow(self):
        if self.ui.radio_id.isChecked():
            self.ui.radio_domestic.setChecked(True)
        else:
            self.ui.radio_international.setChecked(True)

    def initialize(self):
        self.ui.plaintext_maininput.clear()
        self.ui.plaintext_maininput.setPlaceholderText('sd1a1\n航司代码\n第一个名字\n第二个名字\n...')
        self.ui.plaintext_infooutput.clear()
        self.ui.plaintext_infooutput.setPlaceholderText('此处显示生成信息\n')
        self.ui.plaintext_rtinput.setPlaceholderText('此处输入rt返回的信息\n可以录入信息\n暂不支持创建新公司\n现在还不可以使用！')
        self.display = '欢迎使用*hoshipu开发的客户订票信息自动生成程序v2.0.0\t'
        self.display += '若长时间无响应请联系wx: mark794552832\n'
        self.display += '载入信息中请稍等...\n'
        self.update_display()

        self.data = cah.get_data()
        self.ui.line_phone.clear()
        self.ui.line_phone.setText(self.data['settings']['usersettings']['phone'])
        if self.data['settings']['usersettings']['default_output'] == 'ID':
            self.ui.radio_id.setChecked(True)
            self.ui.radio_domestic.setChecked(True)
        elif self.data['settings']['usersettings']['default_output'] == 'PASS':
            self.ui.radio_pass.setChecked(True)
            self.ui.radio_international.setChecked(True)
        else:
            pass
        self.ui.combo_clienttype.clear()
        self.ui.combo_clienttype.addItem('散客')
        for company in self.data['companies']:
            self.ui.combo_clienttype.addItem(company)
        self.ui.line_filepath.setText(self.data['settings']['usersettings']['default_file'])
        self.display += '-----载入完毕-----\n\n'
        self.update_display()

    def firstline_valid(self,firstline):
        if len(firstline) < 3: return False
        try:
            int(firstline[-1])
            return True
        except:
            return False

    def generate(self):
        self.display += '正在生成中请稍等...\n'
        self.update_display()

        # 获得各部分信息
        user_input = self.ui.plaintext_maininput.toPlainText()
        lines = user_input.splitlines()
        for i in range(len(lines)):
            lines[i] = lines[i].strip()
            if lines[i] == '':
                lines = lines[:i]
                break

        # if len(user_input.splitlines()) <= 2 暂时不处理，考虑到也许要生成空记录
        if len(lines) <= 1:
            QMessageBox.critical(self.ui, "错误", '请输入有效预定')
            return
        while lines[-1] == '':
            lines = lines[:-1]
        if not self.firstline_valid(lines[0]) or (int(lines[0][-1])!=len(lines)-2):
            QMessageBox.critical(self.ui, "错误", '请输入有效预定')
            return
        phone = self.ui.line_phone.text()
        company = self.ui.combo_clienttype.currentText()
        airline = lines[1].strip().upper()
        idtype = 2
        if self.ui.radio_id.isChecked():
            idtype = 1
        remark = self.data['settings']['usersettings']['remark']
        flighttype = 2
        if self.ui.radio_domestic.isChecked():
            flighttype = 1

        # 先得到开头结尾
        head,tail = cah.generate_output_headtail(phone,company,airline,idtype,flighttype,remark,lines,self.data)
        re = head

        # 处理中间部分
        rank = 1
        for name in lines[2:]:
            return_remind,fre = cah.generate_output_name(name,rank,company,airline,idtype,flighttype,self.data)
            if return_remind == 1:
                # 一切正常
                re += fre[0]
            elif return_remind == 2:
                # 有多个信息，且只包含格式匹配的
                options = fre
                message_box = QMessageBox()
                message_box.setWindowTitle(f"{name}出现重名问题")
                message_box.setText(f"{name}出现重名问题，请选择一个选项：(show detail查看全文)")
                message_box.setDetailedText("\n".join(options))
                ct = 1
                for option in options:
                    message_box.addButton(str(ct), QMessageBox.AcceptRole)
                    ct += 1
                choice = message_box.exec_() - 2
                if choice != QMessageBox.Cancel:
                    re += options[choice-1]

            elif return_remind == 0:
                # 没有找到直接的信息，但是有/没有格式匹配的
                similars = fre
                if len(similars) == 0:
                    message_box = QMessageBox()
                    message_box.setWindowTitle(f"{name}没有找到信息")
                    message_box.setText(f"{name}没有找到信息，，是否继续生成?")
                    message_box.addButton('跳过,继续生成其他', QMessageBox.AcceptRole)
                    message_box.addButton('否，终止生成', QMessageBox.AcceptRole)
                    choice = message_box.exec() - 2
                    if choice == 0:
                        rank += 1
                        continue
                    else:
                        return
                    
                elif len(similars) == 1:
                    message_box = QMessageBox()
                    message_box.setWindowTitle(f"{name}没有找到信息")
                    message_box.setText(f"{name}没有找到对应信息，但是找到了如下信息{similars[0]}\n是否继续生成?")
                    message_box.addButton('是,使用当前信息', QMessageBox.AcceptRole)
                    message_box.addButton('跳过,继续生成其他', QMessageBox.AcceptRole)
                    message_box.addButton('否，终止生成', QMessageBox.AcceptRole)
                    choice = message_box.exec_() - 2
                    print(choice)
                    if choice == 0:
                        re += similars[0]
                    elif choice == 1:
                        rank += 1
                        continue
                    else:
                        return
                    
                #现在是多个重名
                else:
                    options = fre
                    message_box = QMessageBox()
                    message_box.setWindowTitle(f"{name}没有找到信息")
                    message_box.setText(f"{name}没有找到对应信息，但是找到了其他信息(show detail查看全文)\n是否继续生成?")
                    message_box.setDetailedText("\n".join(options))

                    ct = 1
                    for option in options:
                        message_box.addButton('是，使用'+ str(ct), QMessageBox.AcceptRole)
                        ct += 1
                    message_box.addButton('跳过,继续生成其他', QMessageBox.AcceptRole)
                    message_box.addButton('否，终止生成', QMessageBox.AcceptRole)
                    choice = message_box.exec_() - 2
                    if choice < ct:
                        re += options[choice-1]
                    elif choice == ct:
                        rank += 1
                        continue
                    else:
                        return
            else: # f== 4
                # 出现严重问题
                QMessageBox.critical(self.ui, "错误", '系统信息出错, 请输入有效预定')
            rank += 1

        #添加结尾
        re+=tail

        # 增加提醒
        re += '重名, 信息不对称等提示在消息框中已选择完毕\n'

        self.ui.plaintext_infooutput.setPlainText(re)
        self.display += '生成完毕！\n'
        self.update_display()
        
    def importrt(self):
        rt_input = self.ui.plaintext_rtinput.toPlainText()
        sheetname = '散客信息'
        options = ['散客信息'] + self.data['companies']
        message_box = QMessageBox()
        message_box.setWindowTitle(f"选择导入")
        message_box.setText(f"请选择一个库导入：")
        
        ct = 1
        for option in options:
            message_box.addButton(str(ct)+option, QMessageBox.AcceptRole)
            ct += 1
        choice = message_box.exec_()
        if choice != QMessageBox.Cancel:
            sheetname = options[choice] #不设detials不需要-1
        remessage = cah.upload_new_data(rt_input,sheetname,self.data)
        if remessage == True:
            self.initialize()
            self.display += '用户信息上传已完成!\n'
            self.update_display()
        else:
            QMessageBox.critical(self.ui, "错误", f'无法导入！\n确保excel文件已经关闭或调整输入！\n{remessage}')

if __name__ == "__main__":

    # 在QApplication之前先实例化
    uiLoader = QUiLoader() 

    app = QApplication([])
    stats = Client_atg()
    stats.ui.show()
    app.exec() # PySide6 是 exec 而不是 exec_
    # pyinstaller --onefile --windowed --icon=client_atg.ico client_atg.py
    # pyinstaller --onefile --windowed --icon=C:\Users\mark_hoshipu\Desktop\my_coding\yif_2024\client_atg程序打包\client_atg.ico C:\Users\mark_hoshipu\Desktop\my_coding\yif_2024\client_atg程序打包\client_atg.py




