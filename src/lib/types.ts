import type {
    Category,
    NewCategory,
    Subcategory,
    NewSubcategory,
    Product,
    NewProduct
} from '#lib/db/schema.ts';

export type {
    Category,
    NewCategory,
    Subcategory,
    NewSubcategory,
    Product,
    NewProduct
};

// API Response
export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}