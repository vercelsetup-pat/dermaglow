import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { db } from '#lib/db/index.ts';
import { subcategories } from '#lib/db/schema.ts';
import { asObject, cleanText, isUuid, pgCode } from '#lib/validate.ts';

export const GET: RequestHandler = async ({ params }) => {
	try {
		if (!isUuid(params.id)) {
			return Response.json({ success: false, message: 'Invalid id.' }, { status: 400 });
		}
		const [row] = await db.select().from(subcategories).where(eq(subcategories.id, params.id));
		if (!row) {
			return Response.json({ success: false, message: 'Subcategory not found.' }, { status: 404 });
		}
		return Response.json({ success: true, data: row });
	} catch (error) {
		console.error('GET subcategory error:', error);
		return Response.json({ success: false, message: 'Failed to retrieve subcategory.' }, { status: 500 });
	}
};

// Only name and description can change. Moving a subcategory to another category is not
// allowed because its products reference (id, categoryId).
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		if (!isUuid(params.id)) {
			return Response.json({ success: false, message: 'Invalid id.' }, { status: 400 });
		}
		const payload = asObject(await request.json().catch(() => null));
		if (!payload) {
			return Response.json({ success: false, message: 'Invalid request body.' }, { status: 400 });
		}

		const values: Partial<typeof subcategories.$inferInsert> = {};

		if ('name' in payload) {
			const name = typeof payload.name === 'string' ? payload.name.trim() : '';
			if (!name) {
				return Response.json({ success: false, message: 'Subcategory name is required.' }, { status: 400 });
			}
			values.name = name;
		}
		if ('description' in payload) values.description = cleanText(payload.description);

		if (Object.keys(values).length === 0) {
			return Response.json({ success: false, message: 'Nothing to update.' }, { status: 400 });
		}

		const [updated] = await db
			.update(subcategories)
			.set(values)
			.where(eq(subcategories.id, params.id))
			.returning();

		if (!updated) {
			return Response.json({ success: false, message: 'Subcategory not found.' }, { status: 404 });
		}
		return Response.json({ success: true, message: 'Subcategory updated successfully.', data: updated });
	} catch (error) {
		if (pgCode(error) === '23505') {
			return Response.json(
				{ success: false, message: 'This category already has a subcategory with that name.' },
				{ status: 409 }
			);
		}
		console.error('PATCH subcategory error:', error);
		return Response.json({ success: false, message: 'Failed to update subcategory.' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		if (!isUuid(params.id)) {
			return Response.json({ success: false, message: 'Invalid id.' }, { status: 400 });
		}
		const [deleted] = await db.delete(subcategories).where(eq(subcategories.id, params.id)).returning();
		if (!deleted) {
			return Response.json({ success: false, message: 'Subcategory not found.' }, { status: 404 });
		}
		return Response.json({ success: true, message: 'Subcategory deleted successfully.', data: deleted });
	} catch (error) {
		// products still point at this subcategory (composite FK has no cascade)
		if (pgCode(error) === '23503') {
			return Response.json(
				{ success: false, message: 'This subcategory still has products. Move or delete them first.' },
				{ status: 409 }
			);
		}
		console.error('DELETE subcategory error:', error);
		return Response.json({ success: false, message: 'Failed to delete subcategory.' }, { status: 500 });
	}
};