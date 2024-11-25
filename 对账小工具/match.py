import sys
import csv
import pandas as pd
from PySide6.QtWidgets import QApplication, QMainWindow, QPushButton, QVBoxLayout, QWidget, QFileDialog, QLineEdit, QLabel, QMessageBox

def read_and_accumulate_excel(filename, sheetct):
    # 加载 Excel 文件
    xls = pd.ExcelFile(filename)
    
    # 确保 sheetct 在有效范围内
    if sheetct < 0 or sheetct >= len(xls.sheet_names):
        raise IndexError("sheetct out of range. Please provide a valid sheet index.")
    
    # 读取指定的工作表
    df = pd.read_excel(xls, sheet_name=xls.sheet_names[sheetct], usecols=[0, 1])
    
    result = {}

    # 遍历数据帧的每一行
    for _, row in df.iterrows():
        key = row.iloc[0].replace(' ','')  # 使用 iloc 按位置获取元素
        value = row.iloc[1]  # 使用 iloc 按位置获取元素
        
        # 跳过空值
        if pd.isna(key) or pd.isna(value):
            continue

        # 检查 value 是否为数值类型
        if not isinstance(value, (int, float)):
            continue

        # 累加数值
        if key in result:
            result[key] += value
        else:
            result[key] = value

    return result

def compare_dicts(dict1, dict2):
    all_keys = sorted(set(dict1.keys()).union(set(dict2.keys())))
    result = []

    for key in all_keys:
        value1 = dict1.get(key, "N/A")
        value2 = dict2.get(key, "N/A")
        if value1 == value2:
            result.append([key, value1, value2, ""])
        else:
            result.append([key, value1, value2, "备注"])
    
    return result

def write_to_csv(data, filename, encoding='utf-8'):
    header = ["Name", "QFF Value", "PXB Value", "Remark"]
    with open(filename, 'w', newline='', encoding=encoding) as file:
        writer = csv.writer(file)
        writer.writerow(header)
        writer.writerows(data)

def csv_to_excel(csv_filename, excel_filename):
    df = pd.read_csv(csv_filename)
    df.to_excel(excel_filename, index=False)

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Excel Compare and Accumulate")
        self.setGeometry(300, 300, 400, 200)

        # 创建 GUI 元素
        self.layout = QVBoxLayout()

        self.label = QLabel("选择一个 Excel 文件进行比较两个sheet：")
        self.layout.addWidget(self.label)

        self.select_file1_button = QPushButton("选择 Excel 文件")
        self.select_file1_button.clicked.connect(self.select_file1)
        self.layout.addWidget(self.select_file1_button)

        self.output_name_input = QLineEdit(self)
        self.output_name_input.setPlaceholderText("输入输出 Excel 文件名（不含扩展名）")
        self.layout.addWidget(self.output_name_input)

        self.process_button = QPushButton("处理并导出")
        self.process_button.clicked.connect(self.process_files)
        self.layout.addWidget(self.process_button)

        self.status_label = QLabel("")
        self.layout.addWidget(self.status_label)

        container = QWidget()
        container.setLayout(self.layout)
        self.setCentralWidget(container)

        # 初始化文件路径变量
        self.file1 = ""
        self.file2 = ""

    def select_file1(self):
        self.file1, _ = QFileDialog.getOpenFileName(self, "选择 Excel 文件", "", "Excel Files (*.xlsx)")
        print(self.file1)
        if self.file1:
            self.status_label.setText(f"已选择 QFF 文件: {self.file1.split('/')[-1]}")


    def process_files(self):
        output_filename = self.output_name_input.text()

        if not self.file1:
            QMessageBox.warning(self, "错误", "请选择 Excel 文件。")
            return

        if not output_filename:
            QMessageBox.warning(self, "错误", "请输入输出文件名。")
            return

        # 读取并处理文件
        try:
            qff_dict = read_and_accumulate_excel(self.file1,0)
            pxb_dict = read_and_accumulate_excel(self.file1,1)

            comparison_result = compare_dicts(qff_dict, pxb_dict)
            csv_filename = f'{output_filename}.csv'
            excel_filename = f'{output_filename}.xlsx'
            
            write_to_csv(comparison_result, csv_filename)
            csv_to_excel(csv_filename, excel_filename)

            self.status_label.setText(f"处理完成，输出文件为: {excel_filename}")
        except Exception as e:
            QMessageBox.critical(self, "处理错误", f"发生错误: {str(e)}")

if __name__ == "__main__":
    app = QApplication(sys.argv)

    window = MainWindow()
    window.show()

    sys.exit(app.exec())
