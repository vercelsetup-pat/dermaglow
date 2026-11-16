<script lang="ts">
	import { onMount } from 'svelte';

	type Category = {
		id: number | string;
		name: string;
		description: string | null;
		createdAt?: string | null;
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

	// delete
	let confirmingId = $state<Category['id'] | null>(null);
	let deletingId = $state<Category['id'] | null>(null);

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
			categories = [...categories, created];
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

	async function removeCategory(id: Category['id']) {
		deletingId = id;
		try {
			await api(`${API}/${id}`, { method: 'DELETE' });
			categories = categories.filter((c) => c.id !== id);
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
	<!-- Page header -->
	<div class="flex items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold text-gray-900">Categories</h1>
			<p class="mt-1 text-sm text-gray-500">Manage your store categories and organize your products.</p>
		</div>
		<span class="rounded-lg bg-white px-3 py-1.5 text-sm text-gray-600 ring-1 ring-gray-200">
			{categories.length}
			{categories.length === 1 ? 'category' : 'categories'}
		</span>
	</div>

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

		<!-- Categories table -->
		<section class="rounded-xl border border-gray-200 bg-white">
			<div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
				<div>
					<h2 class="text-base font-semibold text-gray-900">All categories</h2>
					<p class="mt-0.5 text-sm text-gray-500">Edit or remove existing categories.</p>
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

			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-gray-50 text-xs font-medium text-gray-500">
						<tr>
							<th class="px-5 py-3">Category</th>
							<th class="hidden px-5 py-3 md:table-cell">Description</th>
							<th class="hidden px-5 py-3 sm:table-cell">Created</th>
							<th class="px-5 py-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#if loading}
							{#each [1, 2, 3] as n (n)}
								<tr>
									<td colspan="4" class="px-5 py-4"><div class="h-5 animate-pulse rounded bg-gray-100"></div></td>
								</tr>
							{/each}
						{:else if filtered.length === 0}
							<tr>
								<td colspan="4" class="px-5 py-12 text-center text-gray-500">
									{#if categories.length === 0}
										No categories yet. Add your first one using the form.
									{:else}
										No categories match “{search}”.
									{/if}
								</td>
							</tr>
						{:else}
							{#each filtered as c (c.id)}
								<tr class="transition-colors hover:bg-gray-50/70">
									<td class="px-5 py-3.5">
										<div class="flex items-center gap-3">
											<span class="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-sm font-semibold text-emerald-700">
												{c.name.charAt(0).toUpperCase()}
											</span>
											<span class="font-medium text-gray-900">{c.name}</span>
										</div>
									</td>
									<td class="hidden max-w-xs px-5 py-3.5 md:table-cell">
										{#if c.description}
											<span class="line-clamp-1 text-gray-600" title={c.description}>{c.description}</span>
										{:else}
											<span class="text-gray-400">No description</span>
										{/if}
									</td>
									<td class="hidden whitespace-nowrap px-5 py-3.5 text-gray-500 sm:table-cell">
										{formatDate(c.createdAt)}
									</td>
									<td class="px-5 py-3.5">
										<div class="flex items-center justify-end gap-1">
											{#if confirmingId === c.id}
												<span class="mr-1 text-xs text-gray-500">Delete this category?</span>
												<button
													type="button"
													disabled={deletingId === c.id}
													onclick={() => removeCategory(c.id)}
													class="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
												>
													{deletingId === c.id ? 'Deleting…' : 'Delete'}
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
													onclick={() => openEdit(c)}
													aria-label="Edit {c.name}"
													class="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
												>
													<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
														<path d="M13.6 2.6a2 2 0 0 1 2.8 2.8l-.9.9-2.8-2.8.9-.9ZM11.3 4.9 3 13.2V16h2.8l8.3-8.3-2.8-2.8Z" />
													</svg>
												</button>
												<button
													type="button"
													onclick={() => (confirmingId = c.id)}
													aria-label="Delete {c.name}"
													class="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
												>
													<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
														<path fill-rule="evenodd" d="M8 2a1 1 0 0 0-1 1v1H4a1 1 0 0 0 0 2h.1l.8 9.1A2 2 0 0 0 6.9 17h6.2a2 2 0 0 0 2-1.9l.8-9.1H16a1 1 0 1 0 0-2h-3V3a1 1 0 0 0-1-1H8Zm1 2V4h2v0H9Z" clip-rule="evenodd" />
													</svg>
												</button>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
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