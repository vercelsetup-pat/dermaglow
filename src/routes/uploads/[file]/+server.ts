import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { UPLOAD_DIR, MIME_BY_EXT } from '#lib/uploads.ts';

export const GET: RequestHandler = async ({ params }) => {
	const file = params.file;

	// Strict allow-list blocks path traversal like ../../etc/passwd
	if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(file)) throw error(404, 'Not found');

	try {
		const data = await readFile(path.join(UPLOAD_DIR, file));
		return new Response(data, {
			headers: {
				'Content-Type': MIME_BY_EXT[path.extname(file).toLowerCase()],
				'Cache-Control': 'public, max-age=31536000, immutable'
			}
		});
	} catch {
		throw error(404, 'Not found');
	}
};