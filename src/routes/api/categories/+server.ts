import type { RequestHandler } from './$types';

import { asc } from 'drizzle-orm';

import { db } from '#lib/db/index.ts';
import { categories } from '#lib/db/schema.ts';

import type { ApiResponse } from '#lib/types.ts';

// GET: Retrieve all categories
export const GET: RequestHandler = async () => {
  try {
    const result = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.createdAt));

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result
    };

    return Response.json(response);
  } catch (error) {
    console.error('GET categories error:', error);

    return Response.json(
      {
        success: false,
        message: 'Failed to retrieve categories.'
      },
      { status: 500 }
    );
  }
};

// POST: Create a new category
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return Response.json(
        { success: false, message: 'Invalid request body.' },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;

    const name =
      typeof payload.name === 'string'
        ? payload.name.trim()
        : '';

    const description =
      typeof payload.description === 'string'
        ? payload.description.trim()
        : null;

    if (!name) {
      return Response.json(
        {
          success: false,
          message: 'Category name is required.'
        },
        { status: 400 }
      );
    }

    const [newCategory] = await db
      .insert(categories)
      .values({
        name,
        description: description || null
      })
      .returning();

    const response: ApiResponse<typeof newCategory> = {
      success: true,
      message: 'Category created successfully.',
      data: newCategory
    };

    return Response.json(response, { status: 201 });
  } catch (error) {
    console.error('POST categories error:', error);

    return Response.json(
      {
        success: false,
        message: 'Failed to create category.'
      },
      { status: 500 }
    );
  }
};