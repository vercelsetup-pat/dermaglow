import type { RequestHandler } from './$types';
import { asc, eq } from 'drizzle-orm';
import { db } from '#lib/db/index.ts';
import { subcategories } from '#lib/db/schema.ts';
import { asObject, cleanText, isUuid, pgCode } from '#lib/validate.ts';

// GET /api/subcategories                    -> all
// GET /api/subcategories?categoryId=<uuid>  -> those of one category
export const GET: RequestHandler = async ({ url }) => {
	try {
		const categoryId = url.searchParams.get('categoryId');
		if (categoryId && !isUuid(categoryId)) {
			return Response.json({ success: false, message: 'Invalid categoryId.' }, { status: 400 });
		}

		const result = await db
			.select()
			.from(subcategories)
			.where(categoryId ? eq(subcategories.categoryId, categoryId) : undefined)
			.orderBy(asc(subcategories.name));

		return Response.json({ success: true, data: result });
	} catch (error) {
		console.error('GET subcategories error:', error);
		return Response.json({ success: false, message: 'Failed to retrieve subcategories.' }, { status: 500 });
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
			return Response.json({ success: false, message: 'Subcategory name is required.' }, { status: 400 });
		}
		if (!isUuid(payload.categoryId)) {
			return Response.json({ success: false, message: 'A valid categoryId is required.' }, { status: 400 });
		}

		const [created] = await db
			.insert(subcategories)
			.values({
				categoryId: payload.categoryId,
				name,
				description: cleanText(payload.description)
			})
			.returning();

		return Response.json(
			{ success: true, message: 'Subcategory created successfully.', data: created },
			{ status: 201 }
		);
	} catch (error) {
		const code = pgCode(error);
		if (code === '23505') {
			return Response.json(
				{ success: false, message: 'This category already has a subcategory with that name.' },
				{ status: 409 }
			);
		}
		if (code === '23503') {
			return Response.json({ success: false, message: 'Category not found.' }, { status: 404 });
		}
		console.error('POST subcategories error:', error);
		return Response.json({ success: false, message: 'Failed to create subcategory.' }, { status: 500 });
	}
};