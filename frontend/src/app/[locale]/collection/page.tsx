"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Image as ImageIcon, Music } from "lucide-react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

interface Media {
  id: number;
  media_type: string;
  media_url: string;
  file_size: number;
  content_type: string;
}

interface CollectionItem {
  id: number;
  title: string;
  author?: string;
  content: string;
  created_at: string;
  media: Media[];
}

const oldBlogPosts = [
  {
    title: "Building Scalable React Applications",
    excerpt: "Learn best practices for structuring large-scale React applications with modern patterns and tools.",
    date: "2024-03-15",
    readTime: "8 min read",
    tags: ["React", "Architecture", "Best Practices"],
    slug: "building-scalable-react-applications",
  },
  {
    title: "Next.js 15: What's New?",
    excerpt: "Exploring the latest features and improvements in Next.js 15, including the new App Router and Server Components.",
    date: "2024-03-10",
    readTime: "6 min read",
    tags: ["Next.js", "Web Development"],
    slug: "nextjs-15-whats-new",
  },
  {
    title: "TypeScript Tips for Better Code",
    excerpt: "Advanced TypeScript techniques to write more maintainable and type-safe code in your projects.",
    date: "2024-03-05",
    readTime: "10 min read",
    tags: ["TypeScript", "Programming"],
    slug: "typescript-tips-for-better-code",
  },
  {
    title: "Mastering Tailwind CSS",
    excerpt: "A comprehensive guide to building beautiful, responsive UIs with Tailwind CSS utility classes.",
    date: "2024-02-28",
    readTime: "7 min read",
    tags: ["CSS", "Tailwind", "UI/UX"],
    slug: "mastering-tailwind-css",
  },
  {
    title: "API Design Best Practices",
    excerpt: "Essential principles for designing RESTful APIs that are intuitive, scalable, and maintainable.",
    date: "2024-02-20",
    readTime: "9 min read",
    tags: ["API", "Backend", "Architecture"],
    slug: "api-design-best-practices",
  },
  {
    title: "Introduction to Framer Motion",
    excerpt: "Create stunning animations in React applications with Framer Motion's powerful animation library.",
    date: "2024-02-15",
    readTime: "5 min read",
    tags: ["Animation", "React", "UI/UX"],
    slug: "introduction-to-framer-motion",
  },
];

export default function Collection() {
  const t = useTranslations('collection');
  const locale = useLocale();
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6101';
    try {
      const response = await fetch(`${API_BASE_URL}/api/collection/`);
      const data = await response.json();
      setCollections(data.collections);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12 flex justify-between items-center"
      >
        <div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{t('title')}</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            {t('description')}
          </p>
        </div>
        <Link href={`/${locale}/collection/create`}>
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            {t('createNew')}
          </Button>
        </Link>
      </motion.div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((item, index) => {
            const firstImage = item.media.find(m => m.media_type === 'images');
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Link href={`/${locale}/collection/${item.id}`}>
                  <Card className="h-full flex flex-col hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
                    {firstImage && (
                      <div className="relative h-48 w-full overflow-hidden">
                        <img
                          src={firstImage.media_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    {firstImage ? (
                      <CardHeader className="flex-1">
                        <CardTitle className="line-clamp-2">{item.title}</CardTitle>
                        {item.author && (
                          <p className="text-sm text-muted-foreground mt-1">By {item.author}</p>
                        )}
                      </CardHeader>
                    ) : (
                      <div className="flex-1" />
                    )}
                    
                    <CardFooter className="flex flex-col gap-3 items-start">
                      {!firstImage && (
                        <div>
                          <CardTitle className="line-clamp-2 text-base">{item.title}</CardTitle>
                          {item.author && (
                            <p className="text-sm text-muted-foreground mt-1">By {item.author}</p>
                          )}
                        </div>
                      )}
                      <div className="flex justify-between items-center w-full">
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          {item.media.filter(m => m.media_type === 'images').length > 0 && (
                            <span className="flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" />
                              {item.media.filter(m => m.media_type === 'images').length}
                            </span>
                          )}
                          {item.media.filter(m => m.media_type === 'audio').length > 0 && (
                            <span className="flex items-center gap-1">
                              <Music className="h-3 w-3" />
                              {item.media.filter(m => m.media_type === 'audio').length}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                        </span>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
