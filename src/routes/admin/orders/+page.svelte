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
        DotsVerticalOutline,
        EditOutline,
        SearchOutline,
        ChevronDownOutline,
        FilterOutline,
        CloseOutline,
		ArrowDownToBracketOutline,
        FileLinesOutline 
    } from 'flowbite-svelte-icons';
 	import { Dropdown, DropdownItem, Button, Toggle,Badge} from 'flowbite-svelte';
</script>

<div class="page-content space-y-4">
	<!--Header-->
	<div class="header-page">
		<div class="flex items-center gap-3">
			<div class="header-icon">
				<FileLinesOutline class="h-9 w-9" color="#0278BD"/>
			</div>
			<div>
				<h1 class="heading-1">Orders</h1>
				<p class="heading-3">Manage ayour orders to sent and collect Invoices</p>
			</div>
		</div>

		<Button class="btn-secondary flex items-center gap-2">
			<PlusOutline class="shrink-0 h-6 w-6" />
			Add Orders
		</Button>
	</div>

</div>