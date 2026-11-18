import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { db } from '#lib/db/index.ts';
import { categories } from '#lib/db/schema.ts';

export const GET: RequestHandler = async ({ params }) => {
  	try {
    	const [category] = await db.select().from(categories).where(eq(categories.id, params.id));
    	if (!category) {
      	return Response.json({ success: false, message: 'Category not found.' },{ status: 404 });
    }

    return Response.json({ success: true, data: category });

	} catch (error) {
		console.error('GET category error:', error);
		return Response.json({ success: false, message: 'Failed to retrieve category.' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const body: unknown = await request.json();
		if (!body || typeof body !== 'object' || Array.isArray(body)) {
			return Response.json({ success: false, message: 'Invalid request body.' }, { status: 400 });
		}

		const payload = body as Record<string, unknown>;
		const values: Partial<typeof categories.$inferInsert> = {};

		if ('name' in payload) {
			const name = typeof payload.name === 'string' ? payload.name.trim() : '';
			if (!name) {
				return Response.json({ success: false, message: 'Category name is required.' }, { status: 400 });
			}
			values.name = name;
		}

		if ('description' in payload) {
			values.description =
				typeof payload.description === 'string' ? payload.description.trim() || null : null;
		}

		if ('isActive' in payload) {
			if (typeof payload.isActive !== 'boolean') {
				return Response.json({ success: false, message: 'isActive must be true or false.' }, { status: 400 });
			}
			values.isActive = payload.isActive;
		}

		if (Object.keys(values).length === 0) {
			return Response.json({ success: false, message: 'Nothing to update.' }, { status: 400 });
		}

		const [updated] = await db
			.update(categories)
			.set(values)
			.where(eq(categories.id, params.id))
			.returning();

		if (!updated) {
			return Response.json({ success: false, message: 'Category not found.' }, { status: 404 });
		}

		return Response.json({ success: true, message: 'Category updated successfully.', data: updated });
	} catch (error) {
		console.error('PATCH category error:', error);
		return Response.json({ success: false, message: 'Failed to update category.' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
  	try {
		const [deleted] = await db.delete(categories).where(eq(categories.id, params.id)).returning();
		if (!deleted) {
			return Response.json({ success: false, message: 'Category not found.' },{ status: 404 });
		}

		return Response.json({success: true,message: 'Category deleted successfully.',data: deleted});
  	} catch (error) {
		console.error('DELETE category error:', error);
		return Response.json({ success: false, message: 'Failed to delete category.' },{ status: 500 });
  	}
};