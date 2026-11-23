import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import { db } from '#lib/db/index.ts';
import { products, subcategories } from '#lib/db/schema.ts';
import { asObject, isUuid, pgCode } from '#lib/validate.ts';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		if (!isUuid(params.id)) {
			return Response.json({ success: false, message: 'Invalid id.' }, { status: 400 });
		}
		const payload = asObject(await request.json().catch(() => null));
		if (!payload) {
			return Response.json({ success: false, message: 'Invalid request body.' }, { status: 400 });
		}

		const categoryId = payload.categoryId;
		const subcategoryId = payload.subcategoryId || null;

		if (!isUuid(categoryId)) {
			return Response.json({ success: false, message: 'categoryId is required.' }, { status: 400 });
		}
		if (subcategoryId !== null && !isUuid(subcategoryId)) {
			return Response.json({ success: false, message: 'Invalid subcategoryId.' }, { status: 400 });
		}

		if (subcategoryId) {
			const [sub] = await db
				.select({ id: subcategories.id })
				.from(subcategories)
				.where(
					and(
						eq(subcategories.id, subcategoryId as string),
						eq(subcategories.categoryId, categoryId as string)
					)
				);
			if (!sub) {
				return Response.json(
					{ success: false, message: 'That subcategory does not belong to this category.' },
					{ status: 400 }
				);
			}
		}

		const [data] = await db
			.update(products)
			.set({ categoryId: categoryId as string, subcategoryId: subcategoryId as string | null })
			.where(eq(products.id, params.id))
			.returning();

		if (!data) {
			return Response.json({ success: false, message: 'Product not found.' }, { status: 404 });
		}
		return Response.json({ success: true, message: 'Product assigned successfully.', data });
	} catch (error) {
		if (pgCode(error) === '23503') {
			return Response.json({ success: false, message: 'Category not found.' }, { status: 400 });
		}
		console.error('ASSIGN product error:', error);
		return Response.json({ success: false, message: 'Failed to assign product.' }, { status: 500 });
	}
};