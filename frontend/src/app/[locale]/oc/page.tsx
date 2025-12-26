"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Heart, Star, Palette } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

export default function OCPage() {
  const t = useTranslations('oc');

  const traits = t.raw('traits') as string[];
  const likes = t.raw('likes') as string[];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold">{t('title')}</h1>
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('subtitle')}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Character Image */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex justify-center"
        >
          <Card className="overflow-hidden w-full max-w-md">
            <div className="aspect-square relative bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Image
                src="/hoshipu_character.png"
                alt="Hoshipu"
                width={400}
                height={400}
                className="object-contain"
                priority
              />
            </div>
          </Card>
        </motion.div>

        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                <CardTitle>{t('basicInfo.title')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('basicInfo.nameLabel')}</span>
                <span className="font-medium">{t('basicInfo.name')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('basicInfo.speciesLabel')}</span>
                <span className="font-medium">{t('basicInfo.species')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('basicInfo.genderLabel')}</span>
                <span className="font-medium">{t('basicInfo.gender')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('basicInfo.colorLabel')}</span>
                <span className="font-medium">{t('basicInfo.color')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle>{t('personality.title')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {traits.map((trait) => (
                  <Badge key={trait} variant="secondary">{trait}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                <CardTitle>{t('likesTitle')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {likes.map((like) => (
                  <Badge key={like} variant="outline">{like}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Story/Background */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('story.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {t('story.content')}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
