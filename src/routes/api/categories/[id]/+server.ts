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
    	const { name, description } = await request.json();
		if (!name?.trim()) {return Response.json({ success: false, message: 'Category name is required.' },{ status: 400 });}
    	const [updated] = await db.update(categories).set({ name: name.trim(), description: description?.trim() || null }).where(eq(categories.id, params.id)).returning();

		if (!updated) {
			return Response.json({ success: false, message: 'Category not found.' },{ status: 404 });
    	}

    	return Response.json({ success: true, message: 'Category updated successfully.',data: updated});
 	} catch (error) {
    	console.error('PATCH category error:', error);
    	return Response.json({ success: false, message: 'Failed to update category.' },{ status: 500 });
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