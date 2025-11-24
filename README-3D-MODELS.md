# 3D Models Setup Guide

This guide explains how to add 3D GLB models to your ShoesX website.

## Supported 3D Model Format

- **Format**: GLB (binary glTF)
- **Recommended Size**: Under 5MB per model for optimal loading
- **Tools**: Use Blender, Maya, or online converters to create GLB files

## Adding 3D Models

### Option 1: Local Files (Recommended for Development)

1. Place your GLB files in the project root directory:
   ```
   ShoesX/
   ├── index.html
   ├── style.css
   ├── app.js
   ├── shoe.glb          ← Runner shoe model
   ├── formal.glb        ← Formal shoe model
   ├── trail.glb         ← Trail shoe model
   └── court.glb         ← Court shoe model
   ```

2. The models are already referenced in `index.html`:
   - Hero section: `shoe.glb`
   - 3D Viewer section: `shoe.glb`, `formal.glb`, `trail.glb`, `court.glb`

### Option 2: CDN/Hosting Service

If you prefer to host models externally:

1. Upload your GLB files to a CDN (e.g., Cloudflare, AWS S3, Firebase Storage)
2. Update the `src` attributes in `index.html`:
   ```html
   <model-viewer src="https://your-cdn.com/models/shoe.glb" ...>
   ```

### Option 3: Free 3D Model Resources

You can find free shoe models at:
- [Sketchfab](https://sketchfab.com) - Search for "shoe" and filter by GLB format
- [Poly Haven](https://polyhaven.com)
- [TurboSquid](https://www.turbosquid.com) - Some free models available

## Testing Your Models

1. Open `index.html` in a modern browser (Chrome, Edge, Firefox)
2. Check the browser console for any loading errors
3. If a model fails to load, a fallback placeholder will appear automatically

## Model Optimization Tips

1. **Reduce Polygon Count**: Use decimation tools in Blender
2. **Compress Textures**: Use tools like `gltf-pipeline` to optimize
3. **Remove Unused Data**: Clean up materials and animations you don't need

## Example: Using gltf-pipeline

```bash
npm install -g gltf-pipeline
gltf-pipeline -i shoe.gltf -o shoe.glb --draco.compressionLevel 10
```

## Current Model References

The following models are referenced in the code:
- `shoe.glb` - Main runner shoe (used in hero and default viewer)
- `formal.glb` - Formal shoe model
- `trail.glb` - Trail running shoe model
- `court.glb` - Court/athletic shoe model

## Fallback Behavior

If a model file is missing or fails to load:
- A placeholder UI will automatically appear
- Users can still interact with the site
- No errors will break the page functionality

## Need Help?

If you need assistance:
1. Check browser console for specific error messages
2. Verify file paths are correct
3. Ensure GLB files are not corrupted
4. Test with a simple GLB model first

