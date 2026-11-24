<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/state';
    import Logo from '#lib/assets/logo.png';

    const menuGroups = [
        {
            items: [{ label: 'Dashboard', href: '/admin', icon: 'dashboard' }]
        },
        {
            items: [
                { label: 'Categories', href: '/admin/categories', icon: 'categories' },
                { label: 'Subcategories', href: '/admin/subcategories', icon: 'subcategories' },
                { label: 'Products', href: '/admin/products', icon: 'products' },
                { label: 'Orders', href: '/admin/orders', icon: 'orders' }
            ]
        },
        {
            items: [{ label: 'Website Settings', href: '/admin/settings', icon: 'settings' }]
        }
    ];

    let collapsed = $state(false);

    // start collapsed on small screens and follow screen-size changes
    onMount(() => {
        const mq = window.matchMedia('(max-width: 760px)');
        collapsed = mq.matches;
        const onChange = (e: MediaQueryListEvent) => (collapsed = e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    });

    function isActive(href: string) {
        if (href === '/admin') return page.url.pathname === '/admin';
        return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
    }
</script>

<aside class="sidebar" class:collapsed>
    <div class="brand">
        <img class="brand-logo" src={Logo} alt="Derma Glow" />

        <button
            class="sidebar-toggle"
            onclick={() => (collapsed = !collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
            <svg viewBox="0 0 24 24">
                <path d="m15 18-6-6 6-6" />
            </svg>
        </button>
    </div>

    <nav>
        {#each menuGroups as group}
            <div class="menu-group">
                {#each group.items as item}
                    <a
                        href={item.href}
                        class="menu-item"
                        class:active={isActive(item.href)}
                        title={collapsed ? item.label : undefined}
                    >
                        <span class="menu-icon">
                            {#if item.icon === 'dashboard'}
                                <svg viewBox="0 0 24 24">
                                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                                </svg>
                            {:else if item.icon === 'orders'}
                                <svg viewBox="0 0 24 24">
                                    <rect x="4" y="3" width="16" height="18" rx="2" />
                                    <path d="M8 8h8M8 12h8M8 16h5" />
                                </svg>
                            {:else if item.icon === 'products'}
                                <svg viewBox="0 0 24 24">
                                    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
                                    <path d="m3 12 9 5 9-5" />
                                    <path d="m3 16 9 5 9-5" />
                                </svg>
                            {:else if item.icon === 'categories'}
                                <svg viewBox="0 0 24 24">
                                    <rect x="3" y="3" width="8" height="8" rx="1.5" />
                                    <rect x="13" y="3" width="8" height="8" rx="1.5" />
                                    <rect x="3" y="13" width="8" height="8" rx="1.5" />
                                    <rect x="13" y="13" width="8" height="8" rx="1.5" />
                                </svg>
                            {:else if item.icon === 'subcategories'}
                                <svg viewBox="0 0 24 24">
                                    <path d="M4 5h6v6H4z" />
                                    <path d="M14 5h6v6h-6z" />
                                    <path d="M9 11v3h6v-3" />
                                    <path d="M12 14v5" />
                                    <path d="M9 19h6" />
                                </svg>
                            {:else}
                                <svg viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="m19.4 15 .1.1 1.4 1.1-1.5 2.6-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-3l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.5-2.6 1.4-1.1a8 8 0 0 1 0-1.8l-1.4-1.1 1.5-2.6 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h3l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.5 2.6-1.4 1.1a8 8 0 0 1 0 1.7Z" />
                                </svg>
                            {/if}
                        </span>

                        <span class="menu-label">{item.label}</span>
                    </a>
                {/each}
            </div>
        {/each}
    </nav>

    <div class="sidebar-bottom">
        <div class="sidebar-profile">
            <div class="profile-avatar">DG</div>
            <div class="profile-info">
                <strong>Administrator</strong>
                <span>Store Manager</span>
            </div>
        </div>

        <div class="sidebar-footer">
            <span class="status-dot"></span>
            <span class="footer-text">System operational</span>
        </div>
    </div>
</aside>

<style>
    .sidebar {
        width: 225px;
        min-width: 225px;
        flex: 0 0 225px;
        height: 100vh;
        position: sticky;
        top: 0;
        background: #f5f7fa;
      /*  background: #ffffff;*/
        border-right: 1px solid #edf0f4;
        display: flex;
        flex-direction: column;
        padding: 22px 13px 14px;
        overflow-x: hidden;
        overflow-y: auto;
        color: #344054;
        transition: width 0.25s ease, flex-basis 0.25s ease, min-width 0.25s ease;
        box-sizing: border-box;
    }

    .sidebar::-webkit-scrollbar {
        width: 4px;
    }

    .sidebar::-webkit-scrollbar-thumb {
        background: #e5e7eb;
        border-radius: 10px;
    }

    /* Brand (logo + toggle) */

    .brand {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 0 10px 22px;
        min-height: 36px;
    }

    .brand-logo {
        height: 34px;
        max-width: 130px;
        object-fit: contain;
        object-position: left center;
        min-width: 0;
    }

    .sidebar-toggle {
        width: 25px;
        height: 25px;
        flex-shrink: 0;
        display: grid;
        place-items: center;
        border: none;
        background: transparent;
        color: #8993a1;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.2s ease, color 0.2s ease;
    }

    .sidebar-toggle:hover {
        background: #edf3ff;
        color: #29b24a;
    }

    .sidebar-toggle svg {
        width: 16px;
        height: 16px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        transition: transform 0.25s ease;
    }

    /* Navigation */

    nav {
        display: flex;
        flex-direction: column;
        gap: 13px;
    }

    .menu-group {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .menu-item {
        height: 39px;
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 0 11px;
        border-radius: 8px;
        text-decoration: none;
        color: #667085;
        font-size: 11.5px;
        font-weight: 500;
        position: relative;
        white-space: nowrap;
        transition: background 0.2s ease, color 0.2s ease;
    }

    .menu-item:hover {
        background: #f5f7fb;
        color: #29b24a;
    }

    .menu-item.active {
        background: #edf3ff;
        color: #29b24a;
        font-weight: 600;
    }

    .menu-item.active::before {
        content: '';
        position: absolute;
        left: -7px;
        top: 9px;
        height: 21px;
        width: 3px;
        border-radius: 5px;
        background: #29b24a;
    }

    .menu-icon {
        width: 17px;
        height: 17px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .menu-icon svg {
        width: 16px;
        height: 16px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.7;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    /* Bottom (profile + status) */

    .sidebar-bottom {
        margin-top: auto;
        padding-top: 20px;
        min-width: 0;
    }

    .sidebar-profile {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 10px;
        border-top: 1px solid #edf0f4;
        min-width: 0;
    }

    .profile-avatar {
        width: 36px;
        height: 36px;
        flex-shrink: 0;
        background: #eaf0ff;
        color: #29b24a;
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
        min-width: 0;
        white-space: nowrap;
    }

    .profile-info strong {
        font-size: 12px;
        color: #202632;
    }

    .profile-info span {
        font-size: 10px;
        color: #929ba7;
    }

    .sidebar-footer {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 10px 0;
        font-size: 9px;
        color: #98a2b3;
        white-space: nowrap;
    }

    .status-dot {
        width: 7px;
        height: 7px;
        flex-shrink: 0;
        border-radius: 50%;
        background: #45c58a;
    }

    /* Collapsed state */

    .sidebar.collapsed {
        width: 72px;
        min-width: 72px;
        flex-basis: 72px;
        padding: 22px 8px 14px;
    }

    .sidebar.collapsed .brand {
        flex-direction: column;
        justify-content: center;
        gap: 10px;
        padding: 0 0 16px;
    }

    .sidebar.collapsed .brand-logo {
        height: 30px;
        width: 40px;
        object-position: center;
    }

    .sidebar.collapsed .sidebar-toggle svg {
        transform: rotate(180deg);
    }

    .sidebar.collapsed .menu-item {
        justify-content: center;
        padding: 0;
        gap: 0;
    }

    .sidebar.collapsed .menu-item.active::before {
        left: -8px;
    }

    .sidebar.collapsed .menu-label,
    .sidebar.collapsed .profile-info,
    .sidebar.collapsed .footer-text {
        display: none;
    }

    .sidebar.collapsed .sidebar-profile {
        justify-content: center;
        padding: 14px 0;
    }

    .sidebar.collapsed .sidebar-footer {
        justify-content: center;
        padding: 4px 0 0;
    }

    /* Small screens: narrower open sidebar (it also starts collapsed via JS) */

    @media (max-width: 760px) {
        .sidebar {
            width: 190px;
            min-width: 190px;
            flex-basis: 190px;
        }

        .sidebar.collapsed {
            width: 72px;
            min-width: 72px;
            flex-basis: 72px;
        }
    }
</style>
