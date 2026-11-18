<script lang="ts">
	import { onMount, tick } from 'svelte';

	type Id = number | string;

	type Category = {
		id: Id;
		name: string;
		description: string | null;
		isActive?: boolean;
		createdAt?: string | null;
	};
	type Subcategory = {
		id: Id;
		categoryId: Id | null;
		name: string;
		description: string | null;
	};
	type Product = {
		id: Id;
		categoryId: Id | null;
		subcategoryId: Id | null; // null = belongs directly to the category
		name: string;
		price?: number | string | null;
	};

	const API = '/api/categories';

	let categories = $state<Category[]>([]);
	let loading = $state(true);
	let search = $state('');

	// add form
	let name = $state('');
	let description = $state('');
	let adding = $state(false);
	let formError = $state('');

	// edit modal
	let editing = $state<Category | null>(null);
	let editName = $state('');
	let editDescription = $state('');
	let saving = $state(false);
	let editError = $state('');

	// delete + toggle
	let confirmingId = $state<Id | null>(null);
	let deletingId = $state<Id | null>(null);
	let togglingId = $state<Id | null>(null);

	// selection + details card
	let selectedId = $state<Id | null>(null);
	let selectedSubId = $state<Id | null>(null);
	let subs = $state<Subcategory[]>([]);
	let prods = $state<Product[]>([]);
	let detailsLoading = $state(false);
	let detailsError = $state('');
	let panelEl = $state<HTMLElement | null>(null);

	// toast
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
	const money = (v: number | string) => `$${Number(v).toLocaleString('en-US')}`;

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

	onMount(async () => {
		try {
			categories = await api<Category[]>(API);
		} catch (e) {
			notify('error', e instanceof Error ? e.message : 'Could not load categories.');
		} finally {
			loading = false;
		}
	});

	// ---------- details card ----------
	async function loadDetails(c: Category) {
		detailsLoading = true;
		detailsError = '';
		subs = [];
		prods = [];
		try {
			const [nextSubs, nextProds] = await Promise.all([
				api<Subcategory[]>(`/api/subcategories?categoryId=${encodeURIComponent(String(c.id))}`),
				api<Product[]>(`/api/products?categoryId=${encodeURIComponent(String(c.id))}`)
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

	async function selectCategory(c: Category) {
		if (selectedId === c.id) {
			closePanel();
			return;
		}
		selectedId = c.id;
		selectedSubId = null;
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
	}

	// ---------- categories CRUD ----------
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
		'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20';
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && closeEdit()} />

<div class="space-y-6">
	<div class="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
		<!-- Add category -->
		<section class="rounded-xl border border-gray-200 bg-white p-5 lg:sticky lg:top-6">
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

		<!-- Categories -->
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
	</div>

	<!-- Details card: subcategories AND direct products (separate full-width card) -->
	{#if selected}
		<section bind:this={panelEl} class="rounded-xl border border-gray-200 bg-white p-5">
			<div class="flex items-start justify-between gap-3">
				<div>
					<h2 class="text-base font-semibold text-gray-900">{selected.name}</h2>
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
				<div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each [1, 2, 3, 4] as n (n)}
						<div class="h-20 animate-pulse rounded-lg bg-gray-100"></div>
					{/each}
				</div>
			{:else if detailsError}
				<p class="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{detailsError}</p>
			{:else}
				<!-- Subcategories -->
				{#if subs.length > 0}
					<h3 class="mt-5 text-sm font-semibold text-gray-900">Subcategories</h3>
					<div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each subs as s (s.id)}
							<button
								type="button"
								onclick={() => (selectedSubId = selectedSubId === s.id ? null : s.id)}
								aria-pressed={selectedSubId === s.id}
								class="rounded-lg border bg-white p-4 text-left transition hover:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
									{selectedSubId === s.id ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-200'}"
							>
								<p class="font-medium text-gray-900">{s.name}</p>
								<p class="mt-0.5 line-clamp-1 text-sm text-gray-500">{s.description ?? 'No description'}</p>
								<p class="mt-3 text-xs text-gray-500">{countSubProducts(s.id)} products</p>
							</button>
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
							<ul class="mt-3 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
								{#each subProducts as p (p.id)}
									<li class="flex items-center justify-between gap-3 px-4 py-3">
										<span class="min-w-0 truncate text-sm font-medium text-gray-900">{p.name}</span>
										{#if p.price != null}
											<span class="shrink-0 text-sm text-gray-600">{money(p.price)}</span>
										{/if}
									</li>
								{/each}
							</ul>
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
					<ul class="mt-3 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
						{#each directProducts as p (p.id)}
							<li class="flex items-center justify-between gap-3 px-4 py-3">
								<span class="min-w-0 truncate text-sm font-medium text-gray-900">{p.name}</span>
								{#if p.price != null}
									<span class="shrink-0 text-sm text-gray-600">{money(p.price)}</span>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		</section>
	{/if}
</div>

<!-- Edit modal -->
{#if editing}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 grid place-items-center bg-gray-900/40 p-4"
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

<!-- Toast -->
{#if toast}
	<div
		class="fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg {toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}"
		role="status"
	>
		{toast.text}
	</div>
{/if}