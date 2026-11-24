import path from 'node:path';

export const UPLOAD_DIR = path.resolve('uploads'); // project-root /uploads, not /static
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const IMAGE_TYPES: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp'
};

export const MIME_BY_EXT: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp'
};