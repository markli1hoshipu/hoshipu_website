"use client";

import { motion } from "framer-motion";
import { ArrowRight, Code, Palette, Zap, Music, Music2, Music3, Music4 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const musicNotes = [Music, Music2, Music3, Music4];

const Star = ({ index }: { index: number }) => {
  const randomDelay = Math.random() * 5;
  const randomDuration = 15 + Math.random() * 10;
  const randomX = Math.random() * 100;
  const randomSize = 40 + Math.random() * 40;
  const Note = musicNotes[Math.floor(Math.random() * musicNotes.length)];
  const isBlack = Math.random() > 0.5;

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${randomX}%`,
        top: '-5%',
      }}
      animate={{
        y: ['0vh', '110vh'],
        opacity: [0, 0.6, 0.6, 0],
      }}
      transition={{
        duration: randomDuration,
        repeat: Infinity,
        delay: randomDelay,
        ease: "linear",
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

const features = [
  {
    icon: Code,
    title: "Clean Code",
    description: "Writing maintainable and efficient code for scalable applications",
  },
  {
    icon: Palette,
    title: "Modern Design",
    description: "Creating beautiful and intuitive user interfaces",
  },
  {
    icon: Zap,
    title: "Performance",
    description: "Optimizing for speed and best user experience",
  },
];

export default function Home() {
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
            Hi, I'm Hoshipu
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8">
            Full-stack developer crafting exceptional digital experiences
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/projects">
                View My Work <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contact">Get in Touch</Link>
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
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
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
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
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
