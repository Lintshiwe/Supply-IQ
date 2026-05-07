import { useState, useCallback, useRef, useEffect } from "react";
import { ScanBarcode, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useItems } from "@/hooks/useInventoryData";
import type { Item } from "@/types/inventory";
import { cn } from "@/lib/utils";

interface ScanButtonProps {
  onItemFound: (item: Item) => void;
  onNotFound?: (barcode: string) => void;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  placeholder?: string;
  autoFocus?: boolean;
}

export function ScanButton({
  onItemFound,
  onNotFound,
  className,
  variant = "outline",
  size = "icon",
  placeholder = "Scan or type barcode / SKU...",
  autoFocus = false,
}: ScanButtonProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: items } = useItems();

  useEffect(() => {
    if (open && autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, autoFocus]);

  const handleLookup = useCallback(() => {
    const q = value.trim();
    if (!q) return;
    setLoading(true);
    setError(null);

    const item = items?.find(
      (i) => i.barcode?.toLowerCase() === q.toLowerCase() || i.sku.toLowerCase() === q.toLowerCase()
    );

    if (item) {
      onItemFound(item);
      setValue("");
      setOpen(false);
    } else {
      setError(`No item found for "${q}"`);
      onNotFound?.(q);
    }
    setLoading(false);
  }, [value, items, onItemFound, onNotFound]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLookup();
    if (e.key === "Escape") { setOpen(false); setValue(""); setError(null); }
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setValue(""); setError(null); } }}>
      <PopoverTrigger asChild>
        <Button variant={variant} size={size} className={cn("shrink-0", className)} aria-label="Scan barcode">
          <ScanBarcode className="h-4 w-4" />
          {size !== "icon" && <span className="ml-2">Scan</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end" onKeyDown={handleKeyDown}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <ScanBarcode className="h-4 w-4 text-muted-foreground" />
              Scan Barcode
            </h4>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(null); }}
              placeholder={placeholder}
              className="h-10 font-mono text-sm"
              autoFocus
              autoComplete="off"
            />
            <Button onClick={handleLookup} disabled={!value.trim() || loading} className="h-10 px-4">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
            </Button>
          </div>

          {error && (
            <p className="text-xs text-destructive font-medium flex items-center gap-1">
              <X className="h-3 w-3" />
              {error}
            </p>
          )}

          <p className="text-[11px] text-muted-foreground">
            Type or paste a barcode or SKU. Use the SupplyIQ Scanner mobile app for camera scanning.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
