
<script lang="ts">
    import { onMount } from 'svelte';

    import type { Category, ApiResponse } from '../../../lib/types';

    let categories = $state<Category[]>([]);

    let name = $state('');
    let description = $state('');

    let loading = $state(false);
    let submitting = $state(false);
    let errorMessage = $state('');
    let successMessage = $state('');

    // GET: Fetch categories
    async function getCategories() {
        loading = true;
        errorMessage = '';

        try {
            const response = await fetch('/api/categories');

            const result: ApiResponse<Category[]> = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to fetch categories.');
            }

            categories = result.data ?? [];
        } catch (error) {
            errorMessage = error instanceof Error
                ? error.message
                : 'Something went wrong.';
        } finally {
            loading = false;
        }
    }

    // POST: Add category
    async function addCategory(event: SubmitEvent) {
        event.preventDefault();

        if (!name.trim()) {
            errorMessage = 'Category name is required.';
            return;
        }

        submitting = true;
        errorMessage = '';
        successMessage = '';

        try {
            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || null
                })
            });

            const result: ApiResponse<Category> = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to create category.');
            }

            name = '';
            description = '';

            successMessage = 'Category added successfully.';

            await getCategories();

        } catch (error) {
            errorMessage = error instanceof Error
                ? error.message
                : 'Something went wrong.';
        } finally {
            submitting = false;
        }
    }

    onMount(() => {
        getCategories();
    });
</script>

<svelte:head>
    <title>Categories | Admin</title>
</svelte:head>

<div class="page-container">

    <!-- Page Header -->
    <div class="page-header">
        <div>
            <h1>Categories</h1>
            <p>Manage your store categories and organize your products.</p>
        </div>

        <span class="total-count">
            {categories.length} Categories
        </span>
    </div>

    <!-- Add Category Form -->
    <section class="form-card">
        <div class="section-header">
            <div>
                <h2>Add New Category</h2>
                <p>Create a category for your products.</p>
            </div>
        </div>

        <form onsubmit={addCategory}>
            <div class="form-grid">

                <div class="form-group">
                    <label for="name">Category Name *</label>
                    <input
                        id="name"
                        type="text"
                        placeholder="e.g. Clothing"
                        bind:value={name}
                        required
                    />
                </div>

                <div class="form-group">
                    <label for="description">Description</label>
                    <input
                        id="description"
                        type="text"
                        placeholder="Enter category description"
                        bind:value={description}
                    />
                </div>

            </div>

            <div class="form-actions">
                <button
                    type="submit"
                    class="add-button"
                    disabled={submitting}
                >
                    {#if submitting}
                        Adding...
                    {:else}
                        + Add Category
                    {/if}
                </button>
            </div>
        </form>

        {#if errorMessage}
            <p class="error-message">{errorMessage}</p>
        {/if}

        {#if successMessage}
            <p class="success-message">{successMessage}</p>
        {/if}
    </section>

    <!-- Categories Table -->
    <section class="table-card">

        <div class="section-header">
            <div>
                <h2>All Categories</h2>
                <p>View and manage your existing categories.</p>
            </div>
        </div>

        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Category Name</th>
                        <th>Description</th>
                     
                    </tr>
                </thead>

                <tbody>
                    {#if loading}
                        <tr>
                            <td colspan="4" class="empty-state">
                                Loading categories...
                            </td>
                        </tr>

                    {:else if categories.length === 0}
                        <tr>
                            <td colspan="4" class="empty-state">
                                No categories found. Add your first category above.
                            </td>
                        </tr>

                    {:else}
                        {#each categories as category, i (category.id)}
                            <tr>
                                <td>{i + 1}</td>

                                <td class="category-name">
                                    {category.name}
                                </td>

                                <td>
                                    {category.description || '—'}
                                </td>

            
                            </tr>
                        {/each}
                    {/if}
                </tbody>
            </table>
        </div>

    </section>

</div>

<style>
    .page-container {
        display: flex;
        flex-direction: column;
        gap: 24px;
        padding: 24px;
    }

    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    h1 {
        font-size: 24px;
        font-weight: 700;
        margin: 0 0 6px;
    }

    h2 {
        font-size: 17px;
        font-weight: 600;
        margin: 0 0 5px;
    }

    p {
        color: #777;
        font-size: 13px;
        margin: 0;
    }

    .total-count {
        background: #f1f1f1;
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 13px;
    }

    .form-card,
    .table-card {
        background: white;
        border: 1px solid #e5e5e5;
        border-radius: 10px;
        padding: 22px;
    }

    .section-header {
        margin-bottom: 22px;
    }

    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    label {
        font-size: 13px;
        font-weight: 600;
    }

    input {
        width: 100%;
        box-sizing: border-box;
        padding: 11px 12px;
        border: 1px solid #ddd;
        border-radius: 7px;
        outline: none;
        font-size: 13px;
    }

    input:focus {
        border-color: #333;
    }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 20px;
    }

    .add-button {
        background: #222;
        color: white;
        border: none;
        padding: 11px 20px;
        border-radius: 7px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
    }

    .add-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .table-wrapper {
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
    }

    th {
        background: #f8f8f8;
        color: #666;
        font-size: 12px;
        font-weight: 600;
    }

    th, td {
        padding: 14px 12px;
        border-bottom: 1px solid #eee;
        white-space: nowrap;
    }

    td {
        font-size: 13px;
    }

    .category-name {
        font-weight: 600;
    }

    .category-id {
        color: #888;
        font-family: monospace;
    }

    .empty-state {
        text-align: center;
        padding: 35px;
        color: #888;
    }

    .error-message {
        color: #dc2626;
        margin-top: 14px;
    }

    .success-message {
        color: #16a34a;
        margin-top: 14px;
    }

    @media (max-width: 650px) {
        .form-grid {
            grid-template-columns: 1fr;
        }

        .page-header {
            align-items: flex-start;
            gap: 12px;
        }
    }
</style>
