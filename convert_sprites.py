#!/usr/bin/env python3
"""
Convert Aseprite (.ase) files to PNG format
"""

import os
import sys
from pathlib import Path
from aseprite_reader import AsepriteFile

def convert_ase_to_png(ase_path, output_dir=None):
    """Convert a single ASE file to PNG"""
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
        
        # Get the first frame and render it
        frame = ase.frame(0)
        ase.render(frame, output_path)
        
        print(f"✅ Converted: {ase_path} -> {output_path}")
        return str(output_path)
        
    except Exception as e:
        print(f"❌ Error converting {ase_path}: {e}")
        return None

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
    os.makedirs(output_dir, exist_ok=True)
    
    print("🎨 Converting Aseprite files to PNG...")
    print("=" * 50)
    
    total_converted = []
    for sprite_dir in sprite_dirs:
        if os.path.exists(sprite_dir):
            print(f"\n📁 Processing: {sprite_dir}")
            converted = convert_all_in_directory(sprite_dir, output_dir)
            total_converted.extend(converted)
        else:
            print(f"⚠️ Directory not found: {sprite_dir}")
    
    print("\n" + "=" * 50)
    print(f"✅ Total files converted: {len(total_converted)}")
    print(f"📁 Output directory: {output_dir}")
