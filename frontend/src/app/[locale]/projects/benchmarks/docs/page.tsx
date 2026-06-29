"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { Server, Cog, ArrowRight } from "lucide-react";

import { DocBanner } from "./_components/DocBanner";

export default function DocsIndex() {
  const locale = useLocale();
  const base = `/${locale}/projects/benchmarks/docs`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">API documentation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Protocol references for the EmbodyBench evaluation API.
        </p>
      </header>

      <DocBanner />

      <div className="grid gap-4 md:grid-cols-2">
        <DocCard
          href={`${base}/policy-server`}
          icon={<Server className="h-5 w-5 text-indigo-500" />}
          title="Policy server guide"
          description="For model implementers. Defines the three endpoints your server exposes (/episode/init, /step, /finalize), the action and state vectors for each action_space, image format, and includes a 40-line minimum-viable example."
          tag="user-facing"
        />
        <DocCard
          href={`${base}/simulator-protocol`}
          icon={<Cog className="h-5 w-5 text-indigo-500" />}
          title="Simulator-side protocol spec"
          description="For worker implementers. Documents what the simulator sends on the wire, observation serialization, lifecycle, retry policy, the failure-reason taxonomy used for auto-requeue, and the converters embodybench_remote uses for each action_space."
          tag="internal"
        />
      </div>
    </div>
  );
}

function DocCard({
  href,
  icon,
  title,
  description,
  tag,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  tag: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo-500 hover:shadow-md"
    >
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <p className="text-base font-semibold text-slate-900">{title}</p>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
          {tag}
        </span>
      </div>
      <p className="text-sm text-slate-600">{description}</p>
      <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600">
        Open
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </p>
    </Link>
  );
}
