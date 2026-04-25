import { useRef, useState } from "react";
import { Sparkles, Upload as UploadIcon, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface Props {
  value: string;
  onChange: (url: string) => void;
  // Used to seed the AI prompt and the upload filename.
  hint?: string;
}

const dataUrlToBlob = (dataUrl: string): Blob => {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
};

const uploadBlob = async (blob: Blob, hint: string): Promise<string> => {
  const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
  const slug = (hint || "cover")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "cover";
  const path = `${slug}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("game-covers").upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("game-covers").getPublicUrl(path);
  return data.publicUrl;
};

const CoverImagePicker = ({ value, onChange, hint }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const url = await uploadBlob(file, hint || file.name);
      onChange(url);
      toast({ title: "Cover uploaded" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    const prompt = (aiPrompt || hint || "").trim();
    if (!prompt) {
      toast({ title: "Add a description", description: "Type what the cover should depict, or fill in the title first.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cover", {
        body: { prompt },
      });
      if (error) throw error;
      const dataUrl = (data as { image?: string })?.image;
      if (!dataUrl) throw new Error("No image returned");
      // Persist immediately to storage so the game card has a stable URL
      const blob = dataUrlToBlob(dataUrl);
      const url = await uploadBlob(blob, hint || "ai-cover");
      onChange(url);
      toast({ title: "Cover generated", description: "Saved to bunker storage." });
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Cover image</Label>
      {value && (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Cover preview"
            className="h-32 w-48 rounded-md border border-primary/40 object-cover"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-2 -top-2 rounded-full border border-destructive bg-background p-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            aria-label="Remove cover"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <Input
        placeholder="Or paste an image URL..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={500}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Describe a cover to generate (e.g. 'pixel waffle warrior in a wasteland')"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          className="flex-1"
        />
        <Button type="button" onClick={handleGenerate} disabled={generating || uploading}>
          {generating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
          Generate
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={generating || uploading}
        >
          {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UploadIcon className="mr-1 h-4 w-4" />}
          Upload
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </div>
    </div>
  );
};

export default CoverImagePicker;
