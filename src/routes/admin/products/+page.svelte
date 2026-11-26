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
        EditOutline,
        SearchOutline,
        ChevronDownOutline,
        FilterOutline,
        CloseOutline,
		ArrowDownToBracketOutline
    } from 'flowbite-svelte-icons';
 	import { Button, Toggle, Badge,Checkbox, Input, Select, Textarea  } from 'flowbite-svelte';

	let pageSizeValue = $state('8');
	let currentPage = $state(1);

	

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
		let editQuantity = $state<string | number>('');
		let editError = $state('');
		let imagePreview = $state('');
		let editImageFile = $state<File | null>(null);
		let editImagePreview = $state('');
	//#endregion

	//#region Other Varianles
		let categories = $state<Category[]>([]);
		let subcategories = $state<Subcategory[]>([]);
		let products = $state<Product[]>([]);
		let price = $state<string | number>('');
		let quantity = $state<string | number>('');
		let editing = $state<Product | null>(null);
		let editPrice = $state<string | number>('');
		let confirmingId = $state<string | null>(null);
		let deletingId = $state<string | null>(null);
		let toast = $state<{ type: 'success' | 'error'; text: string } | null>(null);
		let toastTimer: ReturnType<typeof setTimeout> | undefined;
		let selected = $state<string[]>([]);
		let sortDir = $state<'asc' | 'desc'>('desc');
		let sortKey = $state<SortKey>('name');
		let imageFile = $state<File | null>(null);
	//#endregion
	
	//#region Variables Tyes & Constant
		type SortKey = 'name' | 'price' | 'category' | 'subcategory' | 'description' | 'quantity' | 'status';
		type Column = {
			key: SortKey;
			label: string;
			sortable?: boolean;
		};

		const CATEGORIES_API = '/api/categories';
		const SUBCATEGORIES_API = '/api/subcategories';
		const API = '/api/products';
		const NONE = '__none__'; 
		const MAX_IMAGE_SIZE = 5 * 1024 * 1024; 

		const columns: Column[] = [
			{ key: 'name', label: 'Product Name', sortable: true },
			{ key: 'price', label: 'Price', sortable: true },
			{ key: 'category', label: 'Category', sortable: true },
			{ key: 'subcategory', label: 'Sub Category', sortable: true },
			{ key: 'description', label: 'Description', sortable: true },
			{ key: 'quantity', label: 'Quantity', sortable: true },
			{ key: 'status', label: 'Status', sortable: true }
		];
	

		const categoryNames = $derived(new Map(categories.map((c) => [c.id, c.name])));
		const subNames = $derived(new Map(subcategories.map((s) => [s.id, s.name])));
		let imageErrors = $state(new Set<string>());
		const formSubs = $derived(subcategories.filter((s) => s.categoryId === categoryId));
		const totalProducts = $derived(products.length);
		const inStock = $derived(
			products.filter((p) => Number(p.quantity) > 5).length
		);

		const editSubs = $derived(subcategories.filter((s) => s.categoryId === editCategoryId));
		const editSubcategoryItems = $derived(editSubs.map((s) => ({ value: s.id, name: s.name })));
		const categoryItems = $derived(categories.map((c) => ({ value: c.id, name: c.name })));
		const subcategoryItems = $derived(formSubs.map((s) => ({ value: s.id, name: s.name })));
		const lowStock = $derived(products.filter( (p) => Number(p.quantity) > 0 && Number(p.quantity) <= 5).length);
		const outOfStock = $derived(products.filter((p) => Number(p.quantity) <= 0).length);
		const catName = (id: string | null) => (id ? (categoryNames.get(id) ?? 'Unknown category') : '');
		const subName = (id: string | null) => (id ? (subNames.get(id) ?? 'Unknown subcategory') : '');
		const money = (v: number | string) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
	//#endregion

	//#region Functions
		function handleImageChange(event: Event) {
			const input = event.currentTarget as HTMLInputElement;
			const file = input.files?.[0];

			if (!file) return;

			formError = '';

			if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
				formError = 'Please upload a JPG, PNG, or WEBP image.';
				input.value = '';
				return;
			}

			if (file.size > MAX_IMAGE_SIZE) {
				formError = 'Image size must not exceed 5 MB.';
				input.value = '';
				return;
			}

			if (imagePreview) URL.revokeObjectURL(imagePreview);

			imageFile = file;
			imagePreview = URL.createObjectURL(file);
		}

		function validQuantity(value: number | string | null) {
			const s = String(value ?? '').trim();
			if (s === '') return true; // empty = 0, same as the API
			const n = Number(s);
			return Number.isInteger(n) && n >= 0;
		}
		function removeImage() {
			if (imagePreview) URL.revokeObjectURL(imagePreview);
			imageFile = null;
			imagePreview = '';
		}

		function sortBy(key: SortKey) {
			if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
			else {
				sortKey = key;
				sortDir = 'asc';
			}
		}

		function notify(type: 'success' | 'error', text: string) {
			toast = { type, text };
			clearTimeout(toastTimer);
			toastTimer = setTimeout(() => (toast = null), 3000);
		}

		function validPrice(value: number | string | null) {
			const s = String(value ?? '').trim();
			if (s === '') return false;
			const n = Number(s);
			return Number.isFinite(n) && n >= 0;
		}

		function handleEditImageChange(event: Event) {
			const input = event.currentTarget as HTMLInputElement;
			const file = input.files?.[0];
			if (!file) return;

			editError = '';

			if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
				editError = 'Please upload a JPG, PNG, or WEBP image.';
				input.value = '';
				return;
			}

			if (file.size > MAX_IMAGE_SIZE) {
				editError = 'Image size must not exceed 5 MB.';
				input.value = '';
				return;
			}

			if (editImagePreview) URL.revokeObjectURL(editImagePreview);
			editImageFile = file;
			editImagePreview = URL.createObjectURL(file);
		}

		function clearEditImage() {
			if (editImagePreview) URL.revokeObjectURL(editImagePreview);
			editImageFile = null;
			editImagePreview = '';
		}

		function openEdit(p: Product) {
			clearEditImage();
			showAddModal = false;
			editing = p;
			editCategoryId = p.categoryId ?? '';
			editSubcategoryId = p.subcategoryId ?? '';
			editName = p.name;
			editPrice = String(p.price);
			editQuantity = String(p.quantity ?? 0);
			editDescription = p.description ?? '';
			editError = '';
		}

		function closeEdit() {
			if (saving) return;
			clearEditImage();
			editing = null;
			editError = '';
		}
		
		function toggleAll() {
			selected = allSelected ? [] : paginated.map((p) => p.id);
		}

		function clearFilters() {
			filterCategoryId = '';
			filterSubId = '';
			search = '';
		}

		function closeAddDrawer() {
			if (adding) return;
			showAddModal = false;
			formError = '';
			removeImage();
		}
	//#endregion

	//#region Async Functions
		async function api<T>(url: string, init?: RequestInit): Promise<T> {
			const isForm = init?.body instanceof FormData;

			const res = await fetch(url, {
				...init,
				headers: isForm ? init?.headers : { 'Content-Type': 'application/json', ...init?.headers }
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

			if (!validQuantity(quantity)) {
				formError = 'Quantity must be a whole number (0 or more).';
				return;
			}

			
			adding = true;

			try {
				const formData = new FormData();

				formData.append('name', name.trim());
				formData.append('price', String(price));
				formData.append('description', description);
				formData.append('categoryId', categoryId);
				formData.append('subcategoryId', categoryId ? subcategoryId : '');
				formData.append('quantity', String(quantity ?? '') || '0');

				if (imageFile) {
					formData.append('image', imageFile);
				}

				
				const created = await api<Product>(API, {
					method: 'POST',
					body: formData
				});

				products = [created, ...products];

				name = '';
				price = '';
				description = '';
				categoryId = '';
				subcategoryId = '';

				removeImage();
				showAddModal = false;

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
			if (!validQuantity(editQuantity)) {
				editError = 'Quantity must be a whole number (0 or more).';
				return;
			}

			saving = true;
			editError = '';
			try {
				const quantityValue = String(editQuantity).trim() === '' ? 0 : Number(editQuantity);
				let init: RequestInit;

				if (editImageFile) {
					const fd = new FormData();
					fd.append('name', editName.trim());
					fd.append('price', String(editPrice));
					fd.append('quantity', String(quantityValue));
					fd.append('description', editDescription);
					fd.append('categoryId', editCategoryId);
					fd.append('subcategoryId', editCategoryId ? editSubcategoryId : '');
					fd.append('image', editImageFile);
					init = { method: 'PATCH', body: fd };
				} else {
					init = {
						method: 'PATCH',
						body: JSON.stringify({
							categoryId: editCategoryId || null,
							subcategoryId: editCategoryId ? editSubcategoryId || null : null,
							name: editName.trim(),
							price: editPrice,
							quantity: quantityValue,
							description: editDescription
						})
					};
				}

				const updated = await api<Product>(`${API}/${editing.id}`, init);
				products = products.map((p) => (p.id === updated.id ? { ...p, ...updated } : p));
				imageErrors = new Set([...imageErrors].filter((id) => id !== updated.id));

				clearEditImage();
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
	const pageSize = $derived(Number(pageSizeValue));
	const paginated = $derived(sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize));
	const allSelected = $derived(paginated.length > 0 && paginated.every((p) => selected.includes(p.id)));

    const hasActiveFilters = $derived(
        !!filterCategoryId ||
        !!filterSubId ||
        !!search.trim()
    );

	const currentImage = $derived(
		editing?.imageUrl && !imageErrors.has(editing.id) ? editing.imageUrl : ''
	);
	const shownImage = $derived(editImagePreview || currentImage);

	const pageSizeItems = [8, 16, 24, 50].map((n) => ({ value: String(n), name: String(n) }));
	
	const totalPages = $derived(Math.max(1, Math.ceil(sorted.length / pageSize)));
	
	const rangeStart = $derived(sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1);
	const rangeEnd = $derived(Math.min(currentPage * pageSize, sorted.length));
	const pageNumbers = $derived.by(() => {
		const total = totalPages;
		const cur = currentPage;
		if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

		const pages: (number | '…')[] = [1];
		const start = Math.max(2, cur - 1);
		const end = Math.min(total - 1, cur + 1);
		if (start > 2) pages.push('…');
		for (let i = start; i <= end; i++) pages.push(i);
		if (end < total - 1) pages.push('…');
		pages.push(total);
		return pages;
	});

	// Go back to page 1 when search, filters, or page size change
	$effect(() => {
		search;
		filterCategoryId;
		filterSubId;
		pageSizeValue;
		currentPage = 1;
	});

	// If the last row of the last page is deleted, step back a page
	$effect(() => {
		if (currentPage > totalPages) currentPage = totalPages;
	});
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && closeEdit()} />
<div class="flex items-start gap-4">
	<div class="page-content min-w-0 flex-1 space-y-4">
		<!--Header-->
		<div class="header-page">
			<div class="flex items-center gap-3">
				<div><LayersOutline class="h-9 w-9" color="#0278BD"/></div>
				<div>
					<h1 class="heading-1">Products</h1>
					<p class="heading-3">Manage and collaborate on your products listing</p>
				</div>
			</div>

			<Button type="button" class="flex items-center gap-2" onclick={() => { editing = null; showAddModal = true; }}>
				<PlusOutline class="h-4 w-4" />
				Add Product
			</Button>
		</div>

		<!--Card-->
		<div class="card">
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
					<Input type="search" placeholder="Search products..." aria-label="Search products" bind:value={search}/>
				</div>

				<div class="flex flex-wrap items-center gap-2">
					{#if hasActiveFilters}
						<Button type="button" onclick={clearFilters} color="alternative" class="px-3 py-2 text-xs font-medium">
							Clear filters
						</Button>
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
				<table>
					<thead>
						<tr>
							<th>
								<Checkbox type="checkbox" checked={allSelected} onchange={toggleAll} class="h-4 w-4" aria-label="Select all products"/>
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
					<tbody>
						{#if loading}
							{#each [1, 2, 3, 4, 5] as n (n)}
								<tr>
									<td colspan="9" class="px-4 py-3">
										<div class="h-9 animate-pulse rounded-lg bg-gray-100"></div>
									</td>
								</tr>
							{/each}
						{:else if sorted.length === 0}
							<tr>
								<td colspan="9" class="px-5 py-16 text-center">
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
							{#each paginated as p (p.id)}
								<tr class="border-b border-gray-100 transition-colors hover:bg-gray-50/70 {selected.includes(p.id) ? 'bg-sky-50/50' : ''}">
									<!-- CHECKBOX -->
									<td class=" w-2 px-4 py-3">
										<Checkbox value={p.id} bind:group={selected} aria-label="Select {p.name}" class="h-4 w-4"/>
									</td>

									<!-- PRODUCT IMAGE/NAME -->
									<td class="px-4 py-3">
										<div class="flex items-center gap-3">
											{#if p.imageUrl && !imageErrors.has(p.id)}
												<img
													src={p.imageUrl}
													alt={p.name}
													class="h-10 w-10 shrink-0 rounded-lg object-cover border border-gray-100"
													onerror={() => imageErrors = new Set([...imageErrors, p.id])}
												/>
											{:else}
												<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
													<svg
														xmlns="http://www.w3.org/2000/svg"
														class="h-5 w-5"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="1.7"
														stroke-linecap="round"
														stroke-linejoin="round"
													>
														<rect x="3" y="3" width="18" height="18" rx="3" />
														<circle cx="8.5" cy="8.5" r="1.5" />
														<path d="m21 15-5-5L5 21" />
													</svg>
												</div>
											{/if}

											<p class="max-w-[240px] truncate text-xs font-medium text-gray-800" title={p.name}>
												{p.name}
											</p>
										</div>
									</td>

									<!-- PRICE -->
									<td class="px-4 py-3 text-xs font-medium text-gray-700">{money(p.price)}</td>
									
									<!-- CATEGORY -->
									<td class="px-4 py-3">
										{#if p.categoryId}
											<Badge color="blue"> {catName(p.categoryId)}</Badge>
										{:else}
											<Badge color="gray">No category</Badge>
										{/if}
									</td>

									<!-- SUB CATEGORY -->
									<td class="px-4 py-3">
										{#if p.subcategoryId}
											<Badge color="indigo"> {subName(p.subcategoryId)}</Badge>
										{:else}
											<Badge color="gray">None</Badge>
										{/if}
									</td>
									
									<!--Description-->
									<td class="px-4 py-3 font-medium text-gray-700">
										{#if p.description}
											<Badge color="blue">...</Badge>
										{:else}
											<Badge color="gray">None</Badge>
										{/if}
									</td>
								
									<!-- QUANTITY -->
									<td class="px-4 py-3">
										<span class="font-medium text-gray-700">
											{#if p.quantity}
											<Badge color="green">{p.quantity}</Badge>
											{:else}
											<Badge color="red">out of stock</Badge>
											{/if}
										</span>
									</td>

									<td class="px-4 py-3"><Toggle  color="green" size="small" checked/></td>

									<!-- ACTIONS -->
									<td class="px-4 py-3 text-right">
										{#if confirmingId === p.id}
											<div class="inline-flex items-center gap-2">
												<Button type="button" onclick={() => removeProduct(p.id)} disabled={deletingId === p.id}
													color="red"
													class=" px-2.5 py-1 text-xs font-medium text-white transition  disabled:opacity-50"
												>
													{deletingId === p.id ? 'Deleting...' : 'Delete?'}
												</Button>
												<Button type="button"
													onclick={() => (confirmingId = null)}
													disabled={deletingId === p.id}
													color="alternative"
													class=" px-2.5 py-1 text-xs font-medium transition"
												>
													Cancel
												</Button>
											</div>
										{:else}
											<div class="inline-flex items-center justify-end gap-1">
												<button
													type="button"
													onclick={() => openEdit(p)}
													aria-label="Edit {p.name}"
													class="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-[#0278BD]"
												>
													<EditOutline class="h-5 w-5" />
												</button>
												<button
													type="button"
													onclick={() => (confirmingId = p.id)}
													aria-label="Delete {p.name}"
													class="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
												>
													<TrashBinOutline class="h-5 w-5" />
												</button>
											</div>
										{/if}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<!-- TABLE FOOTER -->
			<!-- TABLE FOOTER -->
<div class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
	<!-- LEFT: rows per page -->
	<div class="flex items-center gap-3 text-xs text-gray-500">
		<span>Rows per page</span>
		<div class="w-20">
			<Select size="sm" items={pageSizeItems} bind:value={pageSizeValue} />
		</div>
		<span>
			{#if selected.length > 0}
				{selected.length} selected
			{:else}
				{rangeStart}–{rangeEnd} of {sorted.length}
			{/if}
		</span>
	</div>

	<!-- RIGHT: pagination -->
	<nav class="flex items-center gap-1" aria-label="Pagination">
		<button
			type="button"
			onclick={() => (currentPage = Math.max(1, currentPage - 1))}
			disabled={currentPage === 1}
			class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
		>
			Previous
		</button>

		{#each pageNumbers as n, i (i)}
			{#if n === '…'}
				<span class="px-2 text-xs text-gray-400">…</span>
			{:else}
				<button
					type="button"
					onclick={() => (currentPage = n)}
					aria-current={n === currentPage ? 'page' : undefined}
					class="min-w-8 rounded-lg px-2.5 py-1.5 text-xs font-medium transition
						{n === currentPage
							? 'bg-[#0278BD] text-white'
							: 'border border-gray-200 text-gray-600 hover:bg-gray-50'}"
				>
					{n}
				</button>
			{/if}
		{/each}

		<button
			type="button"
			onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
			disabled={currentPage === totalPages}
			class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
		>
			Next
		</button>
	</nav>
</div>
		</section>
	</div>

	{#if showAddModal}
		<aside class="product-drawer" aria-label="Add product">
			<!-- DRAWER HEADER -->
			<div class="product-drawer-header">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6F1F8] text-[#0278BD]">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6"
							viewBox="0 0 24 24" fill="none" stroke="currentColor"
							stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
							<path d="m3.3 7 8.7 5 8.7-5"/>
							<path d="M12 22V12"/>
						</svg>
					</div>

					<div>
						<h2 class="heading-2">Add Product</h2>
						<p class="heading-4">Create a new product in your store</p>
					</div>
				</div>

				<button type="button" onclick={closeAddDrawer} disabled={adding} aria-label="Close"
					class="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
				>
					<CloseOutline class="h-5 w-5" />
				</button>
			</div>

			<form onsubmit={addProduct} class="flex min-h-0 flex-1 flex-col">
				<div class="product-drawer-body">
					<!-- PRODUCT IMAGE -->
					<section>
						<div class="mb-3 flex items-center gap-2">
							<span class="flex h-6 w-6 items-center justify-center rounded-full bg-[#0278BD] text-xs font-semibold text-white">
								1
							</span>
							<h3 class="text-sm font-semibold text-gray-800">
								Product Image
							</h3>
						</div>

						{#if imagePreview}
							<div class="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-3">
								<div class="flex items-center gap-3">
									<img
										src={imagePreview}
										alt="Product preview"
										class="h-20 w-20 rounded-lg border border-gray-200 object-cover"
									/>

									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium text-gray-800">
											{imageFile?.name}
										</p>
										<p class="mt-1 text-xs text-gray-400">
											{imageFile
												? `${(imageFile.size / (1024 * 1024)).toFixed(2)} MB`
												: 'Selected image'}
										</p>

										<div class="mt-2 flex items-center gap-3">
											<label
												for="product-image"
												class="cursor-pointer text-xs font-semibold text-[#0278BD] hover:underline"
											>
												Change image
											</label>

											<button
												type="button"
												onclick={removeImage}
												class="text-xs font-medium text-red-500 hover:text-red-600"
											>
												Remove
											</button>
										</div>
									</div>
								</div>

								<input
									id="product-image"
									type="file"
									accept="image/png,image/jpeg,image/webp"
									class="hidden"
									onchange={handleImageChange}
								/>
							</div>
						{:else}
							<label
								for="product-image"
								class="product-upload-area group"
							>
								<div class="product-upload-icon">
									<svg xmlns="http://www.w3.org/2000/svg"
										class="h-10 w-10" viewBox="0 0 24 24"
										fill="none" stroke="currentColor"
										stroke-width="1.5" stroke-linecap="round"
										stroke-linejoin="round">
										<rect x="3" y="3" width="18" height="18" rx="3"/>
										<circle cx="8.5" cy="8.5" r="1.5"/>
										<path d="m21 15-5-5L5 21"/>
									</svg>

									<span class="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#0278BD] text-white">
										<PlusOutline class="h-4 w-4"/>
									</span>
								</div>

								<span class="mt-3 text-sm font-semibold text-gray-700">
									Click to upload an image
								</span>
								<span class="mt-1 text-xs text-gray-400">
									PNG, JPG or WEBP · Maximum 5 MB
								</span>

								<input
									id="product-image"
									type="file"
									accept="image/png,image/jpeg,image/webp"
									class="hidden"
									onchange={handleImageChange}
								/>
							</label>
						{/if}
					</section>

					<!-- PRODUCT INFORMATION -->
					<section>
						<div class="mb-4 flex items-center gap-2">
							<span class="flex h-6 w-6 items-center justify-center rounded-full bg-[#0278BD] text-xs font-semibold text-white">
								2
							</span>
							<h3 class="text-sm font-semibold text-gray-800">
								Product Information
							</h3>
						</div>

						<div class="space-y-4">
							<!-- PRODUCT NAME -->
							<div>
								<label for="product-name" class="label">Product Name <span class="text-red-500">*</span></label>
								<Input id="product-name" bind:value={name} required placeholder="Enter product name"/>
							</div>

							<!-- PRICE + Quantity -->
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label for="product-price" class="label">Price <span class="text-red-500">*</span></label>
									<Input id="product-price" type="number" bind:value={price} min="0" step="0.01"  required placeholder="0.00"/>
								</div>
								<div>
									<label for="product-quantity" class="label">Quantity</label>
									<Input id="product-quantity" type="number" min="0" step="1"bind:value={quantity} placeholder="0"/>
								</div>
							</div>
					
							<!-- CATEGORY -->
							<div>
								<label for="product-category" class="label">Category</label>
								<Select id="product-category" items={categoryItems} bind:value={categoryId} placeholder="Select category" onchange={() => (subcategoryId = '')}/>
							</div>

							<!-- SUBCATEGORY -->
							<div>
								<label for="product-subcategory" class="label">Subcategory</label>
								<Select id="product-subcategory" items={subcategoryItems} bind:value={subcategoryId} placeholder="Select subcategory" disabled={!categoryId || formSubs.length === 0}/>
							</div>

							<!-- DESCRIPTION -->
							<div>
								<label for="product-description" class="label">Description</label>
								<Textarea id="product-description" bind:value={description} rows={3} placeholder="Enter product description..." class="w-full resize-none"/>
							</div>

							<!-- ERROR -->
							{#if formError}
								<div class="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-600">
									<ExclamationCircleOutline class="mt-0.5 h-4 w-4 shrink-0"/>
									<p>{formError}</p>
								</div>
							{/if}
						</div>
					</section>

				</div>

				<!-- FIXED FOOTER -->
				<div class="product-drawer-footer">
					<Button type="button" color="light" onclick={closeAddDrawer} disabled={adding} class="!rounded-lg !px-5 !py-2.5">
						Cancel
					</Button>

					<Button type="submit" class="!rounded-lg !px-5 !py-2.5" disabled={adding}>
						{#if adding}
							<span class="animate-spin">◌</span>
							Saving...
						{:else}
							Save
						{/if}
					</Button>
				</div>
			</form>
		</aside>
	{/if}
	
	{#if editing}
		<aside class="product-drawer" aria-label="Edit product">
			<!-- HEADER -->
			<div class="product-drawer-header">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6F1F8] text-[#0278BD]">
						<EditOutline class="h-6 w-6" />
					</div>
					<div>
						<h2 class="heading-2">Edit Product</h2>
						<p class="heading-4 max-w-[240px] truncate">{editing.name}</p>
					</div>
				</div>

				<button type="button" onclick={closeEdit} disabled={saving} aria-label="Close"
					class="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
					<CloseOutline class="h-5 w-5" />
				</button>
			</div>

			<form onsubmit={saveEdit} class="flex min-h-0 flex-1 flex-col">
				<div class="product-drawer-body">
					<!-- CURRENT IMAGE (read-only for now) -->
					<div class="mb-3 flex items-center gap-2">
						<span class="flex h-6 w-6 items-center justify-center rounded-full bg-[#0278BD] text-xs font-semibold text-white">
								1
						</span>
						<h3 class="text-sm font-semibold text-gray-800">Product Image</h3>
					</div>
					{#if shownImage}
						<div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
							<div class="flex items-center gap-3">
								<img src={shownImage} alt={editing.name}
									class="h-20 w-20 rounded-lg border border-gray-200 object-cover" />
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium text-gray-800">
										{editImageFile ? editImageFile.name : 'Current image'}
									</p>
									<p class="mt-1 text-xs text-gray-400">
										{editImageFile
											? `${(editImageFile.size / (1024 * 1024)).toFixed(2)} MB · will replace the current image`
											: 'Upload a new one to replace it'}
									</p>
									<div class="mt-2 flex items-center gap-3">
										<label for="edit-image" class="cursor-pointer text-xs font-semibold text-[#0278BD] hover:underline">
											Change image
										</label>
										{#if editImageFile}
											<button type="button" onclick={clearEditImage}
												class="text-xs font-medium text-red-500 hover:text-red-600">
												Undo
											</button>
										{/if}
									</div>
								</div>
							</div>
						</div>
					{:else}
						<label for="edit-image" class="product-upload-area group">
							<div class="product-upload-icon">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" viewBox="0 0 24 24"
									fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
									<rect x="3" y="3" width="18" height="18" rx="3"/>
									<circle cx="8.5" cy="8.5" r="1.5"/>
									<path d="m21 15-5-5L5 21"/>
								</svg>
								<span class="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#0278BD] text-white">
									<PlusOutline class="h-4 w-4"/>
								</span>
							</div>
							<span class="mt-3 text-sm font-semibold text-gray-700">Click to upload an image</span>
							<span class="mt-1 text-xs text-gray-400">PNG, JPG or WEBP · Maximum 5 MB</span>
						</label>
					{/if}

					<input id="edit-image" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" onchange={handleEditImageChange} />

					<div class="space-y-4">
						<div>
							<label for="edit-name" class="label">Product Name <span class="text-red-500">*</span></label>
							<Input id="edit-name" bind:value={editName} required placeholder="Enter product name" />
						</div>

						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="edit-price" class="label">Price <span class="text-red-500">*</span></label>
								<Input id="edit-price" type="number" bind:value={editPrice} min="0" step="0.01" required placeholder="0.00" />
							</div>
							<div>
								<label for="edit-quantity" class="label">Quantity</label>
								<Input id="edit-quantity" type="number" min="0" step="1" bind:value={editQuantity} placeholder="0" />
							</div>
						</div>

						<div>
							<label for="edit-category" class="label">Category</label>
							<Select id="edit-category" items={categoryItems} bind:value={editCategoryId}
								placeholder="No category" onchange={() => (editSubcategoryId = '')} />
						</div>

						<div>
							<label for="edit-subcategory" class="label">Subcategory</label>
							<Select id="edit-subcategory" items={editSubcategoryItems} bind:value={editSubcategoryId}
								placeholder="Select subcategory"
								disabled={!editCategoryId || editSubs.length === 0} />
						</div>

						<div>
							<label for="edit-description" class="label">Description</label>
							<Textarea id="edit-description" bind:value={editDescription} rows={3}
								placeholder="Enter product description..." class="w-full resize-none" />
						</div>

						{#if editError}
							<div class="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-600">
								<ExclamationCircleOutline class="mt-0.5 h-4 w-4 shrink-0" />
								<p>{editError}</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- FOOTER -->
				<div class="product-drawer-footer">
					<Button type="button" color="light" onclick={closeEdit} disabled={saving} class="!rounded-lg !px-5 !py-2.5">
						Cancel
					</Button>
					<Button type="submit" class="!rounded-lg !px-5 !py-2.5" disabled={saving}>
						{#if saving}
							<span class="animate-spin">◌</span>
							Saving...
						{:else}
							Save changes
						{/if}
					</Button>
				</div>
			</form>
		</aside>
	{/if}
</div>

<style>
	.product-drawer {
		position: sticky;
		display: flex;
		max-height: calc(100vh - 2rem);
		width: 430px;
		flex-shrink: 0;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid #e5e7eb;
		border-radius: 1rem;
		background: #ffffff;
		box-shadow: 0 8px 30px rgba(15, 23, 42, 0.06);
	}

	/* HEADER */

	.product-drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.1rem 1.25rem;
		border-bottom: 1px solid #f1f5f9;
		background: #ffffff;
	}

	.product-drawer-body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.product-drawer-body::-webkit-scrollbar {
		width: 5px;
	}

	.product-drawer-body::-webkit-scrollbar-track {
		background: transparent;
	}

	.product-drawer-body::-webkit-scrollbar-thumb {
		border-radius: 10px;
		background: #d1d5db;
	}

	.product-upload-area {
		display: flex;
		min-height: 168px;
		width: 100%;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		border: 1.5px dashed #cbd5e1;
		border-radius: 0.85rem;
		background: #f8fafc;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.product-upload-area:hover {
		border-color: var(--color-secondary);
		background: #f0f8fd;
	}

	.product-upload-icon {
		position: relative;
		display: flex;
		height: 64px;
		width: 64px;
		align-items: center;
		justify-content: center;
		border-radius: 0.85rem;
		background: #e6f1f8;
		color: #5b9fd1;
		transition: transform 0.2s ease;
	}

	.product-upload-area:hover .product-upload-icon {
		transform: translateY(-3px);
		color: #0278bd;
	}

	/* FOOTER */

	.product-drawer-footer {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
		border-top: 1px solid #f1f5f9;
		background: #ffffff;
		padding: 1rem 1.25rem;
	}

	/* RESPONSIVE */

	@media (max-width: 1279px) {
		.product-drawer {
			width: 390px;
		}
	}

	@media (max-width: 1023px) {
		.product-drawer {
			position: relative;
			top: auto;
			width: 100%;
			max-width: 100%;
			max-height: none;
		}
	}

	@media (max-width: 480px) {
		.product-drawer-body {
			padding: 1rem;
		}

		.product-drawer-footer {
			padding: 1rem;
		}
	}
</style>