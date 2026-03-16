#!/usr/bin/env python3
"""
Manual Aseprite (.ase/.aseprite) parser and PNG converter
Based on Aseprite file format specification
"""

import os
import struct
import zlib
from pathlib import Path
from PIL import Image

def read_ase_file(filepath):
    """Parse an Aseprite file and extract frames"""
    with open(filepath, 'rb') as f:
        data = f.read()
    
    # Header (128 bytes)
    file_size = struct.unpack('<I', data[0:4])[0]
    magic = struct.unpack('<H', data[4:6])[0]
    
    if magic != 0xA5E0:
        raise ValueError(f"Invalid ASE magic number: {hex(magic)}")
    
    num_frames = struct.unpack('<H', data[6:8])[0]
    width = struct.unpack('<H', data[8:10])[0]
    height = struct.unpack('<H', data[10:12])[0]
    color_depth = struct.unpack('<H', data[12:14])[0]  # bits per pixel
    flags = struct.unpack('<I', data[14:18])[0]
    
    # Palette (for indexed mode)
    transparent_index = data[28]
    num_colors = struct.unpack('<H', data[32:34])[0]
    
    print(f"  Size: {width}x{height}, Frames: {num_frames}, Depth: {color_depth}bpp")
    
    # Read palette from header area (old format) if indexed
    palette = [(0, 0, 0, 255)] * 256
    
    # Parse frames starting at byte 128
    offset = 128
    frames = []
    layers = []
    
    for frame_idx in range(num_frames):
        if offset >= len(data):
            break
            
        # Frame header
        frame_size = struct.unpack('<I', data[offset:offset+4])[0]
        frame_magic = struct.unpack('<H', data[offset+4:offset+6])[0]
        
        if frame_magic != 0xF1FA:
            print(f"  Warning: Invalid frame magic at offset {offset}: {hex(frame_magic)}")
            offset += frame_size
            continue
        
        old_chunks = struct.unpack('<H', data[offset+6:offset+8])[0]
        frame_duration = struct.unpack('<H', data[offset+8:offset+10])[0]
        # bytes 10-11 reserved
        new_chunks = struct.unpack('<I', data[offset+12:offset+16])[0]
        
        num_chunks = new_chunks if new_chunks != 0 else old_chunks
        
        # Create frame image
        frame_image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        
        # Parse chunks
        chunk_offset = offset + 16
        for chunk_idx in range(num_chunks):
            if chunk_offset >= offset + frame_size:
                break
            if chunk_offset + 6 > len(data):
                break
                
            chunk_size = struct.unpack('<I', data[chunk_offset:chunk_offset+4])[0]
            chunk_type = struct.unpack('<H', data[chunk_offset+4:chunk_offset+6])[0]
            chunk_data = data[chunk_offset+6:chunk_offset+chunk_size]
            
            # Handle different chunk types
            if chunk_type == 0x2004:  # Layer chunk
                layer_flags = struct.unpack('<H', chunk_data[0:2])[0]
                layer_type = struct.unpack('<H', chunk_data[2:4])[0]
                layer_child_level = struct.unpack('<H', chunk_data[4:6])[0]
                # Skip default width/height (2+2 bytes)
                layer_blend_mode = struct.unpack('<H', chunk_data[10:12])[0]
                layer_opacity = chunk_data[12]
                # 3 bytes reserved
                name_len = struct.unpack('<H', chunk_data[16:18])[0]
                layer_name = chunk_data[18:18+name_len].decode('utf-8', errors='ignore')
                
                layers.append({
                    'name': layer_name,
                    'flags': layer_flags,
                    'type': layer_type,
                    'opacity': layer_opacity,
                    'blend_mode': layer_blend_mode,
                    'visible': (layer_flags & 1) != 0
                })
                
            elif chunk_type == 0x2005:  # Cel chunk
                layer_index = struct.unpack('<H', chunk_data[0:2])[0]
                x_pos = struct.unpack('<h', chunk_data[2:4])[0]  # signed
                y_pos = struct.unpack('<h', chunk_data[4:6])[0]  # signed
                opacity = chunk_data[6]
                cel_type = struct.unpack('<H', chunk_data[7:9])[0]
                # 7 bytes reserved (z-index + future)
                cel_data_offset = 16
                
                if cel_type == 0:  # Raw cel
                    cel_width = struct.unpack('<H', chunk_data[cel_data_offset:cel_data_offset+2])[0]
                    cel_height = struct.unpack('<H', chunk_data[cel_data_offset+2:cel_data_offset+4])[0]
                    pixel_data = chunk_data[cel_data_offset+4:]
                    
                    cel_image = decode_pixels(pixel_data, cel_width, cel_height, color_depth, palette)
                    if cel_image:
                        frame_image.paste(cel_image, (x_pos, y_pos), cel_image)
                    
                elif cel_type == 2:  # Compressed cel
                    cel_width = struct.unpack('<H', chunk_data[cel_data_offset:cel_data_offset+2])[0]
                    cel_height = struct.unpack('<H', chunk_data[cel_data_offset+2:cel_data_offset+4])[0]
                    compressed_data = chunk_data[cel_data_offset+4:]
                    
                    try:
                        pixel_data = zlib.decompress(compressed_data)
                        cel_image = decode_pixels(pixel_data, cel_width, cel_height, color_depth, palette)
                        if cel_image:
                            # Apply opacity
                            if opacity < 255:
                                cel_image = apply_opacity(cel_image, opacity)
                            frame_image.paste(cel_image, (x_pos, y_pos), cel_image)
                    except zlib.error as e:
                        print(f"  Decompression error: {e}")
                        
                elif cel_type == 1:  # Linked cel (references another frame)
                    linked_frame = struct.unpack('<H', chunk_data[cel_data_offset:cel_data_offset+2])[0]
                    # Would need to copy from that frame
                    
            elif chunk_type == 0x2019:  # Palette chunk (new format)
                palette_size = struct.unpack('<I', chunk_data[0:4])[0]
                first_color = struct.unpack('<I', chunk_data[4:8])[0]
                last_color = struct.unpack('<I', chunk_data[8:12])[0]
                # 8 bytes reserved
                entry_offset = 20
                
                for i in range(first_color, last_color + 1):
                    if entry_offset + 6 > len(chunk_data):
                        break
                    flags = struct.unpack('<H', chunk_data[entry_offset:entry_offset+2])[0]
                    r = chunk_data[entry_offset+2]
                    g = chunk_data[entry_offset+3]
                    b = chunk_data[entry_offset+4]
                    a = chunk_data[entry_offset+5]
                    palette[i] = (r, g, b, a)
                    entry_offset += 6
                    if flags & 1:  # Has name
                        name_len = struct.unpack('<H', chunk_data[entry_offset:entry_offset+2])[0]
                        entry_offset += 2 + name_len
                        
            elif chunk_type == 0x0004:  # Old palette chunk (64 colors)
                num_packets = struct.unpack('<H', chunk_data[0:2])[0]
                pkt_offset = 2
                color_idx = 0
                for _ in range(num_packets):
                    skip = chunk_data[pkt_offset]
                    num = chunk_data[pkt_offset+1]
                    if num == 0:
                        num = 256
                    color_idx += skip
                    pkt_offset += 2
                    for _ in range(num):
                        r = chunk_data[pkt_offset]
                        g = chunk_data[pkt_offset+1]
                        b = chunk_data[pkt_offset+2]
                        palette[color_idx] = (r, g, b, 255)
                        color_idx += 1
                        pkt_offset += 3
                        
            elif chunk_type == 0x0011:  # Old palette chunk (256 colors)
                num_packets = struct.unpack('<H', chunk_data[0:2])[0]
                pkt_offset = 2
                color_idx = 0
                for _ in range(num_packets):
                    skip = chunk_data[pkt_offset]
                    num = chunk_data[pkt_offset+1]
                    if num == 0:
                        num = 256
                    color_idx += skip
                    pkt_offset += 2
                    for _ in range(num):
                        r = chunk_data[pkt_offset]
                        g = chunk_data[pkt_offset+1]
                        b = chunk_data[pkt_offset+2]
                        palette[color_idx] = (r, g, b, 255)
                        color_idx += 1
                        pkt_offset += 3
            
            chunk_offset += chunk_size
        
        frames.append(frame_image)
        offset += frame_size
    
    return frames, width, height, palette

def decode_pixels(data, width, height, color_depth, palette):
    """Decode raw pixel data to an RGBA image"""
    try:
        img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        pixels = img.load()
        
        if color_depth == 32:  # RGBA
            for y in range(height):
                for x in range(width):
                    idx = (y * width + x) * 4
                    if idx + 4 <= len(data):
                        r, g, b, a = data[idx:idx+4]
                        pixels[x, y] = (r, g, b, a)
                        
        elif color_depth == 16:  # Grayscale + Alpha
            for y in range(height):
                for x in range(width):
                    idx = (y * width + x) * 2
                    if idx + 2 <= len(data):
                        v, a = data[idx:idx+2]
                        pixels[x, y] = (v, v, v, a)
                        
        elif color_depth == 8:  # Indexed
            for y in range(height):
                for x in range(width):
                    idx = y * width + x
                    if idx < len(data):
                        color_idx = data[idx]
                        pixels[x, y] = palette[color_idx]
                        
        return img
    except Exception as e:
        print(f"  Decode error: {e}")
        return None

def apply_opacity(img, opacity):
    """Apply opacity to an image"""
    r, g, b, a = img.split()
    a = a.point(lambda x: int(x * opacity / 255))
    return Image.merge('RGBA', (r, g, b, a))

def convert_ase_to_png(ase_path, output_dir=None):
    """Convert ASE file to PNG (first frame)"""
    try:
        base_name = os.path.splitext(os.path.basename(ase_path))[0]
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
            output_path = Path(output_dir) / f"{base_name}.png"
        else:
            output_path = Path(ase_path).with_suffix('.png')
        
        print(f"Converting: {ase_path}")
        frames, width, height, palette = read_ase_file(ase_path)
        
        if frames:
            # Save first frame
            frames[0].save(str(output_path), 'PNG')
            
            # Check if non-empty
            non_empty = frames[0].getbbox() is not None
            status = "✅" if non_empty else "⚠️ (empty)"
            print(f"  {status} -> {output_path}")
            return str(output_path)
        else:
            print(f"  ❌ No frames found")
            return None
            
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

def convert_all_in_directory(directory, output_dir=None):
    """Convert all ASE files in a directory"""
    converted = []
    for filename in sorted(os.listdir(directory)):
        if filename.endswith('.ase') or filename.endswith('.aseprite'):
            ase_path = os.path.join(directory, filename)
            result = convert_ase_to_png(ase_path, output_dir)
            if result:
                converted.append(result)
    return converted

if __name__ == "__main__":
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
    
    output_dir = '/home/ebourmpo/Desktop/bomberman/game/sprites'
    
    print("="*60)
    print("Aseprite to PNG Converter")
    print("="*60)
    
    total_converted = []
    for sprite_dir in sprite_dirs:
        if os.path.exists(sprite_dir):
            print(f"\n[{sprite_dir}]")
            converted = convert_all_in_directory(sprite_dir, output_dir)
            total_converted.extend(converted)
    
    print(f"\n{'='*60}")
    print(f"Total files converted: {len(total_converted)}")
