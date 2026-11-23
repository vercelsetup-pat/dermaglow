import type { RequestHandler } from './$types';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '#lib/db/index.ts';
import { products } from '#lib/db/schema.ts';
import { asObject, cleanText, isUuid, parsePrice, parseQuantity, parseImageUrl, pgCode } from '#lib/validate.ts';


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

		const rawCategory = payload.categoryId ?? null;
		const rawSub = payload.subcategoryId ?? null;

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

		const imageUrl = parseImageUrl(payload.imageUrl ?? null);
		if (imageUrl === undefined) {
			return Response.json({ success: false, message: 'Invalid image URL.' }, { status: 400 });
		}

		const [created] = await db
			.insert(products)
			.values({
				categoryId: rawCategory as string | null,
				subcategoryId: rawSub as string | null,
				name,
				description: cleanText(payload.description),
				price,
				quantity,
				imageUrl
			})
			.returning();

		return Response.json(
			{ success: true, message: 'Product created successfully.', data: created },
			{ status: 201 }
		);
	} catch (error) {
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