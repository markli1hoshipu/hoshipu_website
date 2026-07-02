"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight, Calculator, Plane, DollarSign, LayoutDashboard, Globe, Gamepad2, Beaker, ExternalLink } from "lucide-react";
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
  projects: Project[];
}

const projectGroups: ProjectGroup[] = [
  {
    groupId: "yuhang",
    projects: [
      { id: "pdfRename", link: "/projects/pdf-rename", icon: FileText },
      { id: "qffTravel", link: "/projects/qff-travel", icon: Plane },
      { id: "yifPayment", link: "/projects/yif", icon: DollarSign },
      { id: "iataCode", link: "/projects/iata-code", icon: Globe },
    ],
  },
  {
    groupId: "personal",
    projects: [
      { id: "lifeManagement", link: "/projects/life-management", icon: LayoutDashboard },
      { id: "embodybench", link: "/projects/benchmarks", icon: Beaker },
    ],
  },
  {
    groupId: "games",
    projects: [
      { id: "game24", link: "/projects/game24", icon: Calculator },
      { id: "pong", link: "/projects/pong", icon: Gamepad2 },
    ],
  },
];

const publications = [
  {
    title: "Self-CriTeach: LLM Self-Teaching and Self-Critiquing for Improving Robotic Planning via Automated Domain Generation",
    venue: "ICML 2026",
    arxiv: "arXiv:2509.21543",
    link: "https://markli1hoshipu.github.io/Plan_LLM/",
    tags: ["LLM", "Robotic Planning", "PDDL"],
  },
  {
    title: "Data and Evaluation Protocols for Robust Robotic Manipulation",
    venue: "RSS 2026 Workshop",
    arxiv: "",
    link: "https://robopro-bench.github.io/RoboPRO/",
    tags: ["Benchmark", "Manipulation", "Dataset"],
  },
];

export default function Projects() {
  const t = useTranslations('projects');
  const locale = useLocale();

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('title')}</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            {t('description')}
          </p>
        </motion.div>

        <div className="space-y-10">
          {/* Publications — first */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-xl font-semibold mb-4 text-foreground/80 border-b pb-2">
              Publications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publications.map((pub, index) => (
                <motion.div
                  key={pub.link}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">{pub.venue}</Badge>
                        {pub.arxiv && <span className="text-xs text-muted-foreground font-mono">{pub.arxiv}</span>}
                      </div>
                      <CardTitle className="text-sm leading-snug">{pub.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 px-4 pb-2">
                      <div className="flex flex-wrap gap-1">
                        {pub.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="px-4 pb-4">
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <a href={pub.link} target="_blank" rel="noopener noreferrer">
                          View Project Page <ExternalLink className="ml-2 h-3 w-3" />
                        </a>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Project groups */}
          {projectGroups.map((group, groupIndex) => (
            <motion.section
              key={group.groupId}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: groupIndex * 0.05 }}
            >
              <h2 className="text-xl font-semibold mb-4 text-foreground/80 border-b pb-2">
                {t(`groups.${group.groupId}`)}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {group.projects.map((project, index) => {
                  const Icon = project.icon;
                  return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                    >
                      <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2 pt-4 px-4">
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center mb-2">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <CardTitle className="text-sm">{t(`${project.id}.title`)}</CardTitle>
                          <p className="text-xs text-muted-foreground leading-snug">{t(`${project.id}.description`)}</p>
                        </CardHeader>
                        <CardContent className="flex-1 px-4 pb-2">
                          <div className="flex flex-wrap gap-1">
                            {(t.raw(`${project.id}.tags`) as string[]).slice(0, 2).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        </CardContent>
                        <CardFooter className="px-4 pb-4">
                          <Button asChild size="sm" className="w-full text-xs">
                            <Link href={`/${locale}${project.link}`}>
                              {t('openTool')} <ArrowRight className="ml-1 h-3 w-3" />
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

      <Messages />
    </>
  );
}
