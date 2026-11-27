import type { RequestHandler } from './$types';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '#lib/db/index.ts';
import { products } from '#lib/db/schema.ts';
import { asObject, cleanText, isUuid, parsePrice, parseQuantity, parseImageUrl, pgCode, parseBoolean } from '#lib/validate.ts';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { UPLOAD_DIR, MAX_IMAGE_SIZE, IMAGE_TYPES } from '#lib/uploads.ts';

type Payload = NonNullable<ReturnType<typeof asObject>>;

export const GET: RequestHandler = async ({ url }) => {
	try {
		const categoryId = url.searchParams.get('categoryId');
		const subcategoryId = url.searchParams.get('subcategoryId');
		const isActiveParam = url.searchParams.get('isActive');

		if (categoryId && !isUuid(categoryId)) {
			return Response.json({ success: false, message: 'Invalid categoryId.' }, { status: 400 });
		}
		if (subcategoryId && !isUuid(subcategoryId)) {
			return Response.json({ success: false, message: 'Invalid subcategoryId.' }, { status: 400 });
		}

		const isActive = isActiveParam === null ? null : parseBoolean(isActiveParam);
		if (isActiveParam !== null && isActive === null) {
			return Response.json({ success: false, message: 'Invalid isActive.' }, { status: 400 });
		}

		const filters = [
			categoryId ? eq(products.categoryId, categoryId) : undefined,
			subcategoryId ? eq(products.subcategoryId, subcategoryId) : undefined,
			isActive !== null ? eq(products.isActive, isActive) : undefined
		].filter((f) => f !== undefined);

		const result = await db
			.select()
			.from(products)
			.where(filters.length ? and(...filters) : undefined)
			.orderBy(asc(products.name));

		return Response.json({ success: true, data: result });
	} catch (error) {
		console.error('GET products error:', error);
		return Response.json({ success: false, message: 'Failed to retrieve products.' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	let savedFilePath: string | null = null;

	try {
		let payload: Payload | null = null;
		let imageFile: File | null = null;

		const contentType = request.headers.get('content-type') ?? '';

		if (contentType.includes('multipart/form-data')) {
			const form = await request.formData().catch(() => null);
			if (!form) {
				return Response.json({ success: false, message: 'Invalid request body.' }, { status: 400 });
			}

			const text = (key: string): string => {
				const v = form.get(key);
				return typeof v === 'string' ? v : '';
			};

			payload = {
				name: text('name'),
				description: text('description'),
				price: text('price'),
				quantity: text('quantity'),
				isActive: text('isActive'),
				categoryId: text('categoryId') || null,
				subcategoryId: text('subcategoryId') || null,
				imageUrl: null
			} as Payload;

			const img = form.get('image');
			if (img instanceof File && img.size > 0) imageFile = img;
		} else {
			payload = asObject(await request.json().catch(() => null));
		}

		if (!payload) {
			return Response.json({ success: false, message: 'Invalid request body.' }, { status: 400 });
		}

		const name = typeof payload.name === 'string' ? payload.name.trim() : '';
		if (!name) {
			return Response.json({ success: false, message: 'Product name is required.' }, { status: 400 });
		}

		const rawCategory = (payload.categoryId ?? null) as string | null;
		const rawSub = (payload.subcategoryId ?? null) as string | null;

		if (rawCategory !== null && !isUuid(rawCategory)) {
			return Response.json({ success: false, message: 'Invalid categoryId.' }, { status: 400 });
		}
		if (rawSub !== null && !isUuid(rawSub)) {
			return Response.json({ success: false, message: 'Invalid subcategoryId.' }, { status: 400 });
		}
		if (rawSub !== null && rawCategory === null) {
			return Response.json(
				{ success: false, message: 'Choose a category before choosing a subcategory.' },
				{ status: 400 }
			);
		}

		const price = parsePrice(payload.price);
		if (price === null) {
			return Response.json(
				{ success: false, message: 'Price must be a number greater than or equal to 0.' },
				{ status: 400 }
			);
		}

		const quantity =
			payload.quantity === undefined || payload.quantity === null || payload.quantity === ''
				? 0
				: parseQuantity(payload.quantity);
		if (quantity === null) {
			return Response.json(
				{ success: false, message: 'Stock must be a whole number (0 or more).' },
				{ status: 400 }
			);
		}

		// isActive defaults to true when not provided
		const isActive =
			payload.isActive === undefined || payload.isActive === null || payload.isActive === ''
				? true
				: parseBoolean(payload.isActive);
		if (isActive === null) {
			return Response.json(
				{ success: false, message: 'isActive must be true or false.' },
				{ status: 400 }
			);
		}

		const parsedUrl = parseImageUrl(payload.imageUrl ?? null);
		if (parsedUrl === undefined) {
			return Response.json({ success: false, message: 'Invalid image URL.' }, { status: 400 });
		}
		let imageUrl: string | null = parsedUrl;

		if (imageFile) {
			const ext = IMAGE_TYPES[imageFile.type];
			if (!ext) {
				return Response.json(
					{ success: false, message: 'Please upload a JPG, PNG, or WEBP image.' },
					{ status: 400 }
				);
			}
			if (imageFile.size > MAX_IMAGE_SIZE) {
				return Response.json(
					{ success: false, message: 'Image size must not exceed 5 MB.' },
					{ status: 400 }
				);
			}

			await mkdir(UPLOAD_DIR, { recursive: true });
			const filename = `${randomUUID()}${ext}`;
			const fullPath = path.join(UPLOAD_DIR, filename);
			await writeFile(fullPath, Buffer.from(await imageFile.arrayBuffer()));
			savedFilePath = fullPath;
			imageUrl = `/uploads/${filename}`;
		}

		const [created] = await db
			.insert(products)
			.values({
				categoryId: rawCategory,
				subcategoryId: rawSub,
				name,
				description: cleanText(payload.description),
				price,
				quantity,
				isActive,
				imageUrl
			})
			.returning();

		return Response.json(
			{ success: true, message: 'Product created successfully.', data: created },
			{ status: 201 }
		);
	} catch (error) {
		if (savedFilePath) await unlink(savedFilePath).catch(() => {});

		const code = pgCode(error);
		if (code === '23503') {
			return Response.json(
				{ success: false, message: 'Category not found, or the subcategory does not belong to the selected category.' },
				{ status: 400 }
			);
		}
		if (code === '23514') {
			return Response.json(
				{ success: false, message: 'Some values are not allowed (check price, stock, and category/subcategory).' },
				{ status: 400 }
			);
		}
		console.error('POST products error:', error);
		return Response.json({ success: false, message: 'Failed to create product.' }, { status: 500 });
	}
};