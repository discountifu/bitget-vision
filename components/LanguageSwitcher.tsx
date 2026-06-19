"use client";

import { useState } from "react";
import { Globe, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { LOCALES, useI18n, type Locale } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LOCALES.find((l) => l.value === locale)?.label ?? locale;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-white/10 bg-black/50 text-white backdrop-blur-md hover:bg-white/10"
          >
            <Globe className="size-3.5" />
            <span className="font-mono text-[11px]">{current}</span>
            <ChevronDown className="size-3 opacity-60" />
          </Button>
        }
      />
      <DropdownMenuContent className="border-white/10 bg-black/80 text-white backdrop-blur-md">
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(v) => {
            setLocale(v as Locale);
            setOpen(false);
          }}
        >
          {LOCALES.map((l) => (
            <DropdownMenuRadioItem key={l.value} value={l.value}>
              {l.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
