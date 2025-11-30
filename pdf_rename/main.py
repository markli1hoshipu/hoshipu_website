import pdfplumber
import re
import os
import shutil
from template import render_filename_template, extract_placeholders, load_templates, save_templates, DEFAULT_TEMPLATES
from PySide6.QtWidgets import (
    QApplication, QMessageBox, QFileDialog, QMainWindow,
    QDialog, QListWidget, QPushButton, QComboBox, QLineEdit, QLabel,
    QVBoxLayout, QHBoxLayout, QGridLayout
)
from PySide6.QtUiTools import QUiLoader


def extract_info(text):
    name_match = re.search(r"旅客姓名.*?\n\s*([\S]+)", text)
    from_match = re.search(r"自[：:]\s*(\S+\s+\S+)", text)
    to_match = re.search(r"至[：:]\s*(\S+\s+\S+)", text)
    amount_match = re.search(r"合计.*?\n.*?(\d+\.\d{2})\s*$", text, re.MULTILINE)
    buyer_match = re.search(r"购买方名称：(\S+)", text)
    invoice_match = re.search(r"发票号码[：:]\s*(\d+)", text)
    issue_date_match = re.search(r"填开日期[：:]\s*([0-9]{4}[年/-][0-9]{1,2}[月/-][0-9]{1,2}[日]?)", text)

    name = name_match.group(1) if name_match else None
    origin = from_match.group(1) if from_match else None
    destination = to_match.group(1) if to_match else None
    amount = amount_match.group(1) if amount_match else None
    buyer = buyer_match.group(1) if buyer_match else None
    invoice_number = invoice_match.group(1) if invoice_match else None
    issue_date = issue_date_match.group(1) if issue_date_match else None

    return name, origin, destination, amount, buyer, invoice_number, issue_date


def safe_filename(s):
    return re.sub(r'[\\/:*?"<>|]', "_", s)


def get_unique_path(folder, base_name):
    base_name = safe_filename(base_name)
    full_path = os.path.join(folder, base_name)
    if not os.path.exists(full_path):
        return full_path

    name, ext = os.path.splitext(base_name)
    counter = 1
    while True:
        new_name = f"{name}_({counter}){ext}"
        new_path = os.path.join(folder, new_name)
        if not os.path.exists(new_path):
            return new_path
        counter += 1


class TemplateBuilderDialog(QDialog):
    def __init__(self, templates: dict, templates_path: str, parent=None):
        super().__init__(parent)
        self.setWindowTitle("模板制作")
        self.templates_path = templates_path
        self.templates = dict(templates)
        
        self.setStyleSheet("""
            QDialog {
                background: #ffffff;
                font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
                font-size: 15px;
            }
            
            QPushButton {
                background-color: #0ea5e9;
                color: #ffffff;
                border: none;
                border-radius: 8px;
                padding: 8px 20px;
                font-weight: 500;
                min-height: 16px;
            }
            QPushButton:hover {
                background-color: #0284c7;
            }
            QPushButton:pressed {
                background-color: #0369a1;
            }
            
            QLabel {
                color: #374151;
                font-weight: 500;
            }
            
            QComboBox {
                background: #ffffff;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                padding: 8px 12px;
                min-height: 20px;
            }
            
            QLineEdit {
                background: #ffffff;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                padding: 8px 12px;
                min-height: 20px;
            }
            
            QComboBox:hover, QLineEdit:hover {
                border: 1px solid #9ca3af;
            }
            
            QComboBox:focus, QLineEdit:focus {
                border: 1px solid #0ea5e9;
                outline: none;
            }
            
            QListWidget {
                background: #ffffff;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 4px;
            }
            
            QListWidget::item {
                padding: 6px;
                border-radius: 6px;
            }
            
            QListWidget::item:hover {
                background: #f3f4f6;
            }
            
            QListWidget::item:selected {
                background: #e5e7eb;
                color: #111827;
            }
        """)

        self.listTemplates = QListWidget()
        for name in self.templates.keys():
            self.listTemplates.addItem(name)
        self.listTemplates.itemClicked.connect(self._loadTemplate)

        # 右侧：拼装器
        self.fieldsCombo = QComboBox()
        # 显示友好中文，映射为占位符key
        self.display_to_key = {
            "买家": "buyer",
            "姓名": "name",
            "出发地": "origin",
            "目的地": "destination",
            "金额": "amount",
            "填开日期": "issue_date",
            "发票号": "invoice_number",
            "原文件名": "original_filename",
            "自定义文本": "__custom__",
        }
        for label in self.display_to_key.keys():
            self.fieldsCombo.addItem(label)

        self.customText = QLineEdit()
        self.customText.setPlaceholderText("输入自定义文本（选择“自定义文本”时可用）")
        self.customText.setEnabled(False)
        self.fieldsCombo.currentTextChanged.connect(self._onFieldChange)

        self.btnAddSegment = QPushButton("+")
        self.btnAddSegment.clicked.connect(self._addSegment)
        self.btnRemoveLast = QPushButton("删除最后")
        self.btnRemoveLast.clicked.connect(self._removeLast)
        self.btnClear = QPushButton("清空")
        self.btnClear.clicked.connect(self._clearSegments)

        self.listSegments = QListWidget()
        self.lblPreview = QLabel("预览：")
        self.templateName = QLineEdit()
        self.templateName.setPlaceholderText("模板名称（如：公司格式A）")
        self.btnSaveTemplate = QPushButton("保存模板")
        self.btnSaveTemplate.clicked.connect(self._saveTemplate)
        self.btnClose = QPushButton("关闭")
        self.btnClose.clicked.connect(self.close)

        self.btnNewTemplate = QPushButton("+")
        self.btnNewTemplate.clicked.connect(self._newTemplate)
        
        leftLayout = QVBoxLayout()
        leftTopLayout = QHBoxLayout()
        leftTopLayout.addWidget(QLabel("当前模板一览："))
        leftTopLayout.addStretch()
        leftTopLayout.addWidget(self.btnNewTemplate)
        leftLayout.addLayout(leftTopLayout)
        leftLayout.addWidget(self.listTemplates)

        assembleGrid = QGridLayout()
        assembleGrid.addWidget(QLabel("元素："), 0, 0)
        assembleGrid.addWidget(self.fieldsCombo, 0, 1)
        assembleGrid.addWidget(QLabel("文本："), 1, 0)
        assembleGrid.addWidget(self.customText, 1, 1)
        assembleGrid.addWidget(self.btnAddSegment, 0, 2)
        assembleGrid.addWidget(self.btnRemoveLast, 1, 2)
        assembleGrid.addWidget(self.btnClear, 2, 2)

        rightLayout = QVBoxLayout()
        rightLayout.addLayout(assembleGrid)
        rightLayout.addWidget(QLabel("片段列表："))
        rightLayout.addWidget(self.listSegments)
        rightLayout.addWidget(self.lblPreview)
        rightLayout.addWidget(QLabel("模板名称："))
        rightLayout.addWidget(self.templateName)
        rightLayout.addWidget(self.btnSaveTemplate)
        rightLayout.addWidget(self.btnClose)

        mainLayout = QHBoxLayout()
        mainLayout.addLayout(leftLayout, 1)
        mainLayout.addLayout(rightLayout, 2)
        self.setLayout(mainLayout)

        # 内部状态：segments 为字符串片段，如 ["{buyer}", "--", "{amount}"]
        self.segments = []
        self._refreshPreview()

    def _newTemplate(self):
        self.listTemplates.clearSelection()
        self.segments = []
        self.listSegments.clear()
        self.templateName.clear()
        self._refreshPreview()
    
    def _onFieldChange(self, _text: str):
        is_custom = self.display_to_key.get(self.fieldsCombo.currentText()) == "__custom__"
        self.customText.setEnabled(is_custom)

    def _addSegment(self):
        display = self.fieldsCombo.currentText()
        key = self.display_to_key.get(display)
        if key == "__custom__":
            text = self.customText.text()
            if not text:
                QMessageBox.warning(self, "提示", "请输入自定义文本")
                return
            self.segments.append(text)
            self.listSegments.addItem(f"自定义文本：{text}")
        else:
            placeholder = "{" + key + "}"
            self.segments.append(placeholder)
            # 在列表中显示中文名称而不是占位符
            self.listSegments.addItem(display)
        self._refreshPreview()

    def _removeLast(self):
        if self.segments:
            self.segments.pop()
            self.listSegments.takeItem(self.listSegments.count() - 1)
            self._refreshPreview()

    def _clearSegments(self):
        self.segments = []
        self.listSegments.clear()
        self._refreshPreview()

    def _refreshPreview(self):
        template_str = "".join(self.segments)
        self.lblPreview.setText(f"预览：{template_str}")

    def _loadTemplate(self, item):
        template_name = item.text()
        template_str = self.templates.get(template_name, "")
        if not template_str:
            return
        
        if template_str.lower().endswith('.pdf'):
            template_str = template_str[:-4]
        
        self.segments = []
        self.listSegments.clear()
        self.templateName.setText(template_name)
        
        i = 0
        while i < len(template_str):
            if template_str[i] == '{':
                end = template_str.find('}', i)
                if end != -1:
                    placeholder = template_str[i:end+1]
                    key = placeholder[1:-1]
                    for display, k in self.display_to_key.items():
                        if k == key:
                            self.segments.append(placeholder)
                            self.listSegments.addItem(display)
                            break
                    i = end + 1
                else:
                    self.segments.append(template_str[i])
                    self.listSegments.addItem(f"自定义文本：{template_str[i]}")
                    i += 1
            else:
                start = i
                while i < len(template_str) and template_str[i] != '{':
                    i += 1
                custom_text = template_str[start:i]
                if custom_text:
                    self.segments.append(custom_text)
                    self.listSegments.addItem(f"自定义文本：{custom_text}")
        
        self._refreshPreview()

    def _saveTemplate(self):
        name = self.templateName.text().strip()
        if not name:
            QMessageBox.warning(self, "提示", "请填写模板名称")
            return
        template_str = "".join(self.segments)
        if not template_str:
            QMessageBox.warning(self, "提示", "模板内容为空")
            return
        
        if not template_str.lower().endswith('.pdf'):
            template_str += '.pdf'
        
        self.templates[name] = template_str
        try:
            save_templates(self.templates_path, self.templates)
        except Exception as e:
            QMessageBox.critical(self, "错误", f"保存失败: {e}")
            return
        
        if not any(self.listTemplates.item(i).text() == name for i in range(self.listTemplates.count())):
            self.listTemplates.addItem(name)
        QMessageBox.information(self, "成功", f"已保存模板：{name}")

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.ui = uiLoader.load('main.ui')
        self.ui.setStyleSheet("""
            * {
                font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
                font-size: 15px;
            }

            QMainWindow, QWidget {
                background: #ffffff;
            }

            QPushButton {
                background-color: #0ea5e9;
                color: #ffffff;
                border: none;
                border-radius: 8px;
                padding: 8px 20px;
                font-weight: 500;
                min-height: 16px;
            }
            QPushButton:hover {
                background-color: #0284c7;
            }
            QPushButton:pressed {
                background-color: #0369a1;
            }

            QGroupBox {
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                margin-top: 12px;
                padding: 16px;
                background: #fafafa;
                font-weight: 600;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 12px;
                padding: 0 8px;
                color: #111827;
                background: #fafafa;
                font-size: 16px;
            }

            QLabel {
                color: #374151;
                font-weight: 500;
            }

            QComboBox {
                background: #ffffff;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                padding: 8px 12px;
                min-height: 20px;
            }
            
            QLineEdit {
                background: #ffffff;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                padding: 8px 12px;
                min-height: 20px;
            }
            
            QComboBox:hover, QLineEdit:hover {
                border: 1px solid #9ca3af;
            }
            
            QComboBox:focus, QLineEdit:focus {
                border: 1px solid #0ea5e9;
                outline: none;
            }

            QTextBrowser {
                background: #f9fafb;
                color: #1f2937;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                padding: 12px;
                font-family: "Consolas", "Monaco", monospace;
                font-size: 14px;
                line-height: 1.6;
            }
            
            QListWidget {
                background: #ffffff;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 4px;
            }
            
            QListWidget::item {
                padding: 6px;
                border-radius: 6px;
            }
            
            QListWidget::item:hover {
                background: #f3f4f6;
            }
            
            QListWidget::item:selected {
                background: #e5e7eb;
                color: #111827;
            }
        """)
        self.setWindowOpacity(1)

        self.ui.btnGenerate.clicked.connect(self.generate)
        self.ui.btnSelectFolder.clicked.connect(self.selectFolder)
        if hasattr(self.ui, 'btnDesignTemplates'):
            self.ui.btnDesignTemplates.clicked.connect(self.openTemplateDesigner)
        self.import_folder = None
        self.templates_path = os.path.join(os.getcwd(), "templates.yaml")
        self.templates = {}
        # “读取模板”按钮触发读取/创建 YAML 并刷新下拉
        if hasattr(self.ui, 'btnLoadTemplates'):
            self.ui.btnLoadTemplates.clicked.connect(self.loadTemplatesButton)
        # 启动时读取模板一次
        self.loadTemplatesButton()
        

    def log(self, text):
        self.ui.textLog.append(text)
        print(text)

    def selectFolder(self):
        folder = QFileDialog.getExistingDirectory(None, "选择PDF文件夹")
        if folder:
            self.import_folder = folder
            self.log(f"📁 已选择文件夹: {folder}")
        else:
            self.log("⚠️ 未选择文件夹")

    # Template management helpers
    def refreshTemplateCombo(self):
        try:
            self.ui.cmbTemplate.clear()
            for name in self.templates.keys():
                self.ui.cmbTemplate.addItem(name)
            # 如果没有任何模板，添加默认
            if self.ui.cmbTemplate.count() == 0:
                for name in DEFAULT_TEMPLATES.keys():
                    self.ui.cmbTemplate.addItem(name)
                self.templates = DEFAULT_TEMPLATES.copy()
        except Exception as e:
            self.log(f"⚠️ 刷新模板下拉失败: {e}")

    def loadTemplatesButton(self):
        # 点击按钮时读取 YAML；若不存在则创建默认 YAML 后再读取
        if not os.path.exists(self.templates_path):
            try:
                save_templates(self.templates_path, DEFAULT_TEMPLATES)
                self.log(f"✅ 已创建默认模板文件: {self.templates_path}")
            except Exception as e:
                self.log(f"⚠️ 创建默认模板文件失败: {e}")
        self.templates = load_templates(self.templates_path)
        self.refreshTemplateCombo()
        self.log("✅ 模板已读取并更新下拉选项")

    def openTemplateDesigner(self):
        # 确保有 YAML 文件
        if not os.path.exists(self.templates_path):
            try:
                save_templates(self.templates_path, DEFAULT_TEMPLATES)
                self.log(f"✅ 已创建默认模板文件: {self.templates_path}")
            except Exception as e:
                self.log(f"⚠️ 创建默认模板文件失败: {e}")
        # 读取现有模板，打开对话框
        self.templates = load_templates(self.templates_path)
        dlg = TemplateBuilderDialog(self.templates, self.templates_path, self)
        dlg.exec()
        # 重新加载（若对话框期间有变化）并刷新下拉
        self.templates = load_templates(self.templates_path)
        self.refreshTemplateCombo()

    def generate(self):
        if not self.import_folder:
            QMessageBox.warning(None, "警告", "请先选择一个导入文件夹")
            return

        import_folder = self.import_folder
        export_folder = os.path.join(import_folder, "exports")
        unsure_folder = os.path.join(export_folder, "unsure_folder")

        os.makedirs(export_folder, exist_ok=True)
        os.makedirs(unsure_folder, exist_ok=True)

        for file_name in os.listdir(import_folder):
            if file_name.lower().endswith(".pdf"):
                file_path = os.path.join(import_folder, file_name)
                try:
                    with pdfplumber.open(file_path) as pdf:
                        full_text = ""
                        for page in pdf.pages:
                            page_text = page.extract_text()
                            if page_text:
                                full_text += page_text + "\n"

                    name, origin, destination, amount, buyer, invoice_number, issue_date = extract_info(full_text)
                    self.log(f"🔍 提取信息: {file_name} -> {name}, {origin}, {destination}, {amount}, {buyer}, 发票号码: {invoice_number}, 填开日期: {issue_date}")

                    try:
                        selected_template_name = self.ui.cmbTemplate.currentText()
                    except Exception:
                        selected_template_name = "行程信息"

                    # 动态字段校验：根据模板决定必需字段
                    values = {
                        "name": name,
                        "origin": origin.replace(' ','') if origin else None,
                        "destination": destination.replace(' ','') if destination else None,
                        "amount": amount,
                        "buyer": buyer,
                        "invoice_number": invoice_number,
                        "issue_date": issue_date,
                        "original_filename": os.path.splitext(file_name)[0],
                    }

                    template_str = self.templates.get(selected_template_name, DEFAULT_TEMPLATES["行程信息"])
                    required_fields = list(extract_placeholders(template_str))

                    if any(values.get(field) in (None, "") for field in required_fields):
                        dest_path = get_unique_path(unsure_folder, file_name)
                        shutil.copy(file_path, dest_path)
                        self.log(f"⚠️ 信息不全（缺少: {', '.join([f for f in required_fields if not values.get(f)])}），已移动至 unsure_folder: {os.path.basename(dest_path)}")
                        continue

                    new_name = render_filename_template(template_str, values)
                    if not new_name.lower().endswith('.pdf'):
                        new_name += '.pdf'
                    dest_path = get_unique_path(export_folder, new_name)
                    shutil.copy(file_path, dest_path)
                    self.log(f"✅ 已保存: {os.path.basename(dest_path)}")

                except Exception as e:
                    self.log(f"❌ 处理出错: {file_name}, 错误: {type(e).__name__}: {e}")


if __name__ == "__main__":
    uiLoader = QUiLoader()
    app = QApplication([])

    stats = MainWindow()
    stats.ui.show()

    app.exec()

# pyinstaller --onefile --windowed --icon=main.ico main.py