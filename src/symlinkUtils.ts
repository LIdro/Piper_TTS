import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SymlinkMapping {
    target: string;
    link: string;
}

export function getLinuxArchitecture(): string {
    const arch = os.arch();
    switch (arch) {
        case 'x64': return 'linux_x86_64';
        case 'arm64': return 'linux_aarch64';
        case 'arm': return 'linux_armv7l';
        default: return 'linux_x86_64'; // fallback
    }
}

export function getSymlinkMappings(): SymlinkMapping[] {
    return [
        { target: 'libespeak-ng.so.1.52.0.1', link: 'libespeak-ng.so.1' },
        { target: 'libespeak-ng.so.1', link: 'libespeak-ng.so' },
        { target: 'libonnxruntime.so.1.14.1', link: 'libonnxruntime.so' },
        { target: 'libpiper_phonemize.so.1.2.0', link: 'libpiper_phonemize.so.1' },
        { target: 'libpiper_phonemize.so.1', link: 'libpiper_phonemize.so' }
    ];
}

export async function fixSymlinks(extensionPath: string): Promise<void> {
    if (process.platform !== 'linux') {
        return; // Only fix on Linux
    }

    const architecture = getLinuxArchitecture();
    const binaryDir = path.join(extensionPath, 'piper', architecture);
    
    if (!fs.existsSync(binaryDir)) {
        console.warn(`Piper binary directory not found: ${binaryDir}`);
        return;
    }

    const symlinks = getSymlinkMappings();
    
    for (const { target, link } of symlinks) {
        await createSymlink(binaryDir, target, link);
    }
}

async function createSymlink(dir: string, target: string, link: string): Promise<void> {
    const linkPath = path.join(dir, link);
    const targetPath = path.join(dir, target);
    
    try {
        // Check if target file exists
        if (!fs.existsSync(targetPath)) {
            console.warn(`Target file not found: ${targetPath}`);
            return;
        }
        
        // Remove existing file/symlink if it exists
        if (fs.existsSync(linkPath)) {
            await fs.promises.unlink(linkPath);
        }
        
        // Create symbolic link
        await fs.promises.symlink(target, linkPath);
        console.log(`Created symlink: ${link} -> ${target}`);
        
    } catch (error) {
        console.error(`Failed to create symlink ${link} -> ${target}:`, error);
        // Don't throw - continue with other symlinks
    }
}