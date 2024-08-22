document.addEventListener('DOMContentLoaded', () => {
    const shoppingListTableBody = document.querySelector('#shoppingListTable tbody');

    document.getElementById('back-button').addEventListener('click', () => {
        window.location.href = '/results';
    });

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
            data.forEach(item => {
                console.log('Adding row for flower:', item.flowerName);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><button class="remove-from-list" data-flower-id="${item.id}" style="background-color: red; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">-</button></td>
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
                shoppingListTableBody.appendChild(row);
            });
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




