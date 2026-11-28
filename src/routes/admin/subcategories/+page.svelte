<script lang="ts">
	import { onMount } from 'svelte';
	import type { Category, Subcategory } from '#lib/types.ts';
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
		CloseOutline
	} from 'flowbite-svelte-icons';
	import {
		Button,
		Toggle,
		Badge,
		Checkbox,
		Input,
		Select,
		Textarea,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';

	type SortKey = 'name' | 'category' | 'description' | 'createdAt' | 'status';
	type Column = { key: SortKey; label: string };
	type Toast = { type: 'success' | 'error'; text: string };

	//#region Constants
	const CATEGORIES_API = '/api/categories';
	const API = '/api/subcategories';
	const columns: Column[] = [
		{ key: 'name', label: 'Sub Category' },
		{ key: 'category', label: 'Category' },
		{ key: 'description', label: 'Description' },
		{ key: 'status', label: 'Status' },
		{ key: 'createdAt', label: 'Created' }
	];
	// checkbox + columns + actions
	const colSpan = columns.length + 2;
	const emptyForm = { categoryId: '', name: '', description: '', isActive: true };
	const pageSizeItems = [8, 16, 24, 50].map((n) => ({ value: String(n), name: String(n) }));
	//#endregion

	//#region State
	let categories = $state<Category[]>([]);
	let subcategories = $state<Subcategory[]>([]);
	let loading = $state(true);

	// add / edit panel (one shared form)
	let panel = $state<'add' | 'edit' | null>(null);
	let editing = $state<Subcategory | null>(null);
	let form = $state({ ...emptyForm });
	let formError = $state('');
	let busy = $state(false);

	// table
	let search = $state('');
	let filterCategoryId = $state('');
	let sortKey = $state<SortKey>('createdAt');
	let sortDir = $state<'asc' | 'desc'>('desc');
	let pageSizeValue = $state('8');
	let currentPage = $state(1);
	let selected = $state<string[]>([]);

	// row actions
	let togglingId = $state<string | null>(null);
	let confirmingId = $state<string | null>(null);
	let deletingId = $state<string | null>(null);

	let toast = $state<Toast | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;
	//#endregion

	//#region Derived
	const categoryNames = $derived(new Map(categories.map((c) => [c.id, c.name])));
	const categoryName = (id: string) => categoryNames.get(id) ?? 'Unknown category';

	const categoryItems = $derived(
		categories.map((c) => ({
			value: c.id,
			name: `${c.name}${c.isActive === false ? ' (inactive)' : ''}`
		}))
	);
	const categoryFilterItems = $derived([
		{ value: '', name: 'All categories' },
		...categories.map((c) => ({ value: c.id, name: c.name }))
	]);

	const stats = $derived.by(() => {
		const used = new Set(subcategories.map((s) => s.categoryId)).size;
		return [
			{
				label: 'Total Sub Categories',
				value: subcategories.length,
				hint: 'Across all categories',
				icon: LayersOutline,
				tone: 'bg-green-50 text-green-600'
			},
			{
				label: 'Categories In Use',
				value: used,
				hint: 'Have at least one sub category',
				icon: CheckCircleOutline,
				tone: 'bg-green-50 text-green-600'
			},
			{
				label: 'Empty Categories',
				value: Math.max(categories.length - used, 0),
				hint: 'No sub categories yet',
				icon: ExclamationCircleOutline,
				tone: 'bg-amber-50 text-amber-600'
			},
			{
				label: 'No Description',
				value: subcategories.filter((s) => !s.description?.trim()).length,
				hint: 'Could use a description',
				icon: CloseCircleOutline,
				tone: 'bg-red-50 text-red-600'
			}
		];
	});

	const hasActiveFilters = $derived(!!filterCategoryId || !!search.trim());

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		return subcategories.filter((s) => {
			if (filterCategoryId && s.categoryId !== filterCategoryId) return false;
			if (!q) return true;
			return (
				s.name.toLowerCase().includes(q) ||
				(s.description ?? '').toLowerCase().includes(q) ||
				categoryName(s.categoryId).toLowerCase().includes(q)
			);
		});
	});

	const sorted = $derived.by(() => {
		const dir = sortDir === 'asc' ? 1 : -1;
		return [...filtered].sort((a, b) => {
			switch (sortKey) {
				case 'name':
					return a.name.localeCompare(b.name) * dir;
				case 'category':
					return categoryName(a.categoryId).localeCompare(categoryName(b.categoryId)) * dir;
				case 'description':
					return (a.description ?? '').localeCompare(b.description ?? '') * dir;
				case 'status':
					return (Number(a.isActive) - Number(b.isActive)) * dir;
				default:
					return (new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()) * dir;
			}
		});
	});

	const pageSize = $derived(Number(pageSizeValue));
	const totalPages = $derived(Math.max(1, Math.ceil(sorted.length / pageSize)));
	const page = $derived(Math.min(currentPage, totalPages));
	const paginated = $derived(sorted.slice((page - 1) * pageSize, page * pageSize));
	const rangeStart = $derived(sorted.length === 0 ? 0 : (page - 1) * pageSize + 1);
	const rangeEnd = $derived(Math.min(page * pageSize, sorted.length));

	const pageNumbers = $derived.by(() => {
		if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
		const pages: (number | '…')[] = [1];
		const start = Math.max(2, page - 1);
		const end = Math.min(totalPages - 1, page + 1);
		if (start > 2) pages.push('…');
		for (let p = start; p <= end; p++) pages.push(p);
		if (end < totalPages - 1) pages.push('…');
		pages.push(totalPages);
		return pages;
	});

	const allSelected = $derived(paginated.length > 0 && paginated.every((s) => selected.includes(s.id)));
	//#endregion

	//#region Helpers
	function notify(type: Toast['type'], text: string) {
		toast = { type, text };
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), 3000);
	}

	function formatDate(value?: string | null) {
		const d = value ? new Date(value) : null;
		if (!d || Number.isNaN(d.getTime())) return '—';
		return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function sortBy(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}
	}

	function toggleAll() {
		selected = allSelected ? [] : paginated.map((s) => s.id);
	}

	function clearFilters() {
		filterCategoryId = '';
		search = '';
	}

	async function api<T>(url: string, init?: RequestInit): Promise<T> {
		const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
		const body = await res.json().catch(() => null);
		if (!res.ok || !body?.success) {
			throw new Error(body?.message ?? 'Something went wrong. Please try again.');
		}
		return body.data as T;
	}
	//#endregion

	//#region Panel
	function openAdd() {
		editing = null;
		form = { ...emptyForm };
		formError = '';
		panel = 'add';
	}

	function openEdit(s: Subcategory) {
		editing = s;
		form = {
			categoryId: s.categoryId,
			name: s.name,
			description: s.description ?? '',
			isActive: s.isActive
		};
		formError = '';
		panel = 'edit';
	}

	function closePanel() {
		if (busy) return;
		panel = null;
		editing = null;
		formError = '';
	}
	//#endregion

	//#region Actions
	async function submit(e: SubmitEvent) {
		e.preventDefault();

		formError =
			panel === 'add' && !form.categoryId
				? 'Choose a category.'
				: !form.name.trim()
					? 'Enter a subcategory name.'
					: '';
		if (formError) return;

		busy = true;
		try {
			if (editing) {
				const updated = await api<Subcategory>(`${API}/${editing.id}`, {
					method: 'PATCH',
					body: JSON.stringify({
						name: form.name,
						description: form.description,
						isActive: form.isActive
					})
				});
				subcategories = subcategories.map((s) => (s.id === updated.id ? { ...s, ...updated } : s));
				panel = null;
				editing = null;
				notify('success', 'Changes saved.');
			} else {
				const created = await api<Subcategory>(API, { method: 'POST', body: JSON.stringify(form) });
				subcategories = [created, ...subcategories];
				// keep the category selected so several can be added in a row
				form.name = '';
				form.description = '';
				notify('success', 'Subcategory added.');
			}
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Could not save sub category.';
		} finally {
			busy = false;
		}
	}

	async function toggleActive(s: Subcategory) {
		if (togglingId === s.id) return;

		const next = !s.isActive;
		const setStatus = (isActive: boolean) =>
			(subcategories = subcategories.map((item) => (item.id === s.id ? { ...item, isActive } : item)));

		togglingId = s.id;
		setStatus(next); // optimistic

		try {
			await api<Subcategory>(`${API}/${s.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ isActive: next })
			});
			notify('success', next ? 'Sub category activated.' : 'Sub category deactivated.');
		} catch (err) {
			setStatus(!next); // roll back
			notify('error', err instanceof Error ? err.message : 'Could not update status.');
		} finally {
			togglingId = null;
		}
	}

	async function remove(id: string) {
		if (deletingId) return;

		deletingId = id;
		try {
			await api(`${API}/${id}`, { method: 'DELETE' });
			subcategories = subcategories.filter((s) => s.id !== id);
			selected = selected.filter((x) => x !== id);
			if (editing?.id === id) closePanel();
			notify('success', 'Subcategory deleted.');
		} catch (err) {
			notify('error', err instanceof Error ? err.message : 'Could not delete subcategory.');
		} finally {
			deletingId = null;
			confirmingId = null;
		}
	}
	//#endregion

	// back to page 1 whenever the list changes shape
	$effect(() => {
		[search, filterCategoryId, pageSizeValue];
		currentPage = 1;
	});

	onMount(() => {
		let active = true;

		(async () => {
			try {
				const [loadedCategories, loadedSubcategories] = await Promise.all([
					api<Category[]>(CATEGORIES_API),
					api<Subcategory[]>(API)
				]);
				if (!active) return;
				categories = loadedCategories;
				subcategories = loadedSubcategories;
			} catch (err) {
				if (active) notify('error', err instanceof Error ? err.message : 'Could not load data.');
			} finally {
				if (active) loading = false;
			}
		})();

		return () => {
			active = false;
			clearTimeout(toastTimer);
		};
	});
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && closePanel()} />

<div class="flex items-start gap-4">
	<!-- LEFT: PAGE CONTENT -->
	<div class="page-content min-w-0 flex-1 space-y-4">
		<!-- HEADER -->
		<div class="header-page">
			<div class="flex items-center gap-3">
				<div><LayersOutline class="h-9 w-9" color="#0278BD" /></div>
				<div>
					<h1 class="heading-1">Sub Categories</h1>
					<p class="heading-3">Manage and organise your sub categories</p>
				</div>
			</div>

			<Button type="button" class="flex items-center gap-2" onclick={openAdd}>
				<PlusOutline class="h-4 w-4" />
				Add Sub Category
			</Button>
		</div>

		<!-- STAT CARDS -->
		<div class="card">
			{#each stats as s, i (s.label)}
				{@const Icon = s.icon}
				<div
					class="flex items-center justify-between border-b border-gray-100 p-5 transition last:border-b-0 hover:bg-gray-50/50 xl:border-b-0
						{i % 2 === 0 ? 'sm:border-r' : ''} {i < 3 ? 'xl:border-r' : ''}"
				>
					<div>
						<p class="text-xs font-medium text-gray-500">{s.label}</p>
						<p class="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{s.value.toLocaleString()}</p>
						<p class="mt-1.5 text-xs text-gray-400">{s.hint}</p>
					</div>
					<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl {s.tone}">
						<Icon class="h-6 w-6" />
					</div>
				</div>
			{/each}
		</div>

		<!-- TABLE -->
		<section>
			<!-- TOOLBAR -->
			<div class="flex flex-wrap items-center justify-between gap-3 pb-4">
				<div class="relative w-full sm:w-72">
					<Input type="search" placeholder="Search sub categories..." aria-label="Search sub categories" bind:value={search} />
				</div>

				<div class="flex flex-wrap items-center gap-2">
					{#if hasActiveFilters}
						<Button type="button" onclick={clearFilters} color="alternative" class="px-3 py-2">Clear filters</Button>
					{/if}
					<Select aria-label="Filter by category" items={categoryFilterItems} bind:value={filterCategoryId} size="sm" class="w-48" />
				</div>
			</div>

			<div class="overflow-x-auto border-t border-gray-100">
				<Table hoverable={true}>
					<TableHead>
						<TableHeadCell>
							<Checkbox checked={allSelected} onchange={toggleAll} class="h-4 w-4" aria-label="Select all sub categories" />
						</TableHeadCell>
						{#each columns as col (col.key)}
							<TableHeadCell class="px-4 py-3">
								<button
									type="button"
									onclick={() => sortBy(col.key)}
									class="inline-flex items-center gap-1.5 transition hover:text-gray-900 {sortKey === col.key ? 'text-gray-900' : ''}"
								>
									{col.label}
									<ChevronDownOutline
										class="h-3.5 w-3.5 transition {sortKey === col.key ? 'text-[#0278BD]' : ''} {sortKey === col.key && sortDir === 'asc' ? 'rotate-180' : ''}"
									/>
								</button>
							</TableHeadCell>
						{/each}
						<TableHeadCell class="px-4 py-3 text-right">Actions</TableHeadCell>
					</TableHead>

					<TableBody>
						{#if loading}
							{#each [1, 2, 3, 4, 5] as n (n)}
								<TableBodyRow>
									<td colspan={colSpan} class="px-4 py-3">
										<div class="h-9 animate-pulse rounded-lg bg-gray-100"></div>
									</td>
								</TableBodyRow>
							{/each}
						{:else if sorted.length === 0}
							<TableBodyRow>
								<td colspan={colSpan} class="px-5 py-16 text-center">
									<div class="mx-auto flex max-w-sm flex-col items-center">
										<div class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
											<SearchOutline class="h-6 w-6" />
										</div>
										<p class="text-sm font-medium text-gray-700">
											{subcategories.length === 0 ? 'No sub categories yet' : 'No sub categories found'}
										</p>
										<p class="mt-1 text-xs text-gray-400">
											{subcategories.length === 0
												? 'Add your first sub category to get started.'
												: 'Try changing your search or filters.'}
										</p>
									</div>
								</td>
							</TableBodyRow>
						{:else}
							{#each paginated as s (s.id)}
								<TableBodyRow class={editing?.id === s.id ? 'bg-sky-50' : ''}>
									<!-- CHECKBOX -->
									<TableBodyCell class="w-2 px-4 py-3">
										<Checkbox value={s.id} bind:group={selected} class="h-4 w-4" aria-label="Select {s.name}" />
									</TableBodyCell>

									<!-- NAME -->
									<TableBodyCell class="px-4 py-3">
										<div class="flex items-center gap-3">
											<p class="max-w-[240px] truncate text-xs font-medium text-gray-800" title={s.name}>{s.name}</p>
										</div>
									</TableBodyCell>

									<!-- CATEGORY -->
									<TableBodyCell class="px-4 py-3">
										<Badge color="blue">{categoryName(s.categoryId)}</Badge>
									</TableBodyCell>

									<!-- DESCRIPTION -->
									<TableBodyCell class="px-4 py-3 text-gray-600">
										{#if s.description}
											<Badge color="blue">...</Badge>
										{:else}
											<Badge color="gray">None</Badge>
										{/if}
									</TableBodyCell>

									<!-- STATUS -->
									<TableBodyCell class="px-4 py-3">
										<Toggle
											color="green"
											size="small"
											checked={s.isActive}
											disabled={togglingId === s.id}
											onchange={() => toggleActive(s)}
											aria-label="{s.isActive ? 'Deactivate' : 'Activate'} {s.name}"
										/>
									</TableBodyCell>

									<!-- CREATED -->
									<TableBodyCell class="px-4 py-3 text-xs text-gray-500">{formatDate(s.createdAt)}</TableBodyCell>

									<!-- ACTIONS -->
									<TableBodyCell class="px-4 py-3 text-right">
										{#if confirmingId === s.id}
											<div class="inline-flex items-center gap-2">
												<Button
													type="button"
													onclick={() => remove(s.id)}
													disabled={deletingId === s.id}
													color="red"
													class="px-2.5 py-1 text-xs font-medium text-white transition disabled:opacity-50"
												>
													{deletingId === s.id ? 'Deleting...' : 'Delete?'}
												</Button>
												<Button
													type="button"
													onclick={() => (confirmingId = null)}
													disabled={deletingId === s.id}
													color="alternative"
													class="px-2.5 py-1 text-xs font-medium transition"
												>
													Cancel
												</Button>
											</div>
										{:else}
											<div class="inline-flex items-center justify-end gap-1">
												<button
													type="button"
													onclick={() => openEdit(s)}
													aria-label="Edit {s.name}"
													class="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-[#0278BD]"
												>
													<EditOutline class="h-5 w-5" />
												</button>
												<button
													type="button"
													onclick={() => (confirmingId = s.id)}
													aria-label="Delete {s.name}"
													class="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
												>
													<TrashBinOutline class="h-5 w-5" />
												</button>
											</div>
										{/if}
									</TableBodyCell>
								</TableBodyRow>
							{/each}
						{/if}
					</TableBody>
				</Table>
			</div>

			<!-- FOOTER -->
			<div class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 py-3">
				<div class="flex items-center gap-3 text-xs text-gray-500">
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

				<nav class="flex items-center gap-1" aria-label="Pagination">
					<button
						type="button"
						onclick={() => (currentPage = Math.max(1, page - 1))}
						disabled={page === 1}
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
								aria-current={n === page ? 'page' : undefined}
								class="min-w-8 rounded-lg px-2.5 py-1.5 text-xs font-medium transition
									{n === page ? 'bg-[#0278BD] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}"
							>
								{n}
							</button>
						{/if}
					{/each}

					<button
						type="button"
						onclick={() => (currentPage = Math.min(totalPages, page + 1))}
						disabled={page === totalPages}
						class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
					>
						Next
					</button>
				</nav>
			</div>
		</section>
	</div>

	<!-- RIGHT: ASIDE (add or edit) -->
	{#if panel}
		<aside
			class="sticky top-4 flex max-h-[calc(100vh-2rem)] w-full max-w-sm shrink-0 flex-col rounded-xl border border-gray-200 bg-white"
			aria-label="{editing ? 'Edit' : 'Add'} sub category"
		>
			<div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
				<h2 class="heading-2">{editing ? 'Edit' : 'Add'} Sub Category</h2>
				<button
					type="button"
					onclick={closePanel}
					disabled={busy}
					aria-label="Close"
					class="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
				>
					<CloseOutline class="h-5 w-5" />
				</button>
			</div>

			<form onsubmit={submit} class="flex min-h-0 flex-1 flex-col">
				<div class="flex-1 space-y-5 overflow-y-auto px-5 py-5">
					<!-- CATEGORY (locked while editing; use the move endpoint to change it) -->
					<div>
						<label for="sub-category" class="label">Category {#if !editing}<span class="text-red-500">*</span>{/if}</label>
						<Select
							id="sub-category"
							items={categoryItems}
							bind:value={form.categoryId}
							disabled={!!editing || loading || categories.length === 0}
							placeholder={loading ? 'Loading…' : categories.length === 0 ? 'No categories yet' : 'Select a category'}
						/>
						{#if !loading && categories.length === 0}
							<p class="mt-1.5 text-xs text-gray-500">Create a category first, then come back here.</p>
						{/if}
					</div>

					<!-- NAME -->
					<div>
						<label for="sub-name" class="label">Name <span class="text-red-500">*</span></label>
						<Input id="sub-name" placeholder="e.g. Botox" bind:value={form.name} />
					</div>

					<!-- DESCRIPTION -->
					<div>
						<div class="mb-2 flex items-center justify-between">
							<label for="sub-desc" class="label">Description</label>
							<span class="text-xs text-gray-400">{form.description.length}/200</span>
						</div>
						<Textarea
							id="sub-desc"
							class="w-full resize-none"
							rows={3}
							maxlength={200}
							placeholder="Optional. What kind of products belong here?"
							bind:value={form.description}
						/>
					</div>

					<!-- STATUS -->
					<div>
						<Toggle color="green" bind:checked={form.isActive}>Active</Toggle>
						<p class="mt-1.5 text-xs text-gray-400">Inactive sub categories are kept but hidden from the storefront.</p>
					</div>

					{#if formError}
						<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">{formError}</p>
					{/if}
				</div>

				<div class="flex justify-end gap-3 border-t border-gray-100 bg-white px-5 py-4">
					<Button type="button" color="light" onclick={closePanel} disabled={busy}>Cancel</Button>
					<Button type="submit" disabled={busy || loading || categories.length === 0}>
						{busy ? 'Saving...' : editing ? 'Save changes' : 'Save'}
					</Button>
				</div>
			</form>
		</aside>
	{/if}
</div>

<!-- TOAST -->
{#if toast}
	<div
		role="status"
		class="fixed bottom-5 right-5 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white {toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}"
	>
		{toast.text}
	</div>
{/if}