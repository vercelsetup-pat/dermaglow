
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
        <header class="topbar">
            <div>
                <span class="breadcrumb">Admin / </span>
                <span class="current-page">{formattedTitle}</span>
            </div>

            <div class="topbar-right">
                <button class="notification" aria-label="Notifications">
                    <svg viewBox="0 0 24 24">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>
                        <path d="M10 21h4"/>
                    </svg>
                </button>

                <div class="profile">
                    <div class="profile-avatar">DG</div>
                    <div class="profile-info">
                        <strong>Administrator</strong>
                        <span>Store Manager</span>
                    </div>
                </div>
            </div>
        </header>

        <section class="page-content">
            {@render children()}
        </section>
    </main>
</div>

<style>
    .admin-layout {
        display: flex;
        min-height: 100vh;
        background: #f4f8fb;
        color: #344655;
    }

    .main-content {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .topbar {
        height: 76px;
        min-height: 76px;
        background: #ffffff;
        border-bottom: 1px solid #edf0f3;
        padding: 0 32px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .breadcrumb {
        color: #a1adb7;
        font-size: 13px;
    }

    .current-page {
        font-size: 13px;
        font-weight: 600;
        color: #344655;
    }

    .topbar-right {
        display: flex;
        align-items: center;
        gap: 22px;
    }

    .notification {
        width: 36px;
        height: 36px;
        border: 1px solid #edf0f3;
        border-radius: 50%;
        background: white;
        display: grid;
        place-items: center;
        cursor: pointer;
    }

    .notification svg {
        width: 17px;
        height: 17px;
        fill: none;
        stroke: #788794;
        stroke-width: 1.7;
        stroke-linecap: round;
    }

    .profile {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .profile-avatar {
        width: 36px;
        height: 36px;
        background: #e7f5fc;
        color: #269ed0;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 11px;
        font-weight: 700;
    }

    .profile-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .profile-info strong {
        font-size: 12px;
        color: #344655;
    }

    .profile-info span {
        font-size: 10px;
        color: #9ba8b3;
    }

    .page-content {
        flex: 1;
        padding: 30px 32px;
        overflow-y: auto;
    }

    @media (max-width: 760px) {
        .topbar {
            padding: 0 16px;
        }

        .page-content {
            padding: 20px 16px;
        }

        .profile-info {
            display: none;
        }
    }
</style>
