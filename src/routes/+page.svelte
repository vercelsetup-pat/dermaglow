<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each data.categories as c (c.id)}
		<article class="rounded-xl border border-gray-200 bg-white p-5">
			<h3 class="text-base font-semibold text-gray-900">{c.name}</h3>
			{#if c.description}
				<p class="mt-1 text-sm text-gray-600">{c.description}</p>
			{/if}
		</article>
	{/each}
</div>