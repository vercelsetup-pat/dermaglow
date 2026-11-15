
<script lang="ts">
    import { page } from '$app/state';

    const menuGroups = [
        {
            title: 'GENERAL',
            items: [
                { label: 'Dashboard', href: '/admin', icon: 'dashboard' }
            ]
        },
        {
            title: 'CATALOG',
            items: [
                { label: 'Categories', href: '/admin/categories', icon: 'categories' },
                { label: 'Subcategories', href: '/admin/subcategories', icon: 'subcategories' },
                { label: 'Products', href: '/admin/products', icon: 'products' }
            ]
        },
        {
            title: 'SALES',
            items: [
                { label: 'Orders', href: '/admin/orders', icon: 'orders' }
            ]
        },
        {
            title: 'CUSTOMERS',
            items: [
                { label: 'Customers', href: '/admin/customers', icon: 'customers' }
            ]
        },
        {
            title: 'SETTINGS',
            items: [
                { label: 'Website Settings', href: '/admin/settings', icon: 'settings' }
            ]
        }
    ];

    function isActive(href: string) {
        if (href === '/admin') {
            return page.url.pathname === '/admin';
        }

        return page.url.pathname === href ||
            page.url.pathname.startsWith(href + '/');
    }
</script>

<aside class="sidebar">
    <div class="brand">
        <div class="brand-logo">D</div>
        <div class="brand-info">
            <span class="brand-name">DERMA GLOW</span>
            <span class="brand-subtitle">ADMINISTRATION</span>
        </div>
    </div>

    <div class="sidebar-divider"></div>

    <nav>
        {#each menuGroups as group}
            <div class="menu-group">
                <p class="group-title">{group.title}</p>

                {#each group.items as item}
                    <a
                        href={item.href}
                        class:active={isActive(item.href)}
                        class="menu-item"
                    >
                        <span class="menu-icon">
                            {#if item.icon === 'dashboard'}
                                <svg viewBox="0 0 24 24">
                                    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                                    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                                    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                                    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
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
                            {:else if item.icon === 'products'}
                                <svg viewBox="0 0 24 24">
                                    <path d="m12 3 9 5-9 5-9-5 9-5Z"/>
                                    <path d="m3 12 9 5 9-5"/>
                                    <path d="m3 16 9 5 9-5"/>
                                </svg>
                            {:else if item.icon === 'orders'}
                                <svg viewBox="0 0 24 24">
                                    <path d="M5 3h14v18l-7-4-7 4V3Z"/>
                                    <path d="M9 8h6M9 12h6"/>
                                </svg>
                            {:else if item.icon === 'customers'}
                                <svg viewBox="0 0 24 24">
                                    <circle cx="9" cy="8" r="3"/>
                                    <path d="M3 20v-2a6 6 0 0 1 12 0v2"/>
                                    <path d="M16 5.5a3 3 0 0 1 0 5.8"/>
                                    <path d="M19 14a5 5 0 0 1 2 4v2"/>
                                </svg>
                            {:else}
                                <svg viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="3"/>
                                    <path d="m19.4 15 .1.1 1.4 1.1-1.5 2.6-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-3l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.5-2.6 1.4-1.1a8 8 0 0 1 0-1.8l-1.4-1.1 1.5-2.6 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h3l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.5 2.6-1.4 1.1a8 8 0 0 1 0 1.7Z"/>
                                </svg>
                            {/if}
                        </span>

                        <span>{item.label}</span>
                    </a>
                {/each}
            </div>
        {/each}
    </nav>

    <div class="sidebar-bottom">
        <div class="help-card">
            <div class="help-icon">?</div>
            <p>Need help?</p>
            <span>Contact our support team</span>
            <a href="mailto:support@example.com">Get Support</a>
        </div>

        <div class="sidebar-footer">
            <span class="status-dot"></span>
            <span>System operational</span>
        </div>
    </div>
</aside>

<style>
    .sidebar {
        width: 250px;
        min-width: 250px;
        height: 100vh;
        background: #ffffff;
        border-right: 1px solid #edf0f3;
        display: flex;
        flex-direction: column;
        padding: 26px 18px 16px;
        box-sizing: border-box;
        overflow-y: auto;
    }

    .brand {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 0 8px 24px;
    }

    .brand-logo {
        width: 37px;
        height: 37px;
        border-radius: 11px;
        background: #e7f5fc;
        color: #269ed0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: 700;
    }

    .brand-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .brand-name {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 1px;
        color: #283b4b;
    }

    .brand-subtitle {
        font-size: 9px;
        letter-spacing: 1.2px;
        color: #9ba8b3;
    }

    .sidebar-divider {
        height: 1px;
        background: #f0f2f4;
        margin-bottom: 22px;
    }

    nav {
        display: flex;
        flex-direction: column;
        gap: 23px;
    }

    .menu-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    .group-title {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1px;
        color: #a4adb6;
        padding: 0 10px;
        margin: 0 0 7px;
    }

    .menu-item {
        height: 42px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 11px;
        border-radius: 8px;
        text-decoration: none;
        color: #788794;
        font-size: 13px;
        font-weight: 500;
        transition: background 0.2s, color 0.2s;
    }

    .menu-item:hover {
        background: #f5f9fc;
        color: #269ed0;
    }

    .menu-item.active {
        background: #eaf6fc;
        color: #269ed0;
        font-weight: 600;
    }

    .menu-icon {
        width: 19px;
        height: 19px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .menu-icon svg {
        width: 18px;
        height: 18px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.7;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .sidebar-bottom {
        margin-top: auto;
        padding-top: 25px;
    }

    .help-card {
        background: #f3f9fc;
        border-radius: 10px;
        padding: 16px 12px;
        text-align: center;
        margin-bottom: 18px;
    }

    .help-icon {
        width: 27px;
        height: 27px;
        background: #dceff9;
        color: #269ed0;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 9px;
        font-weight: 700;
    }

    .help-card p {
        font-size: 12px;
        color: #344b5b;
        font-weight: 600;
        margin: 0 0 5px;
    }

    .help-card span {
        font-size: 10px;
        color: #95a4af;
        display: block;
        margin-bottom: 12px;
    }

    .help-card a {
        display: block;
        background: #35a9df;
        color: white;
        padding: 8px;
        border-radius: 6px;
        text-decoration: none;
        font-size: 11px;
        font-weight: 600;
    }

    .sidebar-footer {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        font-size: 10px;
        color: #9ba8b3;
    }

    .status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #49bd87;
    }

    @media (max-width: 760px) {
        .sidebar {
            width: 210px;
            min-width: 210px;
        }
    }
</style>
