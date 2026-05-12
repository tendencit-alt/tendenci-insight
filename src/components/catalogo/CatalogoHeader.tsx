import { cn } from "@/lib/utils";
import logoTendenci from "@/assets/logo-tendenci-catalogo.png";

interface CatalogoHeaderProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  logoUrl?: string | null;
  brandName?: string;
}

export function CatalogoHeader({
  categories,
  selectedCategory,
  onSelectCategory,
  logoUrl,
  brandName,
}: CatalogoHeaderProps) {
  const showCustomLogo = !!logoUrl;
  return (
    <header className="sticky top-0 z-50">
      <div className="bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-6">
            {showCustomLogo ? (
              <img
                src={logoUrl!}
                alt={brandName || "Logo"}
                className="h-12 md:h-16 object-contain"
              />
            ) : brandName ? (
              <span className="text-white text-2xl md:text-3xl font-bold tracking-wide">
                {brandName}
              </span>
            ) : (
              <img
                src={logoTendenci}
                alt="Logo"
                className="h-12 md:h-16 object-contain"
              />
            )}
          </div>
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="py-4">
            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => onSelectCategory(null)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
                  selectedCategory === null
                    ? "bg-[var(--catalog-primary,#C41E3A)] text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                Todos
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => onSelectCategory(category)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
                    selectedCategory === category
                      ? "bg-[var(--catalog-primary,#C41E3A)] text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
