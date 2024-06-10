from PySide6.QtWidgets import QApplication, QMainWindow, QPushButton, QPlainTextEdit, QFileDialog, QScrollArea, QWidget, QVBoxLayout
import xlrd
import Atable_func as afunc
class ious_main():

    filename_list = []
    sheetname_list = []

    def __init__(self):
        self.window = QMainWindow()
        self.window.resize(1400, 700)
        self.window.move(200, 15)
        self.window.setWindowTitle('报表合并程序 *hsp')

        self.fileselect = QPushButton('选择Excel文件 ', self.window)
        self.fileselect.move(20,35)
        self.fileselect.resize(200, 65)
        self.fileselect.clicked.connect(self.selectfile)
        
        self.sheetname = QPlainTextEdit(self.window)
        self.sheetname.move(230, 35)
        self.sheetname.resize(150, 65)
        self.sheetname.setPlaceholderText("Sheet名:")

        self.fileupload = QPushButton('加入Excel文件 ', self.window)
        self.fileupload.move(390,35)
        self.fileupload.resize(200, 65)
        self.fileupload.clicked.connect(self.uploadfile)

        self.filepath = QPlainTextEdit(self.window)
        self.filepath.move(20, 110)
        self.filepath.resize(570, 45)
        self.filepath.setPlaceholderText("文件路径：（自动生成）")
        self.filepath.setReadOnly(True)

        self.filedest = QPlainTextEdit(self.window)
        self.filedest.move(20, 165)
        self.filedest.resize(570, 45)
        self.filedest.setPlaceholderText("目标文件名（不含后缀）")

        self.combinefiles = QPushButton('合并Excel文件 ', self.window)
        self.combinefiles.move(20, 220)
        self.combinefiles.resize(570, 45)
        self.combinefiles.clicked.connect(self.combinefile)

        self.scroll_area = QScrollArea(self.window)
        self.scroll_area.move(695, 20)
        self.scroll_area.resize(680, 600)
        self.scroll_area.setWidgetResizable(True)

        self.inner_widget = QWidget()
        self.inner_layout = QVBoxLayout()
        self.scroll_area.setWidget(self.inner_widget)
        self.inner_widget.setLayout(self.inner_layout)

        self.showious = QPlainTextEdit()
        self.showious.setReadOnly(True)
        self.showious.setPlaceholderText("需要导入的excel文件出现在这里")
        self.inner_layout.addWidget(self.showious)

    def selectfile(self):
        file_name, _ = QFileDialog.getOpenFileName(self.window, '选择文件', '', 'excel文件(*.xls *.xlsx)')
        self.filepath.setPlainText(file_name)

    def uploadfile(self):

        file_name = self.filepath.toPlainText().strip()
        sheet_name = self.sheetname.toPlainText().strip()
        self.filename_list.append(file_name)
        if file_name == '':
            return 
        if sheet_name == '':
            sheet_name = 'marklihoshipu'
        self.sheetname_list.append(sheet_name)
        old_text = self.showious.toPlainText()
        self.showious.setPlainText(old_text+f'{file_name} ; {sheet_name}\n')
        return 

    def combinefile(self):
        dest = self.filedest.toPlainText().strip()
        if dest == '':
            dest = '合并表格'
        if min(len(self.filename_list),len(self.sheetname_list) == 0):
            self.showious.setPlainText('请选择至少一个文件！\n')
            return 
        list_business = afunc.write_table_from_filenames(dest,filenames=self.filename_list,sheetnames=self.sheetname_list)
        # 导出类型: 仅人(0), 人--月份(1), 仅月份(2), 人--客户(3), 仅客户(4), 人--业务(5), 仅业务(6)

        afunc.write_table0(dest, '仅人', list_business)
        afunc.write_table1(dest, '人--月份', list_business)
        afunc.write_table2(dest, '仅月份', list_business)
        afunc.write_table3(dest, '人--客户', list_business)
        afunc.write_table4(dest, '仅客户', list_business)
        afunc.write_table5(dest, '人--业务', list_business)
        afunc.write_table6(dest, '仅业务', list_business)
        afunc.write_table7(dest, '月--业务', list_business)

        translate = afunc.get_translate()
        dest = dest + 'zh'
        list_business = afunc.write_table_from_filenames_zh(dest,filenames=self.filename_list,sheetnames=self.sheetname_list,translate=translate)
        # 导出类型: 仅人(0), 人--月份(1), 仅月份(2), 人--客户(3), 仅客户(4), 人--业务(5), 仅业务(6)
        afunc.write_table0(dest, '仅人', list_business)
        afunc.write_table1(dest, '人--月份', list_business)
        afunc.write_table2(dest, '仅月份', list_business)
        afunc.write_table3(dest, '人--客户', list_business)
        afunc.write_table4(dest, '仅客户', list_business)
        afunc.write_table5(dest, '人--业务', list_business)
        afunc.write_table6(dest, '仅业务', list_business)
        afunc.write_table7(dest, '月--业务', list_business)

        self.filename_list = []
        self.sheetname_list = []
        self.showious.setPlainText('导入完毕')
        return 
    

if __name__ == "__main__":
    app = QApplication([])
    ious = ious_main()
    ious.window.show()
    app.exec_()
    "pyinstaller -F -w -i atable.ico Atable_combine_page.py"