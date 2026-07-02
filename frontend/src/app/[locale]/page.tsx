"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  FlaskConical, FileText, Trophy,
  Briefcase, Cpu, Code2, Globe, Server, Wrench,
  MapPin, Calendar, ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { Timeline, TimelineEntry } from "@/components/Timeline";
import { ParticleCanvas } from "@/components/ParticleCanvas";

const GitHubIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-label="GitHub">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const LinkedInIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-label="LinkedIn">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const HuggingFaceIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 95 88" fill="currentColor" aria-label="HuggingFace">
    <path d="M47.2 0C21.1 0 0 19.7 0 44c0 24.3 21.1 44 47.2 44s47.2-19.7 47.2-44C94.4 19.7 73.3 0 47.2 0z" fill="currentColor" opacity="0.15"/>
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fontSize="52" style={{fontFamily:'serif'}}>🤗</text>
  </svg>
);


const timelineEntries: TimelineEntry[] = [
  { id: "graduation", date: "Apr 2027", type: "education" },
  { id: "work_prelude", date: "Jun 2025 - Present", type: "work", current: true },
  { id: "research_huawei", date: "May 2025 - Present", type: "research", current: true },
  { id: "award_putnam", date: "2023", type: "award" },
  { id: "research_crl", date: "Feb 2024 - Apr 2025", type: "research" },
  { id: "award_uoftmath", date: "2024", type: "award" },
  { id: "work_yif", date: "Jul 2022 - May 2024", type: "work" },
  { id: "education_uoft", date: "Sep 2022", type: "education" },
];

const researchIds = ["huawei", "crl"];
const workIds = ["prelude", "yif"];
const awardIds = ["putnam", "cmo", "uoftmath", "cemc", "amc"];
const projectIds = ["robotpet", "turtlebot", "mahjong", "travelmap"];

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  );
}

export default function Home() {
  const t = useTranslations("home");
  const ta = useTranslations("about");
  const [currentIndex, setCurrentIndex] = useState(0);

  const subtitles = [
    t("hero.subtitle1"),
    t("hero.subtitle2"),
    t("hero.subtitle3"),
    t("hero.subtitle4"),
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % subtitles.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [subtitles.length]);

  const publications = ta.raw("publications") as Array<{
    title: string;
    venue: string;
    arxiv: string;
    link?: string;
  }>;

  const skills = {
    languages: ta.raw("skills.languages") as string[],
    frameworks: ta.raw("skills.frameworks") as string[],
    robotics: ta.raw("skills.robotics") as string[],
    tools: ta.raw("skills.tools") as string[],
  };

  return (
    <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
      <ParticleCanvas />

      {/* ── Hero ── */}
      <section className="py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <p className="text-xs font-mono tracking-[0.2em] uppercase text-primary mb-4 font-medium">
            {t("hero.affiliation")}
          </p>

          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-4 text-foreground">
            {t("hero.title").replace("Zhiyuan Li", "").trim()}{" "}
            <span className="text-primary">Zhiyuan Li</span>
          </h1>

          <div className="h-7 mb-4 flex items-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="text-base md:text-lg text-muted-foreground"
              >
                {subtitles[currentIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Education + PhD seeking */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <p className="text-sm text-muted-foreground">
              BASc Engineering Science (Robotics) · GPA 3.90 · UofT 2022–2027
            </p>
            <Badge className="bg-green-500/10 text-green-700 border-green-300 hover:bg-green-500/20 text-xs font-medium">
              🎓 Seeking Master / PhD (Fall 2027)
            </Badge>
          </div>

          {/* Social links */}
          <div className="flex gap-5 mb-4">
            <a href="https://github.com/markli1hoshipu" target="_blank" rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors">
              <GitHubIcon />
            </a>
            <a href="https://www.linkedin.com/in/zhiyuan-li-36b894296/" target="_blank" rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors">
              <LinkedInIcon />
            </a>
            <a href="https://huggingface.co/hoshipu" target="_blank" rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors">
              <HuggingFaceIcon />
            </a>
          </div>

          {/* CV downloads */}
          <div className="flex flex-wrap gap-2 mb-6">
            <a href="/documents/cv.pdf" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Research CV
              </Button>
            </a>
            <a href="/documents/software.pdf" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Software Resume
              </Button>
            </a>
            <a href="/documents/Zhiyuan_Li_Academic_History.pdf" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Academic History
              </Button>
            </a>
          </div>

        </motion.div>
      </section>

      {/* ── About ── */}
      <section id="about" className="py-12 border-t border-border">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-6">{t("about.title")}</h2>
          <div className="flex flex-col md:flex-row gap-10 items-start">
            <div className="flex-1">
              <p className="text-base text-muted-foreground leading-relaxed">
                {t("about.description")}
              </p>
            </div>
            <div className="w-full md:w-52 shrink-0">
              <div className="rounded-2xl overflow-hidden shadow-lg ring-1 ring-border">
                <Image
                  src="/images/avatar.jpg"
                  alt="Zhiyuan Li"
                  width={480}
                  height={607}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Research Experience ── */}
      <section id="research" className="py-12 border-t border-border">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeader icon={FlaskConical} title={ta("researchTitle")} />
          <div className="space-y-4">
            {researchIds.map((id, index) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-1">
                      <div>
                        <CardTitle className="text-base">{ta(`research.${id}.title`)}</CardTitle>
                        <CardDescription className="text-sm font-medium">
                          {ta(`research.${id}.company`)}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground shrink-0">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {ta(`research.${id}.period`)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {ta(`research.${id}.location`)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {(ta.raw(`research.${id}.points`) as string[]).map((point, i) => (
                        <li key={i} className="text-sm leading-relaxed">{point}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Publications ── */}
      <section id="publications" className="py-12 border-t border-border">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeader icon={FileText} title={ta("publicationsTitle")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {publications.map((pub, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
              >
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm leading-snug">{pub.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-xs">{pub.venue}</Badge>
                      {pub.link && (
                        <a
                          href={pub.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-0.5"
                        >
                          Project <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {pub.arxiv && (
                        <a
                          href={`https://arxiv.org/abs/${pub.arxiv.replace("arXiv:", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary hover:underline flex items-center gap-0.5"
                        >
                          {pub.arxiv} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Awards ── */}
      <section id="awards" className="py-12 border-t border-border">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeader icon={Trophy} title={ta("awardsTitle")} />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {awardIds.map((id, index) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="h-full border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-sm">{ta(`awards.${id}.title`)}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <p className="text-xs text-muted-foreground leading-snug">{ta(`awards.${id}.description`)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Industry Experience ── */}
      <section id="work" className="py-12 border-t border-border">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeader icon={Briefcase} title={ta("workTitle")} />
          <div className="space-y-4">
            {workIds.map((id, index) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-1">
                      <div>
                        <CardTitle className="text-base">{ta(`work.${id}.title`)}</CardTitle>
                        <CardDescription className="text-sm font-medium">
                          {ta(`work.${id}.company`)}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground shrink-0">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {ta(`work.${id}.period`)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {ta(`work.${id}.location`)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {(ta.raw(`work.${id}.points`) as string[]).map((point, i) => (
                        <li key={i} className="text-sm leading-relaxed">{point}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Personal Projects ── */}
      <section id="projects" className="py-12 border-t border-border">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeader icon={Cpu} title={ta("projectsTitle")} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projectIds.map((id, index) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.08 }}
              >
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-sm">{ta(`personalProjects.${id}.title`)}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {ta(`personalProjects.${id}.description`)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Technical Skills ── */}
      <section id="skills" className="py-12 border-t border-border">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeader icon={Code2} title={ta("skillsTitle")} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Globe, key: "languagesTitle", items: skills.languages },
              { icon: Server, key: "frameworksTitle", items: skills.frameworks },
              { icon: Cpu, key: "roboticsTitle", items: skills.robotics },
              { icon: Wrench, key: "toolsTitle", items: skills.tools },
            ].map(({ icon: Icon, key, items }) => (
              <Card key={key}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">{ta(`skills.${key}`)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Timeline ── */}
      <section className="py-12 border-t border-border">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <h2 className="text-xl font-bold mb-1">{t("timeline.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("timeline.subtitle")}</p>
        </motion.div>
        <Timeline entries={timelineEntries} />
      </section>
    </div>
  );
}
