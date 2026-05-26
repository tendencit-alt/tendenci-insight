import { useState } from "react";
import { ChevronLeft, ChevronRight, Play, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: string[];
  videos?: string[];
  productName: string;
}

export function ProductGallery({ images, videos = [], productName }: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  
  const allMedia = [
    ...images.map(url => ({ type: 'image' as const, url })),
    ...videos.map(url => ({ type: 'video' as const, url }))
  ];

  if (allMedia.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">Sem imagem</span>
      </div>
    );
  }

  const currentMedia = allMedia[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? allMedia.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === allMedia.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative">
      {/* Main Image/Video */}
      <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden relative group">
        {currentMedia.type === 'image' ? (
          <>
            <img
              src={currentMedia.url}
              alt={productName}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <button
              onClick={() => setZoomOpen(true)}
              className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ZoomIn className="h-5 w-5 text-gray-700" />
            </button>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <video
              src={currentMedia.url}
              controls
              className="max-w-full max-h-full"
              poster={images[0]}
            >
              Seu navegador não suporta vídeos.
            </video>
          </div>
        )}

        {/* Navigation Arrows */}
        {allMedia.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              aria-label="Imagem anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm hover:bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              aria-label="Próxima imagem"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm hover:bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {allMedia.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {allMedia.map((media, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                currentIndex === index
                  ? "border-[#C41E3A] ring-2 ring-[#C41E3A]/20"
                  : "border-transparent hover:border-gray-300"
              )}
            >
              {media.type === 'image' ? (
                <img
                  src={media.url}
                  alt={`${productName} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <Play className="h-4 w-4 text-gray-600" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Dots indicator for mobile */}
      {allMedia.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3 md:hidden">
          {allMedia.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                currentIndex === index
                  ? "bg-[#C41E3A] w-4"
                  : "bg-gray-300"
              )}
            />
          ))}
        </div>
      )}

      {/* Zoom Dialog */}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-none">
          <button
            onClick={() => setZoomOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full z-10"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          {currentMedia.type === 'image' && (
            <img
              src={currentMedia.url}
              alt={productName}
              className="w-full h-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
