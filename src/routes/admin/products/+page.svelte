<script lang="ts">
	import { onMount } from 'svelte';
	import type { Category, Subcategory, Product } from '#lib/types.ts';
	type Id = string;

	const CATEGORIES_API = '/api/categories';
	const SUBCATEGORIES_API = '/api/subcategories';
	const API = '/api/products';
	const NONE = '__none__'; // filter value: "No category" / "No subcategory"

	let categories = $state<Category[]>([]);
	let subcategories = $state<Subcategory[]>([]);
	let products = $state<Product[]>([]);
	let loading = $state(true);

	// filters
	let search = $state('');
	let filterCategoryId = $state('');
	let filterSubId = $state('');

	// add form (a number input gives a number, or null when empty)
	let categoryId = $state('');
	let subcategoryId = $state('');
	let name = $state('');
	let price = $state<number | string | null>('');
	let description = $state('');
	let adding = $state(false);
	let formError = $state('');

	// edit modal
	let editing = $state<Product | null>(null);
	let editCategoryId = $state('');
	let editSubcategoryId = $state('');
	let editName = $state('');
	let editPrice = $state<number | string | null>('');
	let editDescription = $state('');
	let saving = $state(false);
	let editError = $state('');

	// delete
	let confirmingId = $state<string | null>(null);
	let deletingId = $state<string | null>(null);

	// toast
	let toast = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;

	const categoryNames = $derived(new Map(categories.map((c) => [c.id, c.name])));
	const subNames = $derived(new Map(subcategories.map((s) => [s.id, s.name])));

	// subcategories available for each dropdown (only those of the chosen category)
	const formSubs = $derived(subcategories.filter((s) => s.categoryId === categoryId));
	const editSubs = $derived(subcategories.filter((s) => s.categoryId === editCategoryId));
	const filterSubs = $derived(subcategories.filter((s) => s.categoryId === filterCategoryId));

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

	const money = (v: number | string) =>
		`$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

	function notify(type: 'success' | 'error', text: string) {
		toast = { type, text };
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), 3000);
	}

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

	function formatDate(value?: string | null) {
		if (!value) return '—';
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return '—';
		return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	// works for both numbers and strings
	function validPrice(value: number | string | null) {
		const s = String(value ?? '').trim();
		if (s === '') return false;
		const n = Number(s);
		return Number.isFinite(n) && n >= 0;
	}

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
					// a subcategory only makes sense together with a category
					subcategoryId: categoryId ? subcategoryId || null : null,
					name,
					price,
					description
				})
			});
			products = [created, ...products]; // newest first
			// keep category/subcategory selected so several products can be added in a row
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

	const inputClass =
		'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-gray-50 disabled:text-gray-400';
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && closeEdit()} />

<div class="space-y-6">
	<div class="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
		<!-- Add product -->
		<section class="rounded-xl border border-gray-200 bg-white p-5 lg:sticky lg:top-6">
			<h2 class="text-base font-semibold text-gray-900">New product</h2>
			<p class="mt-0.5 text-sm text-gray-500">Category and subcategory are optional.</p>

			<form class="mt-5 space-y-4" onsubmit={addProduct}>
				<div>
					<label for="prod-category" class="mb-1.5 block text-sm font-medium text-gray-700">
						Category <span class="font-normal text-gray-400">(optional)</span>
					</label>
					<select
						id="prod-category"
						class={inputClass}
						bind:value={categoryId}
						onchange={() => (subcategoryId = '')}
						disabled={loading}
					>
						<option value="">{loading ? 'Loading…' : 'No category'}</option>
						{#each categories as c (c.id)}
							<option value={c.id}>{c.name}{c.isActive === false ? ' (inactive)' : ''}</option>
						{/each}
					</select>
				</div>

				<!-- only shown when the chosen category has subcategories -->
				{#if categoryId && formSubs.length > 0}
					<div>
						<label for="prod-sub" class="mb-1.5 block text-sm font-medium text-gray-700">
							Subcategory <span class="font-normal text-gray-400">(optional)</span>
						</label>
						<select id="prod-sub" class={inputClass} bind:value={subcategoryId}>
							<option value="">None (directly in the category)</option>
							{#each formSubs as s (s.id)}
								<option value={s.id}>{s.name}</option>
							{/each}
						</select>
					</div>
				{/if}

				<div>
					<label for="prod-name" class="mb-1.5 block text-sm font-medium text-gray-700">
						Name <span class="text-red-500">*</span>
					</label>
					<input
						id="prod-name"
						class={inputClass}
						type="text"
						maxlength="120"
						placeholder="e.g. Botox 100U"
						bind:value={name}
					/>
				</div>

				<div>
					<label for="prod-price" class="mb-1.5 block text-sm font-medium text-gray-700">
						Price <span class="text-red-500">*</span>
					</label>
					<div class="relative">
						<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
						<input
							id="prod-price"
							class="{inputClass} pl-7"
							type="number"
							min="0"
							step="0.01"
							inputmode="decimal"
							placeholder="0.00"
							bind:value={price}
						/>
					</div>
				</div>

				<div>
					<div class="mb-1.5 flex items-center justify-between">
						<label for="prod-desc" class="text-sm font-medium text-gray-700">Description</label>
						<span class="text-xs text-gray-400">{description.length}/300</span>
					</div>
					<textarea
						id="prod-desc"
						class="{inputClass} resize-none"
						rows="3"
						maxlength="300"
						placeholder="Optional. Details about the product."
						bind:value={description}
					></textarea>
				</div>

				{#if formError}
					<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{formError}</p>
				{/if}

				<button
					type="submit"
					disabled={adding || loading}
					class="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60"
				>
					{#if adding}
						<span class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
						Adding…
					{:else}
						<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
						</svg>
						Add product
					{/if}
				</button>
			</form>
		</section>

		<!-- Products -->
		<section class="rounded-xl border border-gray-200 bg-white p-5">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="text-base font-semibold text-gray-900">All products</h2>
					<p class="mt-0.5 text-sm text-gray-500">
						{products.length}
						{products.length === 1 ? 'product' : 'products'}
						{#if filterCategoryId || filterSubId || search.trim()}
							· {filtered.length} shown
						{/if}
					</p>
				</div>
			</div>

			<!-- filters -->
			<div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
				<select
					class={inputClass}
					aria-label="Filter by category"
					bind:value={filterCategoryId}
					onchange={() => (filterSubId = '')}
				>
					<option value="">All categories</option>
					<option value={NONE}>No category</option>
					{#each categories as c (c.id)}
						<option value={c.id}>{c.name}</option>
					{/each}
				</select>

				<!-- only shown when the filtered category has subcategories -->
				{#if filterCategoryId && filterCategoryId !== NONE && filterSubs.length > 0}
					<select class={inputClass} aria-label="Filter by subcategory" bind:value={filterSubId}>
						<option value="">All subcategories</option>
						<option value={NONE}>No subcategory</option>
						{#each filterSubs as s (s.id)}
							<option value={s.id}>{s.name}</option>
						{/each}
					</select>
				{/if}

				<div class="relative">
					<svg class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path fill-rule="evenodd" d="M9 3a6 6 0 1 0 3.6 10.8l3.3 3.3a1 1 0 0 0 1.4-1.4l-3.3-3.3A6 6 0 0 0 9 3Zm-4 6a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clip-rule="evenodd" />
					</svg>
					<input
						class="{inputClass} pl-9"
						type="search"
						placeholder="Search products"
						aria-label="Search products"
						bind:value={search}
					/>
				</div>
			</div>

			<div class="mt-5 border-t border-gray-100 pt-5">
				{#if loading}
					<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{#each [1, 2, 3, 4, 5, 6] as n (n)}
							<div class="h-44 animate-pulse rounded-xl bg-gray-100"></div>
						{/each}
					</div>
				{:else if filtered.length === 0}
					<div class="rounded-xl border border-dashed border-gray-300 px-5 py-14 text-center text-sm text-gray-500">
						{#if products.length === 0}
							No products yet. Add your first one using the form.
						{:else}
							No products match your filters.
						{/if}
					</div>
				{:else}
					<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{#each filtered as p (p.id)}
							<article class="flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-sm">
								<!-- name + price -->
								<div class="flex items-start justify-between gap-3">
									<h3 class="min-w-0 truncate text-base font-semibold text-gray-900" title={p.name}>{p.name}</h3>
									<span class="shrink-0 text-sm font-semibold text-emerald-700">{money(p.price)}</span>
								</div>

								<!-- description -->
								<div class="mt-2 flex-1">
									{#if p.description}
										<p class="line-clamp-2 text-sm text-gray-600" title={p.description}>{p.description}</p>
									{:else}
										<p class="text-sm text-gray-400">No description</p>
									{/if}
								</div>

								<!-- placement -->
								<div class="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
									{#if p.categoryId}
										<span class="max-w-full truncate rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700" title={catName(p.categoryId)}>
											{catName(p.categoryId)}
										</span>
										{#if p.subcategoryId}
											<span class="max-w-full truncate rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600" title={subName(p.subcategoryId)}>
												{subName(p.subcategoryId)}
											</span>
										{/if}
									{:else}
										<span class="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-500">No category</span>
									{/if}
									<span class="text-gray-400">·</span>
									<span class="text-gray-500">{formatDate(p.createdAt)}</span>
								</div>

								<!-- actions -->
								<div class="mt-4 flex items-center justify-end gap-1 border-t border-gray-100 pt-3">
									{#if confirmingId === p.id}
										<span class="mr-auto text-xs text-gray-500">Delete this product?</span>
										<button
											type="button"
											disabled={deletingId === p.id}
											onclick={() => removeProduct(p.id)}
											class="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
										>
											{deletingId === p.id ? 'Deleting…' : 'Delete'}
										</button>
										<button
											type="button"
											onclick={() => (confirmingId = null)}
											class="rounded-md px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
										>
											Cancel
										</button>
									{:else}
										<button
											type="button"
											onclick={() => openEdit(p)}
											class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
										>
											<svg class="size-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
												<path d="M13.6 2.6a2 2 0 0 1 2.8 2.8l-.9.9-2.8-2.8.9-.9ZM11.3 4.9 3 13.2V16h2.8l8.3-8.3-2.8-2.8Z" />
											</svg>
											Edit
										</button>
										<button
											type="button"
											onclick={() => (confirmingId = p.id)}
											class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
										>
											<svg class="size-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
												<path fill-rule="evenodd" d="M8 2a1 1 0 0 0-1 1v1H4a1 1 0 0 0 0 2h.1l.8 9.1A2 2 0 0 0 6.9 17h6.2a2 2 0 0 0 2-1.9l.8-9.1H16a1 1 0 1 0 0-2h-3V3a1 1 0 0 0-1-1H8Zm1 2V4h2v0H9Z" clip-rule="evenodd" />
											</svg>
											Delete
										</button>
									{/if}
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</div>
		</section>
	</div>
</div>

<!-- Edit modal -->
{#if editing}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-gray-900/40 p-4"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && closeEdit()}
	>
		<div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="edit-title">
			<h2 id="edit-title" class="text-base font-semibold text-gray-900">Edit product</h2>

			<form class="mt-5 space-y-4" onsubmit={saveEdit}>
				<div>
					<label for="edit-category" class="mb-1.5 block text-sm font-medium text-gray-700">
						Category <span class="font-normal text-gray-400">(optional)</span>
					</label>
					<select
						id="edit-category"
						class={inputClass}
						bind:value={editCategoryId}
						onchange={() => (editSubcategoryId = '')}
					>
						<option value="">No category</option>
						{#each categories as c (c.id)}
							<option value={c.id}>{c.name}{c.isActive === false ? ' (inactive)' : ''}</option>
						{/each}
					</select>
				</div>

				<!-- only shown when the chosen category has subcategories -->
				{#if editCategoryId && editSubs.length > 0}
					<div>
						<label for="edit-sub" class="mb-1.5 block text-sm font-medium text-gray-700">
							Subcategory <span class="font-normal text-gray-400">(optional)</span>
						</label>
						<select id="edit-sub" class={inputClass} bind:value={editSubcategoryId}>
							<option value="">None (directly in the category)</option>
							{#each editSubs as s (s.id)}
								<option value={s.id}>{s.name}</option>
							{/each}
						</select>
					</div>
				{/if}

				<div>
					<label for="edit-name" class="mb-1.5 block text-sm font-medium text-gray-700">
						Name <span class="text-red-500">*</span>
					</label>
					<input id="edit-name" class={inputClass} type="text" maxlength="120" bind:value={editName} />
				</div>

				<div>
					<label for="edit-price" class="mb-1.5 block text-sm font-medium text-gray-700">
						Price <span class="text-red-500">*</span>
					</label>
					<div class="relative">
						<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
						<input
							id="edit-price"
							class="{inputClass} pl-7"
							type="number"
							min="0"
							step="0.01"
							inputmode="decimal"
							bind:value={editPrice}
						/>
					</div>
				</div>

				<div>
					<label for="edit-desc" class="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
					<textarea id="edit-desc" class="{inputClass} resize-none" rows="3" maxlength="300" bind:value={editDescription}></textarea>
				</div>

				{#if editError}
					<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{editError}</p>
				{/if}

				<div class="flex justify-end gap-2 pt-1">
					<button type="button" onclick={closeEdit} class="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
						Cancel
					</button>
					<button
						type="submit"
						disabled={saving}
						class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
					>
						{saving ? 'Saving…' : 'Save changes'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Toast -->
{#if toast}
	<div
		class="fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg {toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}"
		role="status"
	>
		{toast.text}
	</div>
{/if}