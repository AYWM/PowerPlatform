

// let api_base_url = 'http://192.168.12.14:3000/sbms';
let api_base_url = 'https://api.tpacpackaging.com:3001/sbms';
// let so_detail_url = 'http://192.168.12.14:8888/so_detail.html';
let so_detail_url = 'https://aywm.github.io/PowerPlatform/SBMS/so_detail.html';
let approveQueue = [];
let originalValues = {}; // To store the original values of the dropdowns
let UnitParam,SoParam,UserName;


function getQueryParams() {
    // const urlParams = new URLSearchParams(window.location.search);
    // UnitParam = urlParams.get('UNIT');
    // SoParam = urlParams.get('SO');
    const urlParams = decryptData(window.location.search.slice(1));
    UnitParam = urlParams.UNIT;
    SoParam = urlParams.SO;

    if(urlParams.USER && urlParams.PASSWORD){
        UserName = urlParams.USER;
        const userPassword = urlParams.PASSWORD;
        const password_selectElement = document.getElementById('password');
        password_selectElement.value = userPassword;
        verifyUser(urlParams.USER,urlParams.PASSWORD);
    }

    if(SoParam && SoParam == 'ALL'){
        fetchUsernames(UnitParam);
    }
    else{
        const verificationContainer = document.querySelector('.verification-container');
        verificationContainer.classList.add('hidden');
        fetchData(UnitParam,SoParam);
    }
}

function fetchUsernames(unitId) {
    // Example fetch request to get usernames from JSON endpoint
    fetch(`${api_base_url}/appUsers?unitID=${unitId}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const selectElement = document.getElementById('username');
                // Clear existing options
                selectElement.innerHTML = '';
                // Populate select options
                let output = data.output;
                output.forEach(users => {
                    const option = document.createElement('option');
                    option.value = users.USER_NAME;
                    option.textContent = users.USER_NAME;
                    selectElement.appendChild(option);
                });
                const username_selectElement = document.getElementById('username');
                username_selectElement.value = UserName;
            } else {
                console.error('Error fetching usernames:', data)
            }

        })
        .catch(error => console.error('Error fetching usernames:', error));
}

function verifyUser(username, password) {
    if(!username || !password || password.length<=0 || username.length<=0){
        alert('Wrong Login Credentials');
        return;
    }

    unit_id = UnitParam;
    
    fetch(`${api_base_url}/verifyUser`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, unit_id})
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            fetchData(UnitParam,SoParam);
        } else {
            alert(data.detail.split('\n')[0]);
            throw new Error(data.detail);
        }
    })  
    .catch(error => {
        const searchTable = document.getElementById('searchTable');
        if (searchTable) {
            searchTable.remove();
        }

    });
}

function fetchData(unitId, SoNumber) {
    fetch(`${api_base_url}/SoDetail?unitID=${unitId}&SoNumber=${SoNumber}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                
                if(SoNumber=='ALL'){
                    let output = data.output;

                    let table = '<h2>Showing Data for ALL SO Pending for Approve of Unit: ' + unitId + '</h2>';
                    table += '<h3>Count of details: ' + output.length + '</h3>';
                    table += '<table class="display" style="width:100%" id="searchTable"><thead><tr>';

                    // Create table headers dynamically based on the keys of the first object
                    Object.keys(output[0]).forEach(key => {
                        table += `<th>${key}</th>`;
                    });
                    table += '</tr></thead><tbody>';

                    // Create table rows with data
                    output.forEach(obj => {
                        table += '<tr>';
                        Object.values(obj).forEach((value, index, arr) => {
                            // If it's the last column, add the dropdown
                            if (index === arr.length - 1) {
                                originalValues[arr[2]] = value; // Save the original value
                                table += `  <td>
                                                <!-- <select onchange="handleSelectChange(this, '${arr[0]}', '${arr[2]}', '${arr[3]}', '${arr[5]}', '${arr[6]}', '${arr[8]}')">  -->
                                                <select class="status-select" data-soDate="${arr[0]}" data-soDocNo="${arr[2]}" data-soCustomer="${arr[3]}" data-salesPerson="${arr[5]}" data-soQuantity="${arr[6]}" data-soAmount="${arr[8]}">   
                                                    <option value="A" ${value === 'A' ? 'selected' : ''}>Approve</option>
                                                    <option value="Z" ${value === 'Z' ? 'selected' : ''}>Cancel</option>
                                                    <option value="N" ${value === 'N' ? 'selected' : ''}>Open</option>
                                                     <option value="V" ${value === 'V' ? 'selected' : ''}>Revise</option>
                                                </select>
                                            </td>`;
                            }
                            else if (index === arr.length - 2) {
                                table += `  <td>
                                                <a href="${so_detail_url}?${encryptData(convertStringToJsonObject(value))}"  target="_blank">
                                                    Show Detail
                                                </a>
                                            </td>`;
                            }
                            else if (index === 0) {
                                let date = new Date(value);
                                let formattedValue = !isNaN(date) ? date.toLocaleDateString() : value;
                                table += `<td data-order="${value}">${formattedValue}</td>`;
                            }
                            else{
                                // Check if value is a number and format accordingly
                                let formattedValue = typeof value === 'number' ? value.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 7
                                }) : value;
                                table += `<td>${formattedValue}</td>`;
                            }

                        });
                        table += '</tr>';
                    });

                    table += '</tbody></table>';

                    // Display the table in the result div
                    document.getElementById('result').innerHTML = table;

                    // Calculate summary for column 3 and 6 (assuming zero-based index)
                    let col3Sum = output.reduce((acc, curr) => acc + parseFloat(curr[Object.keys(curr)[6]] || 0), 0);
                    let col6Sum = output.reduce((acc, curr) => acc + parseFloat(curr[Object.keys(curr)[8]] || 0), 0);

                    // Display summary
                    document.getElementById('summary').innerHTML = `
                        <h3>Summary:</h3>
                        <p>Sum of Quantity: ${col3Sum.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}</p>
                        <p>Sum of Amount: ${col6Sum.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}</p>
                    `;                            

                }else{
                    let output = data.output;

                    let table = '<h2>Showing Data for SO Number ' + output[0]['SO_NO'] + '</h2>';
                    table += '<h3>Count of details: ' + output.length + '</h3>';
                    table += '<table  class="display" style="width:100%" id="searchTable"><thead><tr>';
                    // console.log(output[0]);
                    // Create table headers dynamically based on the keys of the first object
                    Object.keys(output[0]).slice(1).forEach(key => {
                        table += `<th>${key}</th>`;
                    });
                    table += '</tr></thead><tbody>';

                    // Create table rows with data
                    output.forEach(obj => {
                        table += '<tr>';
                        Object.values(obj).slice(1).forEach((value, index, arr) => {
                            // If it's the last column, add the dropdown
                            if (index === arr.length - 1) {
                                table += `  <td>
                                                <select>
                                                    <option value="A" ${value === 'A' ? 'selected' : ''}>Approve</option>
                                                    <option value="Z" ${value === 'Z' ? 'selected' : ''}>Cancel</option>
                                                    <option value="N" ${value === 'N' ? 'selected' : ''}>Open</option>
                                                     <option value="V" ${value === 'V' ? 'selected' : ''}>Revise</option>
                                                </select>
                                            </td>`;
                            }
                            else{
                                // Check if value is a number and format accordingly
                                let formattedValue = typeof value === 'number' ? value.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 7
                                }) : value;
                                table += `<td>${formattedValue}</td>`;
                            }

                        });
                        table += '</tr>';
                    });

                    table += '</tbody></table>';

                    // Display the table in the result div
                    document.getElementById('result').innerHTML = table;

                    // Calculate summary for column 3 and 6 (assuming zero-based index)
                    let col3Sum = output.reduce((acc, curr) => acc + parseFloat(curr[Object.keys(curr)[3]] || 0), 0);
                    let col6Sum = output.reduce((acc, curr) => acc + parseFloat(curr[Object.keys(curr)[6]] || 0), 0);

                    // Display summary
                    document.getElementById('summary').innerHTML = `
                        <h3>Summary:</h3>
                        <p>Sum of Quantity: ${col3Sum.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}</p>
                        <p>Sum of Amount: ${col6Sum.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}</p>
                    `;
                }

            } else {
                document.getElementById('result').innerHTML = 'Error fetching data';
            }
            let table = new DataTable('#searchTable', {
                            responsive: true,
                            buttons: ['copy', 'csv', 'excel', 'print',{
                                       extend: 'pdfHtml5',
                                       orientation: 'landscape',
                                       pageSize: SoParam === 'ALL' ? 'A2' : 'A4'
                                    }],
                            layout: {
                                top2Start: 'buttons'
                            },
                            fixedColumns: true,
                            "searching": true,
                            "ordering": true,
                            "info": true,
                            "lengthChange": true,
                            "lengthMenu": [[10, 25, 50, -1], [10, 25, 50, "All"]],
                            "striped": true,
                            "hover": true
                        });
        })
    .catch(error => console.error('Error fetching data:', error));
}


function handleSelectChange(selectElement, soDate, soDocNo, customer, salesPerson, Quantity, Amount) {
    const originalValue = originalValues[soDocNo];
    const newValue = selectElement.value;

    if (originalValue !== 'A' && newValue === 'A') {
        // Add to approve queue
        approveQueue.push({
            soDate,
            soDocNo,
            customer,
            salesPerson,
            Quantity,
            Amount,
            originalValue
        });
        renderApproveQueue();
    } else if (originalValue === 'A' && newValue !== 'A') {
        // Remove from approve queue if it was already approved
        approveQueue = approveQueue.filter(item => item.soDocNo !== soDocNo);
        renderApproveQueue();
    }

    originalValues[soDocNo] = newValue; // Update the original value
    // Show toast message
    showToast(`Status changed to ${newValue} for SO: ${soDocNo}`);
}

function renderApproveQueue() {
    let table = `<h2>Approve Queue</h2>`;
    table += '<table class="responsive-table display" style="width:100%"><thead><tr>';
    table += '<th>SO Date</th><th>SO Number</th><th>Customer</th><th>SalesPerson</th><th>Quantity</th><th>Amount</th><th>Action</th></tr></thead><tbody>';

    approveQueue.forEach((item, index) => {
        let date = new Date(item.soDate);
        let formattedDate = !isNaN(date) ? date.toLocaleDateString() : item.soDate;
        let formattedQuantity = item.Quantity.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 7
                                });
        let formattedAmount = item.Amount.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 7
                                });
        table += `<tr>
            <td>${formattedDate}</td>
            <td>${item.soDocNo}</td>
            <td>${item.customer}</td>
            <td>${item.salesPerson}</td>
            <td>${formattedQuantity}</td>
            <td>${formattedAmount}</td>
            <!-- <td><button onclick="removeFromApproveQueue(${index})">Remove</button></td> -->
            <td><button class="remove-button">Remove</button></td>
        </tr>`;
    });

    table += '</tbody></table>';
    document.getElementById('approveQueue').innerHTML = table;
}

function removeFromApproveQueue(index) {
    const item = approveQueue[index];
    approveQueue.splice(index, 1);
    renderApproveQueue();

    // Change the select option back to its original value if the element exists
    const selectElement = document.querySelector(`select[data-soDocNo="${item.soDocNo}"]`);
    if (selectElement) {
        selectElement.value = item.originalValue;
        originalValues[item.soDocNo] = item.originalValue; // Update the original value
    } else {
        console.error(`Select element with data-soDocNo="${item.soDocNo}" not found.`);
    }
}

document.getElementById('verifyUser').addEventListener('click', function() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Perform verification logic here (fetch request to FastAPI server)
    verifyUser(username, password);
});

document.addEventListener('click', function(event) {
    if (event.target.classList.contains('remove-button')) {
        const rowIndex = event.target.closest('tr').rowIndex - 1; // Adjust for header row
        removeFromApproveQueue(rowIndex);
    }
});

document.addEventListener('change', function(event) {
    if (event.target.classList.contains('status-select')) {
        const selectElement = event.target;
        const soDocNo = selectElement.getAttribute('data-soDocNo');
        const soDate = selectElement.getAttribute('data-soDate');
        const soCustomer = selectElement.getAttribute('data-soCustomer');
        const salesPerson = selectElement.getAttribute('data-salesPerson');
        const soQuantity = selectElement.getAttribute('data-soQuantity');
        const soAmount = selectElement.getAttribute('data-soAmount');
        const newValue = selectElement.value;
        handleSelectChange(selectElement, soDate, soDocNo, soCustomer, salesPerson, soQuantity, soAmount);
    }
});

document.getElementById('submitApproveQueue').addEventListener('click', function() {
    //submit SOs from the ApproveQueue table to the server to approve them
    submitApproveQueue();
});

function convertStringToJsonObject(str) {
    // Correct the string format to be valid JSON
    const correctedStr = str.replace(/([a-zA-Z0-9_]+):/g, '"$1":');
    // console.log('Corrected String:', correctedStr);

    // Parse the corrected string to JSON
    const jsonObject = JSON.parse(correctedStr);
    return jsonObject;
}

function decryptData(encryptedData) {
    const decodedString = atob(encryptedData);
    return JSON.parse(decodedString);
}

function encryptData(data) {
    const jsonString = JSON.stringify(data);
    return btoa(jsonString);
}

function submitApproveQueue() {

    if (!approveQueue || approveQueue.length == 0) {
        alert('No data selected for Approval');
        return;
    }

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const unit_id = UnitParam;

    if (username && password) {
        fetch(`${api_base_url}/SoApproveStatus`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                unit_id,
                username,
                password,
                approveQueue
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('Approval successfully');
                approveQueue = [];
                renderApproveQueue();
                fetchData(UnitParam,SoParam);
            } else {
                alert(data.detail.split('\n')[0]);
                throw new Error(data.detail);
            }
        })  
        .catch(error => {
            const searchTable = document.getElementById('searchTable');
            if (searchTable) {
                searchTable.remove();
            }

        });
    }
}

function showToast(message) {
    // Create the toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    // Append the toast to the body
    document.body.appendChild(toast);

    // Show the toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100); // Slight delay to trigger the animation

    // Remove the toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 600); // Delay for fade out animation
    }, 3000);
}

// Call the function when the page loads
window.onload = getQueryParams;

TeamsJs.addEventListener('load', function () {
     console.log(TeamsJs);
      microsoftTeams.initialize();
      microsoftTeams.getContext((context) => {
        // You can now use context.userPrincipalName or context.userObjectId
        console.log(context);
        const userEmail = context.userPrincipalName;
        if (userEmail) {
            document.getElementById('user-email').innerText = userEmail;
        }
        // Use the email to fetch user-specific content
      });
});

