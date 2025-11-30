"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

const blogPosts = [
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

export default function Blog() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-6">Blog</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Thoughts, tutorials, and insights on web development, programming, and technology.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogPosts.map((post, index) => (
          <motion.div
            key={post.slug}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(post.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{post.readTime}</span>
                  </div>
                </div>
                <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                <CardDescription className="line-clamp-3">{post.excerpt}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild variant="ghost" className="w-full">
                  <Link href={`/blog/${post.slug}`}>
                    Read More <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
