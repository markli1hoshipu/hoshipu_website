import { AlertTriangle } from "lucide-react";

export function DocBanner() {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div>
        <p className="font-semibold">Draft / temporary documentation</p>
        <p className="mt-0.5 text-xs">
          These specs are still evolving. The shapes here match the
          deployed backend today, but treat them as a snapshot — they may
          change between platform releases. Canonical source lives at
          {" "}
          <a
            href="https://github.com/markli1hoshipu/hoshipu_website/tree/main/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-amber-700 underline hover:text-amber-900"
          >
            github.com/markli1hoshipu/hoshipu_website/docs
          </a>
          .
        </p>
      </div>
    </div>
  );
}
