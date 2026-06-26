import { BenchAuthProvider } from "@/contexts/BenchAuthProvider";
import { BenchShell } from "./_components/BenchShell";

export default function BenchmarksLayout({ children }: { children: React.ReactNode }) {
  return (
    <BenchAuthProvider>
      <BenchShell>{children}</BenchShell>
    </BenchAuthProvider>
  );
}
