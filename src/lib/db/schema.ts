
import { pgTable, uuid, varchar,boolean, text, numeric, timestamp, foreignKey, unique, index, check, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// 1. Categories
export const categories = pgTable('categories', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// 2. Subcategories
export const subcategories = pgTable('subcategories', {
        id: uuid('id').defaultRandom().primaryKey(),
        categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
        name: varchar('name', { length: 255 }).notNull(),
        description: text('description'),
        createdAt: timestamp('created_at').defaultNow().notNull()
    },(table) => [
        unique('unique_subcategory_name').on(table.categoryId, table.name),
        unique('unique_subcategory_id_category').on(table.id, table.categoryId),
        index('idx_subcategories_category_id').on(table.categoryId)
    ]
);

// 3. Products
export const products = pgTable('products', {
    id: uuid('id').defaultRandom().primaryKey(),
    categoryId: uuid('category_id').references(() => categories.id),
    subcategoryId: uuid('subcategory_id'),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    imageUrl: text('image_url'),  
    isActive: boolean('is_active').notNull().default(true),                               
    quantity: integer('quantity').notNull().default(0),  
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.subcategoryId, table.categoryId],
      foreignColumns: [subcategories.id, subcategories.categoryId],
      name: 'fk_product_subcategory_category'
    }),
    check('check_product_price', sql`${table.price} >= 0`),
    check('check_product_quantity', sql`${table.quantity} >= 0`),

    check(
      'check_product_subcategory_needs_category',
      sql`${table.subcategoryId} IS NULL OR ${table.categoryId} IS NOT NULL`
    ),
    index('idx_products_category_id').on(table.categoryId),
    index('idx_products_subcategory_id').on(table.subcategoryId)
  ]
);

export const categoriesRelations = relations(categories, ({ many }) => ({
    subcategories: many(subcategories),
    products: many(products)
  })
);

export const subcategoriesRelations = relations(subcategories,({ one, many }) => ({
    category: one(categories, { fields: [subcategories.categoryId], references: [categories.id] }),
    products: many(products)
  })
);

export const productsRelations = relations(products,({ one }) => ({
    category: one(categories, { fields: [products.categoryId], references: [categories.id]}),
    subcategory: one(subcategories, { fields: [products.subcategoryId], references: [subcategories.id]})
  })
);


export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Subcategory = typeof subcategories.$inferSelect;
export type NewSubcategory = typeof subcategories.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;