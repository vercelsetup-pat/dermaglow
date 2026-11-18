import type { RequestHandler } from './$types';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '#lib/db/index.ts';
import { products } from '#lib/db/schema.ts';
import { asObject, cleanText, isUuid, parsePrice, pgCode } from '#lib/validate.ts';

// GET /api/products                          -> all
// GET /api/products?categoryId=<uuid>        -> every product of the category
//                                               (direct ones AND those in its subcategories)
// GET /api/products?subcategoryId=<uuid>     -> products of one subcategory
export const GET: RequestHandler = async ({ url }) => {
	try {
		const categoryId = url.searchParams.get('categoryId');
		const subcategoryId = url.searchParams.get('subcategoryId');

		if (categoryId && !isUuid(categoryId)) {
			return Response.json({ success: false, message: 'Invalid categoryId.' }, { status: 400 });
		}
		if (subcategoryId && !isUuid(subcategoryId)) {
			return Response.json({ success: false, message: 'Invalid subcategoryId.' }, { status: 400 });
		}

		const filters = [
			categoryId ? eq(products.categoryId, categoryId) : undefined,
			subcategoryId ? eq(products.subcategoryId, subcategoryId) : undefined
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
	try {
		const payload = asObject(await request.json().catch(() => null));
		if (!payload) {
			return Response.json({ success: false, message: 'Invalid request body.' }, { status: 400 });
		}

		const name = typeof payload.name === 'string' ? payload.name.trim() : '';
		if (!name) {
			return Response.json({ success: false, message: 'Product name is required.' }, { status: 400 });
		}
		if (!isUuid(payload.categoryId)) {
			return Response.json({ success: false, message: 'A valid categoryId is required.' }, { status: 400 });
		}

		const subcategoryId = payload.subcategoryId ?? null;
		if (subcategoryId !== null && !isUuid(subcategoryId)) {
			return Response.json({ success: false, message: 'Invalid subcategoryId.' }, { status: 400 });
		}

		const price = parsePrice(payload.price);
		if (price === null) {
			return Response.json(
				{ success: false, message: 'Price must be a number greater than or equal to 0.' },
				{ status: 400 }
			);
		}

		const [created] = await db
			.insert(products)
			.values({
				categoryId: payload.categoryId,
				subcategoryId,
				name,
				description: cleanText(payload.description),
				price
			})
			.returning();

		return Response.json(
			{ success: true, message: 'Product created successfully.', data: created },
			{ status: 201 }
		);
	} catch (error) {
		if (pgCode(error) === '23503') {
			return Response.json(
				{ success: false, message: 'Category not found, or the subcategory does not belong to that category.' },
				{ status: 400 }
			);
		}
		console.error('POST products error:', error);
		return Response.json({ success: false, message: 'Failed to create product.' }, { status: 500 });
	}
};