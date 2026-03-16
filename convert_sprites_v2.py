#!/usr/bin/env python3
"""
Convert Aseprite (.ase) files to PNG format - Fixed version
Properly composites all layers
"""

import os
from pathlib import Path
from PIL import Image
from aseprite_reader import AsepriteFile

def convert_ase_to_png(ase_path, output_dir=None):
    """Convert a single ASE file to PNG by compositing all layers"""
    try:
        # Read ASE file
        ase = AsepriteFile(ase_path)
        
        # Get output path
        base_name = os.path.splitext(os.path.basename(ase_path))[0]
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
            output_path = Path(output_dir) / f"{base_name}.png"
        else:
            output_path = Path(ase_path).with_suffix('.png')
        
        # Get dimensions
        width = ase.header.width
        height = ase.header.height
        
        # Create a new transparent image
        result = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        
        # Get the first frame
        frame = ase.frame(0)
        
        # Composite all cels (layers) in the frame
        if hasattr(frame, 'cels') and frame.cels:
            for cel in frame.cels:
                if hasattr(cel, 'image') and cel.image:
                    # Get cel position
                    x_offset = getattr(cel, 'x', 0) or 0
                    y_offset = getattr(cel, 'y', 0) or 0
                    
                    # Convert cel image to PIL Image
                    cel_img = cel.image
                    if hasattr(cel_img, 'convert'):
                        cel_img = cel_img.convert('RGBA')
                    
                    # Paste with alpha compositing
                    result.paste(cel_img, (x_offset, y_offset), cel_img)
        
        # If no cels, try to get pixel data directly
        if result.getbbox() is None:
            # Try using get_image or similar methods
            if hasattr(ase, 'get_image'):
                result = ase.get_image(0)
            elif hasattr(frame, 'image'):
                result = frame.image
            elif hasattr(ase, 'frames') and len(ase.frames) > 0:
                # Try to access raw frame data
                first_frame = ase.frames[0]
                if hasattr(first_frame, 'image'):
                    result = first_frame.image
        
        # Save the result
        result.save(str(output_path), 'PNG')
        
        # Check if image has content
        non_empty = result.getbbox() is not None
        status = "✅" if non_empty else "⚠️ (empty)"
        print(f"{status} Converted: {ase_path} -> {output_path} ({width}x{height})")
        
        return str(output_path)
        
    except Exception as e:
        print(f"❌ Error converting {ase_path}: {e}")
        import traceback
        traceback.print_exc()
        return None

def inspect_ase_file(ase_path):
    """Debug: Inspect the structure of an ASE file"""
    print(f"\n=== Inspecting {ase_path} ===")
    ase = AsepriteFile(ase_path)
    
    print(f"Header: {ase.header.width}x{ase.header.height}")
    print(f"Number of frames: {len(ase.frames) if hasattr(ase, 'frames') else 'unknown'}")
    
    frame = ase.frame(0)
    print(f"Frame type: {type(frame)}")
    print(f"Frame attributes: {[a for a in dir(frame) if not a.startswith('_')]}")
    
    if hasattr(frame, 'cels'):
        print(f"Cels count: {len(frame.cels)}")
        for i, cel in enumerate(frame.cels):
            print(f"  Cel {i}: {type(cel)}")
            print(f"    Attributes: {[a for a in dir(cel) if not a.startswith('_')]}")
            if hasattr(cel, 'image'):
                print(f"    Image: {cel.image}")
    
    print("=" * 50)

def convert_all_in_directory(directory, output_dir=None):
    """Convert all ASE files in a directory"""
    converted = []
    for filename in os.listdir(directory):
        if filename.endswith('.ase') or filename.endswith('.aseprite'):
            ase_path = os.path.join(directory, filename)
            result = convert_ase_to_png(ase_path, output_dir)
            if result:
                converted.append(result)
    return converted

if __name__ == "__main__":
    # First, inspect one file to understand the structure
    test_file = '/home/ebourmpo/Desktop/bomberman/blue/blue_idle.ase'
    if os.path.exists(test_file):
        inspect_ase_file(test_file)
    
    # Directories to convert
    sprite_dirs = [
        '/home/ebourmpo/Desktop/bomberman/black',
        '/home/ebourmpo/Desktop/bomberman/blue',
        '/home/ebourmpo/Desktop/bomberman/pink',
        '/home/ebourmpo/Desktop/bomberman/white',
        '/home/ebourmpo/Desktop/bomberman/bomb',
        '/home/ebourmpo/Desktop/bomberman/tiles',
        '/home/ebourmpo/Desktop/bomberman/heart',
        '/home/ebourmpo/Desktop/bomberman/mob',
    ]
    
    # Output directory
    output_dir = '/home/ebourmpo/Desktop/bomberman/game/sprites'
    
    print("\nConverting sprites...")
    total_converted = []
    for sprite_dir in sprite_dirs:
        if os.path.exists(sprite_dir):
            print(f"\nProcessing: {sprite_dir}")
            converted = convert_all_in_directory(sprite_dir, output_dir)
            total_converted.extend(converted)
    
    print(f"\n{'='*50}")
    print(f"Total files converted: {len(total_converted)}")
