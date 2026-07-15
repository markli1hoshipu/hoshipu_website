"use client";

import { useState, useRef, useCallback } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";

export interface IOUDetailItem {
  client: string;
  amount: number;
  flight: string;
  ticket_number: string;
  remark: string;
}

export interface IOUDetailPayment {
  payment_date: string;
  payer_name: string;
  amount: number;
  remark?: string;
}

export interface IOUDetailData {
  id: number;
  ious_id: string;
  ious_date: string;
  total_amount: number;
  rest: number;
  items: IOUDetailItem[];
  payments: IOUDetailPayment[];
}

/**
 * 按需拉取单张欠条明细（GET /ious/{id}），按数据库ID缓存 + 去重，避免重复请求。
 * 供"搜索结果 / 最近创建 / 最近付款"等处展开明细复用。
 */
export function useIOUDetailCache(getToken: () => string | null) {
  const [cache, setCache] = useState<Record<number, IOUDetailData>>({});
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const requested = useRef<Set<number>>(new Set());

  const ensureLoaded = useCallback(
    async (iouDbId: number) => {
      if (requested.current.has(iouDbId)) return;
      requested.current.add(iouDbId);
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/api/yif/ious/${iouDbId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setCache((prev) => ({ ...prev, [iouDbId]: data.iou }));
        } else {
          setErrors((prev) => new Set(prev).add(iouDbId));
        }
      } catch {
        setErrors((prev) => new Set(prev).add(iouDbId));
      }
    },
    [getToken]
  );

  const reset = useCallback(() => {
    requested.current = new Set();
    setCache({});
    setErrors(new Set());
  }, []);

  return { cache, errors, ensureLoaded, reset };
}

/** 展开区内容：欠条子明细 + 付款记录。传入缓存与错误集合，自身处理加载中/失败态。 */
export function IOUDetailPanel({
  iouDbId,
  cache,
  errors,
}: {
  iouDbId: number;
  cache: Record<number, IOUDetailData>;
  errors: Set<number>;
}) {
  const detail = cache[iouDbId];
  const hasError = errors.has(iouDbId);

  if (hasError) {
    return <p className="text-sm text-muted-foreground">无法加载明细（可能无权限查看该欠条）</p>;
  }
  if (!detail) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        加载明细中...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 欠条明细（子欠条） */}
      <div>
        <h4 className="font-medium mb-2 text-sm">
          欠条明细 · {detail.ious_id}
          <span className="ml-2 text-xs text-muted-foreground">
            总额 ¥{detail.total_amount.toLocaleString()} / 剩余 ¥{detail.rest.toLocaleString()}
          </span>
        </h4>
        <div className="space-y-1 text-sm">
          {detail.items.map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between">
                <span>{item.client} | {item.flight || "-"} | {item.ticket_number || "-"}</span>
                <span>¥{item.amount.toLocaleString()}</span>
              </div>
              {item.remark && <div className="text-muted-foreground text-xs pl-2">└ {item.remark}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* 付款记录 */}
      <div>
        <h4 className="font-medium mb-2 text-sm">付款记录 ({detail.payments?.length || 0})</h4>
        {!detail.payments || detail.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无付款</p>
        ) : (
          <div className="space-y-1 text-sm">
            {detail.payments.map((pay, idx) => (
              <div key={idx}>
                <div className="flex justify-between">
                  <span>{pay.payment_date} | {pay.payer_name}</span>
                  <span className="text-green-600">¥{pay.amount.toLocaleString()}</span>
                </div>
                {pay.remark && <div className="text-muted-foreground text-xs pl-2">└ {pay.remark}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
