"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Beaker, Plus, LogOut } from "lucide-react";
import { useBenchAuth } from "@/contexts/BenchAuthProvider";

export default function BenchmarksLanding() {
  const t = useTranslations("benchmarks.landing");
  const { user, loading, logout } = useBenchAuth();

  // BenchAuthProvider handles redirecting unauthenticated users to /login.
  if (loading || !user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto space-y-6"
      >
        {/* Header row: title + signed-in pill + logout */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Beaker className="h-7 w-7 text-primary" />
              {t("title")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {user.display_name || user.email}
              {user.role === "admin" && (
                <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  admin
                </span>
              )}
            </span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-1" />
              {t("logout")}
            </Button>
          </div>
        </div>

        {/* Empty state */}
        <Card>
          <CardHeader>
            <CardTitle>{t("noRunsTitle")}</CardTitle>
            <CardDescription>{t("noRunsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled title={t("newRunComingSoon")}>
              <Plus className="h-4 w-4 mr-1" />
              {t("newRun")}
            </Button>
            <p className="text-xs text-muted-foreground mt-3">{t("phaseNote")}</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
