"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight, Calculator, Package, Plane } from "lucide-react";
import Link from "next/link";
import Messages from "@/components/Messages";

const projects = [
  {
    title: "GJP PDF 重命名工具",
    description: "智能PDF批量重命名工具，可提取发票信息并使用自定义模板重命名文件。",
    tags: ["CHINESE", "PDF处理", "批量重命名"],
    link: "/projects/pdf-rename",
    type: "tool",
    language: "zh",
    icon: FileText,
  },
  {
    title: "计算24小游戏",
    description: "经典数学益智游戏，使用四个数字和基本运算符计算出24。锻炼你的数学思维和计算能力！",
    tags: ["CHINESE", "游戏", "数学"],
    link: "/projects/game24",
    type: "game",
    language: "zh",
    icon: Calculator,
  },
  {
    title: "QFF 航程信息整理工具",
    description: "管理航程翻译输出模板、航司代码对照表和机场代码对照表，方便整理航班信息。",
    tags: ["CHINESE", "航空", "数据管理"],
    link: "/projects/qff-travel",
    type: "tool",
    language: "zh",
    icon: Plane,
  },
  {
    title: "敬请期待",
    description: "更多精彩项目正在开发中，即将上线...",
    tags: ["CHINESE", "即将推出"],
    link: "#",
    type: "placeholder",
    language: "zh",
    icon: Package,
  },
];

export default function Projects() {
  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Projects</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            A collection of projects I've worked on, showcasing my skills in full-stack development,
            UI/UX design, and problem-solving.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <project.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{project.title}</CardTitle>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={project.link}>
                      {project.language === "zh" ? "打开工具" : "Open Tool"} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Messages Component - Fixed at bottom */}
      <Messages />
    </>
  );
}
