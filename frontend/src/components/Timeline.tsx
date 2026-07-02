"use client";

import { motion } from "framer-motion";
import { GraduationCap, Briefcase, FlaskConical, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

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
    textColor: "text-blue-500",
  },
  work: {
    icon: Briefcase,
    color: "bg-green-500",
    textColor: "text-green-500",
  },
  research: {
    icon: FlaskConical,
    color: "bg-purple-500",
    textColor: "text-purple-500",
  },
  award: {
    icon: Trophy,
    color: "bg-yellow-500",
    textColor: "text-yellow-500",
  },
};

interface TimelineProps {
  entries: TimelineEntry[];
}

export function Timeline({ entries }: TimelineProps) {
  const t = useTranslations("timeline");
  // Reverse so oldest is on the left
  const sorted = [...entries].reverse();

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative py-8 px-4" style={{ minWidth: `${sorted.length * 148}px` }}>
        {/* Horizontal line */}
        <div className="absolute left-4 right-4 top-1/2 h-px bg-border -translate-y-1/2" />

        <div className="flex justify-between">
          {sorted.map((entry, index) => {
            const config = typeConfig[entry.type];
            const Icon = config.icon;
            const isAbove = index % 2 === 0;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: isAbove ? -12 : 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="flex flex-col items-center"
                style={{ width: "130px" }}
              >
                {/* Top label */}
                <div className={`h-24 flex flex-col items-center ${isAbove ? "justify-end pb-3" : ""}`}>
                  {isAbove && (
                    <>
                      <p className="text-[11px] font-semibold text-center text-foreground leading-tight line-clamp-2 px-1">
                        {t(`${entry.id}.title`)}
                      </p>
                      <p className="text-[10px] text-center text-muted-foreground leading-tight line-clamp-2 px-1 mt-0.5">
                        {t(`${entry.id}.subtitle`)}
                      </p>
                      <p className={`text-[10px] text-center mt-1 ${config.textColor} font-medium`}>
                        {entry.date.split(" - ")[0]}
                      </p>
                      {entry.current && (
                        <span className="text-[10px] text-green-500 font-semibold">● {t("current")}</span>
                      )}
                    </>
                  )}
                </div>

                {/* Dot */}
                <div className={`w-9 h-9 rounded-full ${config.color} flex items-center justify-center z-10 ring-4 ring-background shadow-sm shrink-0`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>

                {/* Bottom label */}
                <div className={`h-24 flex flex-col items-center ${!isAbove ? "justify-start pt-3" : ""}`}>
                  {!isAbove && (
                    <>
                      <p className="text-[11px] font-semibold text-center text-foreground leading-tight line-clamp-2 px-1">
                        {t(`${entry.id}.title`)}
                      </p>
                      <p className="text-[10px] text-center text-muted-foreground leading-tight line-clamp-2 px-1 mt-0.5">
                        {t(`${entry.id}.subtitle`)}
                      </p>
                      <p className={`text-[10px] text-center mt-1 ${config.textColor} font-medium`}>
                        {entry.date.split(" - ")[0]}
                      </p>
                      {entry.current && (
                        <span className="text-[10px] text-green-500 font-semibold">● {t("current")}</span>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Timeline;
