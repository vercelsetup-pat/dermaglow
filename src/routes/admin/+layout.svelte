<script lang="ts">
    import Sidebar from '#lib/components/admin/Sidebar.svelte';
    import { page } from '$app/state';
    import type { Snippet } from 'svelte';

    let { children }: { children: Snippet } = $props();

    let pageTitle = $derived(
        page.url.pathname.split('/').filter(Boolean).at(-1) ?? 'Dashboard'
    );

    let formattedTitle = $derived(
        pageTitle.charAt(0).toUpperCase() + pageTitle.slice(1)
    );
</script>

<svelte:head>
    <title>{formattedTitle} | Derma Glow Admin</title>
</svelte:head>

<div class="admin-layout">
    <Sidebar />

    <main class="main-content">
        <section class="page-content">
            {@render children()}
        </section>
    </main>
</div>

<style>
    :global(*) {
        box-sizing: border-box;
    }

    .admin-layout {
        display: flex;
        min-height: 100vh;
        background: #ffffff;
        color: #202632;
    }

    .main-content {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .page-content {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        min-width: 0;
    }

    @media (max-width: 760px) {
        .page-content {
            padding: 20px 16px;
        }
    }
</style>