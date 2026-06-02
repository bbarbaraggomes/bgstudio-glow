import { useState } from "react";
import { Check, ChevronsUpDown, UserPlus, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Client } from "@/lib/types";
import { getClientBadge } from "@/lib/hooks/useReputation";

interface Props {
  value: string;
  onChange: (clientId: string) => void;
  clients: Client[];
  placeholder?: string;
  onCreateNew?: (name: string) => void;
}

export function ClientSearchCombobox({
  value,
  onChange,
  clients,
  placeholder = "Pesquisar cliente...",
  onCreateNew,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = clients.find((c) => c.id === value);

  const filtered = clients
    .filter(
      (c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.phone.includes(query)
    )
    .slice(0, 8);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between rounded-lg font-normal h-10"
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0 flex-1">
              <span className="truncate font-medium">{selected.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{selected.phone}</span>
            </span>
          ) : (
            <span className="text-muted-foreground flex-1 text-left">{placeholder}</span>
          )}
          <span className="flex items-center gap-1 ml-2 shrink-0">
            {selected && (
              <span
                onClick={handleClear}
                className="rounded p-0.5 hover:bg-secondary cursor-pointer"
                aria-label="Limpar"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-40" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 rounded-xl shadow-lg"
        style={{ width: "var(--radix-popover-trigger-width)" }}
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Nome ou telefone..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {filtered.length === 0 && !query && (
              <CommandEmpty>Pesquise por nome ou telefone</CommandEmpty>
            )}
            {filtered.length === 0 && query && !onCreateNew && (
              <CommandEmpty>Nenhuma cliente encontrada</CommandEmpty>
            )}
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((c) => {
                  const badge = getClientBadge(c.reputation_score ?? 100);
                  return (
                    <CommandItem
                      key={c.id}
                      value={c.id}
                      onSelect={(val) => {
                        onChange(val);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <div className="flex items-center gap-2 w-full min-w-0">
                        <Check
                          className={`h-4 w-4 shrink-0 ${value === c.id ? "opacity-100 text-primary" : "opacity-0"}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.phone}</p>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 font-medium ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            {query && onCreateNew && (
              <CommandGroup>
                <CommandItem
                  value={`__create__:${query}`}
                  onSelect={() => {
                    onCreateNew(query);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="gap-2 text-primary"
                >
                  <UserPlus className="h-4 w-4 shrink-0" />
                  <span className="text-sm">
                    Criar nova cliente:{" "}
                    <strong className="font-semibold">{query}</strong>
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
