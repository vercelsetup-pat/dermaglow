
<script lang="ts">
    import { page } from '$app/state';
    import Logo from "#lib/assets/logo.png"

    const menuGroups = [
        {
            items: [
                { label: 'Dashboard', href: '/admin', icon: 'dashboard' }
            ]
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
            items: [
                { label: 'Website Settings', href: '/admin/settings', icon: 'settings' }
            ]
        }
    ];

    let collapsed = $state(false);

    function isActive(href: string) {
        if (href === '/admin') {
            return page.url.pathname === '/admin';
        }

        return page.url.pathname === href ||
            page.url.pathname.startsWith(href + '/');
    }
</script>

<aside class="sidebar" class:collapsed>

    <div class="brand">
        <div class="brand-info">
            <span class="brand-name">ADMIN PANEL</span>
        </div>

        <button
            class="sidebar-toggle"
            onclick={() => collapsed = !collapsed}
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
                                    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                                    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                                    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                                    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                                </svg>

                            {:else if item.icon === 'orders'}
                                <svg viewBox="0 0 24 24">
                                    <rect x="4" y="3" width="16" height="18" rx="2"/>
                                    <path d="M8 8h8M8 12h8M8 16h5"/>
                                </svg>

                            {:else if item.icon === 'products'}
                                <svg viewBox="0 0 24 24">
                                    <path d="m12 3 9 5-9 5-9-5 9-5Z"/>
                                    <path d="m3 12 9 5 9-5"/>
                                    <path d="m3 16 9 5 9-5"/>
                                </svg>

                            {:else if item.icon === 'customers'}
                                <svg viewBox="0 0 24 24">
                                    <circle cx="9" cy="8" r="3"/>
                                    <path d="M3 20v-2a6 6 0 0 1 12 0v2"/>
                                    <path d="M16 5.5a3 3 0 0 1 0 5.8"/>
                                    <path d="M19 14a5 5 0 0 1 2 4v2"/>
                                </svg>

                            {:else if item.icon === 'categories'}
                                <svg viewBox="0 0 24 24">
                                    <rect x="3" y="3" width="8" height="8" rx="1.5"/>
                                    <rect x="13" y="3" width="8" height="8" rx="1.5"/>
                                    <rect x="3" y="13" width="8" height="8" rx="1.5"/>
                                    <rect x="13" y="13" width="8" height="8" rx="1.5"/>
                                </svg>

                            {:else if item.icon === 'subcategories'}
                                <svg viewBox="0 0 24 24">
                                    <path d="M4 5h6v6H4z"/>
                                    <path d="M14 5h6v6h-6z"/>
                                    <path d="M9 11v3h6v-3"/>
                                    <path d="M12 14v5"/>
                                    <path d="M9 19h6"/>
                                </svg>

                            {:else}
                                <svg viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="3"/>
                                    <path d="m19.4 15 .1.1 1.4 1.1-1.5 2.6-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-3l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.5-2.6 1.4-1.1a8 8 0 0 1 0-1.8l-1.4-1.1 1.5-2.6 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h3l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.5 2.6-1.4 1.1a8 8 0 0 1 0 1.7Z"/>
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
        <div class="upgrade-card">
              <img src={Logo} alt="Derma Glow Logo" />
        </div>

        <div class="sidebar-footer">
            <span class="status-dot"></span>
            <span>System operational</span>
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
        background: #ffffff;
        border-right: 1px solid #edf0f4;
        display: flex;
        flex-direction: column;
        padding: 22px 13px 14px;
        overflow-x: hidden;
        overflow-y: auto;
        color: #344054;
        transition: width .25s ease, flex-basis .25s ease, min-width .25s ease;
        box-sizing: border-box;
    }

    .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 10px 25px;
        min-height: 36px;
    }

    .brand-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
        flex: 1;
        min-width: 0;
        white-space: nowrap;
    }

    .brand-name {
        font-size: 13px;
        font-weight: 750;
        color: #171c26;
        letter-spacing: -.3px;
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
        transition: background .2s ease, color .2s ease, transform .25s ease;
    }

    .sidebar-toggle:hover {
        background: #edf3ff;
        color: #29B24A;
    }

    .sidebar-toggle svg {
        width: 16px;
        height: 16px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        transition: transform .25s ease;
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
        transition: background .2s ease, color .2s ease;
    }

    .menu-item:hover {
        background: #f5f7fb;
        color: #29B24A;
    }

    .menu-item.active {
        background: #edf3ff;
        color: #29B24A;
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
        background: #29B24A;
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

    .menu-label {
        white-space: nowrap;
    }

    /* Bottom */

    .sidebar-bottom {
        margin-top: auto;
        padding-top: 20px;
        min-width: 0;
    }

    .upgrade-card {
        padding: 12px;
        border-radius: 12px;

        color: white;
        margin-bottom: 15px;
    }

    .sidebar-footer {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 13px 7px 5px;
        font-size: 9px;
        color: #98a2b3;
        border-top: 1px solid #edf0f4;
        white-space: nowrap;
    }


    .status-dot {
        width: 7px;
        height: 7px;
        flex-shrink: 0;
        border-radius: 50%;
        background: #45c58a;
    }

    .sidebar::-webkit-scrollbar {
        width: 4px;
    }

    .sidebar::-webkit-scrollbar-thumb {
        background: #e5e7eb;
        border-radius: 10px;
    }

    .sidebar.collapsed {
        width: 72px;
        min-width: 72px;
        flex-basis: 72px;
        padding: 22px 8px 14px;
    }

    .sidebar.collapsed .brand {
        justify-content: center;
        gap: 2px;
        padding: 0 0 12px;
    }

   
    .sidebar.collapsed .brand-info {
        display: none;
    }

    .sidebar.collapsed .sidebar-toggle {
        width: 24px;
        height: 24px;
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

    .sidebar.collapsed .menu-label {
        display: none;
    }

    .sidebar.collapsed .upgrade-card {
        display: none;
    }

    .sidebar.collapsed .sidebar-footer {
        justify-content: center;
        padding: 13px 0 5px;
    }

    .sidebar.collapsed .sidebar-footer > span:last-child {
        display: none;
    }

    .sidebar::-webkit-scrollbar {
        width: 4px;
    }

    .sidebar::-webkit-scrollbar-thumb {
        background: #e5e7eb;
        border-radius: 10px;
    }

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

    @media (max-width: 760px) {
        .sidebar {
            width: 190px;
            min-width: 190px;
        }

        .upgrade-card {
            padding: 10px;
        }
    }
</style>
