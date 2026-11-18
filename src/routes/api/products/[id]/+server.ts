import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { db } from '#lib/db/index.ts';
import { products } from '#lib/db/schema.ts';
import { asObject, cleanText, isUuid, parsePrice, pgCode } from '#lib/validate.ts';

export const GET: RequestHandler = async ({ params }) => {
	try {
		if (!isUuid(params.id)) {
			return Response.json({ success: false, message: 'Invalid id.' }, { status: 400 });
		}
		const [row] = await db.select().from(products).where(eq(products.id, params.id));
		if (!row) {
			return Response.json({ success: false, message: 'Product not found.' }, { status: 404 });
		}
		return Response.json({ success: true, data: row });
	} catch (error) {
		console.error('GET product error:', error);
		return Response.json({ success: false, message: 'Failed to retrieve product.' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		if (!isUuid(params.id)) {
			return Response.json({ success: false, message: 'Invalid id.' }, { status: 400 });
		}
		const payload = asObject(await request.json().catch(() => null));
		if (!payload) {
			return Response.json({ success: false, message: 'Invalid request body.' }, { status: 400 });
		}

		const values: Partial<typeof products.$inferInsert> = {};

		if ('name' in payload) {
			const name = typeof payload.name === 'string' ? payload.name.trim() : '';
			if (!name) {
				return Response.json({ success: false, message: 'Product name is required.' }, { status: 400 });
			}
			values.name = name;
		}

		if ('description' in payload) values.description = cleanText(payload.description);

		if ('price' in payload) {
			const price = parsePrice(payload.price);
			if (price === null) {
				return Response.json(
					{ success: false, message: 'Price must be a number greater than or equal to 0.' },
					{ status: 400 }
				);
			}
			values.price = price;
		}

		if ('categoryId' in payload) {
			if (!isUuid(payload.categoryId)) {
				return Response.json({ success: false, message: 'Invalid categoryId.' }, { status: 400 });
			}
			values.categoryId = payload.categoryId;
			// moving to another category clears the old subcategory unless a new one is sent
			if (!('subcategoryId' in payload)) values.subcategoryId = null;
		}

		if ('subcategoryId' in payload) {
			if (payload.subcategoryId !== null && !isUuid(payload.subcategoryId)) {
				return Response.json({ success: false, message: 'Invalid subcategoryId.' }, { status: 400 });
			}
			values.subcategoryId = payload.subcategoryId;
		}

		if (Object.keys(values).length === 0) {
			return Response.json({ success: false, message: 'Nothing to update.' }, { status: 400 });
		}

		const [updated] = await db.update(products).set(values).where(eq(products.id, params.id)).returning();

		if (!updated) {
			return Response.json({ success: false, message: 'Product not found.' }, { status: 404 });
		}
		return Response.json({ success: true, message: 'Product updated successfully.', data: updated });
	} catch (error) {
		if (pgCode(error) === '23503') {
			return Response.json(
				{ success: false, message: 'Category not found, or the subcategory does not belong to that category.' },
				{ status: 400 }
			);
		}
		console.error('PATCH product error:', error);
		return Response.json({ success: false, message: 'Failed to update product.' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		if (!isUuid(params.id)) {
			return Response.json({ success: false, message: 'Invalid id.' }, { status: 400 });
		}
		const [deleted] = await db.delete(products).where(eq(products.id, params.id)).returning();
		if (!deleted) {
			return Response.json({ success: false, message: 'Product not found.' }, { status: 404 });
		}
		return Response.json({ success: true, message: 'Product deleted successfully.', data: deleted });
	} catch (error) {
		console.error('DELETE product error:', error);
		return Response.json({ success: false, message: 'Failed to delete product.' }, { status: 500 });
	}
};