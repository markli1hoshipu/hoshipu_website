/**
 * TokenInserter Component
 * Dropdown button for inserting CRM field tokens into template text
 */

import { Button } from "@/components/ui/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/primitives/dropdown-menu";
import { ChevronDown } from "lucide-react";

const AVAILABLE_TOKENS = [
  { label: "Company Name", value: "name", description: "Customer company name" },
  { label: "Primary Contact", value: "primary_contact", description: "Main contact person" },
  { label: "Industry", value: "industry", description: "Customer industry" },
  { label: "Email", value: "email", description: "Customer email address" },
  { label: "Phone", value: "phone", description: "Customer phone number" }
];

export function TokenInserter({ onInsert, variant = "outline", size = "sm", className }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          Insert Field <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {AVAILABLE_TOKENS.map((token) => (
          <DropdownMenuItem
            key={token.value}
            onClick={() => onInsert(`[${token.value}]`)}
            className="flex flex-col items-start"
          >
            <span className="font-medium">{token.label}</span>
            <span className="text-xs text-muted-foreground">{token.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default TokenInserter;
