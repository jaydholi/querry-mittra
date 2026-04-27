import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useSettings, FontSize } from "@/lib/settings-context";
import { useTheme } from "@/lib/theme-context";
import { Moon, Sun, Type } from "lucide-react";

const sizes: { value: FontSize; label: string }[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

export function SettingsDialog({
  open,
  onOpenChange,
  onClearChats,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onClearChats?: () => void;
}) {
  const s = useSettings();
  const { theme, toggle } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Customize your Querry Mittra experience</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Theme</Label>
              <p className="text-xs text-muted-foreground">Switch between dark and light</p>
            </div>
            <Button variant="outline" size="sm" onClick={toggle}>
              {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
          </div>

          {/* Font size */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Font size</Label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {sizes.map((sz) => (
                <Button
                  key={sz.value}
                  variant={s.fontSize === sz.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => s.setFontSize(sz.value)}
                  className={s.fontSize === sz.value ? "bg-brand-gradient text-primary-foreground" : ""}
                >
                  {sz.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Sound effects</Label>
                <p className="text-xs text-muted-foreground">Beep on new reply</p>
              </div>
              <Switch checked={s.soundOn} onCheckedChange={s.setSoundOn} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Enter to send</Label>
                <p className="text-xs text-muted-foreground">Off = Shift+Enter to send</p>
              </div>
              <Switch checked={s.enterToSend} onCheckedChange={s.setEnterToSend} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Show timestamps</Label>
                <p className="text-xs text-muted-foreground">Display message time</p>
              </div>
              <Switch checked={s.showTimestamps} onCheckedChange={s.setShowTimestamps} />
            </div>
          </div>

          {onClearChats && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <Label className="text-sm font-medium text-destructive">Danger zone</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Delete all your chat history. This cannot be undone.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-3"
                onClick={() => {
                  onClearChats();
                  onOpenChange(false);
                }}
              >
                Clear all chats
              </Button>
            </div>
          )}

          <div className="border-t border-border/60 pt-3 text-center text-[11px] text-muted-foreground">
            <p className="font-medium">Querry Mittra v1.0</p>
            <p>Kutch's First Developed AI Chatbot</p>
            <p>Built by Jay Dholi · Kutch, Gujarat</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
