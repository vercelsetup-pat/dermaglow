<script lang="ts">
	import { onMount, tick } from 'svelte';

	type Id = string;

	type Category = {
		id: Id;
		name: string;
		description: string | null;
		isActive?: boolean;
		createdAt?: string | null;
	};
	type Subcategory = {
		id: Id;
		categoryId: Id;
		name: string;
		description: string | null;
	};
	type Product = {
		id: Id;
		categoryId: Id | null;
		subcategoryId: Id | null;
		name: string;
		description: string | null;
		price: number | string;
	};

	const API = '/api/categories';
	const SUBS_API = '/api/subcategories';
	const PRODUCTS_API = '/api/products';

	let categories = $state<Category[]>([]);
	let loading = $state(true);
	let search = $state('');

	// ---------- add category form ----------
	let name = $state('');
	let description = $state('');
	let adding = $state(false);
	let formError = $state('');

	// ---------- edit category modal ----------
	let editing = $state<Category | null>(null);
	let editName = $state('');
	let editDescription = $state('');
	let saving = $state(false);
	let editError = $state('');

	// ---------- category delete + toggle ----------
	let confirmingId = $state<Id | null>(null);
	let deletingId = $state<Id | null>(null);
	let togglingId = $state<Id | null>(null);

	// ---------- selection + details card ----------
	let selectedId = $state<Id | null>(null);
	let selectedSubId = $state<Id | null>(null);
	let subs = $state<Subcategory[]>([]);
	let prods = $state<Product[]>([]);
	let detailsLoading = $state(false);
	let detailsError = $state('');
	let panelEl = $state<HTMLElement | null>(null);

	// ---------- "Add to category" card (two dropdown sections) ----------
	let openSection = $state<'sub' | 'product' | null>(null);

	// add subcategory
	let subName = $state('');
	let subDesc = $state('');
	let addingSub = $state(false);
	let subError = $state('');

	// add product
	let prodSubId = $state('');
	let prodName = $state('');
	let prodPrice = $state<number | string | null>('');
	let prodDesc = $state('');
	let addingProd = $state(false);
	let prodError = $state('');

	// ---------- edit / delete subcategory ----------
	let editingSub = $state<Subcategory | null>(null);
	let editSubName = $state('');
	let editSubDesc = $state('');
	let savingSub = $state(false);
	let editSubError = $state('');
	let confirmingSubId = $state<Id | null>(null);
	let deletingSubId = $state<Id | null>(null);

	// ---------- edit / delete product ----------
	let editingProd = $state<Product | null>(null);
	let editProdSubId = $state('');
	let editProdName = $state('');
	let editProdPrice = $state<number | string | null>('');
	let editProdDesc = $state('');
	let savingProd = $state(false);
	let editProdError = $state('');
	let confirmingProdId = $state<Id | null>(null);
	let deletingProdId = $state<Id | null>(null);

	// ---------- toast ----------
	let toast = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		if (!q) return categories;
		return categories.filter(
			(c) => c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q)
		);
	});

	const activeCount = $derived(categories.filter((c) => c.isActive !== false).length);

	const selected = $derived(categories.find((c) => c.id === selectedId) ?? null);
	const selectedSub = $derived(subs.find((s) => s.id === selectedSubId) ?? null);
	// products attached directly to the category (no subcategory)
	const directProducts = $derived(prods.filter((p) => p.subcategoryId == null));
	// products of the currently opened subcategory
	const subProducts = $derived(selectedSub ? prods.filter((p) => p.subcategoryId === selectedSub.id) : []);

	const countSubProducts = (id: Id) => prods.filter((p) => p.subcategoryId === id).length;
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
			categories = await api<Category[]>(API);
		} catch (e) {
			notify('error', e instanceof Error ? e.message : 'Could not load categories.');
		} finally {
			loading = false;
		}
	});

	// =====================================================
	// details card
	// =====================================================
	async function loadDetails(c: Category) {
		detailsLoading = true;
		detailsError = '';
		subs = [];
		prods = [];
		try {
			const [nextSubs, nextProds] = await Promise.all([
				api<Subcategory[]>(`${SUBS_API}?categoryId=${encodeURIComponent(c.id)}`),
				api<Product[]>(`${PRODUCTS_API}?categoryId=${encodeURIComponent(c.id)}`)
			]);

			// ignore the result if another category was selected meanwhile
			if (selectedId !== c.id) return;
			subs = nextSubs;
			prods = nextProds;
		} catch (err) {
			if (selectedId !== c.id) return;
			detailsError = err instanceof Error ? err.message : 'Could not load details.';
		} finally {
			if (selectedId === c.id) detailsLoading = false;
		}
	}

	function resetManage() {
		openSection = null;
		subName = '';
		subDesc = '';
		subError = '';
		prodSubId = '';
		prodName = '';
		prodPrice = '';
		prodDesc = '';
		prodError = '';
		confirmingSubId = null;
		confirmingProdId = null;
	}

	async function selectCategory(c: Category) {
		if (selectedId === c.id) {
			closePanel();
			return;
		}
		selectedId = c.id;
		selectedSubId = null;
		resetManage();
		loadDetails(c);
		await tick();
		panelEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}

	function closePanel() {
		selectedId = null;
		selectedSubId = null;
		subs = [];
		prods = [];
		detailsError = '';
		resetManage();
	}

	// clicking a subcategory card shows its products and preselects it in the product form
	function toggleSub(s: Subcategory) {
		if (selectedSubId === s.id) {
			selectedSubId = null;
			prodSubId = '';
		} else {
			selectedSubId = s.id;
			prodSubId = s.id;
		}
	}

	// =====================================================
	// subcategories
	// =====================================================
	async function addSubcategory(e: SubmitEvent) {
		e.preventDefault();
		const cat = selected;
		if (!cat) return;
		subError = '';
		if (!subName.trim()) {
			subError = 'Enter a subcategory name.';
			return;
		}
		addingSub = true;
		try {
			const created = await api<Subcategory>(SUBS_API, {
				method: 'POST',
				body: JSON.stringify({ categoryId: cat.id, name: subName, description: subDesc })
			});
			if (selectedId === cat.id) subs = [created, ...subs];
			subName = '';
			subDesc = '';
			notify('success', 'Subcategory added.');
		} catch (err) {
			subError = err instanceof Error ? err.message : 'Could not add subcategory.';
		} finally {
			addingSub = false;
		}
	}

	function openEditSub(s: Subcategory) {
		editingSub = s;
		editSubName = s.name;
		editSubDesc = s.description ?? '';
		editSubError = '';
	}

	function closeEditSub() {
		if (savingSub) return;
		editingSub = null;
	}

	async function saveSub(e: SubmitEvent) {
		e.preventDefault();
		if (!editingSub) return;
		if (!editSubName.trim()) {
			editSubError = 'Enter a subcategory name.';
			return;
		}
		savingSub = true;
		editSubError = '';
		try {
			const updated = await api<Subcategory>(`${SUBS_API}/${editingSub.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ name: editSubName, description: editSubDesc })
			});
			subs = subs.map((s) => (s.id === updated.id ? { ...s, ...updated } : s));
			editingSub = null;
			notify('success', 'Subcategory saved.');
		} catch (err) {
			editSubError = err instanceof Error ? err.message : 'Could not save changes.';
		} finally {
			savingSub = false;
		}
	}

	async function removeSub(id: Id) {
		deletingSubId = id;
		try {
			await api(`${SUBS_API}/${id}`, { method: 'DELETE' });
			subs = subs.filter((s) => s.id !== id);
			if (selectedSubId === id) selectedSubId = null;
			if (prodSubId === id) prodSubId = '';
			notify('success', 'Subcategory deleted.');
		} catch (err) {
			// e.g. "This subcategory still has products. Move or delete them first."
			notify('error', err instanceof Error ? err.message : 'Could not delete subcategory.');
		} finally {
			deletingSubId = null;
			confirmingSubId = null;
		}
	}

	// =====================================================
	// products
	// =====================================================
	async function addProduct(e: SubmitEvent) {
		e.preventDefault();
		const cat = selected;
		if (!cat) return;
		prodError = '';
		if (!prodName.trim()) {
			prodError = 'Enter a product name.';
			return;
		}
		if (!validPrice(prodPrice)) {
			prodError = 'Enter a valid price (0 or more).';
			return;
		}
		addingProd = true;
		try {
			const created = await api<Product>(PRODUCTS_API, {
				method: 'POST',
				body: JSON.stringify({
					categoryId: cat.id,
					subcategoryId: prodSubId || null,
					name: prodName,
					price: prodPrice,
					description: prodDesc
				})
			});
			if (selectedId === cat.id) prods = [created, ...prods];
			// keep the subcategory selected so several products can be added in a row
			prodName = '';
			prodPrice = '';
			prodDesc = '';
			notify('success', 'Product added.');
		} catch (err) {
			prodError = err instanceof Error ? err.message : 'Could not add product.';
		} finally {
			addingProd = false;
		}
	}

	function openEditProd(p: Product) {
		editingProd = p;
		editProdSubId = p.subcategoryId ?? '';
		editProdName = p.name;
		editProdPrice = String(p.price);
		editProdDesc = p.description ?? '';
		editProdError = '';
	}

	function closeEditProd() {
		if (savingProd) return;
		editingProd = null;
	}

	async function saveProd(e: SubmitEvent) {
		e.preventDefault();
		if (!editingProd) return;
		if (!editProdName.trim()) {
			editProdError = 'Enter a product name.';
			return;
		}
		if (!validPrice(editProdPrice)) {
			editProdError = 'Enter a valid price (0 or more).';
			return;
		}
		savingProd = true;
		editProdError = '';
		try {
			const updated = await api<Product>(`${PRODUCTS_API}/${editingProd.id}`, {
				method: 'PATCH',
				body: JSON.stringify({
					subcategoryId: editProdSubId || null,
					name: editProdName,
					price: editProdPrice,
					description: editProdDesc
				})
			});
			prods = prods.map((p) => (p.id === updated.id ? { ...p, ...updated } : p));
			editingProd = null;
			notify('success', 'Product saved.');
		} catch (err) {
			editProdError = err instanceof Error ? err.message : 'Could not save changes.';
		} finally {
			savingProd = false;
		}
	}

	async function removeProd(id: Id) {
		deletingProdId = id;
		try {
			await api(`${PRODUCTS_API}/${id}`, { method: 'DELETE' });
			prods = prods.filter((p) => p.id !== id);
			notify('success', 'Product deleted.');
		} catch (err) {
			notify('error', err instanceof Error ? err.message : 'Could not delete product.');
		} finally {
			deletingProdId = null;
			confirmingProdId = null;
		}
	}

	// =====================================================
	// categories CRUD
	// =====================================================
	async function addCategory(e: SubmitEvent) {
		e.preventDefault();
		formError = '';
		if (!name.trim()) {
			formError = 'Enter a category name.';
			return;
		}
		adding = true;
		try {
			const created = await api<Category>(API, {
				method: 'POST',
				body: JSON.stringify({ name, description })
			});
			categories = [created, ...categories]; // newest first
			name = '';
			description = '';
			notify('success', 'Category added.');
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Could not add category.';
		} finally {
			adding = false;
		}
	}

	function openEdit(c: Category) {
		editing = c;
		editName = c.name;
		editDescription = c.description ?? '';
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
			editError = 'Enter a category name.';
			return;
		}
		saving = true;
		editError = '';
		try {
			const updated = await api<Category>(`${API}/${editing.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ name: editName, description: editDescription })
			});
			categories = categories.map((c) => (c.id === updated.id ? { ...c, ...updated } : c));
			editing = null;
			notify('success', 'Changes saved.');
		} catch (err) {
			editError = err instanceof Error ? err.message : 'Could not save changes.';
		} finally {
			saving = false;
		}
	}

	async function toggleActive(c: Category) {
		if (togglingId !== null) return;
		const previous = c.isActive !== false;
		const next = !previous;
		togglingId = c.id;

		// optimistic update
		categories = categories.map((x) => (x.id === c.id ? { ...x, isActive: next } : x));

		try {
			await api<Category>(`${API}/${c.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ isActive: next })
			});
			notify('success', next ? 'Category activated.' : 'Category deactivated.');
		} catch (err) {
			// rollback
			categories = categories.map((x) => (x.id === c.id ? { ...x, isActive: previous } : x));
			notify('error', err instanceof Error ? err.message : 'Could not update status.');
		} finally {
			togglingId = null;
		}
	}

	async function removeCategory(id: Id) {
		deletingId = id;
		try {
			await api(`${API}/${id}`, { method: 'DELETE' });
			categories = categories.filter((c) => c.id !== id);
			if (selectedId === id) closePanel();
			notify('success', 'Category deleted.');
		} catch (err) {
			notify('error', err instanceof Error ? err.message : 'Could not delete category.');
		} finally {
			deletingId = null;
			confirmingId = null;
		}
	}

	const inputClass =
		'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-gray-50 disabled:text-gray-400';
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			closeEdit();
			closeEditSub();
			closeEditProd();
		}
	}}
/>

<!-- Product rows (used for both the subcategory's products and the direct products) -->
{#snippet productList(items: Product[])}
	<ul class="mt-3 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
		{#each items as p (p.id)}
			<li class="flex items-center justify-between gap-3 px-4 py-3">
				<div class="min-w-0">
					<p class="truncate text-sm font-medium text-gray-900" title={p.name}>{p.name}</p>
					{#if p.description}
						<p class="truncate text-xs text-gray-500" title={p.description}>{p.description}</p>
					{/if}
				</div>

				<div class="flex shrink-0 items-center gap-1">
					<span class="mr-2 text-sm text-gray-600">{money(p.price)}</span>

					{#if confirmingProdId === p.id}
						<span class="text-xs text-gray-500">Delete?</span>
						<button
							type="button"
							disabled={deletingProdId === p.id}
							onclick={() => removeProd(p.id)}
							class="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
						>
							{deletingProdId === p.id ? '…' : 'Yes'}
						</button>
						<button
							type="button"
							onclick={() => (confirmingProdId = null)}
							class="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
						>
							No
						</button>
					{:else}
						<button
							type="button"
							onclick={() => openEditProd(p)}
							aria-label="Edit {p.name}"
							class="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
						>
							<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path d="M13.6 2.6a2 2 0 0 1 2.8 2.8l-.9.9-2.8-2.8.9-.9ZM11.3 4.9 3 13.2V16h2.8l8.3-8.3-2.8-2.8Z" />
							</svg>
						</button>
						<button
							type="button"
							onclick={() => (confirmingProdId = p.id)}
							aria-label="Delete {p.name}"
							class="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
						>
							<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path fill-rule="evenodd" d="M8 2a1 1 0 0 0-1 1v1H4a1 1 0 0 0 0 2h.1l.8 9.1A2 2 0 0 0 6.9 17h6.2a2 2 0 0 0 2-1.9l.8-9.1H16a1 1 0 1 0 0-2h-3V3a1 1 0 0 0-1-1H8Zm1 2V4h2v0H9Z" clip-rule="evenodd" />
							</svg>
						</button>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
{/snippet}

<div class="space-y-6">
	<div class="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
		<!-- ================= LEFT COLUMN ================= -->
		<div class="min-w-0 space-y-6">
			<!-- New category -->
			<section class="rounded-xl border border-gray-200 bg-white p-5">
				<h2 class="text-base font-semibold text-gray-900">New category</h2>
				<p class="mt-0.5 text-sm text-gray-500">Products can be grouped under it later.</p>

				<form class="mt-5 space-y-4" onsubmit={addCategory}>
					<div>
						<label for="cat-name" class="mb-1.5 block text-sm font-medium text-gray-700">
							Name <span class="text-red-500">*</span>
						</label>
						<input
							id="cat-name"
							class={inputClass}
							type="text"
							maxlength="80"
							placeholder="e.g. Injectables"
							bind:value={name}
						/>
					</div>

					<div>
						<div class="mb-1.5 flex items-center justify-between">
							<label for="cat-desc" class="text-sm font-medium text-gray-700">Description</label>
							<span class="text-xs text-gray-400">{description.length}/200</span>
						</div>
						<textarea
							id="cat-desc"
							class="{inputClass} resize-none"
							rows="3"
							maxlength="200"
							placeholder="Optional. What kind of products belong here?"
							bind:value={description}
						></textarea>
					</div>

					{#if formError}
						<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{formError}</p>
					{/if}

					<button
						type="submit"
						disabled={adding}
						class="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60"
					>
						{#if adding}
							<span class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
							Adding…
						{:else}
							<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
							</svg>
							Add category
						{/if}
					</button>
				</form>
			</section>

			<!-- Add to the selected category: two dropdown sections -->
			{#if selected}
				<section class="overflow-hidden rounded-xl border border-gray-200 bg-white">
					<div class="p-5 pb-4">
						<h2 class="text-base font-semibold text-gray-900">Add to {selected.name}</h2>
						<p class="mt-0.5 text-sm text-gray-500">Create subcategories and products for this category.</p>
					</div>

					<!-- Dropdown 1: subcategory -->
					<div class="border-t border-gray-100">
						<button
							type="button"
							onclick={() => (openSection = openSection === 'sub' ? null : 'sub')}
							aria-expanded={openSection === 'sub'}
							class="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
						>
							<span>Add subcategory</span>
							<svg class="size-4 text-gray-400 transition-transform {openSection === 'sub' ? 'rotate-180' : ''}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
							</svg>
						</button>

						{#if openSection === 'sub'}
							<form class="space-y-4 px-5 pb-5 pt-1" onsubmit={addSubcategory}>
								<div>
									<label for="sub-name" class="mb-1.5 block text-sm font-medium text-gray-700">
										Name <span class="text-red-500">*</span>
									</label>
									<input
										id="sub-name"
										class={inputClass}
										type="text"
										maxlength="80"
										placeholder="e.g. Botox"
										bind:value={subName}
									/>
								</div>

								<div>
									<div class="mb-1.5 flex items-center justify-between">
										<label for="sub-desc" class="text-sm font-medium text-gray-700">Description</label>
										<span class="text-xs text-gray-400">{subDesc.length}/200</span>
									</div>
									<textarea
										id="sub-desc"
										class="{inputClass} resize-none"
										rows="2"
										maxlength="200"
										placeholder="Optional."
										bind:value={subDesc}
									></textarea>
								</div>

								{#if subError}
									<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{subError}</p>
								{/if}

								<button
									type="submit"
									disabled={addingSub}
									class="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60"
								>
									{#if addingSub}
										<span class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
										Adding…
									{:else}
										Add subcategory
									{/if}
								</button>
							</form>
						{/if}
					</div>

					<!-- Dropdown 2: product -->
					<div class="border-t border-gray-100">
						<button
							type="button"
							onclick={() => (openSection = openSection === 'product' ? null : 'product')}
							aria-expanded={openSection === 'product'}
							class="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
						>
							<span>Add product</span>
							<svg class="size-4 text-gray-400 transition-transform {openSection === 'product' ? 'rotate-180' : ''}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
							</svg>
						</button>

						{#if openSection === 'product'}
							<form class="space-y-4 px-5 pb-5 pt-1" onsubmit={addProduct}>
								<!-- only shown when the category has subcategories -->
								{#if subs.length > 0}
									<div>
										<label for="prod-sub" class="mb-1.5 block text-sm font-medium text-gray-700">
											Subcategory <span class="font-normal text-gray-400">(optional)</span>
										</label>
										<select id="prod-sub" class={inputClass} bind:value={prodSubId}>
											<option value="">None (directly in {selected.name})</option>
											{#each subs as s (s.id)}
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
										bind:value={prodName}
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
											bind:value={prodPrice}
										/>
									</div>
								</div>

								<div>
									<div class="mb-1.5 flex items-center justify-between">
										<label for="prod-desc" class="text-sm font-medium text-gray-700">Description</label>
										<span class="text-xs text-gray-400">{prodDesc.length}/300</span>
									</div>
									<textarea
										id="prod-desc"
										class="{inputClass} resize-none"
										rows="2"
										maxlength="300"
										placeholder="Optional."
										bind:value={prodDesc}
									></textarea>
								</div>

								{#if prodError}
									<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{prodError}</p>
								{/if}

								<button
									type="submit"
									disabled={addingProd}
									class="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60"
								>
									{#if addingProd}
										<span class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
										Adding…
									{:else}
										Add product
									{/if}
								</button>
							</form>
						{/if}
					</div>
				</section>
			{/if}
		</div>

		<!-- ================= RIGHT COLUMN ================= -->
		<div class="min-w-0 space-y-6">
			<!-- All categories -->
			<section class="rounded-xl border border-gray-200 bg-white p-5">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 class="text-base font-semibold text-gray-900">All categories</h2>
						<p class="mt-0.5 text-sm text-gray-500">
							{categories.length}
							{categories.length === 1 ? 'category' : 'categories'} · {activeCount} active · click a card to see what's inside
						</p>
					</div>
					<div class="relative w-full sm:w-64">
						<svg class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path fill-rule="evenodd" d="M9 3a6 6 0 1 0 3.6 10.8l3.3 3.3a1 1 0 0 0 1.4-1.4l-3.3-3.3A6 6 0 0 0 9 3Zm-4 6a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clip-rule="evenodd" />
						</svg>
						<input
							class="{inputClass} pl-9"
							type="search"
							placeholder="Search categories"
							aria-label="Search categories"
							bind:value={search}
						/>
					</div>
				</div>

				<div class="mt-5 pt-5">
					{#if loading}
						<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{#each [1, 2, 3, 4, 5, 6] as n (n)}
								<div class="h-36 animate-pulse rounded-xl bg-gray-100"></div>
							{/each}
						</div>
					{:else if filtered.length === 0}
						<div class="rounded-xl border border-dashed border-gray-300 px-5 py-14 text-center text-sm text-gray-500">
							{#if categories.length === 0}
								No categories yet. Add your first one using the form.
							{:else}
								No categories match “{search}”.
							{/if}
						</div>
					{:else}
						<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{#each filtered as c (c.id)}
								{@const active = c.isActive !== false}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<article
									role="button"
									tabindex="0"
									aria-pressed={selectedId === c.id}
									onclick={() => selectCategory(c)}
									onkeydown={(e) => {
										if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
											e.preventDefault();
											selectCategory(c);
										}
									}}
									class="flex cursor-pointer flex-col rounded-xl border p-5 text-left transition hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
										{selectedId === c.id ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-200 hover:border-gray-300'}
										{active ? 'bg-white' : 'bg-gray-50'}"
								>
									<!-- top row: name + toggle -->
									<div class="flex items-start justify-between gap-3">
										<h3 class="min-w-0 truncate text-base font-semibold {active ? 'text-gray-900' : 'text-gray-500'}" title={c.name}>
											{c.name}
										</h3>

										<button
											type="button"
											role="switch"
											aria-checked={active}
											aria-label="{active ? 'Deactivate' : 'Activate'} {c.name}"
											disabled={togglingId === c.id}
											onclick={(e) => {
												e.stopPropagation();
												toggleActive(c);
											}}
											class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60 {active ? 'bg-emerald-600' : 'bg-gray-300'}"
										>
											<span class="inline-block size-5 rounded-full bg-white shadow transition-transform {active ? 'translate-x-5' : 'translate-x-0.5'}"></span>
										</button>
									</div>

									<!-- description -->
									<div class="mt-2 flex-1">
										{#if c.description}
											<p class="line-clamp-2 text-sm text-gray-600" title={c.description}>{c.description}</p>
										{:else}
											<p class="text-sm text-gray-400">No description</p>
										{/if}
									</div>

									<!-- meta -->
									<div class="mt-4 flex items-center gap-2 text-xs">
										<span class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium {active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}">
											<span class="size-1.5 rounded-full {active ? 'bg-emerald-500' : 'bg-gray-400'}"></span>
											{active ? 'Active' : 'Inactive'}
										</span>
										<span class="text-gray-400">·</span>
										<span class="text-gray-500">{formatDate(c.createdAt)}</span>
									</div>

									<!-- actions -->
									<div class="mt-4 flex items-center justify-end gap-1 border-t border-gray-100 pt-3">
										{#if confirmingId === c.id}
											<span class="mr-auto text-xs text-gray-500">Delete this category?</span>
											<button
												type="button"
												disabled={deletingId === c.id}
												onclick={(e) => {
													e.stopPropagation();
													removeCategory(c.id);
												}}
												class="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
											>
												{deletingId === c.id ? 'Deleting…' : 'Delete'}
											</button>
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													confirmingId = null;
												}}
												class="rounded-md px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
											>
												Cancel
											</button>
										{:else}
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													openEdit(c);
												}}
												class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
											>
												<svg class="size-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
													<path d="M13.6 2.6a2 2 0 0 1 2.8 2.8l-.9.9-2.8-2.8.9-.9ZM11.3 4.9 3 13.2V16h2.8l8.3-8.3-2.8-2.8Z" />
												</svg>
												Edit
											</button>
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													confirmingId = c.id;
												}}
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

			<!-- Details card: directly under the categories card -->
			{#if selected}
				<section bind:this={panelEl} class="rounded-xl border border-gray-200 bg-white p-5">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<h2 class="truncate text-base font-semibold text-gray-900">{selected.name}</h2>
							<p class="mt-0.5 text-sm text-gray-500">
								{#if detailsLoading}
									Loading…
								{:else}
									{subs.length} {subs.length === 1 ? 'subcategory' : 'subcategories'} · {directProducts.length}
									{directProducts.length === 1 ? 'product' : 'products'} directly in this category
								{/if}
							</p>
						</div>
						<button
							type="button"
							onclick={closePanel}
							aria-label="Close details"
							class="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
						>
							<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z" />
							</svg>
						</button>
					</div>

					{#if detailsLoading}
						<div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
							{#each [1, 2, 3] as n (n)}
								<div class="h-24 animate-pulse rounded-lg bg-gray-100"></div>
							{/each}
						</div>
					{:else if detailsError}
						<p class="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{detailsError}</p>
					{:else}
						<!-- Subcategories -->
						<h3 class="mt-5 text-sm font-semibold text-gray-900">Subcategories</h3>
						{#if subs.length === 0}
							<div class="mt-3 rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
								No subcategories yet. Use “Add subcategory” on the left.
							</div>
						{:else}
							<div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
								{#each subs as s (s.id)}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<div
										role="button"
										tabindex="0"
										aria-pressed={selectedSubId === s.id}
										onclick={() => toggleSub(s)}
										onkeydown={(e) => {
											if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
												e.preventDefault();
												toggleSub(s);
											}
										}}
										class="flex cursor-pointer flex-col rounded-lg border bg-white p-4 text-left transition hover:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
											{selectedSubId === s.id ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-200'}"
									>
										<p class="truncate font-medium text-gray-900" title={s.name}>{s.name}</p>
										<p class="mt-0.5 line-clamp-1 text-sm text-gray-500">{s.description ?? 'No description'}</p>
										<p class="mt-3 text-xs text-gray-500">{countSubProducts(s.id)} products</p>

										<div class="mt-3 flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
											{#if confirmingSubId === s.id}
												<span class="mr-auto text-xs text-gray-500">Delete?</span>
												<button
													type="button"
													disabled={deletingSubId === s.id}
													onclick={(e) => {
														e.stopPropagation();
														removeSub(s.id);
													}}
													class="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
												>
													{deletingSubId === s.id ? '…' : 'Yes'}
												</button>
												<button
													type="button"
													onclick={(e) => {
														e.stopPropagation();
														confirmingSubId = null;
													}}
													class="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
												>
													No
												</button>
											{:else}
												<button
													type="button"
													onclick={(e) => {
														e.stopPropagation();
														openEditSub(s);
													}}
													class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
												>
													Edit
												</button>
												<button
													type="button"
													onclick={(e) => {
														e.stopPropagation();
														confirmingSubId = s.id;
													}}
													class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
												>
													Delete
												</button>
											{/if}
										</div>
									</div>
								{/each}
							</div>

							<!-- Products of the opened subcategory -->
							{#if selectedSub}
								<h3 class="mt-6 text-sm font-semibold text-gray-900">Products in {selectedSub.name}</h3>
								{#if subProducts.length === 0}
									<div class="mt-3 rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
										No products in this subcategory yet.
									</div>
								{:else}
									{@render productList(subProducts)}
								{/if}
							{/if}
						{/if}

						<!-- Direct products (no subcategory) -->
						<h3 class="mt-6 text-sm font-semibold text-gray-900">
							{subs.length > 0 ? 'Products without a subcategory' : 'Products'}
						</h3>
						{#if directProducts.length === 0}
							<div class="mt-3 rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
								{subs.length > 0 ? 'No products directly in this category.' : 'No products yet.'}
							</div>
						{:else}
							{@render productList(directProducts)}
						{/if}
					{/if}
				</section>
			{/if}
		</div>
	</div>
</div>

<!-- Edit category modal -->
{#if editing}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-gray-900/40 p-4"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && closeEdit()}
	>
		<div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="edit-title">
			<h2 id="edit-title" class="text-base font-semibold text-gray-900">Edit category</h2>

			<form class="mt-5 space-y-4" onsubmit={saveEdit}>
				<div>
					<label for="edit-name" class="mb-1.5 block text-sm font-medium text-gray-700">
						Name <span class="text-red-500">*</span>
					</label>
					<input id="edit-name" class={inputClass} type="text" maxlength="80" bind:value={editName} />
				</div>
				<div>
					<label for="edit-desc" class="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
					<textarea id="edit-desc" class="{inputClass} resize-none" rows="3" maxlength="200" bind:value={editDescription}></textarea>
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

<!-- Edit subcategory modal -->
{#if editingSub}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-gray-900/40 p-4"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && closeEditSub()}
	>
		<div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="edit-sub-title">
			<h2 id="edit-sub-title" class="text-base font-semibold text-gray-900">Edit subcategory</h2>

			<form class="mt-5 space-y-4" onsubmit={saveSub}>
				<div>
					<label for="edit-sub-name" class="mb-1.5 block text-sm font-medium text-gray-700">
						Name <span class="text-red-500">*</span>
					</label>
					<input id="edit-sub-name" class={inputClass} type="text" maxlength="80" bind:value={editSubName} />
				</div>
				<div>
					<label for="edit-sub-desc" class="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
					<textarea id="edit-sub-desc" class="{inputClass} resize-none" rows="3" maxlength="200" bind:value={editSubDesc}></textarea>
				</div>

				{#if editSubError}
					<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{editSubError}</p>
				{/if}

				<div class="flex justify-end gap-2 pt-1">
					<button type="button" onclick={closeEditSub} class="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
						Cancel
					</button>
					<button
						type="submit"
						disabled={savingSub}
						class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
					>
						{savingSub ? 'Saving…' : 'Save changes'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Edit product modal -->
{#if editingProd}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-gray-900/40 p-4"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && closeEditProd()}
	>
		<div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="edit-prod-title">
			<h2 id="edit-prod-title" class="text-base font-semibold text-gray-900">Edit product</h2>

			<form class="mt-5 space-y-4" onsubmit={saveProd}>
				{#if subs.length > 0}
					<div>
						<label for="edit-prod-sub" class="mb-1.5 block text-sm font-medium text-gray-700">
							Subcategory <span class="font-normal text-gray-400">(optional)</span>
						</label>
						<select id="edit-prod-sub" class={inputClass} bind:value={editProdSubId}>
							<option value="">None (directly in the category)</option>
							{#each subs as s (s.id)}
								<option value={s.id}>{s.name}</option>
							{/each}
						</select>
					</div>
				{/if}

				<div>
					<label for="edit-prod-name" class="mb-1.5 block text-sm font-medium text-gray-700">
						Name <span class="text-red-500">*</span>
					</label>
					<input id="edit-prod-name" class={inputClass} type="text" maxlength="120" bind:value={editProdName} />
				</div>

				<div>
					<label for="edit-prod-price" class="mb-1.5 block text-sm font-medium text-gray-700">
						Price <span class="text-red-500">*</span>
					</label>
					<div class="relative">
						<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
						<input
							id="edit-prod-price"
							class="{inputClass} pl-7"
							type="number"
							min="0"
							step="0.01"
							inputmode="decimal"
							bind:value={editProdPrice}
						/>
					</div>
				</div>

				<div>
					<label for="edit-prod-desc" class="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
					<textarea id="edit-prod-desc" class="{inputClass} resize-none" rows="3" maxlength="300" bind:value={editProdDesc}></textarea>
				</div>

				{#if editProdError}
					<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{editProdError}</p>
				{/if}

				<div class="flex justify-end gap-2 pt-1">
					<button type="button" onclick={closeEditProd} class="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
						Cancel
					</button>
					<button
						type="submit"
						disabled={savingProd}
						class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
					>
						{savingProd ? 'Saving…' : 'Save changes'}
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