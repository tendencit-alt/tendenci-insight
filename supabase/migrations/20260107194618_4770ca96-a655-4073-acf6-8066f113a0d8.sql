-- Add galeria and videos columns to products table for "Produto" category
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS galeria TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]';

-- Add comment for documentation
COMMENT ON COLUMN products.galeria IS 'Array of image URLs for product gallery';
COMMENT ON COLUMN products.videos IS 'JSON array of video objects with type, url, and nome fields';