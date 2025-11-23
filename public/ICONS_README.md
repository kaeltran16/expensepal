# App Icons Setup

The PWA requires icons in the following sizes. Place them in the `/public` directory:

## Required Icon Sizes:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## Quick Icon Generation:

### Option 1: Using an online tool
1. Visit: https://realfavicongenerator.net/
2. Upload a 512x512px logo
3. Download the generated icons
4. Place them in `/public/`

### Option 2: Using ImageMagick (command line)
```bash
# Start with a 512x512 source image (source.png)
convert source.png -resize 72x72 icon-72x72.png
convert source.png -resize 96x96 icon-96x96.png
convert source.png -resize 128x128 icon-128x128.png
convert source.png -resize 144x144 icon-144x144.png
convert source.png -resize 152x152 icon-152x152.png
convert source.png -resize 192x192 icon-192x192.png
convert source.png -resize 384x384 icon-384x384.png
convert source.png -resize 512x512 icon-512x512.png
```

### Option 3: Temporary placeholder icons
Run the provided script to generate simple placeholder icons:
```bash
npm run generate-icons
```

## Icon Design Guidelines:
- Use a simple, recognizable symbol (e.g., 💰 for expense tracking)
- Ensure good contrast against both light and dark backgrounds
- Keep the design clean and minimal
- Use a square aspect ratio with optional rounded corners
- Recommended colors: Blue gradient (#2563eb to #764ba2)
