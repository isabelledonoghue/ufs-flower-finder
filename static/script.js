// script.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('queryForm');
    const flowerDropdownButton = document.querySelector('#flowerDropdown button');
    const wholesalerDropdownButton = document.querySelector('#wholesalerDropdown button');
    const deliveryDateInput = document.getElementById('deliveryDate');
    const calendarDiv = document.getElementById('calendar');
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingMessage = document.getElementById('loadingMessage');
    const cancelButton = document.getElementById('cancelButton');

    let abortController = null;

    // DROPDOWNS
    // handle dropdown button clicks
    flowerDropdownButton.addEventListener('click', () => {
        const dropdown = document.querySelector('#flowerDropdown .dropdown-content');
        dropdown.style.display = (dropdown.style.display === 'block') ? 'none' : 'block';
    });
    wholesalerDropdownButton.addEventListener('click', () => {
        const dropdown = document.querySelector('#wholesalerDropdown .dropdown-content');
        dropdown.style.display = (dropdown.style.display === 'block') ? 'none' : 'block';
    });
        // Handle "Select All" and "Deselect All" buttons
        document.querySelectorAll('.select-all').forEach(button => {
            button.addEventListener('click', () => {
                const group = button.getAttribute('data-group');
                document.querySelectorAll(`input[name="${group}"]`).forEach(checkbox => {
                    checkbox.checked = true;
                });
                updateSelectedItems(); // Update button text to reflect changes
            });
        });
    
        document.querySelectorAll('.deselect-all').forEach(button => {
            button.addEventListener('click', () => {
                const group = button.getAttribute('data-group');
                document.querySelectorAll(`input[name="${group}"]`).forEach(checkbox => {
                    checkbox.checked = false;
                });
                updateSelectedItems(); // Update button text to reflect changes
            });
        });
    // function to display selected query items
    function updateSelectedItems() {
        const flowerCheckboxes = document.querySelectorAll('#flowerDropdown input[name="flowerTypes"]:checked');
        const flowerTypes = Array.from(flowerCheckboxes).map(checkbox => checkbox.nextSibling.textContent.trim()).join(', ');

        const wholesalerCheckboxes = document.querySelectorAll('#wholesalerDropdown input[name="wholesalers"]:checked');
        const wholesalers = Array.from(wholesalerCheckboxes).map(checkbox => checkbox.nextSibling.textContent.trim()).join(', ');

        flowerDropdownButton.textContent = flowerTypes ? `Flower Types: ${flowerTypes}` : 'Select Flower Types';
        wholesalerDropdownButton.textContent = wholesalers ? `Wholesalers: ${wholesalers}` : 'Select Wholesalers';
    }
    // update selected items when checkboxes change
    document.querySelectorAll('#flowerDropdown input[name="flowerTypes"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedItems);
    });
    document.querySelectorAll('#wholesalerDropdown input[name="wholesalers"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedItems);
    });

    // CALENDAR
    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth();
    let selectedDates = new Set();

    // track calendar visibility
    let isCalendarOpen = false;
    
    function generateCalendar() {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDay = firstDay.getDay();

        let calendarHtml = '<table><thead><tr>';
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            calendarHtml += `<th>${day}</th>`;
        });
        calendarHtml += '</tr></thead><tbody><tr>';

        // empty cells before the first day of the month
        for (let i = 0; i < startDay; i++) {
            calendarHtml += '<td></td>';
        }

        // days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = selectedDates.has(formattedDate);
            const backgroundColor = isSelected ? '#6CB26E' : 'white';
            calendarHtml += `<td data-date="${formattedDate}" style="background-color: ${backgroundColor};">${day}</td>`;
            if ((startDay + day) % 7 === 0) {
                calendarHtml += '</tr><tr>';
            }
        }
        // fill remaining cells
        if ((startDay + daysInMonth) % 7 !== 0) {
            for (let i = (startDay + daysInMonth) % 7; i < 7; i++) {
                calendarHtml += '<td></td>';
            }
        }
        calendarHtml += '</tr></tbody></table>';
        document.getElementById('calendarBody').innerHTML = calendarHtml;
        document.getElementById('calendarMonthYear').textContent = `${new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })} ${currentYear}`;

        // event listener for date cells
        document.querySelectorAll('#calendarBody td[data-date]').forEach(cell => {
            cell.addEventListener('click', (event) => {
                const date = event.target.getAttribute('data-date');
                if (selectedDates.has(date)) {
                    selectedDates.delete(date); // deselect date
                } else {
                    selectedDates.add(date); // select date
                }
                updateSelectedDates(); // update input with selected dates
                generateCalendar(); // rerender and highlight selected dates
            });
        });
    }

    function updateSelectedDates() {
        const datesArray = Array.from(selectedDates);
        deliveryDateInput.value = datesArray.join(', ');
    }

    function changeMonth(delta) {
        currentMonth += delta;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        } else if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        generateCalendar();
    }

    function changeYear(delta) {
        currentYear += delta;
        generateCalendar();
    }

    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    document.getElementById('prevYear').addEventListener('click', () => changeYear(-1));
    document.getElementById('nextYear').addEventListener('click', () => changeYear(1));

    // deliveryDateInput.addEventListener('click', () => {
    //     calendarDiv.style.display = (calendarDiv.style.display === 'block') ? 'none' : 'block';
    //     generateCalendar();
    // });

    // toggle calendar open/close
    deliveryDateInput.addEventListener('click', (event) => {
        event.stopPropagation(); // prevent calendar from being closed when clicking input
        if (!isCalendarOpen) {
            calendarDiv.style.display = 'block';
            isCalendarOpen = true;
            generateCalendar();
        }
    });

    // close calendar click outside
    document.addEventListener('click', (event) => {
        console.log("clicked outside of calendar")
        if (isCalendarOpen && !calendarDiv.contains(event.target) && !deliveryDateInput.contains(event.target)) {
            calendarDiv.style.display = 'none';
            isCalendarOpen = false;
        }
    });

    // prevent click reaching document level listener
    calendarDiv.addEventListener('click', (event) => {
        event.stopPropagation();
    })

    deliveryDateInput.addEventListener('input', (event) => {
        let value = event.target.value.replace(/\D/g, ''); // remove non-numeric characters
        if (value.length > 4) {
            value = value.slice(0, 4) + '-' + value.slice(4);
        }
        if (value.length > 7) {
            value = value.slice(0, 7) + '-' + value.slice(7);
        }
        event.target.value = value;
    });

    document.addEventListener('click', function(event) {
        if (!calendarDiv.contains(event.target) && !deliveryDateInput.contains(event.target)) {
            calendarDiv.style.display = 'none';
        }
    });

    // FORM SUBMISSION
    async function handleFormSubmit(event) {
        event.preventDefault();

        // show loading screen
        loadingScreen.classList.remove('hidden');
        loadingMessage.textContent = 'Gathering Data...';

        // create new AbortController for request
        abortController = new AbortController();

        // gather request arguments
        const deliveryDates = Array.from(selectedDates);
        const flowerCheckboxes = document.querySelectorAll('#flowerDropdown input[name="flowerTypes"]');
        const selectedFlowers = Array.from(flowerCheckboxes).filter(checkbox => checkbox.checked).map(checkbox => checkbox.value);
        const allFlowers = Array.from(flowerCheckboxes).map(checkbox => checkbox.value); // get all flower types
        const wholesalersCheckboxes = document.querySelectorAll('#wholesalerDropdown input[name="wholesalers"]');
        const selectedWholesalers = Array.from(wholesalersCheckboxes).filter(checkbox => checkbox.checked).map(checkbox => checkbox.value);
        const allWholesalers = Array.from(wholesalersCheckboxes).map(checkbox => checkbox.value); // get all wholesalers
        
        const flowerNames = selectedFlowers.length > 0 ? selectedFlowers : allFlowers;
        const scripts = selectedWholesalers.length > 0 ? selectedWholesalers : allWholesalers;

        try {
            // clear database before starting new scrape
            await fetch('/clear_database', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const response = await fetch('/scrape', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    deliveryDates,
                    flowerNames,
                    scripts
                }),
                signal: abortController.signal
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            console.log('Request successful!', data);
            window.location.href = '/results';
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Request was cancelled.');
            } else {
                console.error('Request failed!', error);
            }
        } finally {
            // hide loading screen
            loadingScreen.classList.add('hidden');
        }
    }

    // add event listener to form
    form.addEventListener('submit', handleFormSubmit);

    // cancel button functionality
    cancelButton.addEventListener('click', async () => {
        console.log('cancel button click');

        if (abortController) {
            abortController.abort(); // cancel current request
            console.log('Request aborted');
        }
    
        // clear the database
        try {
            await fetch('/clear_database', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log('Database cleared');
        } catch (error) {
            console.error('failed to clear database:', error);
        }
    
        // hide loading screen and clear input fields
        loadingScreen.classList.add('hidden');
        deliveryDateInput.value = '';
        document.querySelectorAll('#flowerDropdown input[type="checkbox"]').forEach(checkbox => checkbox.checked = false);
        document.querySelectorAll('#wholesalerDropdown input[type="checkbox"]').forEach(checkbox => checkbox.checked = false);
        updateSelectedItems();

        // clear selected delivery dates and reset calendar
        selectedDates.clear(); // clear set of selected dates
        generateCalendar(); // regenerate calendar
    });


    // close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        const flowerDropdown = document.querySelector('#flowerDropdown .dropdown-content');
        const wholesalerDropdown = document.querySelector('#wholesalerDropdown .dropdown-content');
        if (!flowerDropdown.contains(event.target) && !flowerDropdown.previousElementSibling.contains(event.target)) {
            flowerDropdown.style.display = 'none';
        }
        if (!wholesalerDropdown.contains(event.target) && !wholesalerDropdown.previousElementSibling.contains(event.target)) {
            wholesalerDropdown.style.display = 'none';
        }
    });
});
