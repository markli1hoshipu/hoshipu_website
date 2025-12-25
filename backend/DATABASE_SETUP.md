# Database Setup Guide

## 配置完成 ✅

数据库依赖已安装到虚拟环境中：
- ✅ psycopg2-binary (PostgreSQL driver)
- ✅ SQLAlchemy (ORM)
- ✅ Alembic (Database migrations)

## 环境配置文件

### 1. `.env` (本地开发环境)
用于本地开发。

**重要：** 你需要从 Render 复制完整的 **External Database URL** 并替换：

```bash
# 当前配置（需要替换为实际的External URL）
DATABASE_URL=postgresql://[USERNAME]:[PASSWORD]@[EXTERNAL-HOST]:5432/[DATABASE_NAME]
```

**如何获取 External URL：**
1. 登录 Render Dashboard
2. 进入你的 PostgreSQL 数据库
3. 找到 "Connections" 部分
4. 复制 **External Database URL**（完整的URL）
5. 替换 `.env` 文件中的 `DATABASE_URL`

### 2. `.env.production` (生产环境)
用于部署到 Render 或其他生产环境。

**同样需要替换 External URL**，或者如果部署在 Render 上，可以使用 Internal URL 以获得更好的性能。

## 数据库连接信息

从 Render Dashboard 获取以下信息：
- Database name
- Username
- Password
- Port (通常是 5432)

## 使用方式

### 本地开发
```bash
# 使用 .env 文件（默认）
cd backend
./venv/Scripts/python main.py
```

### 生产部署
在 Render 的环境变量中设置：
```
DATABASE_URL=<your-external-or-internal-database-url>
```

或者复制 `.env.production` 的内容到 Render 环境变量。

## 下一步

数据库依赖已安装，但**还没有创建任何表结构**。

当你准备好创建数据库表时，我们需要：
1. 设计数据库模型（评论、博客、用户等）
2. 创建 SQLAlchemy models
3. 使用 Alembic 创建迁移
4. 应用迁移创建表结构

## 测试数据库连接

创建一个简单的测试脚本来验证连接：

```python
# backend/test_db.py
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        print("✅ Database connection successful!")
except Exception as e:
    print(f"❌ Database connection failed: {e}")
```

运行测试：
```bash
cd backend
./venv/Scripts/python test_db.py
```

## 注意事项

- ⚠️ `.env` 和 `.env.production` 不应提交到 Git
- ✅ 已经在 `.gitignore` 中忽略
- 🔒 保护好数据库密码
- 🌐 开发阶段可以使用 External URL
- 🚀 生产环境（Render）建议使用 Internal URL
