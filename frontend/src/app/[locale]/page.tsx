"use client";

import { motion } from "framer-motion";
import { ArrowRight, Code, Palette, Zap, Music, Music2, Music3, Music4 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations, useLocale } from "next-intl";

const musicNotes = [Music, Music2, Music3, Music4];

// Seeded random function for consistent SSR/CSR
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return Number((x - Math.floor(x)).toFixed(4));
};

const Star = ({ index }: { index: number }) => {
  const randomDelay = Number((seededRandom(index * 1) * 2).toFixed(2));
  const randomDuration = Number((8 + seededRandom(index * 2) * 6).toFixed(2));
  const randomX = Number((seededRandom(index * 3) * 100).toFixed(2));
  const randomStartY = Number((seededRandom(index * 4) * 60 - 10).toFixed(2));
  const randomEndY = Number((randomStartY + 60 + seededRandom(index * 5) * 40).toFixed(2));
  const randomSize = Number((40 + seededRandom(index * 6) * 40).toFixed(2));
  const Note = musicNotes[Math.floor(seededRandom(index * 7) * musicNotes.length)];
  const isBlack = seededRandom(index * 8) > 0.5;
  
  const fadeInDuration = Number((0.15 + seededRandom(index * 9) * 0.1).toFixed(3));
  const fadeOutDuration = Number((0.15 + seededRandom(index * 10) * 0.1).toFixed(3));
  const fadeInPoint = fadeInDuration;
  const fadeOutPoint = 1 - fadeOutDuration;

  return (
    <motion.div
      className="absolute -z-10"
      style={{
        left: `${randomX}%`,
        top: `${randomStartY}%`,
      }}
      animate={{
        y: [`0vh`, `${randomEndY - randomStartY}vh`],
        opacity: [0, 0.6, 0.6, 0],
      }}
      transition={{
        duration: randomDuration,
        repeat: Infinity,
        delay: randomDelay,
        ease: "linear",
        opacity: {
          times: [0, fadeInPoint, fadeOutPoint, 1],
          ease: "easeInOut"
        }
      }}
    >
      <Note 
        size={randomSize} 
        className={isBlack ? "text-black" : "text-white"}
        strokeWidth={1.5}
      />
    </motion.div>
  );
};

const featuresData = [
  { icon: Code, id: "cleanCode" },
  { icon: Palette, id: "modernDesign" },
  { icon: Zap, id: "performance" },
];

export default function Home() {
  const t = useTranslations('home');
  const locale = useLocale();

  return (
    <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <Star key={i} index={i} />
        ))}
      </div>
      <section className="py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
            {t('hero.title')}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8">
            {t('hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href={`/${locale}/projects`}>
                {t('hero.viewWork')} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`/${locale}/contact`}>{t('hero.getInTouch')}</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      <section className="py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {featuresData.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{t(`features.${feature.id}.title`)}</CardTitle>
                    <CardDescription>{t(`features.${feature.id}.description`)}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </section>
    </div>
  );
}
