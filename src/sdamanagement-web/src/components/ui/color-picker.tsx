import { HexColorPicker, HexColorInput } from "react-colorful";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  id?: string;
}

export function ColorPicker({ value, onChange, id }: ColorPickerProps) {
  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(value);
  const displayColor = isValidHex ? value : "#4F46E5";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div
            className="h-5 w-5 shrink-0 rounded border"
            style={{ backgroundColor: displayColor }}
          />
          <span className="font-mono text-muted-foreground">
            {value || "#______"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex flex-col gap-3">
          <HexColorPicker color={displayColor} onChange={onChange} />
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 shrink-0 rounded border"
              style={{ backgroundColor: displayColor }}
            />
            <HexColorInput
              color={value}
              onChange={onChange}
              prefixed
              aria-label="Hex color"
              className="h-8 flex-1 rounded-md border border-input bg-background px-2 font-mono text-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
