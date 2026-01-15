"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap,
  FlaskConical,
  FileText,
  Trophy,
  Briefcase,
  Cpu,
  Code2,
  Globe,
  Server,
  Wrench,
  MapPin,
  Calendar,
  ExternalLink,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

const researchIds = ["huawei", "crl"];
const workIds = ["prelude", "robotics", "yif"];
const awardIds = ["putnam", "cmo", "uoftmath", "cemc", "amc"];
const projectIds = ["robotpet", "turtlebot", "mahjong", "travelmap"];

export default function About() {
  const t = useTranslations("about");

  const skills = {
    languages: t.raw("skills.languages") as string[],
    frameworks: t.raw("skills.frameworks") as string[],
    robotics: t.raw("skills.robotics") as string[],
    tools: t.raw("skills.tools") as string[],
  };

  const publications = t.raw("publications") as Array<{
    title: string;
    venue: string;
    arxiv: string;
  }>;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-6">{t("title")}</h1>
        <p className="text-lg text-muted-foreground mb-6 max-w-3xl">
          {t("description")}
        </p>
        <div className="flex flex-wrap gap-3 mb-12">
          <Button asChild variant="outline" size="sm">
            <a
              href="/documents/Zhiyuan_Li_Resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-4 w-4 mr-2" />
              {t("documents.resume")}
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a
              href="/documents/Zhiyuan_Li_Research_CV.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-4 w-4 mr-2" />
              {t("documents.researchCV")}
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a
              href="/documents/Zhiyuan_Li_Academic_History.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-4 w-4 mr-2" />
              {t("documents.academicHistory")}
            </a>
          </Button>
        </div>
      </motion.div>

      <Tabs defaultValue="research" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="research" className="text-sm">
            {t("tabs.research")}
          </TabsTrigger>
          <TabsTrigger value="software" className="text-sm">
            {t("tabs.software")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="research">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-12"
          >
            {/* Education Section */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <GraduationCap className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">{t("education.title")}</h2>
              </div>
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <CardTitle className="text-xl">
                        {t("education.school")}
                      </CardTitle>
                      <CardDescription className="text-base">
                        {t("education.degree")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {t("education.period")}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{t("education.gpa")}</Badge>
                    <Badge variant="secondary">{t("education.honors")}</Badge>
                    <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                      {t("education.status")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Research Experience Section */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <FlaskConical className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">{t("researchTitle")}</h2>
              </div>
              <div className="space-y-6">
                {researchIds.map((id, index) => (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="border-l-4 border-l-purple-500">
                      <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                          <div>
                            <CardTitle>{t(`research.${id}.title`)}</CardTitle>
                            <CardDescription className="text-base font-medium">
                              {t(`research.${id}.company`)}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {t(`research.${id}.period`)}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {t(`research.${id}.location`)}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                          {(t.raw(`research.${id}.points`) as string[]).map(
                            (point, i) => (
                              <li key={i} className="text-sm leading-relaxed">
                                {point}
                              </li>
                            )
                          )}
                        </ul>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Publications Section */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <FileText className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">{t("publicationsTitle")}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {publications.map((pub, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className="h-full hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base leading-tight">
                          {pub.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{pub.venue}</Badge>
                          <a
                            href={`https://arxiv.org/abs/${pub.arxiv.replace("arXiv:", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            {pub.arxiv}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Awards Section */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Trophy className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">{t("awardsTitle")}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {awardIds.map((id, index) => (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="h-full border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          {t(`awards.${id}.title`)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {t(`awards.${id}.description`)}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>
          </motion.div>
        </TabsContent>

        <TabsContent value="software">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-12"
          >
            {/* Work Experience Section */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Briefcase className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">{t("workTitle")}</h2>
              </div>
              <div className="space-y-6">
                {workIds.map((id, index) => (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="border-l-4 border-l-green-500">
                      <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                          <div>
                            <CardTitle>{t(`work.${id}.title`)}</CardTitle>
                            <CardDescription className="text-base font-medium">
                              {t(`work.${id}.company`)}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {t(`work.${id}.period`)}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {t(`work.${id}.location`)}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                          {(t.raw(`work.${id}.points`) as string[]).map(
                            (point, i) => (
                              <li key={i} className="text-sm leading-relaxed">
                                {point}
                              </li>
                            )
                          )}
                        </ul>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Personal Projects Section */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Cpu className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">{t("projectsTitle")}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectIds.map((id, index) => (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className="h-full hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          {t(`personalProjects.${id}.title`)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {t(`personalProjects.${id}.description`)}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Technical Skills Section */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Code2 className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">{t("skillsTitle")}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">
                        {t("skills.languagesTitle")}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {skills.languages.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Server className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">
                        {t("skills.frameworksTitle")}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {skills.frameworks.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Cpu className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">
                        {t("skills.roboticsTitle")}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {skills.robotics.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">
                        {t("skills.toolsTitle")}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {skills.tools.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
