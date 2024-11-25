from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
from PySide6.QtWidgets import QApplication, QMessageBox,QPushButton
from PySide6.QtUiTools import QUiLoader


uiLoader = QUiLoader()

def read_account_info(file_path = "account.txt"):
    try:
        with open(file_path, 'r') as file:
            # 读取第一行作为账号
            account = file.readline().strip()
            # 读取第二行作为密码
            pwd = file.readline().strip()
            return account, pwd
    except FileNotFoundError:
        print(f"文件 {file_path} 未找到。")
        return None, None
    except Exception as e:
        print(f"读取文件时发生错误: {e}")
        return None, None


# gokeys = ['GO2407173103841','GO2407173436592']
def get_passenger_infos_from_golist(gokeys):
    
    re = [];info = {}
    for gokey in gokeys:
        if gokey not in re:
            info[gokey] = []
            re.append(gokey)
    
    account, password = read_account_info()
    

    wd = webdriver.Chrome(service=Service(r'd:\tools\chromedriver.exe'))
    wd.implicitly_wait(15)

    wd.get('https://b2b.csair.com/B2B/index')   # 打开登录界面


    # 这里添加实际的登录操作
    wd.find_element(By.ID, 'user-login-username').send_keys(account)
    wd.find_element(By.ID, 'user-login-password').send_keys(password)
    wd.find_element(By.ID, 'btn-login').click()
    # time.sleep(5)


    parent_element = wd.find_element(By.ID, 'order')
    parent_element.click()
    child_elements = parent_element.find_elements(By.TAG_NAME, 'li')
    first_child_element = child_elements[0]
    first_child_element.click()
    

    for gokey in re:
        wd.find_element(By.ID, 'id-orderNo').clear()
        wd.find_element(By.ID, 'id-orderNo').send_keys(gokey)
        wd.find_element(By.ID, 'id-search').click()
        time.sleep(3)
        wd.find_element(By.ID, 'id-orderList').find_element(By.NAME, 'orderNo').click()
        time.sleep(3)

    window_handles = wd.window_handles
    for i in range(1,len(window_handles)):
        # time.sleep(1)
        wd.switch_to.window(window_handles[i])
        # time.sleep(1)

        contact = wd.find_element(By.ID, 'contact').text
        print(contact)

        go = wd.find_element(By.ID, 'orderNo').text
        print(go)

        passenger_tbody = wd.find_element(By.ID, 'passengerList')
        rows = passenger_tbody.find_elements(By.TAG_NAME, 'tr')
        
        for row in rows:
            cells = row.find_elements(By.TAG_NAME, 'td')
            if cells:
                name = cells[0].text
                print(f"Name: {name}")
                info[go].append([name,contact])
        
        # time.sleep(2)
    print(re,info)
    return re,info




class Http:
    def __init__(self):

        # 加载界面
        self.ui = uiLoader.load('cz_pread.ui')

        # 处理其他内容
        self.ui.btn_generate.clicked.connect(self.generate)
        self.update()

    def update(self):
        self.ui.text_nameout.setPlaceholderText('出行人名单出现在这里')
        self.ui.text_contactout.setPlaceholderText('出票人名单出现在这里')
        self.ui.text_detail.setPlaceholderText('详细信息出现在这里')

    def generate(self):
        self.update()
        gokeys = self.ui.text_golistin.toPlainText().splitlines()  # 修改为 toPlainText()
        re,info = get_passenger_infos_from_golist(gokeys)
        for go in re:
            self.ui.text_detail.setPlainText(self.ui.text_detail.toPlainText() + go + ':\n')  # 修改为 setPlainText()
            for pair in info[go]:
                self.ui.text_nameout.setPlainText(self.ui.text_nameout.toPlainText() + pair[0] + '\n')  # 修改为 setPlainText()
                self.ui.text_contactout.setPlainText(self.ui.text_contactout.toPlainText() + pair[1] + '\n')  # 修改为 setPlainText()
                self.ui.text_detail.setPlainText(self.ui.text_detail.toPlainText() + pair[0] + ' ' + pair[1] + '\n')  # 确保使用正确的属性 text_detail 而不是 t_detail

app = QApplication([])
stats = Http()
stats.ui.show()
app.exec() # PySide6 是 exec 而不是 exec_

        
