"""
YIF Data Analysis API Router
处理business_data.txt文件上传和数据分析
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from psycopg2.extras import RealDictCursor
from routers.yif_router import verify_token
from database import get_db_connection
import pickle
from typing import List, Dict, Any
from datetime import datetime
import sys
import os


def verify_admin(user_id: int):
    """Verify user is an admin, raise HTTPException if not"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            SELECT role FROM yif_workers
            WHERE id = %s AND is_active = TRUE
        """, (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(401, "User not found")
        if user['role'] != 'admin':
            raise HTTPException(403, "Admin access required")
    finally:
        cursor.close()
        conn.close()

# 添加src目录到Python路径，以便导入business模块
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# 导入business模块，pickle需要这些类定义才能反序列化
try:
    import business
    # 确保business模块在sys.modules中，以便pickle能找到
    sys.modules['business'] = business
except ImportError:
    # 如果导入失败，创建占位类以避免pickle错误
    import types
    dummy_module = types.ModuleType('business')

    class DummyClass:
        pass

    dummy_module.ious = DummyClass
    dummy_module.payment = DummyClass
    dummy_module.business = DummyClass

    sys.modules['business'] = dummy_module
    business = dummy_module

router = APIRouter(prefix="/api/yif/data", tags=["yif-data"])

# 临时存储解析后的数据（生产环境应使用数据库）
_parsed_data: Dict[str, Any] = {}

class IOUSData:
    """欠条数据类"""
    def __init__(self, obj):
        self.id = getattr(obj, 'id', '')
        self.user = getattr(obj, 'user', '')
        self.date = getattr(obj, 'date', '')
        self.client = getattr(obj, 'client', '')
        self.lclient = getattr(obj, 'lclient', [])
        self.total_money = float(getattr(obj, 'total_money', 0))
        self.lmoney = getattr(obj, 'lmoney', [])
        self.lflight = getattr(obj, 'lflight', [])
        self.ltktnum = getattr(obj, 'ltktnum', [])
        self.rem = getattr(obj, 'rem', '')

class PaymentData:
    """付款数据类"""
    def __init__(self, obj):
        self.user = getattr(obj, 'user', '')
        self.date = getattr(obj, 'date', '')
        self.client = getattr(obj, 'client', '')
        self.amount = float(getattr(obj, 'amount', 0))
        self.ious_id = getattr(obj, 'ious_id', '')
        self.remark = getattr(obj, 'remark', '')

class BusinessData:
    """业务数据类"""
    def __init__(self, obj):
        self.ious = IOUSData(obj.ious) if hasattr(obj, 'ious') else None
        self.list_payment = [PaymentData(p) for p in getattr(obj, 'list_payment', [])]
        self.paid = float(getattr(obj, 'paid', 0))
        self.rest = float(getattr(obj, 'rest', 0))
        self.type = getattr(obj, 'type', '')

@router.post("/upload")
async def upload_business_data(file: UploadFile = File(...), user_id: int = Depends(verify_token)):
    """
    上传并解析business_data.txt文件 (Admin only)
    """
    # Verify admin role
    verify_admin(user_id)

    try:
        # 读取文件内容
        content = await file.read()

        # 文件诊断信息
        file_size = len(content)
        file_header = content[:20].hex() if len(content) >= 20 else content.hex()

        # SECURITY WARNING: Pickle deserialization is dangerous.
        # Only allow authenticated users and only accept .pkl files from trusted sources.
        # Consider migrating to a safer format like JSON in the future.
        #
        # Using RestrictedUnpickler to limit what classes can be unpickled
        import io

        class RestrictedUnpickler(pickle.Unpickler):
            """Restrict unpickler to only allow safe business classes"""
            ALLOWED_MODULES = {'business', '__main__', 'builtins', 'datetime'}
            ALLOWED_CLASSES = {
                ('business', 'ious'),
                ('business', 'payment'),
                ('business', 'business'),
                ('builtins', 'dict'),
                ('builtins', 'list'),
                ('builtins', 'str'),
                ('builtins', 'int'),
                ('builtins', 'float'),
                ('datetime', 'datetime'),
                ('datetime', 'date'),
            }

            def find_class(self, module, name):
                # Only allow specific modules and classes
                if module not in self.ALLOWED_MODULES:
                    raise pickle.UnpicklingError(f"Module not allowed: {module}")
                # For business module, allow any class (legacy data)
                if module == 'business':
                    return super().find_class(module, name)
                # For other modules, check specific classes
                if (module, name) not in self.ALLOWED_CLASSES:
                    raise pickle.UnpicklingError(f"Class not allowed: {module}.{name}")
                return super().find_class(module, name)

        # 使用受限pickle反序列化，尝试不同的方法
        data = None
        error_messages = []

        # 方法1: 使用RestrictedUnpickler加载
        for encoding in [None, 'latin1', 'bytes', 'ASCII', 'utf-8']:
            try:
                buffer = io.BytesIO(content)
                if encoding:
                    data = RestrictedUnpickler(buffer, encoding=encoding, fix_imports=True).load()
                else:
                    data = RestrictedUnpickler(buffer).load()
                break
            except Exception as e:
                error_messages.append(f"编码{encoding or '默认'}: {str(e)[:50]}")
                continue

        # 如果所有方法都失败
        if data is None:
            error_detail = f"文件无法解析。文件大小: {file_size} 字节。\n"
            error_detail += f"文件头: {file_header}\n"
            error_detail += "尝试的解析方法:\n" + "\n".join(error_messages)
            error_detail += "\n\n建议: 该pickle文件可能已损坏。请尝试:\n"
            error_detail += "1. 从备份恢复原始文件\n"
            error_detail += "2. 使用原始ious_system1.3系统重新导出数据\n"
            error_detail += f"3. 检查文件是否被意外修改（最后修改时间应匹配）"
            raise Exception(error_detail)
        
        # 解析数据结构
        parsed_businesses = []
        total_ious = 0
        total_amount = 0
        total_paid = 0
        total_rest = 0
        
        for date_key, business_list in data.items():
            for business_obj in business_list:
                try:
                    biz = BusinessData(business_obj)
                    
                    if biz.ious:
                        parsed_businesses.append({
                            'date': date_key,
                            'ious_id': biz.ious.id,
                            'user': biz.ious.user,
                            'client': biz.ious.client,
                            'total_money': biz.ious.total_money,
                            'paid': biz.paid,
                            'rest': biz.rest,
                            'status': biz.type,
                            'payments_count': len(biz.list_payment)
                        })
                        
                        total_ious += 1
                        total_amount += biz.ious.total_money
                        total_paid += biz.paid
                        total_rest += biz.rest
                except Exception as e:
                    print(f"Error parsing business object: {e}")
                    continue
        
        # 存储解析后的数据
        _parsed_data['businesses'] = parsed_businesses
        _parsed_data['summary'] = {
            'total_ious': total_ious,
            'total_amount': total_amount,
            'total_paid': total_paid,
            'total_rest': total_rest,
            'upload_time': datetime.now().isoformat()
        }
        _parsed_data['raw_data'] = data  # 保存原始数据用于详细查询
        
        return {
            "success": True,
            "message": f"Successfully parsed {total_ious} ious records",
            "summary": _parsed_data['summary']
        }
        
    except Exception as e:
        raise HTTPException(500, f"Failed to parse file: {str(e)}")

@router.get("/summary")
async def get_summary(user_id: int = Depends(verify_token)):
    """
    获取数据摘要统计 (Admin only)
    """
    verify_admin(user_id)

    if 'summary' not in _parsed_data:
        return {
            "success": True,
            "summary": None
        }

    return {
        "success": True,
        "summary": _parsed_data['summary']
    }

@router.get("/businesses")
async def get_businesses(skip: int = 0, limit: int = 100, status: str = None, user_id: int = Depends(verify_token)):
    """
    获取业务列表 (Admin only)
    """
    verify_admin(user_id)

    if 'businesses' not in _parsed_data:
        return {
            "success": True,
            "total": 0,
            "skip": skip,
            "limit": limit,
            "businesses": []
        }

    businesses = _parsed_data['businesses']

    # 过滤状态
    if status:
        businesses = [b for b in businesses if b['status'] == status]

    # 分页
    total = len(businesses)
    businesses = businesses[skip:skip + limit]

    return {
        "success": True,
        "total": total,
        "skip": skip,
        "limit": limit,
        "businesses": businesses
    }

@router.get("/stats")
async def get_statistics(user_id: int = Depends(verify_token)):
    """
    获取详细统计信息 (Admin only)
    """
    verify_admin(user_id)

    if 'businesses' not in _parsed_data:
        raise HTTPException(404, "No data uploaded yet")
    
    businesses = _parsed_data['businesses']
    
    # 按状态分组统计
    status_stats = {}
    for biz in businesses:
        status = biz['status']
        if status not in status_stats:
            status_stats[status] = {'count': 0, 'amount': 0, 'paid': 0, 'rest': 0}
        status_stats[status]['count'] += 1
        status_stats[status]['amount'] += biz['total_money']
        status_stats[status]['paid'] += biz['paid']
        status_stats[status]['rest'] += biz['rest']
    
    # 按客户统计
    client_stats = {}
    for biz in businesses:
        client = biz['client']
        if client not in client_stats:
            client_stats[client] = {'count': 0, 'amount': 0, 'paid': 0, 'rest': 0}
        client_stats[client]['count'] += 1
        client_stats[client]['amount'] += biz['total_money']
        client_stats[client]['paid'] += biz['paid']
        client_stats[client]['rest'] += biz['rest']
    
    return {
        "success": True,
        "status_stats": status_stats,
        "client_stats": dict(sorted(client_stats.items(), key=lambda x: x[1]['amount'], reverse=True)[:20])  # 前20客户
    }

@router.get("/payments/{ious_id}")
async def get_payment_details(ious_id: str, user_id: int = Depends(verify_token)):
    """
    获取特定欠条的付款明细 (Admin only)
    """
    verify_admin(user_id)

    if 'raw_data' not in _parsed_data:
        raise HTTPException(404, "No data uploaded yet")

    raw_data = _parsed_data['raw_data']

    # 遍历所有日期的业务数据，查找匹配的欠条ID
    for date_key, business_list in raw_data.items():
        for business_obj in business_list:
            try:
                biz = BusinessData(business_obj)
                if biz.ious and biz.ious.id == ious_id:
                    # 提取付款明细
                    payments = []
                    for payment in biz.list_payment:
                        payments.append({
                            'date': payment.date,
                            'client': payment.client,
                            'amount': payment.amount,
                            'remark': payment.remark
                        })

                    return {
                        "success": True,
                        "ious_id": ious_id,
                        "payments": payments,
                        "total_payments": len(payments),
                        "total_paid": biz.paid
                    }
            except Exception as e:
                continue

    raise HTTPException(404, f"No payment details found for IOU ID: {ious_id}")
