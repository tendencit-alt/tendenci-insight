import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Video, X, Loader2, Link as LinkIcon, Plus } from "lucide-react";

export interface VideoItem {
  type: "upload" | "url";
  url: string;
  nome?: string;
}

interface ProductMediaUploaderProps {
  imageUrl: string | null;
  galeria: string[];
  videos: VideoItem[];
  onImageUrlChange: (url: string) => void;
  onGaleriaChange: (urls: string[]) => void;
  onVideosChange: (videos: VideoItem[]) => void;
  disabled?: boolean;
}

export default function ProductMediaUploader({
  imageUrl,
  galeria,
  videos,
  onImageUrlChange,
  onGaleriaChange,
  onVideosChange,
  disabled = false
}: ProductMediaUploaderProps) {
  const { toast } = useToast();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `produtos/${fileName}`;

    const { error } = await supabase.storage
      .from("ia-assets")
      .upload(filePath, file);

    if (error) throw error;

    const { data } = supabase.storage.from("ia-assets").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const newUrls: string[] = [];
      
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast({ title: "Arquivo inválido", description: "Apenas imagens são permitidas", variant: "destructive" });
          continue;
        }
        
        const url = await uploadImage(file);
        newUrls.push(url);
      }

      if (newUrls.length > 0) {
        // Se não há imagem principal, a primeira vai para imagem principal
        if (!imageUrl && newUrls.length > 0) {
          onImageUrlChange(newUrls[0]);
          onGaleriaChange([...galeria, ...newUrls.slice(1)]);
        } else {
          onGaleriaChange([...galeria, ...newUrls]);
        }
        toast({ title: `${newUrls.length} imagem(ns) adicionada(s)` });
      }
    } catch (error: any) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast({ title: "Arquivo inválido", description: "Apenas vídeos são permitidos", variant: "destructive" });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo de 50MB", variant: "destructive" });
      return;
    }

    setUploadingVideo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `produtos/videos/${fileName}`;

      const { error } = await supabase.storage
        .from("ia-assets")
        .upload(filePath, file);

      if (error) throw error;

      const { data } = supabase.storage.from("ia-assets").getPublicUrl(filePath);
      
      onVideosChange([...videos, { type: "upload", url: data.publicUrl, nome: file.name }]);
      toast({ title: "Vídeo adicionado" });
    } catch (error: any) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const addVideoUrl = () => {
    if (!videoUrlInput.trim()) return;
    
    const url = videoUrlInput.trim();
    if (!url.startsWith("http")) {
      toast({ title: "URL inválida", variant: "destructive" });
      return;
    }

    onVideosChange([...videos, { type: "url", url, nome: "Link externo" }]);
    setVideoUrlInput("");
    toast({ title: "Vídeo adicionado" });
  };

  const removeImage = (index: number) => {
    if (index === -1) {
      // Remover imagem principal
      if (galeria.length > 0) {
        onImageUrlChange(galeria[0]);
        onGaleriaChange(galeria.slice(1));
      } else {
        onImageUrlChange("");
      }
    } else {
      // Remover da galeria
      onGaleriaChange(galeria.filter((_, i) => i !== index));
    }
  };

  const removeVideo = (index: number) => {
    onVideosChange(videos.filter((_, i) => i !== index));
  };

  const setAsMainImage = (galeriaIndex: number) => {
    const newMainImage = galeria[galeriaIndex];
    const newGaleria = galeria.filter((_, i) => i !== galeriaIndex);
    if (imageUrl) {
      newGaleria.unshift(imageUrl);
    }
    onImageUrlChange(newMainImage);
    onGaleriaChange(newGaleria);
  };

  const allImages = [imageUrl, ...galeria].filter(Boolean) as string[];

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium flex items-center gap-2">
          <ImagePlus className="h-4 w-4" />
          Mídia do Produto
        </Label>
      </div>

      {/* Imagens */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">Imagens ({allImages.length})</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled || uploadingImage}
          >
            {uploadingImage ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Adicionar
          </Button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
            disabled={disabled}
          />
        </div>

        {allImages.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {allImages.map((url, idx) => (
              <div key={idx} className="relative group aspect-square">
                <img
                  src={url}
                  alt={`Imagem ${idx + 1}`}
                  className={`w-full h-full object-cover rounded-lg border-2 ${idx === 0 ? "border-primary" : "border-transparent"}`}
                />
                {idx === 0 && (
                  <span className="absolute top-1 left-1 text-[10px] bg-primary text-primary-foreground px-1 rounded">
                    Principal
                  </span>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                  {idx > 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setAsMainImage(idx - 1)}
                      title="Definir como principal"
                      aria-label="Definir imagem como principal"
                    >
                      ★
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeImage(idx === 0 ? -1 : idx - 1)}
                    aria-label="Remover imagem"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
            <ImagePlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma imagem adicionada</p>
          </div>
        )}
      </div>

      {/* Vídeos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground flex items-center gap-1">
            <Video className="h-3 w-3" />
            Vídeos ({videos.length})
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => videoInputRef.current?.click()}
            disabled={disabled || uploadingVideo}
          >
            {uploadingVideo ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Upload
          </Button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoUpload}
            disabled={disabled}
          />
        </div>

        {/* URL de vídeo */}
        <div className="flex gap-2">
          <Input
            placeholder="URL do vídeo (YouTube, Vimeo, etc)"
            value={videoUrlInput}
            onChange={(e) => setVideoUrlInput(e.target.value)}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addVideoUrl}
            disabled={disabled || !videoUrlInput.trim()}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </div>

        {videos.length > 0 && (
          <div className="space-y-2">
            {videos.map((video, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-background rounded-lg border">
                <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate flex-1" title={video.url}>
                  {video.nome || video.url}
                </span>
                <span className="text-xs text-muted-foreground">
                  {video.type === "upload" ? "Upload" : "Link"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeVideo(idx)}
                  aria-label="Remover vídeo"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
