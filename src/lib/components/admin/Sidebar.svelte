
<script lang="ts">
    import { page } from '$app/state';

    const menuGroups = [
        {
            items: [
                { label: 'Dashboard', href: '/admin', icon: 'dashboard' }
            ]
        },
        {
            items: [
                { label: 'Categories', href: '/admin/categories', icon: 'categories' },
                { label: 'Subcategories', href: '/admin/subcategories', icon: 'subcategories' }
            ]
        },
        {
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

    <!-- Brand -->
    <div class="brand">
        <div class="brand-logo">D</div>

        <div class="brand-info">
            <span class="brand-name">DERMA GLOW</span>
            <span class="brand-subtitle">ADMIN PANEL</span>
        </div>
    </div>

    <div class="sidebar-divider"></div>

    <!-- Navigation -->
    <nav>
        {#each menuGroups as group}
            <div class="menu-group">

                {#each group.items as item}
                    <a
                        href={item.href}
                        class="menu-item"
                        class:active={isActive(item.href)}
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

    <!-- Bottom Section -->
    <div class="sidebar-bottom">

        <div class="upgrade-card">
            <div class="upgrade-icon">
                <svg viewBox="0 0 24 24">
                    <path d="M12 2 15 9l7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>
                </svg>
            </div>

            <strong>Derma Glow</strong>

            <p>
                Manage your store, products and orders all in one place.
            </p>

            <span class="upgrade-label">ADMINISTRATION</span>
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
        height: 100vh;
        position: sticky;
        top: 0;
        background: #ffffff;
        border-right: 1px solid #edf0f4;
        display: flex;
        flex-direction: column;
        padding: 22px 13px 14px;
        overflow-y: auto;
        color: #344054;
    }

    /* Brand */

    .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 9px 12px;
    }

    .brand-logo {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        background: #3475ff;
        color: white;
        display: grid;
        place-items: center;
        font-size: 18px;
        font-weight: 800;
    }

    .brand-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .brand-name {
        font-size: 13px;
        font-weight: 750;
        color: #171c26;
        letter-spacing: -.3px;
    }

    .brand-subtitle {
        font-size: 8px;
        letter-spacing: 1px;
        color: #9aa3af;
        font-weight: 600;
    }

    .sidebar-divider {
        height: 1px;
        background: #edf0f4;
        margin: 0 -13px 17px;
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
        transition: all .2s ease;
    }

    .menu-item:hover {
        background: #f5f7fb;
        color: #3475ff;
    }

    .menu-item.active {
        background: #edf3ff;
        color: #3475ff;
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
        background: #3475ff;
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

    /* Bottom */

    .sidebar-bottom {
        margin-top: auto;
        padding-top: 20px;
    }

    .upgrade-card {
        padding: 12px 12px;
        border-radius: 12px;
        background: linear-gradient(145deg, #3979ff, #1746bd);
        color: #ffffff;
        margin-bottom: 15px;
    }

    .upgrade-icon {
        width: 27px;
        height: 27px;
        border-radius: 7px;
        background: rgba(255,255,255,.2);
        display: grid;
        place-items: center;
        margin-bottom: 11px;
    }

    .upgrade-icon svg {
        width: 15px;
        height: 15px;
        fill: none;
        stroke: white;
        stroke-width: 1.7;
        stroke-linejoin: round;
    }

    .upgrade-card strong {
        display: block;
        font-size: 12px;
        margin-bottom: 5px;
    }

    .upgrade-card p {
        font-size: 9px;
        line-height: 1.6;
        color: rgba(255,255,255,.8);
        margin: 0 0 10px;
    }

    .upgrade-label {
        font-size: 8px;
        font-weight: 700;
        letter-spacing: .8px;
        color: rgba(255,255,255,.85);
    }

    .sidebar-footer {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 13px 7px 5px;
        font-size: 9px;
        color: #98a2b3;
        border-top: 1px solid #edf0f4;
    }

    .status-dot {
        width: 7px;
        height: 7px;
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
