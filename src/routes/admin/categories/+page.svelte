categories
<script lang="ts">
    const categories = [
        { id: 1, name: 'Skincare', description: 'Skincare products', status: 'Active' },
        { id: 2, name: 'Haircare', description: 'Haircare products', status: 'Active' },
        { id: 3, name: 'Makeup', description: 'Makeup and beauty products', status: 'Active' }
    ];
</script>

<svelte:head>
    <title>Categories | Derma Glow</title>
</svelte:head>

<div class="page-header">
    <div>
        <h1>Categories</h1>
        <p>Manage your store product categories.</p>
    </div>

    <button class="add-button">
        + Add Category
    </button>
</div>

<div class="stats">
    <div class="stat-card">
        <span>Total Categories</span>
        <strong>{categories.length}</strong>
    </div>

    <div class="stat-card">
        <span>Active Categories</span>
        <strong>{categories.filter(c => c.status === 'Active').length}</strong>
    </div>
</div>

<div class="table-card">
    <div class="table-header">
        <h2>All Categories</h2>
        <input type="search" placeholder="Search categories..." />
    </div>

    <table>
        <thead>
            <tr>
                <th>Category Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>

        <tbody>
            {#each categories as category}
                <tr>
                    <td>{category.name}</td>
                    <td>{category.description}</td>
                    <td>
                        <span class="status">{category.status}</span>
                    </td>
                    <td>
                        <button class="action-button">Edit</button>
                        <button class="action-button delete">Delete</button>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>
    .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 28px;
    }

    h1 {
        font-size: 23px;
        color: #344655;
        margin: 0 0 7px;
        font-weight: 650;
    }

    .page-header p {
        color: #9ba8b3;
        font-size: 13px;
        margin: 0;
    }

    .add-button {
        background: #35a9df;
        color: white;
        border: none;
        padding: 11px 17px;
        border-radius: 7px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
    }

    .stats {
        display: flex;
        gap: 18px;
        margin-bottom: 25px;
    }

    .stat-card {
        background: white;
        border: 1px solid #edf0f3;
        border-radius: 10px;
        padding: 19px;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .stat-card span {
        font-size: 12px;
        color: #929faa;
    }

    .stat-card strong {
        font-size: 24px;
        color: #344655;
    }

    .table-card {
        background: white;
        border: 1px solid #edf0f3;
        border-radius: 10px;
        overflow: hidden;
    }

    .table-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
    }

    .table-header h2 {
        font-size: 14px;
        color: #344655;
        margin: 0;
    }

    .table-header input {
        border: 1px solid #e9edf1;
        border-radius: 6px;
        padding: 9px 12px;
        font-size: 11px;
        outline: none;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
    }

    th {
        background: #f8fafc;
        color: #8e9ba7;
        font-size: 11px;
        font-weight: 600;
        padding: 14px 20px;
    }

    td {
        padding: 17px 20px;
        border-top: 1px solid #f0f2f4;
        color: #637482;
        font-size: 12px;
    }

    .status {
        color: #269c70;
        background: #eaf7f0;
        padding: 5px 10px;
        border-radius: 20px;
        font-size: 10px;
    }

    .action-button {
        border: none;
        background: none;
        color: #35a9df;
        font-size: 11px;
        cursor: pointer;
        margin-right: 8px;
    }

    .action-button.delete {
        color: #d77b7b;
    }

    @media (max-width: 700px) {
        .table-card {
            overflow-x: auto;
        }

        table {
            min-width: 650px;
        }
    }
</style>
