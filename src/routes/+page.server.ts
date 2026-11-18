import type { PageServerLoad } from './$types';
import { asc, eq } from 'drizzle-orm';
import { db } from '#lib/db/index.ts';
import { categories } from '#lib/db/schema.ts';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select({
			id: categories.id,
			name: categories.name,
			description: categories.description
		})
		.from(categories)
		.where(eq(categories.isActive, true))
		.orderBy(asc(categories.createdAt));

	return { categories: rows };
};