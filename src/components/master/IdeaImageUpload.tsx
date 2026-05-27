import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IdeaImageUploadProps {
  onImageUploaded: (url: string, fileName: string, filePath: string) => void;
  disabled?: boolean;
}

export const IdeaImageUpload = ({ onImageUploaded, disabled }: IdeaImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione apenas arquivos de imagem');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 10MB');
      return;
    }

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('master-ideas-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: signed } = await supabase.storage
        .from('master-ideas-files')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7);

      onImageUploaded(signed?.signedUrl ?? '', file.name, filePath);
      toast.success('Imagem enviada!');
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      toast.error('Erro ao enviar imagem');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="gap-2"
      >
        <ImagePlus className="h-4 w-4" />
        Imagem
      </Button>
    </>
  );
};

interface ImagePreviewProps {
  url: string;
  fileName: string;
  onRemove: () => void;
  onInsert: () => void;
}

export const ImagePreview = ({ url, fileName, onRemove, onInsert }: ImagePreviewProps) => {
  return (
    <div className="relative group">
      <img 
        src={url} 
        alt={fileName}
        className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onInsert}
        title="Clique para inserir na descrição"
      />
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
      <span className="text-xs text-muted-foreground truncate max-w-[80px] block text-center mt-1">
        {fileName}
      </span>
    </div>
  );
};
