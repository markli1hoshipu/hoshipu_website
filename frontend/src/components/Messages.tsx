"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ChevronUp,
  ChevronDown,
  Send,
  MessageCircle,
  Loader2,
  Trash2
} from "lucide-react";

interface Message {
  id: number;
  content: string;
  created_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";

export default function Messages() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteMessageId, setDeleteMessageId] = useState<number | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Fetch messages
  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/messages/`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load messages when opened
  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen]);

  // Submit new message
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/messages/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newMessage }),
      });

      if (response.ok) {
        setNewMessage("");
        fetchMessages(); // Refresh messages
      }
    } catch (error) {
      console.error("Error submitting message:", error);
      alert("留言提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete button click
  const handleDeleteClick = (messageId: number) => {
    setDeleteMessageId(messageId);
    setDeleteDialogOpen(true);
    setDeletePassword("");
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteMessageId || !deletePassword) return;

    setDeleting(true);
    try {
      const response = await fetch(`${API_URL}/api/messages/${deleteMessageId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      if (response.ok) {
        // Refresh messages after successful deletion
        fetchMessages();
        setDeleteDialogOpen(false);
        setDeletePassword("");
        setDeleteMessageId(null);
      } else if (response.status === 403) {
        alert("密码错误！");
      } else {
        alert("删除失败，请稍后重试");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("删除失败，请稍后重试");
    } finally {
      setDeleting(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    // Parse the UTC date string from backend
    const date = new Date(dateString);
    const now = new Date();

    // Calculate difference in milliseconds
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 10) return "刚刚";
    if (seconds < 60) return `${seconds}秒前`;
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Toggle Button - Fixed on right side */}
      <motion.div
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50"
        initial={{ x: 100 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`rounded-l-lg rounded-r-none shadow-lg h-40 px-6 flex flex-col items-center justify-center gap-3 ${
            !isOpen ? "bg-blue-100 hover:bg-blue-200 text-blue-900" : ""
          }`}
          variant={isOpen ? "default" : "ghost"}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="writing-mode-vertical text-sm">留言板</span>
          {messages.length > 0 && (
            <Badge variant="destructive" className="absolute top-2 right-2">
              {messages.length}
            </Badge>
          )}
        </Button>
      </motion.div>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Messages Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-background border-l shadow-2xl z-50 flex flex-col"
          >
            <div className="flex-1 overflow-hidden flex flex-col">
              <Card className="flex-1 rounded-none border-0 flex flex-col">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      留言板
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                    >
                      <ChevronDown className="h-4 w-4 rotate-90" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden flex flex-col gap-4 p-6">
                  {/* New Message Form */}
                  <form onSubmit={handleSubmit} className="flex gap-2 items-end flex-shrink-0">
                    <Textarea
                      placeholder="在此留言..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      maxLength={1000}
                      disabled={submitting}
                      className="!h-[120px]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (newMessage.trim()) {
                            handleSubmit(e as any);
                          }
                        }
                      }}
                    />
                    <Button type="submit" disabled={submitting || !newMessage.trim()} className="shrink-0">
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          发送
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Messages List */}
                  <div className="flex-1 min-h-0 max-h-[calc(100vh-330px)] overflow-y-auto space-y-3">
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        还没有留言，来写第一条吧！
                      </div>
                    ) : (
                      messages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-4 rounded-lg bg-muted/50 relative group"
                        >
                          <p className="text-sm mb-2 break-words pr-8">{message.content}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(message.created_at)}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteClick(message.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteDialogOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteDialogOpen(false)}
              className="fixed inset-0 bg-black/50 z-[60]"
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md"
            >
              <Card className="mx-4">
                <CardHeader>
                  <CardTitle>删除留言</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    请输入密码以确认删除此留言
                  </p>
                  <Input
                    type="password"
                    placeholder="请输入密码"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && deletePassword) {
                        handleDeleteConfirm();
                      }
                    }}
                    disabled={deleting}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(false)}
                      disabled={deleting}
                    >
                      取消
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteConfirm}
                      disabled={deleting || !deletePassword}
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          删除中...
                        </>
                      ) : (
                        "确认删除"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
