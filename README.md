# Applications for Yif

This repository contains many Python applications built with PySide2/6, and serves as tools for Yif international to improve the working efficiency. The following applications are still in use:

1. **CZ Passenger Info Reader** - A tool to extract passenger information from Southern Airlines B2B orders
2. **Airport Code Translator** - A utility for translating airport codes to full names

## CZ Passenger Info Reader

### Overview

This application automates the retrieval of passenger information from China Southern Airlines' B2B platform. It logs into the B2B system, searches for order numbers, and extracts passenger details and contact information.

### Features

- Extract passenger names and contact details using order numbers (GO keys)
- Display extracted information in organized sections
- Support for processing multiple orders simultaneously
- Clean user interface with separate areas for input and output data

### Requirements

- Python 3.x
- PySide6
- Selenium
- Chrome WebDriver

### Usage

1. Ensure you have your account credentials stored in `account.txt` (first line: account ID, second line: password)
2. Run the application: `python cz_pread.py`
3. Enter your GO order numbers in the input field (one per line)
4. Click "生成" (Generate) to process the orders
5. View the extracted passenger names, contact information, and detailed data in the respective output sections

## Airport Code Translator

### Overview

A simple utility that translates airport codes to their full names based on a reference file.

### Features

- Quick translation of airport codes to full names
- Support for processing multiple codes at once
- Clean user interface

### Requirements

- Python 3.x
- PySide6

### Usage

1. Ensure you have an `airports.txt` file with airport code mappings
2. Run the application: `python short_translate.py`
3. Enter airport codes in the input field
4. Click "生成" (Generate) to translate the codes
5. View the translated results in the output field

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cz-tools.git
cd cz-tools

# Install dependencies
pip install PySide6 selenium

# Run the applications
python cz_pread.py
# or
python short_translate.py
```

## Build Standalone Applications

You can build standalone executables using PyInstaller:

```bash
# For Airport Code Translator
pyinstaller --noconsole --onefile --icon=translate.ico short_translate.py

# For CZ Passenger Info Reader
pyinstaller --noconsole --onefile cz_pread.py
```

## Note on Security

The CZ Passenger Info Reader requires B2B platform credentials. Never share your `account.txt` file or include it in version control. Add it to your `.gitignore` file.

## License

[MIT License](LICENSE)











-----------------


● 好的！给你完整的PKL数据格式总结：

  � 完整Pickle数据格式

  ---
  文件1: business_data.txt (715KB)

  顶层结构：
  类型: dict (字典)

  结构:
  {
      "230811": [business对象1, business对象2, ...],
      "230812": [business对象3, business对象4, ...],
      ...
  }

  实际数据:
  - 日期数: 136个
  - 业务记录总数: 2,631条
  - 日期范围: 230811 到 231224 (2023年8月至12月)

  ---
  数据对象层次结构

  第1层: business对象

  business {
      ious: ious对象                    # 欠条信息
      list_payment: [payment对象列表]    # 付款记录（可能为空列表[]）
      paid: float                       # 已付总额（计算字段）
      rest: float                       # 剩余金额（计算字段）
      type: str                         # 状态（计算字段）
  }

  status字段可能的值及分布：
  - "已付清" - 1,475条 (56%)
  - "未付款" - 1,082条 (41%)
  - "未付清" - 67条 (3%)
  - "初始欠条为负" - 6条
  - "已超额支付" - 1条

  ---
  第2层: ious对象（欠条信息）

  ious {
      # 主键信息
      id: str                    # 欠条ID，例如 "QFF230811D01"

      # 基本信息
      user: str                  # 负责人，例如 "QFF"
      date: str                  # 日期 YYMMDD，例如 "230811"

      # 明细列表（数组，长度相同）
      lclient: [str]             # 客户名称列表
      lmoney: [float]            # 金额列表
      lflight: [str]             # 航段列表
      ltktnum: [str]             # 票号列表
      remark: [str]              # 备注列表

      # 汇总字段（方便查询）
      total_money: float         # 总金额 = sum(lmoney)
      client: str                # 第一个客户 = lclient[0]
      rem: str                   # 第一条备注 = remark[0] (可能为空字符串)
  }

  ID格式规则：
  格式: 用户代码(3字母) + 日期(6位YYMMDD) + 类型(1字母) + 编号(2位数字)
  示例: QFF230811D01
        ^^^---------- 用户代码 (QFF, MAR, LZY等)
           ^^^^^^--- 日期
                 ^-- 类型代码
                  ^^ 当日该类型的序号 (01-99)

  类型代码及分布：
  - D = BSP国内 (1,098条, 42%)
  - I = BSP国际 (576条, 22%)
  - C = CZ南航 (562条, 21%)
  - W = 外航 (237条, 9%)
  - M = MU东航 (92条, 4%)
  - H = 手写/手动 (66条, 2%)

  ---
  第3层: payment对象（付款记录）

  payment {
      user: str                  # 经手人
      date: str                  # 付款日期 YYMMDD
      client: str                # 付款人名称
      amount: float              # 付款金额
      ious_id: str               # 对应的欠条ID
      remark: str                # 备注
  }

  ---
  文件2: import_id.txt (39KB)

  类型: list (列表)

  结构:
  [
      "QFF230811D01",
      "QFF230811D02",
      ...
  ]

  实际数据:
  - ID总数: 2,631个
  - 用途: 防止重复录入（在插入新欠条前检查）
  - 注意: 数量 = business_data.txt中的记录数

  ---
  文件3: history.txt (530KB, 纯文本)

  格式: 每行一条记录
  时间戳 操作描述

  示例:
  2023-08-11 14:23:45 导入了5条欠条记录
  2023-08-11 15:30:12 付款录入：QFF230811D01 收到1500元

  ---
  � 真实数据示例

  示例1: 单明细欠条（最常见）

  business {
      ious: {
          id: "QFF230811D01",
          user: "QFF",
          date: "230811",
          lclient: ["张三"],
          lmoney: [1800.0],
          lflight: ["DLCTSN"],
          ltktnum: ["731-9117416085-87"],
          remark: [""],
          total_money: 1800.0,
          client: "张三",
          rem: ""
      },
      list_payment: [
          {
              user: "QFF",
              date: "231025",
              client: "张三",
              amount: 1800.0,
              ious_id: "QFF230811D01",
              remark: "还清3600"
          }
      ],
      paid: 1800.0,
      rest: 0.0,
      type: "已付清"
  }

  示例2: 多明细欠条

  business {
      ious: {
          id: "QFF230811D07",
          user: "QFF",
          date: "230811",
          lclient: ["大连海运公司", "大连海运公司"],
          lmoney: [2500.0, 1900.0],
          lflight: ["PVGDLC", "SHADLC"],
          ltktnum: ["781-9117416139-40", "781-9117416113"],
          remark: ["", ""],
          total_money: 4400.0,
          client: "大连海运公司",
          rem: ""
      },
      list_payment: [
          {
              user: "QFF",
              date: "230920",
              client: "大连海运公司",
              amount: 4400.0,
              ious_id: "QFF230811D07",
              remark: ""
          }
      ],
      paid: 4400.0,
      rest: 0.0,
      type: "已付清"
  }

  示例3: 多次付款

  business {
      ious: {
          id: "QFF230811C04",
          user: "QFF",
          date: "230811",
          total_money: -1000.0,
          ...
      },
      list_payment: [
          {date: "230800", client: "王晓云", amount: -1000.0, ...},
          {date: "230800", client: "王晓云", amount: 0.0, ...},
          {date: "230800", client: "王晓云", amount: 0.0, ...},
          {date: "230800", client: "王晓云", amount: 0.0, ...}
      ],
      paid: -1000.0,
      rest: 0.0,
      type: "已付清"
  }


  ---
  � 关键约束和规则

  1. 唯一性约束：
    - ious.id 必须唯一（通过import_id.txt检查）
    - ID格式严格：12字符，符合规则
  2. 列表长度一致性：
    - lclient, lmoney, lflight, ltktnum, remark 长度必须相同
    - 代表同一欠条的多个条目
  3. 计算字段：
    - total_money = sum(lmoney)
    - paid = sum(所有payment.amount)
    - rest = total_money - paid
    - type 根据rest和paid自动判断
  4. 外键关系：
    - payment.ious_id 必须存在于某个 ious.id
    - business_data 的key（日期）必须等于 ious.date

  ---
  这就是完整的数据格式！你现在可以基于这个设计PostgreSQL表结构了。需要我提供任何补充信息吗？
