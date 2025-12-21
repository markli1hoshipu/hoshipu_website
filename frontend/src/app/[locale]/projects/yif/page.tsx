"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, DollarSign, BarChart3 } from "lucide-react";

interface User {
  id: number;
  username: string;
}

export default function YIFDashboard() {
  const router = useRouter();
  const locale = useLocale();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // 检查登录状态
    const userStr = sessionStorage.getItem('yif_user');
    if (!userStr) {
      router.push(`/${locale}/projects/yif/login`);
      return;
    }
    
    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
    } catch {
      router.push(`/${locale}/projects/yif/login`);
    }
  }, [router, locale]);

  const handleLogout = () => {
    sessionStorage.removeItem('yif_user');
    router.push(`/${locale}/projects`);
  };

  if (!user) {
    return <div className="container mx-auto px-4 py-12">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">YIF Payment Management</h1>
            <p className="text-muted-foreground">Welcome back, {user.username}!</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Total Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">¥0.00</p>
              <p className="text-sm text-muted-foreground mt-1">Coming soon...</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => router.push(`/${locale}/projects/yif/data`)}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Business Data Analysis
              </Button>
              <Button className="w-full" variant="outline" disabled>
                View Reports
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 p-6 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-2">System Status</h2>
          <p className="text-muted-foreground">
            YIF Payment Management System is under development. More features coming soon.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
