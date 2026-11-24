<script lang="ts">
	import { onMount } from 'svelte';
	import type { Category, Subcategory, Product } from '#lib/types.ts';
	 import {
        PlusOutline,
        TrashBinOutline,
        LayersOutline,
        CheckCircleOutline,
        ExclamationCircleOutline,
        CloseCircleOutline,
        DotsVerticalOutline,
        EditOutline,
        SearchOutline,
        ChevronDownOutline,
        FilterOutline,
        CloseOutline,
		ArrowDownToBracketOutline
    } from 'flowbite-svelte-icons';
 	import { Dropdown, DropdownItem, Button, Toggle,Badge} from 'flowbite-svelte';
	type SortKey = 'name' |'description' | 'price' | 'category' | 'subcategory' |'quantity' | 'status';

	type Column = {
		key: SortKey;
		label: string;
		sortable?: boolean;
	};

	// To add a header, add one line here (and its <td> in the body)
	const columns: Column[] = [
		{ key: 'name', label: 'Product Name', sortable: true },
		{ key: 'description', label: 'Description', sortable: true },
		{ key: 'price', label: 'Price', sortable: true },
		{ key: 'category', label: 'Category', sortable: true },
		{ key: 'subcategory', label: 'Sub Category', sortable: true },
		{ key: 'quantity', label: 'Quantity', sortable: true },
		{ key: 'status', label: 'Status', sortable: true }
	];

	
	// +1 checkbox column, +1 actions column
	const colSpan = $derived(columns.length + 2);

	const CATEGORIES_API = '/api/categories';
	const SUBCATEGORIES_API = '/api/subcategories';
	const API = '/api/products';
	const NONE = '__none__'; 

	//#region Boolean Variables
		let loading = $state(true);
		let saving = $state(false);
		let adding = $state(false);
		let showAddModal = $state(false);
    	let showFilters = $state(false);
	//#endregion

	//#region String Varibales
		let categoryId = $state('');
		let subcategoryId = $state('');
		let filterCategoryId = $state('');
		let filterSubId = $state('');
		let search = $state('');
		let name = $state('');
		let description = $state('');
	
		let formError = $state('');
		let editCategoryId = $state('');
		let editSubcategoryId = $state('');
		let editName = $state('');
		let editDescription = $state('');
		let editError = $state('');
	//#endregion

	//#region Other Varianles
		let categories = $state<Category[]>([]);
		let subcategories = $state<Subcategory[]>([]);
		let products = $state<Product[]>([]);
		let price = $state<number | string | null>('');
		let editing = $state<Product | null>(null);
		let editPrice = $state<number | string | null>('');
		let confirmingId = $state<string | null>(null);
		let deletingId = $state<string | null>(null);
		let toast = $state<{ type: 'success' | 'error'; text: string } | null>(null);
		let toastTimer: ReturnType<typeof setTimeout> | undefined;
	//#endregion
	
	const categoryNames = $derived(new Map(categories.map((c) => [c.id, c.name])));
	const subNames = $derived(new Map(subcategories.map((s) => [s.id, s.name])));

	const formSubs = $derived(subcategories.filter((s) => s.categoryId === categoryId));
	const editSubs = $derived(subcategories.filter((s) => s.categoryId === editCategoryId));
	const filterSubs = $derived(subcategories.filter((s) => s.categoryId === filterCategoryId));
	const totalProducts = $derived(products.length);
	const inStock = $derived(
        products.filter((p) => Number(p.quantity) > 5).length
    );

	const lowStock = $derived(
        products.filter(
            (p) => Number(p.quantity) > 0 && Number(p.quantity) <= 5
        ).length
    );

    const outOfStock = $derived(
        products.filter((p) => Number(p.quantity) <= 0).length
    );

	const catName = (id: string | null) => (id ? (categoryNames.get(id) ?? 'Unknown category') : '');
	const subName = (id: string | null) => (id ? (subNames.get(id) ?? 'Unknown subcategory') : '');

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		return products.filter((p) => {
			if (filterCategoryId === NONE) {
				if (p.categoryId) return false;
			} else if (filterCategoryId && p.categoryId !== filterCategoryId) {
				return false;
			}
			if (filterSubId === NONE && p.subcategoryId) return false;
			if (filterSubId && filterSubId !== NONE && p.subcategoryId !== filterSubId) return false;
			if (!q) return true;
			return (
				p.name.toLowerCase().includes(q) ||
				(p.description ?? '').toLowerCase().includes(q) ||
				catName(p.categoryId).toLowerCase().includes(q) ||
				subName(p.subcategoryId).toLowerCase().includes(q)
			);
		});
	});

	const money = (v: number | string) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

	//#region Functions
		function notify(type: 'success' | 'error', text: string) {
			toast = { type, text };
			clearTimeout(toastTimer);
			toastTimer = setTimeout(() => (toast = null), 3000);
		}

		function formatDate(value?: string | null) {
			if (!value) return '—';
			const d = new Date(value);
			if (Number.isNaN(d.getTime())) return '—';
			return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
		}

		function validPrice(value: number | string | null) {
			const s = String(value ?? '').trim();
			if (s === '') return false;
			const n = Number(s);
			return Number.isFinite(n) && n >= 0;
		}

		function openEdit(p: Product) {
			editing = p;
			editCategoryId = p.categoryId ?? '';
			editSubcategoryId = p.subcategoryId ?? '';
			editName = p.name;
			editPrice = String(p.price);
			editDescription = p.description ?? '';
			editError = '';
		}

		function closeEdit() {
			if (saving) return;
			editing = null;
		}
	//#endregion

	//#region Async Functions
		async function api<T>(url: string, init?: RequestInit): Promise<T> {
			const res = await fetch(url, {
				headers: { 'Content-Type': 'application/json' },
				...init
			});
			const body = await res.json().catch(() => null);
			if (!res.ok || !body?.success) {
				throw new Error(body?.message ?? 'Something went wrong. Please try again.');
			}
			return body.data as T;
		}

		async function addProduct(e: SubmitEvent) {
			e.preventDefault();
			formError = '';
			if (!name.trim()) {
				formError = 'Enter a product name.';
				return;
			}
			if (!validPrice(price)) {
				formError = 'Enter a valid price (0 or more).';
				return;
			}
			adding = true;
			try {
				const created = await api<Product>(API, {
					method: 'POST',
					body: JSON.stringify({
						categoryId: categoryId || null,
						subcategoryId: categoryId ? subcategoryId || null : null,
						name,
						price,
						description
					})
				});
				products = [created, ...products]; 
				name = '';
				price = '';
				description = '';
				notify('success', 'Product added.');
			} catch (err) {
				formError = err instanceof Error ? err.message : 'Could not add product.';
			} finally {
				adding = false;
			}
		}

		async function saveEdit(e: SubmitEvent) {
			e.preventDefault();
			if (!editing) return;
			if (!editName.trim()) {
				editError = 'Enter a product name.';
				return;
			}
			if (!validPrice(editPrice)) {
				editError = 'Enter a valid price (0 or more).';
				return;
			}
			saving = true;
			editError = '';
			try {
				const updated = await api<Product>(`${API}/${editing.id}`, {
					method: 'PATCH',
					body: JSON.stringify({
						categoryId: editCategoryId || null,
						subcategoryId: editCategoryId ? editSubcategoryId || null : null,
						name: editName,
						price: editPrice,
						description: editDescription
					})
				});
				products = products.map((p) => (p.id === updated.id ? { ...p, ...updated } : p));
				editing = null;
				notify('success', 'Changes saved.');
			} catch (err) {
				editError = err instanceof Error ? err.message : 'Could not save changes.';
			} finally {
				saving = false;
			}
		}

		async function removeProduct(id: string) {
			deletingId = id;
			try {
				await api(`${API}/${id}`, { method: 'DELETE' });
				products = products.filter((p) => p.id !== id);
				notify('success', 'Product deleted.');
			} catch (err) {
				notify('error', err instanceof Error ? err.message : 'Could not delete product.');
			} finally {
				deletingId = null;
				confirmingId = null;
			}
		}
	//#endregion

	onMount(async () => {
		try {
			[categories, subcategories, products] = await Promise.all([
				api<Category[]>(CATEGORIES_API),
				api<Subcategory[]>(SUBCATEGORIES_API),
				api<Product[]>(API)
			]);
		} catch (e) {
			notify('error', e instanceof Error ? e.message : 'Could not load data.');
		} finally {
			loading = false;
		}
	});

	let selected = $state<string[]>([]);
	let sortDir = $state<'asc' | 'desc'>('desc');
	let sortKey = $state<SortKey>('name');

	function sortBy(key: SortKey) {
		if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else {
			sortKey = key;
			sortDir = 'asc';
		}
	}

	const sorted = $derived.by(() => {
		const dir = sortDir === 'asc' ? 1 : -1;
		return [...filtered].sort((a, b) => {
			switch (sortKey) {
				case 'name': return a.name.localeCompare(b.name) * dir;
				case 'price': return (Number(a.price) - Number(b.price)) * dir;
				case 'category': return catName(a.categoryId).localeCompare(catName(b.categoryId)) * dir;
				default: return (new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()) * dir;
			}
		});
	});

	const allSelected = $derived(sorted.length > 0 && sorted.every((p) => selected.includes(p.id)));
	function toggleAll() {
		selected = allSelected ? [] : sorted.map((p) => p.id);
	}


	function clearFilters() {
        filterCategoryId = '';
        filterSubId = '';
        search = '';
    }

    const hasActiveFilters = $derived(
        !!filterCategoryId ||
        !!filterSubId ||
        !!search.trim()
    );
	const initials = (n: string) => n.trim().slice(0, 2).toUpperCase();
	
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && closeEdit()} />

<div class="page-content space-y-4">
	<!--Header-->
	<div class="flex items-center justify-between gap-4 pb-6 border-b border-gray-200">
		<div class="flex items-center gap-3">
			<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
				<LayersOutline class="h-9 w-9" color="#0278BD"/>
			</div>
			<div>
				<h1 class="text-2xl font-semibold leading-tight text-[var(--color-primary)]">Products</h1>
				<p class="text-sm text-gray-500">Manage and collaborate on your products listing</p>
			</div>
		</div>

		<Button class="btn-secondary flex items-center gap-2">
			<PlusOutline class="h-4 w-4" />
			Add Product
		</Button>
	</div>

	<!--Card-->
	<div class="grid grid-cols-1 overflow-hidden rounded-xl border border-gray-200 bg-white sm:grid-cols-2 xl:grid-cols-4">

        <!-- Total Products -->
        <div class="flex items-center justify-between border-b border-gray-100 p-5 transition hover:bg-gray-50/50 sm:border-r xl:border-b-0">
            <div>
                <p class="text-xs font-medium text-gray-500">Total Products</p>
                <p class="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{totalProducts.toLocaleString()}</p>
                <p class="mt-1.5 text-xs text-gray-400">All items in your store</p>
            </div>
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <LayersOutline class="h-6 w-6" />
            </div>
        </div>

        <!-- In Stock -->
        <div class="flex items-center justify-between border-b border-gray-100 p-5 transition hover:bg-gray-50/50 xl:border-b-0 xl:border-r">
            <div>
                <p class="text-xs font-medium text-gray-500">In Stock</p>
                <p class="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{inStock.toLocaleString()}</p>
                <p class="mt-1.5 text-xs text-gray-400">More than 5 available</p>
            </div>
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <CheckCircleOutline class="h-6 w-6" />
            </div>
        </div>

        <!-- Low Stock -->
        <div class="flex items-center justify-between border-b border-gray-100 p-5 transition hover:bg-gray-50/50 sm:border-r xl:border-b-0">
            <div>
                <p class="text-xs font-medium text-gray-500">Low Stock</p>
                <p class="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{lowStock.toLocaleString()}</p>
                <p class="mt-1.5 text-xs text-gray-400">5 or fewer available</p>
            </div>
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <ExclamationCircleOutline class="h-6 w-6" />
            </div>
        </div>

        <!-- Out of Stock -->
        <div class="flex items-center justify-between p-5 transition hover:bg-gray-50/50">
            <div>
                <p class="text-xs font-medium text-gray-500">Out of Stock</p>
                <p class="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{outOfStock.toLocaleString()}</p>
                <p class="mt-1.5 text-xs text-gray-400">Needs restocking</p>
            </div>

            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <CloseCircleOutline class="h-6 w-6" />
            </div>
        </div>
    </div>

	<!--Table-->
	<section>
        <!-- TOOLBAR -->
        <div class="flex flex-wrap items-center justify-between gap-3 pb-4">
            <div class="relative w-full sm:w-72"> 
                <SearchOutline class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    type="search"
                    placeholder="Search products..."
                    aria-label="Search products"
                    bind:value={search}
                    class="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#0278BD] focus:ring-2 focus:ring-[#0278BD]/10"
                />
            </div>

            <div class="flex flex-wrap items-center gap-2">
                {#if hasActiveFilters}
                    <button type="button" onclick={clearFilters} class="rounded-lg px-3 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800">
                        Clear filters
                    </button>
                {/if}

				<Button type="button" onclick={() => showFilters = !showFilters} color="light" class="inline-flex items-center gap-2 px-3 py-2 text-sm">
                    <ArrowDownToBracketOutline  class="h-4 w-4" />
                    Export
                </Button>

				 <Button type="button" onclick={() => showFilters = !showFilters} color="light" class="inline-flex items-center gap-2 px-3 py-2 text-sm">
                    <FilterOutline class="h-4 w-4" />
                    Filter
                    {#if hasActiveFilters}
                        <span class="h-1.5 w-1.5 rounded-full bg-[#0278BD]"></span>
                    {/if}
				</Button>
            </div>
        </div>

        <!-- TABLE -->
        <div class="overflow-x-auto border-t border-gray-100">
            <table class="w-full min-w-[760px] text-left text-sm">
                <!-- TABLE HEADER -->
                <thead class="bg-gray-50/70 text-xs font-medium text-gray-500">
					<tr class="border-b border-gray-100">
						<th class="w-12 px-4 py-3">
							<input
								type="checkbox"
								checked={allSelected}
								onchange={toggleAll}
								class="h-4 w-4 rounded border-gray-300 text-[#0278BD] focus:ring-[#0278BD]/30"
								aria-label="Select all products"
							/>
						</th>

						{#each columns as col (col.key)}
							<th class="px-4 py-3">
								{#if col.sortable}
									<button type="button" onclick={() => sortBy(col.key)} class="inline-flex items-center gap-1.5 transition hover:text-gray-900 {sortKey === col.key ? 'text-gray-900' : ''}">
										{col.label}
										<ChevronDownOutline class="h-3.5 w-3.5 transition {sortKey === col.key ? 'text-[#0278BD]' : ''} {sortKey === col.key && sortDir === 'asc' ? 'rotate-180' : ''}"/>
									</button>
								{:else}
									{col.label}
								{/if}
							</th>
						{/each}
						<th class="px-4 py-3 text-right">Actions</th>
					</tr>
				</thead>
                <!-- TABLE BODY -->
                <tbody class="divide-y divide-gray-100">
                    {#if loading}
                        {#each [1, 2, 3, 4, 5] as n (n)}
                            <tr>
                                <td colspan="6" class="px-4 py-3">
                                    <div class="h-9 animate-pulse rounded-lg bg-gray-100"></div>
                                </td>
                            </tr>
                        {/each}
                    {:else if sorted.length === 0}
                        <tr>
                            <td colspan="6" class="px-5 py-16 text-center">
                                <div class="mx-auto flex max-w-sm flex-col items-center">
                                    <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                                        <SearchOutline class="h-6 w-6" />
                                    </div>
                                    <p class="text-sm font-medium text-gray-700">
                                        {products.length === 0 ? 'No products yet' : 'No products found'}
                                    </p>
                                    <p class="mt-1 text-xs text-gray-400">
                                        {products.length === 0 ? 'Add your first product to get started.' : 'Try changing your search or filters.'}
                                    </p>
                                </div>
                            </td>
                        </tr>
                    {:else}
                        {#each sorted as p (p.id)}
                            <tr class="border-b border-gray-100 transition-colors hover:bg-gray-50/70 {selected.includes(p.id) ? 'bg-sky-50/50' : ''}">
                                <!-- CHECKBOX -->
                                <td class="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        value={p.id}
                                        bind:group={selected}
                                        class="h-4 w-4 rounded border-gray-300 text-[#0278BD] focus:ring-[#0278BD]/30"
                                        aria-label="Select {p.name}"
                                    />
                                </td>

                                <!-- PRODUCT NAME -->
                                <td class="px-4 py-3">
                                    <div class="flex items-center gap-3">
                                        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-600">
                                            {initials(p.name)}
                                        </div>

                                        <div class="min-w-0">
                                            <p class="max-w-[240px] truncate font-medium text-gray-800" title={p.name}>{p.name}</p>
                                            {#if p.description}
                                                <p class="max-w-[240px] truncate text-xs text-gray-400" title={p.description}>{p.description}</p>
                                            {/if}
                                        </div>
                                    </div>
                                </td>
								<td class="px-4 py-3 font-medium text-gray-700">{p.description}</td>
                                <!-- PRICE -->
                                <td class="px-4 py-3  text-gray-700">{money(p.price)}</td>

                                <!-- CATEGORY -->
                                <td class="px-4 py-3">
                                    {#if p.categoryId}
                                        <p class="text-gray-700">{catName(p.categoryId)}</p>
                                        {#if p.subcategoryId}
                                            <p class="mt-0.5 text-xs text-gray-400"> {subName(p.subcategoryId)}</p>
                                        {/if}
                                    {:else}
                                        <span class="text-xs text-gray-400">No category</span>
                                    {/if}
                                </td>

								<!-- SUB CATEGORY -->
								<td class="px-4 py-3">
									{#if p.subcategoryId}
										<p class="text-gray-700">{subName(p.subcategoryId)}</p>
									{:else}
										<span class="text-xs text-gray-400">—</span>
									{/if}
								</td>
								
                                <!-- QUANTITY -->
                                <td class="px-4 py-3">
                                    <span class="font-medium text-gray-700">
										{#if p.quantity}
										<Badge color="gray">{p.quantity}</Badge>
										{:else}
										<Badge color="red">out of stock</Badge>
										{/if}
									</span>
                                </td>

								<td class="px-4 py-3"><Badge color="green">Active</Badge></td>

                                <!-- ACTIONS -->
                                <td class="px-4 py-3 text-right">
									<div class="inline-flex items-center justify-end gap-1">
										<button
											type="button"
											aria-label="Edit {p.name}"
											class="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-[#0278BD]"
										>
											<EditOutline class="h-5 w-5" />
										</button>

										<button
											type="button"
											aria-label="Delete {p.name}"
											class="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
										>
											<TrashBinOutline class="h-5 w-5" />
										</button>
									</div>
								</td>
                            </tr>
                        {/each}
                    {/if}
                </tbody>
            </table>
        </div>

        <!-- TABLE FOOTER -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
            <span class="text-xs text-gray-500">
                {#if selected.length > 0}
                    {selected.length} selected
                {:else}
                    Showing {sorted.length} of {products.length} products
                {/if}
            </span>

            <div class="flex items-center gap-2 text-xs text-gray-500">
                <span>Rows per page</span>
                <span class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-600">
                    {sorted.length}
                </span>
            </div>
        </div>
    </section>
</div>

