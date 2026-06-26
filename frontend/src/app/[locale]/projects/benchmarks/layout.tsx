import { BenchAuthProvider } from "@/contexts/BenchAuthProvider";

export default function BenchmarksLayout({ children }: { children: React.ReactNode }) {
  return <BenchAuthProvider>{children}</BenchAuthProvider>;
}
