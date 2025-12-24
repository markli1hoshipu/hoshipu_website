"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useYIFAuth } from "@/hooks/useYIFAuth";
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Key,
  Shield,
  ShieldCheck,
  User,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";

interface TeamUser {
  id: number;
  username: string;
  user_code: string;
  display_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function TeamManagementPage() {
  const router = useRouter();
  const locale = useLocale();
  const { user, loading: authLoading, getToken } = useYIFAuth();

  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create user form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    user_code: "",
    display_name: "",
    role: "user",
  });
  const [creating, setCreating] = useState(false);

  // Edit user
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);
  const [editForm, setEditForm] = useState({
    display_name: "",
    user_code: "",
    role: "",
    is_active: true,
  });
  const [updating, setUpdating] = useState(false);

  // Change password
  const [changingPasswordFor, setChangingPasswordFor] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete confirmation
  const [deletingUser, setDeletingUser] = useState<TeamUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6101';

  const getAuthHeaders = () => {
    const token = getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // Check admin access
  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') {
      router.push(`/${locale}/projects/yif`);
    }
  }, [authLoading, user, router, locale]);

  // Fetch users
  useEffect(() => {
    if (authLoading || !user || user.role !== 'admin') return;
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/yif/team/users`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else if (response.status === 401) {
        router.push(`/${locale}/projects/yif/login`);
      } else if (response.status === 403) {
        setError("无权访问");
      } else {
        const err = await response.json();
        setError(err.detail || "获取用户列表失败");
      }
    } catch (err) {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.user_code || !newUser.display_name) {
      alert("请填写所有必填字段");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/yif/team/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        setShowCreateForm(false);
        setNewUser({ username: "", password: "", user_code: "", display_name: "", role: "user" });
        fetchUsers();
      } else {
        const err = await response.json();
        alert(err.detail || "创建用户失败");
      }
    } catch (err) {
      alert("网络错误");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    setUpdating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/yif/team/users/${editingUser.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        setEditingUser(null);
        fetchUsers();
      } else {
        const err = await response.json();
        alert(err.detail || "更新用户失败");
      }
    } catch (err) {
      alert("网络错误");
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!changingPasswordFor || !newPassword) return;

    if (newPassword.length < 6) {
      alert("密码至少需要6个字符");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/yif/team/users/${changingPasswordFor}/password`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ new_password: newPassword }),
      });

      if (response.ok) {
        setChangingPasswordFor(null);
        setNewPassword("");
        alert("密码修改成功");
      } else {
        const err = await response.json();
        alert(err.detail || "修改密码失败");
      }
    } catch (err) {
      alert("网络错误");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/yif/team/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setDeletingUser(null);
        fetchUsers();
      } else {
        const err = await response.json();
        alert(err.detail || "删除用户失败");
      }
    } catch (err) {
      alert("网络错误");
    } finally {
      setDeleting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800"><ShieldCheck className="h-3 w-3 mr-1" />管理员</Badge>;
      case 'manager':
        return <Badge className="bg-blue-100 text-blue-800"><Shield className="h-3 w-3 mr-1" />经理</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800"><User className="h-3 w-3 mr-1" />用户</Badge>;
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">验证登录状态...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-muted-foreground">无权访问此页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">团队管理</h1>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            添加用户
          </Button>
        </div>

        {/* Create User Form */}
        {showCreateForm && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                创建新用户
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">用户名 *</label>
                  <Input
                    placeholder="登录用户名"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">密码 *</label>
                  <Input
                    type="password"
                    placeholder="登录密码"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">用户代码 * (2-3字母)</label>
                  <Input
                    placeholder="如: LML"
                    value={newUser.user_code}
                    onChange={(e) => setNewUser({ ...newUser, user_code: e.target.value.toUpperCase() })}
                    maxLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">显示名称 *</label>
                  <Input
                    placeholder="中文名"
                    value={newUser.display_name}
                    onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">角色</label>
                  <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">用户</SelectItem>
                      <SelectItem value="manager">经理</SelectItem>
                      <SelectItem value="admin">管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleCreateUser} disabled={creating}>
                  {creating ? "创建中..." : "创建用户"}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>用户列表</CardTitle>
            <CardDescription>共 {users.length} 个用户</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">加载中...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-3 px-2">ID</th>
                      <th className="text-left py-3 px-2">用户名</th>
                      <th className="text-left py-3 px-2">代码</th>
                      <th className="text-left py-3 px-2">显示名</th>
                      <th className="text-left py-3 px-2">角色</th>
                      <th className="text-center py-3 px-2">状态</th>
                      <th className="text-right py-3 px-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b hover:bg-muted/30">
                        <td className="py-3 px-2 text-muted-foreground">{u.id}</td>
                        <td className="py-3 px-2 font-medium">{u.username}</td>
                        <td className="py-3 px-2 font-mono">{u.user_code}</td>
                        <td className="py-3 px-2">{u.display_name}</td>
                        <td className="py-3 px-2">{getRoleBadge(u.role)}</td>
                        <td className="py-3 px-2 text-center">
                          {u.is_active ? (
                            <Badge className="bg-green-100 text-green-800">活跃</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">已停用</Badge>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingUser(u);
                                setEditForm({
                                  display_name: u.display_name,
                                  user_code: u.user_code,
                                  role: u.role,
                                  is_active: u.is_active,
                                });
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setChangingPasswordFor(u.id)}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            {u.id !== user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => setDeletingUser(u)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  编辑用户: {editingUser.username}
                  <Button variant="ghost" size="sm" onClick={() => setEditingUser(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">显示名称</label>
                  <Input
                    value={editForm.display_name}
                    onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">用户代码</label>
                  <Input
                    value={editForm.user_code}
                    onChange={(e) => setEditForm({ ...editForm, user_code: e.target.value.toUpperCase() })}
                    maxLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">角色</label>
                  <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">用户</SelectItem>
                      <SelectItem value="manager">经理</SelectItem>
                      <SelectItem value="admin">管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">状态</label>
                  <Select
                    value={editForm.is_active ? "active" : "inactive"}
                    onValueChange={(v) => setEditForm({ ...editForm, is_active: v === "active" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">活跃</SelectItem>
                      <SelectItem value="inactive">停用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleUpdateUser} disabled={updating} className="flex-1">
                    {updating ? "保存中..." : "保存"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingUser(null)} className="flex-1">
                    取消
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Change Password Modal */}
        {changingPasswordFor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-sm mx-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  修改密码
                  <Button variant="ghost" size="sm" onClick={() => { setChangingPasswordFor(null); setNewPassword(""); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">新密码</label>
                  <Input
                    type="password"
                    placeholder="至少6个字符"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleChangePassword} disabled={changingPassword} className="flex-1">
                    {changingPassword ? "修改中..." : "确认修改"}
                  </Button>
                  <Button variant="outline" onClick={() => { setChangingPasswordFor(null); setNewPassword(""); }} className="flex-1">
                    取消
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-sm mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  确认停用
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>确定要停用用户 <strong>{deletingUser.display_name}</strong> ({deletingUser.username}) 吗？</p>
                <p className="text-sm text-muted-foreground">停用后该用户将无法登录系统。</p>
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={handleDeleteUser} disabled={deleting} className="flex-1">
                    {deleting ? "停用中..." : "确认停用"}
                  </Button>
                  <Button variant="outline" onClick={() => setDeletingUser(null)} className="flex-1">
                    取消
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  );
}
