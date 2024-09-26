document.addEventListener('DOMContentLoaded', () => {
    const shoppingListTableBody = document.querySelector('#shoppingListTable tbody');

    document.getElementById('back-button').addEventListener('click', () => {
        window.location.href = '/results';
    });

    document.getElementById('clear-cart').addEventListener('click', async () => {
        try {
            const response = await fetch('/clear_shopping_list', {
                method: 'POST'
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            console.log('Clear cart response:', data);
            shoppingListTableBody.innerHTML = ''; // clear table
            document.getElementById('empty-state-message').classList.add('visible');
            document.getElementById('shoppingListTable').style.display = 'none';
        } catch (error) {
            console.error('Fetch error:', error);
        }
    })

    // map to stor urls
    const sellerUrls = {
        "Mayesh" : "https://www.mayesh.com/login",
        "Holex": "https://holex.com/en_US/login",
        "Kennicott": "https://shop.kennicott.com/",
        "Rooted Farmers": "https://www.rootedfarmers.com/shop"
    };

    async function fetchShoppingList() {
        try {
            const response = await fetch('/shopping_list_data');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            console.log('Shopping list data received:', data);
            populateTable(data);
        } catch (error) {
            console.error('Fetch error:', error);
        }
    }

    function populateTable(data) {
        const emptyStateMessage = document.getElementById('empty-state-message');
        const shoppingListTable = document.getElementById('shoppingListTable');
        shoppingListTableBody.innerHTML = '';

        if (data.length === 0) {
            emptyStateMessage.classList.add('visible');
            shoppingListTable.style.display = 'none';
        } else {
            emptyStateMessage.classList.remove('visible');
            shoppingListTable.style.display = 'table';

            // group data by seller
            const groupedData = data.reduce((acc, item) => {
                if (!acc[item.seller]) {
                    acc[item.seller] = [];
                }
                acc[item.seller].push(item);
                return acc;
            }, {});

            // populate table rows for each seller
            for (const [seller, flowers] of Object.entries(groupedData)) {
                // seller heading
                const sellerSection = document.createElement('div');
                sellerSection.classList.add('seller-section');

                // seller name with link
                const sellerHeading = document.createElement('h2');
                const sellerLink = document.createElement('a');

                // add seller name as link text
                sellerLink.href = sellerUrls[seller];
                sellerLink.textContent = seller;
                sellerLink.target = '_blank';
                sellerLink.style.color = 'inherit';

                sellerHeading.appendChild(sellerLink);
                shoppingListTableBody.appendChild(sellerHeading);

                // table headers
                const headers = [
                    '', 'Flower Name', 'Flower Image', 'Delivery', 'Seller',
                    'Farm', 'Prices', 'Stem Price', 'Stems Per', 'Available', 'Color', 'Height'
                ];
                const headerRow = document.createElement('tr');
                headers.forEach(header => {
                    const th = document.createElement('th');
                    th.textContent = header;
                    headerRow.appendChild(th);
                });

                const table = document.createElement('table');
                const thead = document.createElement('thead');
                thead.appendChild(headerRow);
                table.appendChild(thead);
                const tbody = document.createElement('tbody');

                // table rows for each flower
                flowers.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><button class="remove-from-list" data-flower-id="${item.id}" style="background-color: red; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">-</button></td>
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
                    tbody.appendChild(row);
                });
                table.appendChild(tbody);
                sellerSection.appendChild(table);
                shoppingListTableBody.appendChild(sellerSection);
            }
            addRemoveEventListeners();
        }
    }

    function addRemoveEventListeners() {
        document.querySelectorAll('.remove-from-list').forEach(button => {
            button.addEventListener('click', (e) => {
                const flowerId = e.target.getAttribute('data-flower-id');
                fetch('/remove_from_shopping_list', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ flowerId })
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Flower removed from shopping list:', data);
                    e.target.closest('tr').remove();
                })
                .catch(error => {
                    console.error('Error:', error);
                });
            });
        });
    }

    fetchShoppingList();
});



