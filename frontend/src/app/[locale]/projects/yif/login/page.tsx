"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, User } from "lucide-react";

export default function YIFLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 获取 redirect 参数，登录成功后跳转回原页面
  // 验证 redirect URL 安全性：必须是相对路径，不能包含协议或双斜杠
  const rawRedirect = searchParams.get('redirect');
  const isValidRedirect = (url: string | null): boolean => {
    if (!url) return false;
    // Must start with / and not contain protocol or double slashes
    return url.startsWith('/') && !url.includes('://') && !url.startsWith('//');
  };
  const redirectPath = isValidRedirect(rawRedirect) ? rawRedirect! : `/${locale}/projects/yif`;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6101';

    try {
      const response = await fetch(`${API_BASE_URL}/api/yif/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        // 保存JWT token和用户信息到localStorage
        localStorage.setItem('yif_access_token', data.access_token);
        localStorage.setItem('yif_user', JSON.stringify(data.user));
        // 跳转到原页面或默认页面 (完整页面跳转以重置 auth context)
        // 使用 router.push 代替直接 href 赋值，更安全
        window.location.href = redirectPath;
      } else {
        setError(data.detail || "用户名或密码错误");
      }
    } catch (err) {
      setError("无法连接到服务器");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">YIF 付款管理系统</CardTitle>
            <CardDescription className="text-center">
              请输入您的账号密码登录系统
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">用户名</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "登录中..." : "登录"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
