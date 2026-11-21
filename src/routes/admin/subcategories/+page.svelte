<script lang="ts">
	import { onMount } from 'svelte';

	import type { Category, Subcategory, Product } from '#lib/types.ts';
	type Id = string;
	
	const CATEGORIES_API = '/api/categories';
	const API = '/api/subcategories';

	let categories = $state<Category[]>([]);
	let subcategories = $state<Subcategory[]>([]);
	let loading = $state(true);

	// filters
	let search = $state('');
	let filterCategoryId = $state('');

	// add form
	let categoryId = $state('');
	let name = $state('');
	let description = $state('');
	let adding = $state(false);
	let formError = $state('');

	// edit modal
	let editing = $state<Subcategory | null>(null);
	let editName = $state('');
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
	const categoryName = (id: string) => categoryNames.get(id) ?? 'Unknown category';

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
			subcategories = [created, ...subcategories]; // newest first
			// keep the category selected so several subcategories can be added in a row
			name = '';
			description = '';
			notify('success', 'Subcategory added.');
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Could not add subcategory.';
		} finally {
			adding = false;
		}
	}

	function openEdit(s: Subcategory) {
		editing = s;
		editName = s.name;
		editDescription = s.description ?? '';
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
			notify('success', 'Subcategory deleted.');
		} catch (err) {
			notify('error', err instanceof Error ? err.message : 'Could not delete subcategory.');
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
		<!-- Add subcategory -->
		<section class="rounded-xl border border-gray-200 bg-white p-5 lg:sticky lg:top-6">
			<h2 class="text-base font-semibold text-gray-900">New subcategory</h2>
			<p class="mt-0.5 text-sm text-gray-500">Products can be placed inside it later.</p>

			<form class="mt-5 space-y-4" onsubmit={addSubcategory}>
				<div>
					<label for="sub-category" class="mb-1.5 block text-sm font-medium text-gray-700">
						Category <span class="text-red-500">*</span>
					</label>
					<select id="sub-category" class={inputClass} bind:value={categoryId} disabled={loading || categories.length === 0}>
						<option value="" disabled>
							{loading ? 'Loading…' : categories.length === 0 ? 'No categories yet' : 'Select a category'}
						</option>
						{#each categories as c (c.id)}
							<option value={c.id}>{c.name}{c.isActive === false ? ' (inactive)' : ''}</option>
						{/each}
					</select>
					{#if !loading && categories.length === 0}
						<p class="mt-1.5 text-xs text-gray-500">Create a category first, then come back here.</p>
					{/if}
				</div>

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
						bind:value={name}
					/>
				</div>

				<div>
					<div class="mb-1.5 flex items-center justify-between">
						<label for="sub-desc" class="text-sm font-medium text-gray-700">Description</label>
						<span class="text-xs text-gray-400">{description.length}/200</span>
					</div>
					<textarea
						id="sub-desc"
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
					disabled={adding || loading || categories.length === 0}
					class="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60"
				>
					{#if adding}
						<span class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
						Adding…
					{:else}
						<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
						</svg>
						Add subcategory
					{/if}
				</button>
			</form>
		</section>

		<!-- Subcategories -->
		<section class="rounded-xl border border-gray-200 bg-white p-5">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="text-base font-semibold text-gray-900">All subcategories</h2>
					<p class="mt-0.5 text-sm text-gray-500">
						{subcategories.length}
						{subcategories.length === 1 ? 'subcategory' : 'subcategories'}
						{#if filterCategoryId || search.trim()}
							· {filtered.length} shown
						{/if}
					</p>
				</div>

				<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
					<select
						class="{inputClass} sm:w-48"
						aria-label="Filter by category"
						bind:value={filterCategoryId}
					>
						<option value="">All categories</option>
						{#each categories as c (c.id)}
							<option value={c.id}>{c.name}</option>
						{/each}
					</select>

					<div class="relative sm:w-56">
						<svg class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path fill-rule="evenodd" d="M9 3a6 6 0 1 0 3.6 10.8l3.3 3.3a1 1 0 0 0 1.4-1.4l-3.3-3.3A6 6 0 0 0 9 3Zm-4 6a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clip-rule="evenodd" />
						</svg>
						<input
							class="{inputClass} pl-9"
							type="search"
							placeholder="Search subcategories"
							aria-label="Search subcategories"
							bind:value={search}
						/>
					</div>
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
						{#if subcategories.length === 0}
							No subcategories yet. Add your first one using the form.
						{:else}
							No subcategories match your filters.
						{/if}
					</div>
				{:else}
					<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{#each filtered as s (s.id)}
							<article class="flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-sm">
								<h3 class="truncate text-base font-semibold text-gray-900" title={s.name}>{s.name}</h3>

								<div class="mt-2 flex-1">
									{#if s.description}
										<p class="line-clamp-2 text-sm text-gray-600" title={s.description}>{s.description}</p>
									{:else}
										<p class="text-sm text-gray-400">No description</p>
									{/if}
								</div>

								<!-- meta -->
								<div class="mt-4 flex items-center gap-2 text-xs">
									<span class="max-w-[60%] truncate rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700" title={categoryName(s.categoryId)}>
										{categoryName(s.categoryId)}
									</span>
									<span class="text-gray-400">·</span>
									<span class="text-gray-500">{formatDate(s.createdAt)}</span>
								</div>

								<!-- actions -->
								<div class="mt-4 flex items-center justify-end gap-1 border-t border-gray-100 pt-3">
									{#if confirmingId === s.id}
										<span class="mr-auto text-xs text-gray-500">Delete this subcategory?</span>
										<button
											type="button"
											disabled={deletingId === s.id}
											onclick={() => removeSubcategory(s.id)}
											class="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
										>
											{deletingId === s.id ? 'Deleting…' : 'Delete'}
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
											onclick={() => openEdit(s)}
											class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
										>
											<svg class="size-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
												<path d="M13.6 2.6a2 2 0 0 1 2.8 2.8l-.9.9-2.8-2.8.9-.9ZM11.3 4.9 3 13.2V16h2.8l8.3-8.3-2.8-2.8Z" />
											</svg>
											Edit
										</button>
										<button
											type="button"
											onclick={() => (confirmingId = s.id)}
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
		class="fixed inset-0 z-50 grid place-items-center bg-gray-900/40 p-4"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && closeEdit()}
	>
		<div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="edit-title">
			<h2 id="edit-title" class="text-base font-semibold text-gray-900">Edit subcategory</h2>
			<p class="mt-0.5 text-sm text-gray-500">
				In <span class="font-medium text-gray-700">{categoryName(editing.categoryId)}</span>
			</p>

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