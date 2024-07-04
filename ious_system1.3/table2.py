import sys
from PySide2.QtCore import *
from PySide2.QtGui import *
from PySide2.QtWidgets import *
from PySide2.QtCore import Qt


class CheckBoxDemo(QWidget):
    my_boxes = []
    def __init__(self, parent=None):
        super(CheckBoxDemo, self).__init__(parent)

        #创建一个GroupBox组
        groupBox = QGroupBox("Checkboxes")
        groupBox.setFlat(False)

        #创建复选框1，并默认选中，当状态改变时信号触发事件
        self.checkBox = QCheckBox("&Checkbox1")
        self.checkBox.setChecked(True)
        self.checkBox.stateChanged.connect(lambda: self.btnstate(self.checkBox))
        self.my_boxes.append(self.checkBox)

        #创建复选框，标记状态改变时信号触发事件
        self.checkBox = QCheckBox("Checkbox2")
        self.checkBox.toggled.connect(lambda: self.btnstate(self.checkBox))
        self.my_boxes.append(self.checkBox)

        #创建复选框3，设置为3状态，设置默认选中状态为半选状态，当状态改变时信号触发事件
        self.checkBox = QCheckBox("tristateBox")
        self.checkBox.setTristate(True)
        self.checkBox.setCheckState(Qt.PartiallyChecked)
        self.checkBox.stateChanged.connect(lambda: self.btnstate(self.checkBox))
        self.my_boxes.append(self.checkBox)

        #水平布局
        layout = QHBoxLayout()
        #控件添加到水平布局中
        layout.addWidget(self.my_boxes[0])
        layout.addWidget(self.my_boxes[1])
        layout.addWidget(self.my_boxes[2])

        #设置QGroupBox组的布局方式
        groupBox.setLayout(layout)

        #设置主界面布局垂直布局
        mainLayout = QVBoxLayout()
        #QgroupBox的控件添加到主界面布局中
        mainLayout.addWidget(groupBox)

        #设置主界面布局
        self.setLayout(mainLayout)
        #设置主界面标题
        self.setWindowTitle("checkbox demo")

    #输出三个复选框当前的状态，0选中，1半选，2没选中
    def btnstate(self, btn):
        re = ''
        for ck in self.my_boxes:
            re+= str(ck.isChecked())
        print(re)


if __name__ == '__main__':
    app = QApplication(sys.argv)
    checkboxDemo = CheckBoxDemo()
    checkboxDemo.show()
    sys.exit(app.exec_())
