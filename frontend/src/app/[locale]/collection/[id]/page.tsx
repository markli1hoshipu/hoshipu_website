"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";
import { useLocale } from "next-intl";

interface Media {
  id: number;
  media_type: string;
  media_url: string;
  file_size: number;
  content_type: string;
  display_order: number;
}

interface CollectionItem {
  id: number;
  title: string;
  author?: string;
  content: string;
  created_at: string;
  updated_at: string;
  media: Media[];
}

export default function CollectionDetail() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const [collection, setCollection] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchCollection(params.id as string);
    }
  }, [params.id]);

  const fetchCollection = async (id: string) => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6101';
    try {
      const response = await fetch(`${API_BASE_URL}/api/collection/${id}`);
      const data = await response.json();
      setCollection(data.collection);
    } catch (error) {
      console.error('Failed to fetch collection:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">Collection not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* 标题和信息 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{collection.title}</h1>
          {collection.author && (
            <p className="text-lg text-muted-foreground mb-2">By {collection.author}</p>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(collection.created_at).toLocaleDateString(
                locale === 'zh' ? 'zh-CN' : 'en-US',
                { year: 'numeric', month: 'long', day: 'numeric' }
              )}
            </span>
          </div>
          {collection.content && (
            <p className="text-lg text-muted-foreground whitespace-pre-wrap">
              {collection.content}
            </p>
          )}
        </div>

        {/* 媒体内容 */}
        <div className="space-y-6">
          {collection.media.map((media, index) => (
            <motion.div
              key={media.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  {media.media_type === 'images' && (
                    <div className="relative w-full">
                      <img
                        src={media.media_url}
                        alt={`Media ${index + 1}`}
                        className="w-full rounded-lg"
                      />
                    </div>
                  )}
                  
                  {media.media_type === 'audio' && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Audio {index + 1}
                      </p>
                      <audio controls className="w-full">
                        <source src={media.media_url} type={media.content_type} />
                        Your browser does not support the audio element.
                      </audio>
                      <p className="text-xs text-muted-foreground">
                        Size: {(media.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* 媒体统计 */}
        {collection.media.length > 0 && (
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Total media: {collection.media.length} file(s) •{' '}
              {collection.media.filter(m => m.media_type === 'images').length} image(s) •{' '}
              {collection.media.filter(m => m.media_type === 'audio').length} audio file(s)
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
