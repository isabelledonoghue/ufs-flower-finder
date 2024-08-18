document.addEventListener('DOMContentLoaded', () => {
    const resultsTableBody = document.querySelector('#resultsTable tbody');
    const filterDeliveryDate = document.getElementById('filterDeliveryDate');
    const filterSeller = document.getElementById('filterSeller');
    const filterFlowerName = document.getElementById('filterFlowerName');
    const newRequestButton = document.getElementById('newRequestButton');
    const applyFiltersButton = document.getElementById('applyFiltersButton');
    const sortBy = document.getElementById('sortBy');

    async function fetchResults() {
        try {
            const response = await fetch('/results_data');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            console.log('Results data received:', data);
            populateTable(data);
        } catch (error) {
            console.error('Fetch error:', error);
        }
    }

    newRequestButton.addEventListener('click', async () => {
        try {
            // send POST request to clear the database and recreate schema
            const response = await fetch('/clear_database', {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Failed to clear the database');
            }

            // redirect to query page
            console.log('Database cleared. Redirecting to query page...');
            window.location.href = '/';
        } catch (error) {
            console.error('Error:', error);
        }
    });

    applyFiltersButton.addEventListener('click', () => {
        applyFilters();
        sortTable();
    });

    function populateTable(data) {
        resultsTableBody.innerHTML = '';
        data.forEach(item => {
            console.log('Adding row for flower:', item.flowerName);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.flowerName}</td>
                <td><img src="${item.flowerImage}" alt="${item.flowerName}" style="width: 100px;"></td>
                <td>${item.delivery}</td>
                <td>${item.seller}</td>
                <td>${item.farm}</td>
                <td>${item.prices}</td>
                <td>$${item.stemPrice}</td>
                <td>${item.stemsPer}</td>
                <td>${item.available}</td>
                <td>${item.color}</td>
                <td>${item.height}</td>
            `;
            resultsTableBody.appendChild(row);
        });
        applyFilters();
    }

    function applyFilters() {
        console.log('Applying filters...');
        const rows = resultsTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const deliveryDate = row.cells[2].textContent.toLowerCase();
            const seller = row.cells[3].textContent.toLowerCase();
            const farm = row.cells[4].textContent.toLowerCase();
            const flowerName = row.cells[0].textContent.toLowerCase();

            const deliveryDateFilter = filterDeliveryDate.value.toLowerCase();
            const sellerFilter = filterSeller.value.toLowerCase();
            const farmFilter = filterFarm.value.toLowerCase();
            const flowerNameFilter = filterFlowerName.value.toLowerCase();

            if (
                (deliveryDate.includes(deliveryDateFilter) || deliveryDateFilter === '') &&
                (seller.includes(sellerFilter) || sellerFilter === '') &&
                (farm.includes(farmFilter) || farmFilter === '') &&
                (flowerName.includes(flowerNameFilter) || flowerNameFilter === '')
            ) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    function sortTable() {
        const rows = Array.from(resultsTableBody.querySelectorAll('tr'));
        const sortByValue = sortBy.value;
        
        rows.sort((a, b) => {
            const aCell = a.querySelector('td');
            const bCell = b.querySelector('td');

            if (sortByValue === 'stemPriceAsc') {
                return parseFloat(aCell.textContent) - parseFloat(bCell.textContent);
            } else if (sortByValue === 'deliveryDate') {
                const today = new Date();
                const aDate = new Date(aCell.textContent);
                const bDate = new Date(bCell.textContent);
                return Math.abs(today - aDate) - Math.abs(today - bDate);
            }
            return 0;
        });

        rows.forEach(row => resultsTableBody.appendChild(row));
        console.log('Table sorted by:', sortByValue);
    }

    // fetch results and set up filters
    fetchResults();
});
