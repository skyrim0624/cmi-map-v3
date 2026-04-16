import os
import glob
from PIL import Image, ImageFilter, ImageDraw

def process(img_path):
    print("Processing", img_path)
    img = Image.open(img_path).convert("RGBA")
    r, g, b, a = img.split()
    
    mask = a.point(lambda p: 255 if p > 30 else 0)
    
    dilated = mask.filter(ImageFilter.MaxFilter(25))
    
    # To reliably flood fill, we should floodfill from multiple border points in case the object touches the edge
    w, h = dilated.size
    ImageDraw.floodfill(dilated, (0, 0), 128)
    ImageDraw.floodfill(dilated, (w-1, 0), 128)
    ImageDraw.floodfill(dilated, (0, h-1), 128)
    ImageDraw.floodfill(dilated, (w-1, h-1), 128)
    
    # 0 = hole, 128 = outside, 255 = dilated line
    def map_mask(p):
        return 0 if p == 128 else 255
        
    bg_mask = dilated.point(map_mask)
    
    # Shrink back the mask to fit the original line boundaries
    bg_mask = bg_mask.filter(ImageFilter.MinFilter(25))
    
    # To avoid jagged edges, blur slightly and threshold
    bg_mask = bg_mask.filter(ImageFilter.GaussianBlur(1))
    
    white_bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    transparent = Image.new("RGBA", img.size, (0, 0, 0, 0))
    
    bg = Image.composite(white_bg, transparent, bg_mask)
    bg.alpha_composite(img)
    bg.save(img_path)

for p in glob.glob("public/categories/*.png"):
    process(p)
print("Done")
