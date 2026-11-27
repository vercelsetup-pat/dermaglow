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
	import { Button, Toggle, Badge,Checkbox, Input, Select, Textarea, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell  } from 'flowbite-svelte';

	//#region Types & constant
		type SortKey = 'name' | 'category' | 'description' | 'createdAt';
		type Column = { key: SortKey; label: string; sortable?: boolean };

		const CATEGORIES_API = '/api/categories';
		const API = '/api/subcategories';
		const columns: Column[] = [
			{ key: 'name', label: 'Sub Category', sortable: true },
			{ key: 'category', label: 'Category', sortable: true },
			{ key: 'description', label: 'Description', sortable: true },
			{ key: 'createdAt', label: 'Created', sortable: true }
		];
		const colSpan = $derived(columns.length + 2);

		let categories = $state<Category[]>([]);
		let subcategories = $state<Subcategory[]>([]);
		let sortKey = $state<SortKey>('createdAt');
		let sortDir = $state<'asc' | 'desc'>('desc');
		let editing = $state<Subcategory | null>(null);
		let toast = $state<{ type: 'success' | 'error'; text: string } | null>(null);
		let toastTimer: ReturnType<typeof setTimeout> | undefined;
	//#endregion

	//#region Boolean Variables
		let adding = $state(false);
		let showAddPanel = $state(false);
		let saving = $state(false);
		let loading = $state(true);
	//#endregion

	//#region String Variables
		let categoryId = $state('');
		let name = $state('');
		let description = $state('');
		let formError = $state('');
		let editName = $state('');
		let editDescription = $state('');
		let editError = $state('');
		let filterCategoryId = $state('');
		let search = $state('');
		let selected = $state<string[]>([]);
		let confirmingId = $state<string | null>(null);
		let deletingId = $state<string | null>(null);
	//#endregion
	
	//#region Derived
	const categoryNames = $derived(new Map(categories.map((c) => [c.id, c.name])));
	const categoryName = (id: string) => categoryNames.get(id) ?? 'Unknown category';

	const totalSubs = $derived(subcategories.length);
	const categoriesUsed = $derived(new Set(subcategories.map((s) => s.categoryId)).size);
	const categoriesEmpty = $derived(Math.max(categories.length - categoriesUsed, 0));
	const noDescription = $derived(subcategories.filter((s) => !s.description?.trim()).length);

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
				default:
					return (
						(new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()) * dir
					);
			}
		});
	});

	const allSelected = $derived(sorted.length > 0 && sorted.every((s) => selected.includes(s.id)));
	//#endregion

	//#region Helpers
		function notify(type: 'success' | 'error', text: string) {
			toast = { type, text };
			clearTimeout(toastTimer);
			toastTimer = setTimeout(() => (toast = null), 3000);
		}

		function formatDate(value?: string | Date | null) {
			if (!value) return '—';
			const d = new Date(value);
			if (Number.isNaN(d.getTime())) return '—';
			return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
		}

		function sortBy(key: SortKey) {
			if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
			else {
				sortKey = key;
				sortDir = 'asc';
			}
		}
	//#endregion

	//#region Functions
		function toggleAll() {
			selected = allSelected ? [] : sorted.map((s) => s.id);
		}

		function clearFilters() {
			filterCategoryId = '';
			search = '';
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
	//#endregion

	//#region Panels
	function openAdd() {
		editing = null;
		formError = '';
		showAddPanel = true;
	}

	function closeAdd() {
		if (adding) return;
		showAddPanel = false;
		formError = '';
	}

	function openEdit(s: Subcategory) {
		showAddPanel = false;
		editing = s;
		editName = s.name;
		editDescription = s.description ?? '';
		editError = '';
	}

	function closeEdit() {
		if (saving) return;
		editing = null;
	}
	//#endregion

	//#region Async Functions
		async function addSubcategory(e: SubmitEvent) {
			e.preventDefault();
			formError = '';
			if (!categoryId) {
				formError = 'Choose a category.';
				return;
			}
			if (!name.trim()) {
				formError = 'Enter a subcategory name.';
				return;
			}
			adding = true;
			try {
				const created = await api<Subcategory>(API, {
					method: 'POST',
					body: JSON.stringify({ categoryId, name, description })
				});
				subcategories = [created, ...subcategories];
				// keep the category selected so several can be added in a row
				name = '';
				description = '';
				notify('success', 'Subcategory added.');
			} catch (err) {
				formError = err instanceof Error ? err.message : 'Could not add subcategory.';
			} finally {
				adding = false;
			}
		}

		async function saveEdit(e: SubmitEvent) {
			e.preventDefault();
			if (!editing) return;
			if (!editName.trim()) {
				editError = 'Enter a subcategory name.';
				return;
			}
			saving = true;
			editError = '';
			try {
				const updated = await api<Subcategory>(`${API}/${editing.id}`, {
					method: 'PATCH',
					body: JSON.stringify({ name: editName, description: editDescription })
				});
				subcategories = subcategories.map((s) => (s.id === updated.id ? { ...s, ...updated } : s));
				editing = null;
				notify('success', 'Changes saved.');
			} catch (err) {
				editError = err instanceof Error ? err.message : 'Could not save changes.';
			} finally {
				saving = false;
			}
		}

		async function removeSubcategory(id: string) {
			deletingId = id;
			try {
				await api(`${API}/${id}`, { method: 'DELETE' });
				subcategories = subcategories.filter((s) => s.id !== id);
				selected = selected.filter((x) => x !== id);
				if (editing?.id === id) editing = null;
				notify('success', 'Subcategory deleted.');
			} catch (err) {
				notify('error', err instanceof Error ? err.message : 'Could not delete subcategory.');
			} finally {
				deletingId = null;
				confirmingId = null;
			}
		}
	//#endregion

	onMount(async () => {
		try {
			[categories, subcategories] = await Promise.all([
				api<Category[]>(CATEGORIES_API),
				api<Subcategory[]>(API)
			]);
		} catch (e) {
			notify('error', e instanceof Error ? e.message : 'Could not load data.');
		} finally {
			loading = false;
		}
	});

	// const categoryFilterItems = $derived([
	// 	{ value: '', name: 'All categories' },
	// 	{ value: "", name: 'No category' },
	// 	...categories.map((c) => ({ value: c.id, name: c.name }))
	// ]);

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
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && closeEdit()} />

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
			<!-- Total -->
			<div class="flex items-center justify-between border-b border-gray-100 p-5 transition hover:bg-gray-50/50 sm:border-r xl:border-b-0">
				<div>
					<p class="text-xs font-medium text-gray-500">Total Sub Categories</p>
					<p class="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{totalSubs.toLocaleString()}</p>
					<p class="mt-1.5 text-xs text-gray-400">Across all categories</p>
				</div>
				<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
					<LayersOutline class="h-6 w-6" />
				</div>
			</div>

			<!-- Categories in use -->
			<div class="flex items-center justify-between border-b border-gray-100 p-5 transition hover:bg-gray-50/50 xl:border-b-0 xl:border-r">
				<div>
					<p class="text-xs font-medium text-gray-500">Categories In Use</p>
					<p class="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{categoriesUsed.toLocaleString()}</p>
					<p class="mt-1.5 text-xs text-gray-400">Have at least one sub category</p>
				</div>
				<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
					<CheckCircleOutline class="h-6 w-6" />
				</div>
			</div>

			<!-- Categories empty -->
			<div class="flex items-center justify-between border-b border-gray-100 p-5 transition hover:bg-gray-50/50 sm:border-r xl:border-b-0">
				<div>
					<p class="text-xs font-medium text-gray-500">Empty Categories</p>
					<p class="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{categoriesEmpty.toLocaleString()}</p>
					<p class="mt-1.5 text-xs text-gray-400">No sub categories yet</p>
				</div>
				<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
					<ExclamationCircleOutline class="h-6 w-6" />
				</div>
			</div>

			<!-- No description -->
			<div class="flex items-center justify-between p-5 transition hover:bg-gray-50/50">
				<div>
					<p class="text-xs font-medium text-gray-500">No Description</p>
					<p class="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{noDescription.toLocaleString()}</p>
					<p class="mt-1.5 text-xs text-gray-400">Could use a description</p>
				</div>
				<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
					<CloseCircleOutline class="h-6 w-6" />
				</div>
			</div>
		</div>

		<!-- TABLE -->
		<section>
			<!-- TOOLBAR -->
			<div class="flex flex-wrap items-center justify-between gap-3 pb-4">
				<div class="relative w-full sm:w-72">
					<Input type="search" placeholder="Search sub categories..." aria-label="Search sub categories" bind:value={search}/>
				</div>

				<div class="flex flex-wrap items-center gap-2">
					{#if hasActiveFilters}
						<Button type="button" onclick={clearFilters} color="alternative" class="px-3 py-2 text-xs font-medium">
							Clear filters
						</Button>
					{/if}
					<Select aria-label="Filter by category"  bind:value={filterCategoryId} size="sm" class="w-48"/>
				</div>
			</div>

			<div class="overflow-x-auto border-t border-gray-100">
				<Table hoverable={true}>
					<TableHead>
						<TableHeadCell>
							<Checkbox type="checkbox" checked={allSelected} onchange={toggleAll} class="h-4 w-4" aria-label="Select all sub categories"/>
						</TableHeadCell>
						{#each columns as col (col.key)}
							<TableHeadCell class="px-4 py-3">
								{#if col.sortable}
									<button type="button" onclick={() => sortBy(col.key)} class="inline-flex items-center gap-1.5 transition hover:text-gray-900 {sortKey === col.key ? 'text-gray-900' : ''}">
										{col.label}
										<ChevronDownOutline class="h-3.5 w-3.5 transition {sortKey === col.key ? 'text-[#0278BD]' : ''} {sortKey === col.key && sortDir === 'asc' ? 'rotate-180' : ''}"/>
									</button>
								{:else}
									{col.label}
								{/if}
							</TableHeadCell>
						{/each}
						<TableHeadCell class="px-4 py-3 text-right">Actions</TableHeadCell>
					</TableHead>

					<TableBody>
						{#if loading}
							{#each [1, 2, 3, 4, 5] as n (n)}
								<tr>
									<td colspan={colSpan} class="px-4 py-3">
										<div class="h-9 animate-pulse rounded-lg bg-gray-100"></div>
									</td>
								</tr>
							{/each}
						{:else if sorted.length === 0}
							<tr>
								<td colspan={colSpan} class="px-5 py-16 text-center">
									<div class="mx-auto flex max-w-sm flex-col items-center">
										<div class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
											<SearchOutline class="h-6 w-6" />
										</div>
										<p class="text-sm font-medium text-gray-700">
											{subcategories.length === 0 ? 'No sub categories yet' : 'No sub categories found'}
										</p>
										<p class="mt-1 text-xs text-gray-400">
											{subcategories.length === 0 ? 'Add your first sub category to get started.' : 'Try changing your search or filters.'}
										</p>
									</div>
								</td>
							</tr>
						{:else}
							{#each sorted as s (s.id)}
								<tr class="border-b border-gray-100 transition-colors hover:bg-gray-50/70 {selected.includes(s.id) ? 'bg-sky-50/50' : ''} {editing?.id === s.id ? 'bg-sky-50' : ''}">
									<!-- CHECKBOX -->
									<td class="px-4 py-3">
										<Checkbox type="checkbox" value={s.id} bind:group={selected} class="h-4 w-4" aria-label="Select {s.name}"/>
									</td>

									<!-- NAME -->
									<td class="px-4 py-3">
										<div class="flex items-center gap-3">
											<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-semibold text-indigo-600">
												{s.name.trim().slice(0, 2).toUpperCase()}
											</div>
											<p class="max-w-[240px] truncate font-medium text-gray-800" title={s.name}>
												{s.name}
											</p>
										</div>
									</td>

									<!-- CATEGORY -->
									<td class="px-4 py-3">
										<Badge color="blue">{categoryName(s.categoryId)}</Badge>
									</td>

									<!-- DESCRIPTION -->
									<td class="px-4 py-3 text-gray-600">
										{#if s.description}
											<p class="max-w-[280px] truncate" title={s.description}>{s.description}</p>
										{:else}
											<Badge color="gray">None</Badge>
										{/if}
									</td>

									<!-- CREATED -->
									<td class="px-4 py-3 text-xs text-gray-500">{formatDate(s.createdAt)}</td>

									<!-- ACTIONS -->
									<td class="px-4 py-3 text-right">
										{#if confirmingId === s.id}
											<div class="inline-flex items-center gap-2">
												<span class="text-xs text-gray-500">Delete?</span>
												<Button
													type="button"
													onclick={() => removeSubcategory(s.id)}
													disabled={deletingId === s.id}
													color="red"
													class="rounded-lg px-2.5 py-1 text-xs font-medium text-white transition disabled:opacity-50"
												>
													{deletingId === s.id ? 'Deleting...' : 'Yes'}
												</Button>
												<Button
													type="button"
													onclick={() => (confirmingId = null)}
													disabled={deletingId === s.id}
													color="alternative"
													class="rounded-lg px-2.5 py-1 text-xs font-medium transition"
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
									</td>
								</tr>
							{/each}
						{/if}
					</TableBody>
				</Table>
			</div>

			<!-- FOOTER -->
			<div class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
				<span class="text-xs text-gray-500">
					{#if selected.length > 0}
						{selected.length} selected
					{:else}
						Showing {sorted.length} of {subcategories.length} sub categories
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

	<!-- RIGHT: ASIDE (add or edit) -->
	{#if showAddPanel}
		<aside
			class="sticky top-4 flex max-h-[calc(100vh-2rem)] w-full max-w-sm shrink-0 flex-col rounded-xl border border-gray-200 bg-white"
			aria-label="Add sub category"
		>
			<div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
				<h2 class="heading-2">Add Sub Category</h2>
				<button
					type="button"
					onclick={closeAdd}
					aria-label="Close"
					class="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
				>
					<CloseOutline class="h-5 w-5" />
				</button>
			</div>

			<form onsubmit={addSubcategory} class="flex min-h-0 flex-1 flex-col">
				<div class="flex-1 space-y-5 overflow-y-auto px-5 py-5">
					<div>
						<label for="sub-category" class="label">Category <span class="text-red-500">*</span></label>
						<Select
							id="sub-category"
							items={categoryItems}
							bind:value={categoryId}
							disabled={loading || categories.length === 0}
							placeholder={loading ? 'Loading…' : categories.length === 0 ? 'No categories yet' : 'Select a category'}
						/>
						{#if !loading && categories.length === 0}
							<p class="mt-1.5 text-xs text-gray-500">Create a category first, then come back here.</p>
						{/if}
					</div>

					<div>
						<label for="sub-name" class="label">Name <span class="text-red-500">*</span></label>
						<Input id="sub-name" placeholder="e.g. Botox" bind:value={name}/>
					</div>

					<div>
						<div class="mb-2 flex items-center justify-between">
							<label for="sub-desc" class="label">Description</label>
							<span class="text-xs text-gray-400">{description.length}/200</span>
						</div>
						<Textarea id="sub-desc" class="w-full resize-none" rows={3} placeholder="Optional. What kind of products belong here?"bind:value={description}/>
					</div>

					{#if formError}
						<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">{formError}</p>
					{/if}
				</div>

				<div class="flex justify-end gap-3 border-t border-gray-100 bg-white px-5 py-4">
					<Button type="button" color="light" onclick={closeAdd} disabled={adding}>Cancel</Button>
					<Button type="submit" disabled={adding || loading || categories.length === 0}>
						{adding ? 'Saving...' : 'Save'}
					</Button>
				</div>
			</form>
		</aside>
	{:else if editing}
		<aside
			class="sticky top-4 flex max-h-[calc(100vh-2rem)] w-full max-w-sm shrink-0 flex-col rounded-xl border border-gray-200 bg-white"
			aria-label="Edit sub category"
		>
			<div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
				<div>
					<h2 class="text-base font-semibold text-gray-800">Edit Sub Category</h2>
					<p class="mt-0.5 text-xs text-gray-500">
						In <span class="font-medium text-gray-700">{categoryName(editing.categoryId)}</span>
					</p>
				</div>
				<button
					type="button"
					onclick={closeEdit}
					aria-label="Close"
					class="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
				>
					<CloseOutline class="h-5 w-5" />
				</button>
			</div>

			<form onsubmit={saveEdit} class="flex min-h-0 flex-1 flex-col">
				<div class="flex-1 space-y-5 overflow-y-auto px-5 py-5">
					<div>
						<label for="edit-name" class="mb-2 block text-sm font-medium text-gray-700">
							Name <span class="text-red-500">*</span>
						</label>
						<Input id="edit-name"  type="text" bind:value={editName} />
					</div>

					<div>
						<div class="mb-2 flex items-center justify-between">
							<label for="edit-desc" class="label">Description</label>
							<span class="text-xs text-gray-400">{editDescription.length}/200</span>
						</div>
						<Textarea id="edit-desc" class="w-full resize-none" rows={3} bind:value={editDescription}/>
					</div>

					{#if editError}
						<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">{editError}</p>
					{/if}
				</div>

				<div class="flex justify-end gap-3 border-t border-gray-100 bg-white px-5 py-4">
					<Button type="button" color="light" onclick={closeEdit} disabled={saving}>Cancel</Button>
					<Button type="submit" class="btn-secondary" disabled={saving}>
						{saving ? 'Saving...' : 'Save changes'}
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