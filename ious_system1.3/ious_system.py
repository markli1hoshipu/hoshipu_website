import sys
from PySide2.QtWidgets import QApplication, QMainWindow,  QTabWidget, QPushButton, QPlainTextEdit,  QScrollArea, QWidget, QVBoxLayout,QTableWidget, QCheckBox, QTableWidgetItem
from ious_page import ious_main
from ious_search_page import ious_search
from payment_page import payment_main
from pay_search_page import pay_search
from paymult_page import payment_mult
from betterpay_page import better_pay
#pyinstaller -F -w -i yif_ious.ico ious_system.py
class YIFIOUApp(QMainWindow):
    def __init__(self):
        super().__init__()

        self.setWindowTitle('宇航客运欠条管理系统 --made by Zhiyuan Li *hoshipu')
        self.resize(1600,1000)

        self.tab_widget = QTabWidget()

        self.ious_in = QWidget()
        self.ious_sea = QWidget()
        self.pay_in = QWidget()
        self.pay_sea = QWidget()
        self.pay_mult = QWidget()
        self.pay_better = QWidget()

        self.tab_widget.addTab(self.ious_in, "欠条录入")
        self.tab_widget.addTab(self.pay_in, "付款录入")
        self.tab_widget.addTab(self.ious_sea, "欠条查询与导出")
        self.tab_widget.addTab(self.pay_sea, "付款查询与导出")
        self.tab_widget.addTab(self.pay_mult, "多笔付款录入")
        self.tab_widget.addTab(self.pay_better, "自选付款录入")

        self.layout = QVBoxLayout()
        self.layout.addWidget(self.tab_widget)

        self.central_widget = QWidget()
        self.central_widget.setLayout(self.layout)
        self.setCentralWidget(self.central_widget)

        self.setup_ious_in_tab()
        self.setup_pay_in_tab()
        self.setup_ious_sea_tab()
        self.setup_pay_sea_tab()
        self.setup_pay_mult_tab()
        self.setup_pay_better_tab()


    def setup_ious_in_tab(self):
        self.ious_in.layout = QVBoxLayout()
        self.ious_in_app = ious_main()
        self.ious_in_app.window.setParent(self.ious_in)
        self.ious_in.layout.addWidget(self.ious_in_app.window)
        self.ious_in.setLayout(self.ious_in.layout)

    def setup_pay_in_tab(self):
        self.pay_in.layout = QVBoxLayout()
        self.pay_in_app = payment_main()
        self.pay_in_app.window.setParent(self.pay_in)
        self.pay_in.layout.addWidget(self.pay_in_app.window)
        self.pay_in.setLayout(self.pay_in.layout)
    
    def setup_ious_sea_tab(self):
        self.ious_sea.layout = QVBoxLayout()
        self.ious_sea_app = ious_search()
        self.ious_sea_app.window.setParent(self.ious_sea)
        self.ious_sea.layout.addWidget(self.ious_sea_app.window)
        self.ious_sea.setLayout(self.ious_sea.layout)
    
    def setup_pay_sea_tab(self):
        self.pay_sea.layout = QVBoxLayout()
        self.pay_sea_app = pay_search()
        self.pay_sea_app.window.setParent(self.pay_sea)
        self.pay_sea.layout.addWidget(self.pay_sea_app.window)
        self.pay_sea.setLayout(self.pay_sea.layout)

    def setup_pay_mult_tab(self):
        self.pay_mult.layout = QVBoxLayout()
        self.pay_mult_app = payment_mult()
        self.pay_mult_app.window.setParent(self.pay_mult)
        self.pay_mult.layout.addWidget(self.pay_mult_app.window)
        self.pay_mult.setLayout(self.pay_mult.layout)

    def setup_pay_better_tab(self):
        self.pay_better.layout = QVBoxLayout()
        self.pay_better_app = better_pay()
        self.pay_better_app.window.setParent(self.pay_better)
        self.pay_better.layout.addWidget(self.pay_better_app.window)
        self.pay_better.setLayout(self.pay_better.layout)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = YIFIOUApp()
    window.show()
    sys.exit(app.exec_())
