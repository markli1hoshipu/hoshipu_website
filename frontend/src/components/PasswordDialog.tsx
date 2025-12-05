"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface PasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
  title?: string;
  description?: string;
  placeholder?: string;
}

export default function PasswordDialog({
  isOpen,
  onClose,
  onSubmit,
  title = "输入密码",
  description = "请输入密码以继续操作",
  placeholder = "请输入密码"
}: PasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setStatus("idle");
      setErrorMessage("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!password.trim()) {
      setStatus("error");
      setErrorMessage("密码不能为空");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      await onSubmit(password);
      setStatus("success");
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error.message || "操作失败，请检查密码是否正确");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder={placeholder}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (status === "error") {
                  setStatus("idle");
                  setErrorMessage("");
                }
              }}
              onKeyDown={handleKeyDown}
              disabled={status === "loading" || status === "success"}
              autoFocus
              className={
                status === "error"
                  ? "border-red-500 focus-visible:ring-red-500"
                  : status === "success"
                  ? "border-green-500 focus-visible:ring-green-500"
                  : ""
              }
            />
          </div>

          {status === "error" && errorMessage && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {status === "success" && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>验证成功</span>
            </div>
          )}

          {status === "loading" && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-md border border-blue-200">
              <AlertCircle className="h-4 w-4 shrink-0 animate-pulse" />
              <span>验证中...</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={status === "loading" || status === "success"}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={status === "loading" || status === "success"}
          >
            {status === "loading" ? "验证中..." : status === "success" ? "成功" : "确认"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
