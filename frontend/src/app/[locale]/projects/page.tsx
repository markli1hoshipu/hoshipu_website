"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight, Calculator, Plane, DollarSign, Wallet } from "lucide-react";
import Link from "next/link";
import Messages from "@/components/Messages";
import { useTranslations, useLocale } from "next-intl";
import { LucideIcon } from "lucide-react";

interface Project {
  id: string;
  link: string;
  icon: LucideIcon;
}

interface ProjectGroup {
  groupId: string;
  groupTitle: string;
  projects: Project[];
}

const projectGroups: ProjectGroup[] = [
  {
    groupId: "yuhang",
    groupTitle: "大连宇航小程序",
    projects: [
      { id: "pdfRename", link: "/projects/pdf-rename", icon: FileText },
      { id: "qffTravel", link: "/projects/qff-travel", icon: Plane },
      { id: "yifPayment", link: "/projects/yif", icon: DollarSign },
    ],
  },
  {
    groupId: "personal",
    groupTitle: "个人程序",
    projects: [
      { id: "accounting", link: "/projects/accounting", icon: Wallet },
    ],
  },
  {
    groupId: "games",
    groupTitle: "小游戏",
    projects: [
      { id: "game24", link: "/projects/game24", icon: Calculator },
    ],
  },
];

export default function Projects() {
  const t = useTranslations('projects');
  const locale = useLocale();

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{t('title')}</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            {t('description')}
          </p>
        </motion.div>

        <div className="space-y-12">
          {projectGroups.map((group, groupIndex) => (
            <motion.section
              key={group.groupId}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: groupIndex * 0.1 }}
            >
              <h2 className="text-2xl font-semibold mb-6 text-foreground/80 border-b pb-2">
                {group.groupTitle}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.projects.map((project, index) => {
                  const Icon = project.icon;
                  return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                    >
                      <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <CardTitle>{t(`${project.id}.title`)}</CardTitle>
                          <CardDescription>{t(`${project.id}.description`)}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                          <div className="flex flex-wrap gap-2">
                            {(t.raw(`${project.id}.tags`) as string[]).map((tag: string) => (
                              <Badge key={tag} variant="secondary">{tag}</Badge>
                            ))}
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button asChild className="w-full">
                            <Link href={`/${locale}${project.link}`}>
                              {t('openTool')} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          ))}
        </div>
      </div>

      {/* Messages Component - Fixed at bottom */}
      <Messages />
    </>
  );
}
