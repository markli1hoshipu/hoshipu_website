import { Github, Linkedin, Twitter, Mail } from "lucide-react";
import Link from "next/link";

const socialLinks = [
  { name: "GitHub", href: process.env.NEXT_PUBLIC_GITHUB_URL || "#", icon: Github },
  { name: "LinkedIn", href: process.env.NEXT_PUBLIC_LINKEDIN_URL || "#", icon: Linkedin },
  { name: "Twitter", href: process.env.NEXT_PUBLIC_TWITTER_URL || "#", icon: Twitter },
  { name: "Email", href: process.env.NEXT_PUBLIC_EMAIL ? `mailto:${process.env.NEXT_PUBLIC_EMAIL}` : "#", icon: Mail },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Zhiyuan Li. All rights reserved.
          </p>
          <div className="flex items-center space-x-6">
            {socialLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={link.name}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
