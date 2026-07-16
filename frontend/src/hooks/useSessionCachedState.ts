"use client";

import { Dispatch, SetStateAction, useCallback, useState } from "react";

/**
 * sessionStorage 支持的 useState：在标签页内保留状态（切换侧边栏页面、刷新 F5 都不丢），
 * 关闭标签页后清空。用于 YIF 各页面的搜索条件 / 搜索结果 / 展开 / 选择 / 草稿等，
 * 避免切换页面时组件卸载导致状态重置。
 *
 * 用法与 useState 完全一致，只多一个 key：
 *   const [results, setResults] = useSessionCachedState<IOU[]>("ious/search:results", []);
 *
 * 注意：不要缓存 File 等无法 JSON 序列化的值。Set 已通过自定义 replacer/reviver 支持。
 */

const PREFIX = "yif_cache:";

// 让 Set 也能被 JSON 序列化（标记为 {__t:"set", v:[...]}），读取时还原。
function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Set) {
    return { __t: "set", v: Array.from(value) };
  }
  return value;
}

function reviver(_key: string, value: unknown): unknown {
  if (
    value &&
    typeof value === "object" &&
    (value as { __t?: string }).__t === "set" &&
    Array.isArray((value as { v?: unknown }).v)
  ) {
    return new Set((value as { v: unknown[] }).v);
  }
  return value;
}

function readCache<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw, reviver) as T;
  } catch {
    return fallback;
  }
}

export function useSessionCachedState<T>(
  key: string,
  initial: T | (() => T)
): readonly [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() =>
    readCache(key, typeof initial === "function" ? (initial as () => T)() : initial)
  );

  const set = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.sessionStorage.setItem(
            PREFIX + key,
            JSON.stringify(resolved, replacer)
          );
        } catch {
          /* 配额超限 / 隐私模式禁用等：退化为纯内存状态，不抛错 */
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, set] as const;
}

/** 清空所有 yif_cache: 前缀的缓存（登出时调用，避免不同用户在同一标签页间串数据）。 */
export function clearSessionCache(): void {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(window.sessionStorage).filter((k) =>
      k.startsWith(PREFIX)
    );
    keys.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    /* 忽略 */
  }
}
