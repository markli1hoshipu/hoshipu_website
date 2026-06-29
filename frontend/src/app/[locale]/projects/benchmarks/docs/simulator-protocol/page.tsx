import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DocBanner } from "../_components/DocBanner";
import { MarkdownArticle } from "../_components/MarkdownArticle";
import { loadDocMarkdown } from "../_lib/load-doc";

export const dynamic = "force-static";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function SimulatorProtocolDoc({ params }: PageProps) {
  const { locale } = await params;
  const content = loadDocMarkdown("simulator-protocol.md");
  return (
    <div className="space-y-5">
      <Link
        href={`/${locale}/projects/benchmarks/docs`}
        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Docs index
      </Link>
      <DocBanner />
      <MarkdownArticle content={content} />
    </div>
  );
}
