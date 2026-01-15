"use client";

import { motion } from "framer-motion";
import { GraduationCap, Briefcase, FlaskConical, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type TimelineEntryType = "education" | "work" | "research" | "award";

export interface TimelineEntry {
  id: string;
  date: string;
  type: TimelineEntryType;
  current?: boolean;
}

const typeConfig = {
  education: {
    icon: GraduationCap,
    color: "bg-blue-500",
    borderColor: "border-blue-500",
    textColor: "text-blue-500",
  },
  work: {
    icon: Briefcase,
    color: "bg-green-500",
    borderColor: "border-green-500",
    textColor: "text-green-500",
  },
  research: {
    icon: FlaskConical,
    color: "bg-purple-500",
    borderColor: "border-purple-500",
    textColor: "text-purple-500",
  },
  award: {
    icon: Trophy,
    color: "bg-yellow-500",
    borderColor: "border-yellow-500",
    textColor: "text-yellow-500",
  },
};

interface TimelineProps {
  entries: TimelineEntry[];
}

export function Timeline({ entries }: TimelineProps) {
  const t = useTranslations("timeline");

  return (
    <div className="relative">
      {/* Center line - hidden on mobile */}
      <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-border md:-translate-x-1/2" />

      <div className="space-y-8 md:space-y-12">
        {entries.map((entry, index) => {
          const config = typeConfig[entry.type];
          const Icon = config.icon;
          const isLeft = index % 2 === 0;

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative flex items-center ${
                isLeft ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              {/* Dot marker */}
              <div
                className={`absolute left-4 md:left-1/2 w-4 h-4 rounded-full ${config.color} md:-translate-x-1/2 z-10 ring-4 ring-background`}
              />

              {/* Content card */}
              <div
                className={`ml-12 md:ml-0 md:w-[45%] ${
                  isLeft ? "md:pr-8 md:text-right" : "md:pl-8 md:text-left"
                }`}
              >
                <Card
                  className={`border-l-4 ${config.borderColor} hover:shadow-lg transition-shadow`}
                >
                  <CardHeader className="pb-2">
                    <div
                      className={`flex items-center gap-2 ${
                        isLeft ? "md:flex-row-reverse" : ""
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center`}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className={isLeft ? "md:text-right" : ""}>
                        <CardTitle className="text-lg">
                          {t(`${entry.id}.title`)}
                        </CardTitle>
                        <p className={`text-sm ${config.textColor} font-medium`}>
                          {entry.date}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-2">
                      {t(`${entry.id}.subtitle`)}
                    </p>
                    <p className="text-sm">{t(`${entry.id}.description`)}</p>
                    {entry.current && (
                      <Badge variant="secondary" className="mt-2">
                        {t("current")}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Spacer for alternating layout */}
              <div className="hidden md:block md:w-[45%]" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default Timeline;
