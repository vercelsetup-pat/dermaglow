<script lang="ts">
	import { onMount } from 'svelte';
	import type { Category, Subcategory, Product } from '#lib/types.ts';
	import { PlusOutline, PenOutline, TrashBinOutline, CloseOutline } from "flowbite-svelte-icons";
	import { Spinner } from "flowbite-svelte";
	
	type Id = string;
	const API = '/api/categories';
	const SUBS_API = '/api/subcategories';
	const PRODUCTS_API = '/api/products';
	const NONE = '__none';

	//#region Variables Boolean
		let addingSub = $state(false);
		let attaching = $state(false);
		let adding = $state(false);
		let addingProd = $state(false);
		let detailsLoading = $state(false);
		let loading = $state(true);
		let newCatOpen = $state(false);
		let saving = $state(false);
		let savingSub = $state(false);
		let savingProd = $state(false);
		let poolLoading = $state(false);
	//#endregion

	//#region Variables String
		let search = $state('');
		let name = $state('');
		let description = $state('');
		let formError = $state('');
		let editName = $state('');
		let editDescription = $state('');
		let editError = $state('');
		let editSubName = $state('');
		let editSubDesc = $state('');
		let editProdSubId = $state('');
		let editProdName = $state('');
		let editProdDesc = $state('');
		let editProdError = $state('');
		let editSubError = $state('');
		let detailsError = $state('');
		let subName = $state('');
		let subDesc = $state('');
		let attachError = $state('');
		let subError = $state('');
		let prodSubId = $state('');
		let prodName = $state('');
		let prodDesc = $state('');
		let prodError = $state('');
	//#endregion

	//#region Variables Others
		let categories = $state<Category[]>([]);
		let editing = $state<Category | null>(null);
		let editingSub = $state<Subcategory | null>(null);
		let editingProd = $state<Product | null>(null);
		let subs = $state<Subcategory[]>([]);
		let prods = $state<Product[]>([]);
		let confirmingId = $state<Id | null>(null);
		let deletingId = $state<Id | null>(null);
		let togglingId = $state<Id | null>(null);
		let selectedId = $state<Id | null>(null);
		let filter = $state<'all' | typeof NONE | Id>('all');
		let panelEl = $state<HTMLElement | null>(null);
		let addModal = $state<'sub' | 'product' | null>(null);
		let addTab = $state<'existing' | 'new'>('existing');
		let allSubs = $state<Subcategory[]>([]);
		let allProds = $state<Product[]>([]);
		let pickSearch = $state('');
		let picked = $state<Id[]>([]);
		let prodPrice = $state<number | string | null>('');
		let confirmingSubId = $state<Id | null>(null);
		let deletingSubId = $state<Id | null>(null);
		let editProdPrice = $state<number | string | null>('');

		let confirmingProdId = $state<Id | null>(null);
		let deletingProdId = $state<Id | null>(null);
		let toast = $state<{ type: 'success' | 'error'; text: string } | null>(null);
		let toastTimer: ReturnType<typeof setTimeout> | undefined;
	//#endregion

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		if (!q) return categories;
		return categories.filter(
			(c) => c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q)
		);
	});

	const selected = $derived(categories.find((c) => c.id === selectedId) ?? null);
	const selectedActive = $derived(selected ? selected.isActive !== false : false);
	const selectedSub = $derived(subs.find((s) => s.id === filter) ?? null);
	const directProducts = $derived(prods.filter((p) => p.subcategoryId == null));
	const visibleProducts = $derived(
		filter === 'all'
			? prods
			: filter === NONE
				? directProducts
				: prods.filter((p) => p.subcategoryId === filter)
	);

	// pool of existing items for the "Existing" tab
	const searchQ = $derived(pickSearch.trim().toLowerCase());
	const visibleSubs = $derived(
		allSubs.filter((s) => s.categoryId !== selectedId && s.name.toLowerCase().includes(searchQ))
	);
	const visiblePool = $derived(
		allProds.filter((p) => p.categoryId !== selectedId && p.name.toLowerCase().includes(searchQ))
	);
	const availableCount = $derived(
		addModal === 'sub'
			? allSubs.filter((s) => s.categoryId !== selectedId).length
			: allProds.filter((p) => p.categoryId !== selectedId).length
	);
	const movingProds = $derived(
		allProds.filter((p) => picked.includes(p.id) && p.categoryId != null).length
	);

	const countSubProducts = (id: Id) => prods.filter((p) => p.subcategoryId === id).length;
	const countPoolSubProducts = (id: Id) => allProds.filter((p) => p.subcategoryId === id).length;
	const categoryName = (id: Id | null) => categories.find((c) => c.id === id)?.name ?? null;
	const subName_ = (id: Id | null) => subs.find((s) => s.id === id)?.name ?? null;
	const money = (v: number | string) =>
		`$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;


	//#region Functions
		function clearSelection() {
			selectedId = null;
			filter = 'all';
			subs = [];
			prods = [];
			detailsError = '';
			resetAddForms();
		}

		function closeAdd() {
			if (attaching || addingSub || addingProd) return;
			addModal = null;
		}

		function closeEditSub() {
			if (savingSub) return;
			editingSub = null;
		}

		function closeEditProd() {
			if (savingProd) return;
			editingProd = null;
		}

		function closeNewCategory() {
			if (adding) return;
			newCatOpen = false;
		}

		function closeEdit() {
			if (saving) return;
			editing = null;
		}

		function notify(type: 'success' | 'error', text: string) {
			toast = { type, text };
			clearTimeout(toastTimer);
			toastTimer = setTimeout(() => (toast = null), 3000);
		}

		function openAdd(kind: 'sub' | 'product') {
			addModal = kind;
			addTab = 'existing';
			pickSearch = '';
			picked = [];
			attachError = '';
			subError = '';
			prodError = '';
			if (kind === 'product') prodSubId = selectedSub ? selectedSub.id : '';
			loadPool();
		}

		function openEditSub(s: Subcategory) {
			editingSub = s;
			editSubName = s.name;
			editSubDesc = s.description ?? '';
			editSubError = '';
		}

		function openEditProd(p: Product) {
			editingProd = p;
			editProdSubId = p.subcategoryId ?? '';
			editProdName = p.name;
			editProdPrice = String(p.price);
			editProdDesc = p.description ?? '';
			editProdError = '';
		}

		function openEdit(c: Category) {
			editing = c;
			editName = c.name;
			editDescription = c.description ?? '';
			editError = '';
		}

		function selectCategory(c: Category, scroll = true) {
			if (selectedId === c.id) return;
				selectedId = c.id;
				filter = 'all';
				confirmingId = null;
				resetAddForms();
				loadDetails(c);
			if (scroll && typeof window !== 'undefined' && window.innerWidth < 1024) {
				setTimeout(() => panelEl?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
			}
		}

		function validPrice(value: number | string | null) {
			const s = String(value ?? '').trim();
			if (s === '') return false;
			const n = Number(s);
			return Number.isFinite(n) && n >= 0;
		}

		function resetAddForms() {
			addModal = null;
			addTab = 'existing';
			pickSearch = '';
			picked = [];
			attachError = '';
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

		function togglePick(id: Id) {
			picked = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
			attachError = '';
		}
	//#endregion 

	//#region Async Functions
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
				categories = [created, ...categories];
				name = '';
				description = '';
				newCatOpen = false;
				notify('success', 'Category added.');
				selectCategory(created);
			} catch (err) {
				formError = err instanceof Error ? err.message : 'Could not add category.';
			} finally {
				adding = false;
			}
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

		async function attachSelected() {
			const cat = selected;
			const kind = addModal;
			if (!cat || !kind) return;
			if (picked.length === 0) {
				attachError = kind === 'sub' ? 'Select at least one subcategory.' : 'Select at least one product.';
				return;
			}

			attaching = true;
			attachError = '';
			const total = picked.length;
			const failed: Id[] = [];
			let lastMessage = '';

			for (const id of picked) {
				try {
					if (kind === 'sub') {
						await api(`${SUBS_API}/${id}/move`, {
							method: 'POST',
							body: JSON.stringify({ categoryId: cat.id })
						});
					} else {
						await api(`${PRODUCTS_API}/${id}/assign`, {
							method: 'POST',
							body: JSON.stringify({ categoryId: cat.id, subcategoryId: prodSubId || null })
						});
					}
				} catch (err) {
					failed.push(id);
					lastMessage = err instanceof Error ? err.message : 'Could not add item.';
				}
			}

			const okCount = total - failed.length;
			picked = failed;
			await Promise.all([loadDetails(cat), loadPool()]);
			attaching = false;

			if (okCount > 0) {
				const label =
					kind === 'sub'
						? 'subcategor' + (okCount === 1 ? 'y' : 'ies')
						: okCount === 1
							? 'product'
							: 'products';
				notify('success', `${okCount} ${label} added.`);
			}
			if (failed.length > 0) {
				attachError = `${failed.length} could not be added. ${lastMessage}`;
			} else {
				addModal = null;
			}
		}

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
				addModal = null;
				notify('success', 'Subcategory added.');
			} catch (err) {
				subError = err instanceof Error ? err.message : 'Could not add subcategory.';
			} finally {
				addingSub = false;
			}
		}

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
				prodName = '';
				prodPrice = '';
				prodDesc = '';
				addModal = null;
				notify('success', 'Product added.');
			} catch (err) {
				prodError = err instanceof Error ? err.message : 'Could not add product.';
			} finally {
				addingProd = false;
			}
		}

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
				if (selectedId !== c.id) return;
				subs = nextSubs;
				prods = nextProds;
				if (filter !== 'all' && filter !== NONE && !nextSubs.some((s) => s.id === filter)) {
					filter = 'all';
				}
			} catch (err) {
				if (selectedId !== c.id) return;
				detailsError = err instanceof Error ? err.message : 'Could not load details.';
			} finally {
				if (selectedId === c.id) detailsLoading = false;
			}
		}

		async function loadPool() {
			poolLoading = true;
			try {
				const [s, p] = await Promise.all([api<Subcategory[]>(SUBS_API), api<Product[]>(PRODUCTS_API)]);
				allSubs = s;
				allProds = p;
			} catch (err) {
				attachError = err instanceof Error ? err.message : 'Could not load existing items.';
			} finally {
				poolLoading = false;
			}
		}

		function openNewCategory() {
			name = '';
			description = '';
			formError = '';
			newCatOpen = true;
		}

		async function removeSub(id: Id) {
			deletingSubId = id;
			try {
				await api(`${SUBS_API}/${id}`, { method: 'DELETE' });
				subs = subs.filter((s) => s.id !== id);
				if (filter === id) filter = 'all';
				if (prodSubId === id) prodSubId = '';
				notify('success', 'Subcategory deleted.');
			} catch (err) {
				notify('error', err instanceof Error ? err.message : 'Could not delete subcategory.');
			} finally {
				deletingSubId = null;
				confirmingSubId = null;
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

		async function removeCategory(id: Id) {
			deletingId = id;
			try {
				await api(`${API}/${id}`, { method: 'DELETE' });
				const rest = categories.filter((c) => c.id !== id);
				categories = rest;
				if (selectedId === id) {
					clearSelection();
					if (rest.length > 0) selectCategory(rest[0], false);
				}
				notify('success', 'Category deleted.');
			} catch (err) {
				notify('error', err instanceof Error ? err.message : 'Could not delete category.');
			} finally {
				deletingId = null;
				confirmingId = null;
			}
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

			categories = categories.map((x) => (x.id === c.id ? { ...x, isActive: next } : x));

			try {
				await api<Category>(`${API}/${c.id}`, {
					method: 'PATCH',
					body: JSON.stringify({ isActive: next })
				});
				notify('success', next ? 'Category is now visible in the store.' : 'Category hidden from the store.');
			} catch (err) {
				categories = categories.map((x) => (x.id === c.id ? { ...x, isActive: previous } : x));
				notify('error', err instanceof Error ? err.message : 'Could not update status.');
			} finally {
				togglingId = null;
			}
		}

	//#endregion

	onMount(async () => {
		try {
			categories = await api<Category[]>(API);
			if (categories.length > 0) selectCategory(categories[0], false);
		} catch (e) {
			notify('error', e instanceof Error ? e.message : 'Could not load categories.');
		} finally {
			loading = false;
		}
	});
	
	

	const ghostBtn =
		'rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100';
	const outlineBtn =
		'inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';
	const iconBtn =
		'rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') { closeAdd(); closeNewCategory(); closeEdit(); closeEditSub(); closeEditProd();}}}/>

<!-- Product rows -->
{#snippet productList(items: Product[])}
	<ul class="divide-y divide-gray-100">
		{#each items as p (p.id)}
			<li class="group flex items-center gap-3 py-3">
				<div class="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-gray-100 text-gray-400">
					{#if p.imageUrl}
						<img src={p.imageUrl} alt="" class="size-full object-cover" />
					{:else}
						<svg class="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path fill-rule="evenodd" d="M4 3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4Zm0 2h12v6.6l-2.3-2.3a1 1 0 0 0-1.4 0L9 12.6 7.7 11.3a1 1 0 0 0-1.4 0L4 13.6V5Zm9 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" clip-rule="evenodd" />
						</svg>
					{/if}
				</div>

				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium text-gray-900" title={p.name}>{p.name}</p>
					<p class="truncate text-xs text-gray-500" title={p.description ?? ''}>
						{p.description || 'No description'}
					</p>
				</div>

				{#if filter === 'all' && p.subcategoryId && subName_(p.subcategoryId)}
					<span class="hidden shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 sm:inline">
						{subName_(p.subcategoryId)}
					</span>
				{/if}

				<span class="w-20 shrink-0 text-right text-sm font-semibold text-gray-900">{money(p.price)}</span>

				<div class="flex w-24 shrink-0 items-center justify-end gap-0.5">
					{#if confirmingProdId === p.id}
						<button
							type="button"
							disabled={deletingProdId === p.id}
							onclick={() => removeProd(p.id)}
							class="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
						>
							{deletingProdId === p.id ? '…' : 'Delete'}
						</button>
						<button
							type="button"
							onclick={() => (confirmingProdId = null)}
							class="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
						>
							No
						</button>
					{:else}
						<button type="button" onclick={() => openEditProd(p)} aria-label="Edit {p.name}" class={iconBtn}>
							<PenOutline class="shrink-0 h-4 w-4" />
						</button>
						<button
							type="button"
							onclick={() => (confirmingProdId = p.id)}
							aria-label="Delete {p.name}"
							class="{iconBtn} hover:bg-red-50 hover:text-red-600"
						>
							<TrashBinOutline class="shrink-0 h-4 w-4" />
						</button>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
{/snippet}

<!-- ================= PAGE ================= -->
<div class="overflow-hidden rounded-xl border border-gray-200 bg-white lg:grid lg:grid-cols-[19rem_minmax(0,1fr)]">
	<!-- ============ LEFT SIDE ============ -->
	<aside class="border-b border-gray-200 bg-gray-50/70 p-4 lg:border-b-0 lg:border-r">
		<div class="flex items-center justify-between gap-2 px-1">
			<div>
				<h2 class="text-sm font-semibold text-gray-900">Categories</h2>
				<p class="text-xs text-gray-500">
					{categories.length} total · {categories.filter((c) => c.isActive !== false).length} visible
				</p>
			</div>
			<button type="button" onclick={openNewCategory} class={outlineBtn}>
				<PlusOutline class="shrink-0 h-4 w-4" />
				New
			</button>
		</div>

		<div class="relative mt-4">
			<input class="input-field pl-20" type="search" placeholder="Search categories" aria-label="Search categories" bind:value={search}/>
		</div>

		<div class="mt-3 max-h-[28rem] space-y-1 overflow-y-auto lg:max-h-none">
			{#if loading}
				{#each [1, 2, 3, 4] as n (n)}
					<div class="h-14 animate-pulse rounded-lg bg-gray-100"></div>
				{/each}
			{:else if filtered.length === 0}
				<p class="rounded-lg border border-dashed border-gray-300 px-3 py-8 text-center text-sm text-gray-500">
					{categories.length === 0 ? 'No categories yet. Create your first one.' : `No categories match “${search}”.`}
				</p>
			{:else}
				{#each filtered as c (c.id)}
					{@const active = c.isActive !== false}
					<button
						type="button"
						onclick={() => selectCategory(c)}
						aria-current={selectedId === c.id}
						class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
							{selectedId === c.id ? 'bg-[var(--color-light-sec)] shadow-sm ring-1 ring-gray-200' : 'hover:bg-gray-100'}"
					>
						<span class="size-2 shrink-0 rounded-full {active ? 'bg-emerald-500' : 'bg-gray-300'}" aria-hidden="true"></span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm {selectedId === c.id ? 'font-semibold' : 'font-medium'} {active ? 'text-gray-900' : 'text-gray-500'}">
								{c.name}
							</span>
							<span class="block truncate text-xs text-gray-500">
								{#if c.subCount != null && c.productCount != null}
									{c.subCount} sub · {c.productCount} products
								{:else if !active}
									Hidden from store
								{:else}
									{c.description || 'No description'}
								{/if}
							</span>
						</span>
					</button>
				{/each}
			{/if}
		</div>
	</aside>

	<!-- ============ RIGHT SIDE ============ -->
	<section bind:this={panelEl} class="min-w-0 p-5 sm:p-6">
		{#if loading}
			<div class="space-y-4">
				<div class="h-6 w-48 animate-pulse rounded bg-gray-100"></div>
				<div class="grid gap-3 sm:grid-cols-3">
					{#each [1, 2, 3] as n (n)}
						<div class="h-16 animate-pulse rounded-lg bg-gray-100"></div>
					{/each}
				</div>
				<div class="h-48 animate-pulse rounded-lg bg-gray-100"></div>
			</div>
		{:else if !selected}
			<div class="grid min-h-72 place-items-center text-center">
				<div>
					<p class="text-base font-semibold text-gray-900">Select a category</p>
					<p class="mt-1 text-sm text-gray-500">Pick one from the list to manage its subcategories and products.</p>
				</div>
			</div>
		{:else}
			<!-- header -->
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div class="min-w-0">
					<p class="text-xs text-gray-400">Categories / <span class="text-gray-500">{selected.name}</span></p>
					<div class="mt-1 flex flex-wrap items-center gap-2.5">
						<h2 class="truncate text-xl font-semibold text-gray-900">{selected.name}</h2>
						<span class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium {selectedActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}">
							<span class="size-1.5 rounded-full {selectedActive ? 'bg-emerald-500' : 'bg-gray-400'}"></span>
							{selectedActive ? 'Active' : 'Hidden'}
						</span>
					</div>
					<p class="mt-1 max-w-xl text-sm text-gray-500">{selected.description || 'No description yet.'}</p>
				</div>

				<div class="flex items-center gap-1.5">
					<button
						type="button"
						role="switch"
						aria-checked={selectedActive}
						aria-label="{selectedActive ? 'Hide' : 'Show'} {selected.name} in the store"
						title={selectedActive ? 'Visible in store' : 'Hidden from store'}
						disabled={togglingId === selected.id}
						onclick={() => toggleActive(selected)}
						class="relative mr-2 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60 {selectedActive ? 'bg-emerald-600' : 'bg-gray-300'}"
					>
						<span class="inline-block size-5 rounded-full bg-white shadow transition-transform {selectedActive ? 'translate-x-5' : 'translate-x-0.5'}"></span>
					</button>

					{#if confirmingId === selected.id}
						<span class="text-xs text-gray-500">Delete this category?</span>
						<button
							type="button"
							disabled={deletingId === selected.id}
							onclick={() => removeCategory(selected.id)}
							class="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
						>
							{deletingId === selected.id ? 'Deleting…' : 'Delete'}
						</button>
						<button
							type="button"
							onclick={() => (confirmingId = null)}
							class="rounded-md px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
						>
							Cancel
						</button>
					{:else}
						<button type="button" onclick={() => openEdit(selected)} aria-label="Edit category" title="Edit category" class={iconBtn}>
							<PenOutline class="shrink-0 h-4 w-4" />
						</button>
						<button
							type="button"
							onclick={() => (confirmingId = selected.id)}
							aria-label="Delete category"
							title="Delete category"
							class="{iconBtn} hover:bg-red-50 hover:text-red-600"
						>
							<TrashBinOutline class="shrink-0 h-4 w-4" />
						</button>
					{/if}
				</div>
			</div>

			{#if detailsLoading}
				<div class="mt-6 grid gap-3 sm:grid-cols-3">
					{#each [1, 2, 3] as n (n)}
						<div class="h-16 animate-pulse rounded-lg bg-gray-100"></div>
					{/each}
				</div>
				<div class="mt-6 space-y-2">
					{#each [1, 2, 3] as n (n)}
						<div class="h-14 animate-pulse rounded-lg bg-gray-100"></div>
					{/each}
				</div>
			{:else if detailsError}
				<p class="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{detailsError}</p>
			{:else}
				<!-- stat tiles -->
				<div class="mt-6 grid gap-3 sm:grid-cols-3">
					<div class="rounded-lg bg-gray-50 px-4 py-3">
						<p class="text-xs text-gray-500">Subcategories</p>
						<p class="mt-0.5 text-xl font-semibold text-gray-900">{subs.length}</p>
					</div>
					<div class="rounded-lg bg-gray-50 px-4 py-3">
						<p class="text-xs text-gray-500">Products</p>
						<p class="mt-0.5 text-xl font-semibold text-gray-900">{prods.length}</p>
					</div>
					<div class="rounded-lg bg-gray-50 px-4 py-3">
						<p class="text-xs text-gray-500">Visible in store</p>
						<p class="mt-0.5 text-xl font-semibold {selectedActive ? 'text-emerald-700' : 'text-gray-500'}">
							{selectedActive ? 'Yes' : 'No'}
						</p>
					</div>
				</div>

				<!-- toolbar: filter chips + add buttons -->
				<div class="mt-7 flex flex-wrap items-center justify-between gap-3">
					<div class="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter products by subcategory">
						<button
							type="button"
							aria-pressed={filter === 'all'}
							onclick={() => (filter = 'all')}
							class="rounded-full border px-3 py-1 text-sm transition {filter === 'all' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}"
						>
							All <span class="{filter === 'all' ? 'text-white/70' : 'text-gray-400'}">{prods.length}</span>
						</button>
						{#each subs as s (s.id)}
							<button
								type="button"
								aria-pressed={filter === s.id}
								onclick={() => (filter = filter === s.id ? 'all' : s.id)}
								class="rounded-full border px-3 py-1 text-sm transition {filter === s.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}"
							>
								{s.name}
								<span class="{filter === s.id ? 'text-white/70' : 'text-gray-400'}">{countSubProducts(s.id)}</span>
							</button>
						{/each}
						{#if subs.length > 0 && directProducts.length > 0}
							<button
								type="button"
								aria-pressed={filter === NONE}
								onclick={() => (filter = filter === NONE ? 'all' : NONE)}
								class="rounded-full border border-dashed px-3 py-1 text-sm transition {filter === NONE ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}"
							>
								No subcategory <span class="{filter === NONE ? 'text-white/70' : 'text-gray-400'}">{directProducts.length}</span>
							</button>
						{/if}
					</div>

					<div class="flex items-center gap-2">
						<button type="button" onclick={() => openAdd('sub')} class={outlineBtn}>
							<PlusOutline class="shrink-0 h-4 w-4" />
							Subcategory
						</button>
						<button type="button" onclick={() => openAdd('product')} class="btn-primary">
							<PlusOutline class="shrink-0 h-4 w-4" />
							Product
						</button>
					</div>
				</div>

				<!-- selected subcategory info -->
				{#if selectedSub}
					<div class="mt-4 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3">
						<div class="min-w-0">
							<p class="truncate text-sm font-medium text-gray-900">{selectedSub.name}</p>
							<p class="truncate text-xs text-gray-500">{selectedSub.description || 'No description'}</p>
						</div>
						<div class="flex shrink-0 items-center gap-1">
							{#if confirmingSubId === selectedSub.id}
								<span class="text-xs text-gray-500">Delete subcategory?</span>
								<button
									type="button"
									disabled={deletingSubId === selectedSub.id}
									onclick={() => removeSub(selectedSub.id)}
									class="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
								>
									{deletingSubId === selectedSub.id ? '…' : 'Delete'}
								</button>
								<button
									type="button"
									onclick={() => (confirmingSubId = null)}
									class="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
								>
									No
								</button>
							{:else}
								<button type="button" onclick={() => openEditSub(selectedSub)} aria-label="Edit subcategory" class={iconBtn}>
									<PenOutline class="shrink-0 h-4 w-4" />
								</button>
								<button
									type="button"
									onclick={() => (confirmingSubId = selectedSub.id)}
									aria-label="Delete subcategory"
									class="{iconBtn} hover:bg-red-50 hover:text-red-600"
								>
									<TrashBinOutline class="shrink-0 h-4 w-4" />
								</button>
							{/if}
						</div>
					</div>
				{/if}

				<!-- products -->
				<div class="mt-4">
					{#if visibleProducts.length === 0}
						<div class="rounded-lg border border-dashed border-gray-300 px-4 py-12 text-center">
							<p class="text-sm font-medium text-gray-900">
								{prods.length === 0 ? 'No products yet' : 'No products in this view'}
							</p>
							<p class="mt-1 text-sm text-gray-500">
								Add an existing product or create a new one for {selected.name}.
							</p>
							<button type="button" onclick={() => openAdd('product')} class="btn-primary mt-4">
								<PlusOutline class="shrink-0 h-4 w-4" />
								Add product
							</button>
						</div>
					{:else}
						{@render productList(visibleProducts)}
					{/if}
				</div>
			{/if}
		{/if}
	</section>
</div>

<!-- ================= New category modal ================= -->
{#if newCatOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-gray-900/40 p-4"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && closeNewCategory()}
	>
		<div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="new-cat-title">
			<h2 id="new-cat-title" class="text-base font-semibold text-gray-900">New category</h2>
			<p class="mt-0.5 text-sm text-gray-500">Subcategories and products can be added to it afterwards.</p>

			<form class="mt-5 space-y-4" onsubmit={addCategory}>
				<div>
					<label for="cat-name" class="mb-1.5 block text-sm font-medium text-gray-700">
						Name <span class="text-red-500">*</span>
					</label>
					<input
						id="cat-name"
						class="input-field"
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
						class="input-field resize-none"
						rows="3"
						maxlength="200"
						placeholder="Optional. What kind of products belong here?"
						bind:value={description}
					></textarea>
				</div>

				{#if formError}
					<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{formError}</p>
				{/if}

				<div class="flex justify-end gap-2 pt-1">
					<button type="button" onclick={closeNewCategory} class={ghostBtn}>Cancel</button>
					<button type="submit" disabled={adding} class="btn-primary">
						{#if adding}
							<Spinner />
							Adding…
						{:else}
							Create category
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ================= Add modal (existing / create new) ================= -->
{#if addModal && selected}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-gray-900/40 p-4"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && closeAdd()}
	>
		<div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="add-title">
			<div class="flex items-start justify-between gap-3">
				<h2 id="add-title" class="min-w-0 truncate text-base font-semibold text-gray-900">
					{addModal === 'sub' ? 'Add subcategories' : 'Add products'} to {selected.name}
				</h2>
				<button type="button" onclick={closeAdd} aria-label="Close" class={iconBtn}>
					<CloseOutline class="shrink-0 h-4 w-4" />
				</button>
			</div>

			<div class="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 text-sm font-medium" role="tablist">
				<button
					type="button"
					role="tab"
					aria-selected={addTab === 'existing'}
					onclick={() => (addTab = 'existing')}
					class="rounded-md px-3 py-1.5 transition {addTab === 'existing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
				>
					Existing
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={addTab === 'new'}
					onclick={() => (addTab = 'new')}
					class="rounded-md px-3 py-1.5 transition {addTab === 'new' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
				>
					Create new
				</button>
			</div>

			{#if addTab === 'existing'}
				<div class="mt-4 space-y-4">
					<div class="relative">
						
						<input
							class="input-field pl-9"
							type="search"
							placeholder={addModal === 'sub' ? 'Search subcategories' : 'Search products'}
							aria-label="Search"
							bind:value={pickSearch}
						/>
					</div>

					{#if poolLoading && availableCount === 0}
						<div class="space-y-2">
							{#each [1, 2, 3] as n (n)}
								<div class="h-12 animate-pulse rounded-lg bg-gray-100"></div>
							{/each}
						</div>
					{:else if availableCount === 0}
						<p class="rounded-lg border border-dashed border-gray-300 px-3 py-8 text-center text-sm text-gray-500">
							{addModal === 'sub' ? 'No other subcategories available.' : 'No other products available.'}
						</p>
					{:else if (addModal === 'sub' ? visibleSubs.length : visiblePool.length) === 0}
						<p class="rounded-lg border border-dashed border-gray-300 px-3 py-8 text-center text-sm text-gray-500">
							No results for “{pickSearch}”.
						</p>
					{:else}
						<ul class="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
							{#if addModal === 'sub'}
								{#each visibleSubs as s (s.id)}
									<li>
										<label class="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-gray-50">
											<input
												type="checkbox"
												class="size-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
												checked={picked.includes(s.id)}
												onchange={() => togglePick(s.id)}
											/>
											<div class="min-w-0 flex-1">
												<p class="truncate text-sm font-medium text-gray-900">{s.name}</p>
												<p class="text-xs text-gray-500">{countPoolSubProducts(s.id)} products</p>
											</div>
											<span class="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
												In {categoryName(s.categoryId) ?? 'another category'}
											</span>
										</label>
									</li>
								{/each}
							{:else}
								{#each visiblePool as p (p.id)}
									<li>
										<label class="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-gray-50">
											<input
												type="checkbox"
												class="size-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
												checked={picked.includes(p.id)}
												onchange={() => togglePick(p.id)}
											/>
											<div class="min-w-0 flex-1">
												<p class="truncate text-sm font-medium text-gray-900">{p.name}</p>
												<p class="text-xs text-gray-500">{money(p.price)}</p>
											</div>
											{#if p.categoryId}
												<span class="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
													In {categoryName(p.categoryId) ?? 'another category'}
												</span>
											{:else}
												<span class="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
													No category
												</span>
											{/if}
										</label>
									</li>
								{/each}
							{/if}
						</ul>
					{/if}

					{#if addModal === 'product' && subs.length > 0}
						<div>
							<label for="pick-prod-sub" class="mb-1.5 block text-sm font-medium text-gray-700">
								Place in subcategory <span class="font-normal text-gray-400">(optional)</span>
							</label>
							<select id="pick-prod-sub" class="input-field" bind:value={prodSubId}>
								<option value="">None (directly in {selected.name})</option>
								{#each subs as s (s.id)}
									<option value={s.id}>{s.name}</option>
								{/each}
							</select>
						</div>
					{/if}

					{#if addModal === 'sub' && picked.length > 0}
						<p class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
							{picked.length === 1 ? 'This subcategory moves' : 'These subcategories move'} here together with their products.
						</p>
					{:else if addModal === 'product' && movingProds > 0}
						<p class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
							{movingProds}
							{movingProds === 1 ? 'product will' : 'products will'} move here from another category.
						</p>
					{/if}

					{#if attachError}
						<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{attachError}</p>
					{/if}

					<div class="flex justify-end gap-2 pt-1">
						<button type="button" onclick={closeAdd} class={ghostBtn}>Cancel</button>
						<button type="button" onclick={attachSelected} disabled={attaching} class="btn-primary">
							{#if attaching}
								<Spinner />
								Adding…
							{:else}
								{picked.length > 0 ? `Add ${picked.length} selected` : 'Add selected'}
							{/if}
						</button>
					</div>
				</div>
			{:else if addModal === 'sub'}
				<form class="mt-4 space-y-4" onsubmit={addSubcategory}>
					<div>
						<label for="sub-name" class="mb-1.5 block text-sm font-medium text-gray-700">
							Name <span class="text-red-500">*</span>
						</label>
						<input
							id="sub-name"
							class="input-field"
							type="text"
							maxlength="80"
							placeholder="e.g. Botulinum"
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
							class="input-field resize-none"
							rows="2"
							maxlength="200"
							placeholder="Optional."
							bind:value={subDesc}
						></textarea>
					</div>

					{#if subError}
						<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{subError}</p>
					{/if}

					<div class="flex justify-end gap-2 pt-1">
						<button type="button" onclick={closeAdd} class={ghostBtn}>Cancel</button>
						<button type="submit" disabled={addingSub} class="btn-primary">
							{#if addingSub}
								<Spinner />
								Adding…
							{:else}
								Create subcategory
							{/if}
						</button>
					</div>
				</form>
			{:else}
				<form class="mt-4 space-y-4" onsubmit={addProduct}>
					{#if subs.length > 0}
						<div>
							<label for="prod-sub" class="mb-1.5 block text-sm font-medium text-gray-700">
								Subcategory <span class="font-normal text-gray-400">(optional)</span>
							</label>
							<select id="prod-sub" class="input-field"bind:value={prodSubId}>
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
							class="input-field"
							type="text"
							maxlength="120"
							placeholder="e.g. Revolax Deep"
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
								class="input-field pl-7"
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
							class="input-field resize-none"
							rows="2"
							maxlength="300"
							placeholder="Optional."
							bind:value={prodDesc}
						></textarea>
					</div>

					{#if prodError}
						<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{prodError}</p>
					{/if}

					<div class="flex justify-end gap-2 pt-1">
						<button type="button" onclick={closeAdd} class={ghostBtn}>Cancel</button>
						<button type="submit" disabled={addingProd} class="btn-primary">
							{#if addingProd}
								<Spinner />
								Adding…
							{:else}
								Create product
							{/if}
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}

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
					<input id="edit-name" class="input-field" type="text" maxlength="80" bind:value={editName} />
				</div>
				<div>
					<label for="edit-desc" class="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
					<textarea id="edit-desc" class="input-field resize-none" rows="3" maxlength="200" bind:value={editDescription}></textarea>
				</div>

				{#if editError}
					<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{editError}</p>
				{/if}

				<div class="flex justify-end gap-2 pt-1">
					<button type="button" onclick={closeEdit} class={ghostBtn}>Cancel</button>
					<button type="submit" disabled={saving} class="btn-primary">
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
					<input id="edit-sub-name" class=input-field type="text" maxlength="80" bind:value={editSubName} />
				</div>
				<div>
					<label for="edit-sub-desc" class="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
					<textarea id="edit-sub-desc" class="input-field resize-none" rows="3" maxlength="200" bind:value={editSubDesc}></textarea>
				</div>

				{#if editSubError}
					<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{editSubError}</p>
				{/if}

				<div class="flex justify-end gap-2 pt-1">
					<button type="button" onclick={closeEditSub} class={ghostBtn}>Cancel</button>
					<button type="submit" disabled={savingSub} class="btn-primary">
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
						<select id="edit-prod-sub" class="input-field" bind:value={editProdSubId}>
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
					<input id="edit-prod-name" class="input-field" type="text" maxlength="120" bind:value={editProdName} />
				</div>

				<div>
					<label for="edit-prod-price" class="mb-1.5 block text-sm font-medium text-gray-700">
						Price <span class="text-red-500">*</span>
					</label>
					<div class="relative">
						<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
						<input
							id="edit-prod-price"
							class="input-field pl-7"
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
					<textarea id="edit-prod-desc" class="input-field resize-none" rows="3" maxlength="300" bind:value={editProdDesc}></textarea>
				</div>

				{#if editProdError}
					<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{editProdError}</p>
				{/if}

				<div class="flex justify-end gap-2 pt-1">
					<button type="button" onclick={closeEditProd} class={ghostBtn}>Cancel</button>
					<button type="submit" disabled={savingProd} class="btn-primary">
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