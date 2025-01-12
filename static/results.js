document.addEventListener('DOMContentLoaded', () => {
    const resultsTableBody = document.querySelector('#resultsTable tbody');
    const filterDeliveryDate = document.getElementById('filterDeliveryDate');
    const filterSeller = document.getElementById('filterSeller');
    const filterFlowerName = document.getElementById('filterFlowerName');
    const newRequestButton = document.getElementById('newRequestButton');
    const applyFiltersButton = document.getElementById('applyFiltersButton');
    const removeFiltersButton = document.getElementById('removeFiltersButton'); // Added remove filters button
    const sortBy = document.getElementById('sortBy');

    async function fetchResults() {
        try {
            const response = await fetch('/results_data');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            console.log('Results data received:', data);

            populateFilters(data);
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

    removeFiltersButton.addEventListener('click', () => {
        resetFiltersAndSort();
    });

    async function populateTable(data) {
        resultsTableBody.innerHTML = '';
        for (const item of data) {
            console.log('Adding row for flower:', item.flowerName);

            // fix holex image url
            let flowerImageUrl = item.flowerImage;
            if (flowerImageUrl.includes('cdn.holexflower.com')) {
                flowerImageUrl = flowerImageUrl.replace(/\/\//, '/'); // remove extra '/'
            }
            
            // check if item is in shopping list
            const response = await fetch('/is_in_shopping_list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ flowerId: item.id })
            });
            const result = await response.json();
            const isInList = result.isInList;

            // check if item is in saved cart
            const responseTwo = await fetch('/saved_cart_data');
            const savedCartData = await responseTwo.json();

            const isInSavedCart = savedCartData.some(savedItem => {
                console.log('Comparing savedItem and item');
                return savedItem.flowerName === item.flowerName &&
                    savedItem.farm === item.farm &&
                    savedItem.seller === item.seller &&
                    savedItem.delivery === item.delivery;
            });

            console.log('isInSavedCart:', isInSavedCart);
            console.log('isInList:', isInList);

            const isInCart = isInSavedCart || isInList;
            console.log('isInCart:', isInCart);

            const buttonColor = isInCart ? 'red' : 'green';
            const buttonText = isInCart ? '-' : '+';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><button class="toggle-list" data-flower-id="${item.id}" style="background-color: ${buttonColor}; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">${buttonText}</button></td>
                <td>${item.flowerName}</td>
                <td>${item.flowerImage ? `<img src="${item.flowerImage}" alt="${item.flowerName}" style="width: 100px;">` : ''}</td>
                <td>${item.delivery}</td>
                <td>${item.seller}</td>
                <td>${item.farm}</td>
                <td>${item.prices}</td>
                <td>$${item.stemPrice}</td>
                <td>${item.stemsPer}</td>
                <td>${item.available}</td>
                <td>${item.color.includes('rgb') ? `<div style="width: 20px; height: 20px; background-color: ${item.color}; display: inline-block; border: 1px solid black;"></div>`: item.color}</td>
                <td>${item.height}</td>
            `;
            resultsTableBody.appendChild(row);
        }
        applyFilters();
        addToggleEventListeners();
    }

    function addToggleEventListeners() {
        document.querySelectorAll('.toggle-list').forEach(button => {
            button.addEventListener('click', async (e) => {
                const flowerId = e.target.getAttribute('data-flower-id');
                console.log('Flower ID clicked:', flowerId);

                if (e.target.style.backgroundColor === 'green') {
                    // add to list
                    try {
                        const response = await fetch('/add_to_shopping_list', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ flowerId })
                        });
                        const data = await response.json();
                        console.log('Item added:', data);
                        e.target.style.backgroundColor = 'red';
                        e.target.textContent = '-';
                    } catch (error) {
                        console.error('Error:', error);
                    }
                } else {
                    // remove from list
                    try {
                        const response = await fetch('/remove_from_shopping_list', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ flowerId })
                        });
                        const data = await response.json();
                        console.log('Item removed:', data);
                        e.target.style.backgroundColor = 'green';
                        e.target.textContent = '+';
                    } catch (error) {
                        console.error('Error:', error);
                    }
                }
            });
        });
    }

    function applyFilters() {
        console.log('Applying filters...');
        const rows = resultsTableBody.querySelectorAll('tr');
        const deliveryDateFilter = filterDeliveryDate.value.toLowerCase();
        const sellerFilter = filterSeller.value.toLowerCase();
        const farmFilter = filterFarm.value.toLowerCase();
        const flowerNameFilter = filterFlowerName.value.toLowerCase();

        rows.forEach(row => {
            const deliveryDate = row.cells[3].textContent.toLowerCase();
            const seller = row.cells[4].textContent.toLowerCase();
            const farm = row.cells[5].textContent.toLowerCase();
            const flowerName = row.cells[1].textContent.toLowerCase();

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

    function populateFilters(data) {
        const sellerSelect = document.getElementById('filterSeller');
        const farmSelect = document.getElementById('filterFarm');
        const flowerNameSelect = document.getElementById('filterFlowerName');
    
        const sellers = new Set();
        const farms = new Set();
        const flowerNames = new Set(["STOCK", "SNAPDRAGON", "SALAL", "DELPHINIUM", "ROSE", 
            "CARNATION", "LISIANTHUS", "SCABIOSA", "MUMS", 
            "RANUNCULUS", "ANEMONE", "EUCALYPTUS", "RUSCUS"]);

        data.forEach(item => {
            sellers.add(item.seller);
            farms.add(item.farm);
        });
    
        populateSelect(sellerSelect, sellers);
        populateSelect(farmSelect, farms);
        populateSelect(flowerNameSelect, flowerNames);
    }
    
    function populateSelect(selectElement, optionsSet) {
        selectElement.innerHTML = '<option value="">Select Option</option>';
        optionsSet.forEach(optionValue => {
            const option = document.createElement('option');
            option.value = optionValue;
            option.textContent = optionValue;
            selectElement.appendChild(option);
        });
    }

    function resetFiltersAndSort() {
        console.log('Resetting filters and sort...');
        
        // clear filter inputs
        filterDeliveryDate.value = '';
        filterSeller.value = '';
        filterFarm.value = '';
        filterFlowerName.value = '';
        sortBy.value = '';
    
        fetchResults();
    }

    function sortTable() {
        const rows = Array.from(resultsTableBody.querySelectorAll('tr'));
        const sortByValue = sortBy.value;

        if (sortByValue === '') {
            return;
        }
        
        rows.sort((a, b) => {
            let aValue, bValue;

            if (sortByValue === 'stemPriceAsc') {
                console.log("sorting by price");
                aValue = parseFloat(a.querySelector('td:nth-child(8)').textContent.replace('$', ''));
                bValue = parseFloat(b.querySelector('td:nth-child(8)').textContent.replace('$', ''));
                return aValue - bValue;
            } else if (sortByValue === 'deliveryDate') {
                console.log("sorting by delivery date");
                aValue = new Date(a.querySelector('td:nth-child(4)').textContent);
                bValue = new Date(b.querySelector('td:nth-child(4)').textContent);
                return aValue - bValue;
            }
            return 0;
        });

        rows.forEach(row => resultsTableBody.appendChild(row));
        console.log('Table sorted by:', sortByValue);
    }

    // fetch results and set up filters
    fetchResults();
});