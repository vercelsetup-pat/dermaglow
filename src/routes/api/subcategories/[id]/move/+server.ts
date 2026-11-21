import { db } from '#lib/db/index.ts';
import { categories, products, subcategories } from '#lib/db/schema.ts';
import { eq, inArray } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	const body = await request.json().catch(() => null);
	const categoryId: string | undefined = body?.categoryId;
	if (!categoryId) {
		return Response.json({ success: false, message: 'categoryId is required.' }, { status: 400 });
	}

	const [cat] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId));
	if (!cat) return Response.json({ success: false, message: 'Category not found.' }, { status: 404 });

	try {
		const data = await db.transaction(async (tx) => {
			const [sub] = await tx.select().from(subcategories).where(eq(subcategories.id, params.id));
			if (!sub) return null;
			if (sub.categoryId === categoryId) return sub;

			const prods = await tx
				.select({ id: products.id })
				.from(products)
				.where(eq(products.subcategoryId, sub.id));
			const ids = prods.map((p) => p.id);

			// 1) detach products (FK is skipped while subcategoryId is null)
			await tx.update(products).set({ subcategoryId: null }).where(eq(products.subcategoryId, sub.id));
			// 2) move the subcategory
			const [updated] = await tx
				.update(subcategories)
				.set({ categoryId })
				.where(eq(subcategories.id, sub.id))
				.returning();
			// 3) re-attach the products to the new category + same subcategory
			if (ids.length) {
				await tx.update(products).set({ categoryId, subcategoryId: sub.id }).where(inArray(products.id, ids));
			}
			return updated;
		});

		if (!data) return Response.json({ success: false, message: 'Subcategory not found.' }, { status: 404 });
		return Response.json({ success: true, data });
	} catch (e: any) {
		if (e?.code === '23505' || e?.cause?.code === '23505') {
			return Response.json(
				{ success: false, message: 'That category already has a subcategory with this name.' },
				{ status: 409 }
			);
		}
		return Response.json({ success: false, message: 'Could not move subcategory.' }, { status: 500 });
	}
};