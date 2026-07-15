"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STORAGE_KEY = "yif_default_expand_details";
const CHANGE_EVENT = "yif-default-expand-change";

/**
 * 记住"搜索结果明细是否默认展开"的偏好（跨页面 / 跨组件共享，持久化到 localStorage）。
 * 任一处修改都会通过自定义事件通知所有 hook 实例，保持实时同步。
 * 返回 [defaultExpand, setDefaultExpand]。
 */
export function useDefaultExpandDetails() {
  const [defaultExpand, setState] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        setState(localStorage.getItem(STORAGE_KEY) === "1");
      } catch {
        /* localStorage 不可用时使用默认值 */
      }
    };
    read();
    const onCustom = (e: Event) => setState((e as CustomEvent<boolean>).detail);
    window.addEventListener(CHANGE_EVENT, onCustom);
    window.addEventListener("storage", read); // 跨标签页同步
    return () => {
      window.removeEventListener(CHANGE_EVENT, onCustom);
      window.removeEventListener("storage", read);
    };
  }, []);

  const setDefaultExpand = useCallback((value: boolean) => {
    setState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      /* 忽略写入失败 */
    }
    window.dispatchEvent(new CustomEvent<boolean>(CHANGE_EVENT, { detail: value }));
  }, []);

  return [defaultExpand, setDefaultExpand] as const;
}

/**
 * 齿轮按钮：切换明细默认展开 / 默认收起。
 * 自带偏好状态，放哪都行（如侧边栏）。className 用于适配不同背景。
 */
export function DetailExpandSettingsButton({ className }: { className?: string }) {
  const [defaultExpand, setDefaultExpand] = useDefaultExpandDetails();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="明细显示设置" className={className}>
          <Settings2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>搜索结果明细</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={defaultExpand ? "expand" : "collapse"}
          onValueChange={(v) => setDefaultExpand(v === "expand")}
        >
          <DropdownMenuRadioItem value="expand">默认展开明细</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="collapse">默认不展开明细</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
