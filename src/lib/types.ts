import type {
	Category as DbCategory,
	NewCategory,
	Subcategory as DbSubcategory,
	NewSubcategory,
	Product as DbProduct,
	NewProduct
} from '#lib/db/schema.ts';

export type { DbCategory, NewCategory, DbSubcategory, NewSubcategory, DbProduct, NewProduct };

export interface ApiResponse<T> {
	success: boolean;
	message?: string;
	data?: T;
}

// Frontend interfaces (what the pages receive from the API)
export interface Category {
	id: string;
	name: string;
	description: string | null;
	isActive?: boolean;
	createdAt?: string | null;
	subCount?: number;
	productCount?: number;
}

export interface Subcategory {
	id: string;
	categoryId: string;
	name: string;
    createdAt: string;
	description: string | null;
}

export interface Product {
	id: string;
	categoryId: string | null;
	subcategoryId: string | null;
	name: string;
	description: string | null;
	price: string | number;
	imageUrl?: string | null;
	createdAt?: string | null;
}