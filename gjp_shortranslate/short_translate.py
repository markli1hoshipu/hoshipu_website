from PySide6.QtWidgets import QApplication, QMessageBox,QPushButton
from PySide6.QtUiTools import QUiLoader


uiLoader = QUiLoader()

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

def tr_line(line,book):
    re = ''
    i = 0
    n = len(line)
    while i < n:
        if i+2 < n and line[i:i+3] in book:
            re += book[line[i:i+3]]
            if i+3 != n and line[i+3] != '-':
                re += '-'
            i += 3
        else:
            re += line[i]
            i += 1
    return re

class Http:
    def __init__(self):

        # 加载界面
        self.ui = uiLoader.load('airport_short.ui')

        # 处理其他内容
        self.ui.btn_generate.clicked.connect(self.generate)
        self.update()

    def update(self):
        self.ui.text_out.setPlaceholderText('翻译结果在这里')
        self.ui.text_in.setPlaceholderText('输入在这里')

    def generate(self):
        self.update()
        user_input = self.ui.text_in.toPlainText()
        output = ''
        for line in user_input.splitlines():
            output += tr_line(line,get_airport('airports.txt'))
            output += '\n'
        self.ui.text_out.setPlainText(output)
    
app = QApplication([])
stats = Http()
stats.ui.show()
app.exec() # PySide6 是 exec 而不是 exec_

#pyinstaller --noconsole --onefile --icon=translate.ico short_translate.py

        

    
