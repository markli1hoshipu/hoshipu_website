"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code2, Database, Globe, Server } from "lucide-react";
import { useTranslations } from "next-intl";

const experienceIds = ["exp1", "exp2"];

export default function About() {
  const t = useTranslations('about');

  const skills = {
    frontend: t.raw('skills.frontend') as string[],
    backend: t.raw('skills.backend') as string[],
    tools: t.raw('skills.tools') as string[],
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-6">{t('title')}</h1>
        <p className="text-lg text-muted-foreground mb-12 max-w-3xl">
          {t('description')}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-16"
      >
        <h2 className="text-3xl font-bold mb-8">{t('skillsTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>{t('skills.frontendTitle')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {skills.frontend.map((skill) => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                <CardTitle>{t('skills.backendTitle')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {skills.backend.map((skill) => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary" />
                <CardTitle>{t('skills.toolsTitle')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {skills.tools.map((skill) => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-bold mb-8">{t('experienceTitle')}</h2>
        <div className="space-y-6">
          {experienceIds.map((expId, index) => (
            <motion.div
              key={expId}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>{t(`experience.${expId}.title`)}</CardTitle>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{t(`experience.${expId}.company`)}</span>
                    <span>{t(`experience.${expId}.period`)}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t(`experience.${expId}.description`)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
