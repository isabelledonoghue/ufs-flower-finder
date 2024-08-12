// script.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('queryForm');

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const deliveryDate = document.getElementById('deliveryDate').value;
        const flowerNames = Array.from(document.getElementById('flowerNames').selectedOptions).map(option => option.value);
        const scripts = Array.from(document.getElementById('scripts').selectedOptions).map(option => option.value);
        
        fetch('/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                deliveryDate,
                flowerNames,
                scripts
            })
        })
        .then(response => response.json())
        .then(data => {
            alert('Request successful!');
            console.log(data);
        })
        .catch(error => {
            alert('Request failed!');
            console.error('Error:', error);
        });
    });
});
