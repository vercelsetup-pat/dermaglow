
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

    let searchQuery = $state('');
</script>

<svelte:head>
    <title>{formattedTitle} | Derma Glow Admin</title>
</svelte:head>

<div class="admin-layout">
    <Sidebar />

    <main class="main-content">
        <!-- Header -->
        <header class="topbar">
            <div class="search-box">
              
            </div>

            <div class="topbar-right">
                <button class="header-button" aria-label="Theme">
                    <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                    </svg>
                </button>

                <button class="header-button notification" aria-label="Notifications">
                    <svg viewBox="0 0 24 24">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                        <path d="M10 21h4" />
                    </svg>
                    <span class="notification-dot"></span>
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

        <!-- Page Content -->
        <section class="page-content">
            <!-- <div class="page-heading">
                <h1>{formattedTitle}</h1>
            </div> -->

            {@render children()}
        </section>
    </main>
</div>

<style>
    :global(*) {
        sizing: border-box;
    }

    .admin-layout {
        display: flex;
        min-height: 100vh;
        background: #f5f7fa;
        color: #202632;
    }

    .main-content {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    /* Header */

    .topbar {
        height: 70px;
        min-height: 70px;
        background: #ffffff;
        border-bottom: 1px solid #edf0f4;
        padding: 0 28px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .search-box {
        width: 350px;
        height: 38px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 12px;
        background: #f8f9fb;
        border: 1px solid #edf0f4;
        border-radius: 20px;
    }

    .search-box svg {
        width: 16px;
        height: 16px;
        fill: none;
        stroke: #8b95a3;
        stroke-width: 1.8;
        flex-shrink: 0;
    }

    .search-box input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        font-family: inherit;
        font-size: 12px;
        color: #202632;
    }

    .search-box input::placeholder {
        color: #929ba7;
    }

    .search-shortcut {
        font-size: 10px;
        color: #8b95a3;
        border: 1px solid #e6e9ee;
        border-radius: 5px;
        padding: 3px 5px;
    }

    .topbar-right {
        display: flex;
        align-items: center;
        gap: 14px;
    }

    .header-button {
        width: 36px;
        height: 36px;
        border: 1px solid #edf0f4;
        border-radius: 50%;
        background: #ffffff;
        display: grid;
        place-items: center;
        position: relative;
        cursor: pointer;
    }

    .header-button svg {
        width: 17px;
        height: 17px;
        fill: none;
        stroke: #596474;
        stroke-width: 1.6;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .header-button:hover {
        background: #f5f8ff;
    }

    .notification-dot {
        position: absolute;
        top: 7px;
        right: 7px;
        width: 6px;
        height: 6px;
        background: #29B24A;
        border-radius: 50%;
    }

    .profile {
        display: flex;
        align-items: center;
        gap: 10px;
        padding-left: 5px;
    }

    .profile-avatar {
        width: 36px;
        height: 36px;
        background: #eaf0ff;
        color: #29B24A;
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
        color: #202632;
    }

    .profile-info span {
        font-size: 10px;
        color: #929ba7;
    }

    /* Main Content */

    .page-content {
        flex: 1;
        padding: 20px 20px;
        overflow-y: auto;
        min-width: 0;
    }


    @media (max-width: 760px) {
        .topbar {
            padding: 0 16px;
        }

        .search-box {
            width: min(250px, 55%);
        }

        .topbar-right {
            gap: 8px;
        }

        .profile-info {
            display: none;
        }

        .page-content {
            padding: 20px 16px;
        }
    }
</style>
