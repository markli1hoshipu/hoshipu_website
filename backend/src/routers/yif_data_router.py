"""
YIF Data Analysis API Router
处理business_data.txt文件上传和数据分析
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import pickle
from typing import List, Dict, Any
from datetime import datetime

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
async def upload_business_data(file: UploadFile = File(...)):
    """
    上传并解析business_data.txt文件
    """
    try:
        # 读取文件内容
        content = await file.read()
        
        # 使用pickle反序列化
        data = pickle.loads(content)
        
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
async def get_summary():
    """
    获取数据摘要统计
    """
    if 'summary' not in _parsed_data:
        raise HTTPException(404, "No data uploaded yet")
    
    return {
        "success": True,
        "summary": _parsed_data['summary']
    }

@router.get("/businesses")
async def get_businesses(skip: int = 0, limit: int = 100, status: str = None):
    """
    获取业务列表
    """
    if 'businesses' not in _parsed_data:
        raise HTTPException(404, "No data uploaded yet")
    
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
async def get_statistics():
    """
    获取详细统计信息
    """
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
