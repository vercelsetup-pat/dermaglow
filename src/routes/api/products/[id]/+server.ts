import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { db } from '#lib/db/index.ts';
import { products } from '#lib/db/schema.ts';
import { asObject, cleanText, isUuid, parsePrice, parseQuantity, parseImageUrl, pgCode } from '#lib/validate.ts';

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

		if ('quantity' in payload) {
			const quantity =
				payload.quantity === null || payload.quantity === '' ? 0 : parseQuantity(payload.quantity);
			if (quantity === null) {
				return Response.json(
					{ success: false, message: 'Stock must be a whole number (0 or more).' },
					{ status: 400 }
				);
			}
			values.quantity = quantity;
		}

		if ('imageUrl' in payload) {
			const imageUrl = parseImageUrl(payload.imageUrl);
			if (imageUrl === undefined) {
				return Response.json({ success: false, message: 'Invalid image URL.' }, { status: 400 });
			}
			values.imageUrl = imageUrl;
		}

		let subcategoryId: string | null | undefined;
		if ('subcategoryId' in payload) {
			if (payload.subcategoryId !== null && !isUuid(payload.subcategoryId)) {
				return Response.json({ success: false, message: 'Invalid subcategoryId.' }, { status: 400 });
			}
			subcategoryId = payload.subcategoryId as string | null;
		}

		if ('categoryId' in payload) {
			if (payload.categoryId !== null && !isUuid(payload.categoryId)) {
				return Response.json({ success: false, message: 'Invalid categoryId.' }, { status: 400 });
			}
			values.categoryId = payload.categoryId as string | null;

			if (values.categoryId === null) {
				if (subcategoryId) {
					return Response.json(
						{ success: false, message: 'A product without a category cannot have a subcategory.' },
						{ status: 400 }
					);
				}
				values.subcategoryId = null;
			} else if (subcategoryId === undefined) {
				// moved to another category: the old subcategory no longer applies
				values.subcategoryId = null;
			}
		}

		if (subcategoryId !== undefined) values.subcategoryId = subcategoryId;

		if (Object.keys(values).length === 0) {
			return Response.json({ success: false, message: 'Nothing to update.' }, { status: 400 });
		}

		const [updated] = await db.update(products).set(values).where(eq(products.id, params.id)).returning();

		if (!updated) {
			return Response.json({ success: false, message: 'Product not found.' }, { status: 404 });
		}
		return Response.json({ success: true, message: 'Product updated successfully.', data: updated });
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
				{ success: false, message: 'A product with a subcategory must also have a category.' },
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