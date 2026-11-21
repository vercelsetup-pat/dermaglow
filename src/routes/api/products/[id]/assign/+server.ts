import { db } from '#lib/db/index.ts';
import { products, subcategories } from '#lib/db/schema.ts';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	const body = await request.json().catch(() => null);
	const categoryId: string | undefined = body?.categoryId;
	const subcategoryId: string | null = body?.subcategoryId || null;

	if (!categoryId) {
		return Response.json({ success: false, message: 'categoryId is required.' }, { status: 400 });
	}

	if (subcategoryId) {
		const [sub] = await db
			.select({ id: subcategories.id })
			.from(subcategories)
			.where(and(eq(subcategories.id, subcategoryId), eq(subcategories.categoryId, categoryId)));
		if (!sub) {
			return Response.json(
				{ success: false, message: 'That subcategory does not belong to this category.' },
				{ status: 400 }
			);
		}
	}

	const [data] = await db
		.update(products)
		.set({ categoryId, subcategoryId })
		.where(eq(products.id, params.id))
		.returning();

	if (!data) return Response.json({ success: false, message: 'Product not found.' }, { status: 404 });
	return Response.json({ success: true, data });
};