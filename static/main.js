//////////////////////
//Side Menu Function//
//////////////////////


const baseUrl = `http://127.0.0.1:5000`; // Base URL for API requests

let userName='';
//const baseUrl = "https://a7cbb3da-2928-4d18-ba75-ea41ce8ad0c5-00-g8eiilou0duk.sisko.replit.dev"; // Base URL for API requests

// Get elements for toggling sidebar and menu button

const menuButton = document.getElementById('menu-button');
const closeButton = document.getElementById('close-button');
const sidebar = document.getElementById('sidebar');

menuButton.addEventListener('click', () => {
    sidebar.classList.add('open');
    menuButton.style.display = 'none'; 
    closeButton.style.display = 'block';
});

// Close the sidebar and switch back the icons when close button is clicked
closeButton.addEventListener('click', () => {
    sidebar.classList.remove('open');
    menuButton.style.display = 'block'; 
    closeButton.style.display = 'none';
});



// Popup functionality
function togglePopup(popupId) {
    console.log(`Toggling popup with ID: ${popupId}`);
    const popup = document.getElementById(popupId);
    console.log(`Popup element: ${popup}`);
    popup.classList.toggle('active');
    console.log(`Popup class list: ${popup.classList}`);
}

// Close popup when clicking outside
document.addEventListener('click', function(event) {
    // Don't handle clicks on menu button or sidebar
    if (
        event.target.closest('#menu-button') || 
        event.target.closest('#sidebar') || 
        event.target.closest('.popup-content') ||  // Prevent closing if clicking inside popup
        event.target.matches('[onclick*="togglePopup"]') ||  // Prevent closing if clicking a toggle button
        event.target.closest('.card')  // Prevent closing when clicking on car cards
    ) {
        return;
    }

    // Close only if clicking outside
    document.querySelectorAll('.popup.active').forEach(popup => {
        popup.classList.remove('active');
    });
});

function handleLogin(event) {
    event.preventDefault(); // Prevent the default form submission
    const email = document.querySelector('input[name="email"]').value;
    const password = document.querySelector('input[name="password"]').value;

    // Perform AJAX request to login
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            'email': email,
            'password': password
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data)
        if (!data.status) {
            document.querySelector('.success-message').textContent = '';
            document.querySelector('.error-message').textContent = data.message;
        } else {
            userName = data.email;
            const welcomeMessageElement = document.querySelector('.welcome-title');
            welcomeMessageElement.textContent = `Welcome, ${userName}!`;
            document.querySelector('.error-message12').textContent = '';
            togglePopup('login-popup'); // Close login popup
            sidebar.classList.remove('open');
            menuButton.style.display = 'block'; 
            closeButton.style.display = 'none';

        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}
//update on each page
document.addEventListener('DOMContentLoaded', function () {
    const welcomeMessageElement = document.querySelector('.welcome-title');
    if (userName) {
        console.log(userName)
        welcomeMessageElement.textContent = `Welcome, ${userName}!`;
      }

    populateModels();
});

function handleSignup(event) {
    event.preventDefault(); // Prevent the default form submission
    const email = document.querySelector('input[name="email_signup"]').value;
    const password = document.querySelector('input[name="password_signup"]').value;
    
    // Perform AJAX request to signup
    fetch('/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            'email': email,
            'password': password
        })
    })
    .then(response => {
      if (!response.ok) {
            return response.json().then(data => {
                // Display error message
                console.log(data);
                document.querySelector('.success-message').textContent = '';
                document.querySelector('.error-message12').textContent = data.message;
            });
        }
        // Handle successful signup
        document.querySelector('.success-message').textContent = "Signup successful! Please log in.";
        document.querySelector('.error-message12').textContent = '';
        document.querySelector('.error-message').textContent = '';
        togglePopup('login-popup'); // Close signup popup and open login popup
        togglePopup('signup-popup'); // Close signup popup

    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function parseCSV(data) {
    const lines = data.split('\n');
    const result = [];
    const headers = lines[0].split(',');

    for (let i = 1; i < lines.length; i++) {
        const obj = {};
        const currentLine = lines[i].split(',');

        for (let j = 0; j < headers.length; j++) {
            obj[headers[j].trim()] = currentLine[j].trim();
        }
        result.push(obj);
    }
    return result;
}

// ✅ New function to update slider values dynamically
function updateSliderValue(id, unit = "", isCurrency = false) {
    const slider = document.getElementById(id);
    const display = document.getElementById(id + "-value");

    if (slider && display) {
        // Display initial value
        if (id === "seating") {
            display.textContent = slider.value + " seats"; // ✅ Always show 'seats'
        } else {
            display.textContent = isCurrency
                ? "₱" + parseInt(slider.value, 10).toLocaleString()
                : slider.value + " " + unit;
        }

        // Update value when slider moves
        slider.addEventListener("input", function () {
            if (id === "seating") {
                display.textContent = slider.value + " seats"; // ✅ Ensures "X seats" is always shown
            } else {
                const value = parseInt(slider.value, 10) || 0; 
                display.textContent = isCurrency
                    ? "₱" + value.toLocaleString()
                    : value + " " + unit;
            }
        });
    }
}


async function applyFilters() {

    console.log("apply filters clicked");

    const brand = document.getElementById("brand").value.trim().toLowerCase();
    const model = document.getElementById("model").value.trim().toLowerCase();
    const bodyType = document.getElementById("body-type").value.trim().toLowerCase();
    const driveTrain = document.getElementById("drive-train").value.trim().toLowerCase();
    const transmission = document.getElementById("transmission").value.trim().toLowerCase();
    const fuelType = document.getElementById("fuel-type").value.trim().toLowerCase(); 
    const minHp = parseFloat(document.getElementById("horsepower").value) || 50;
    const minCargo = parseFloat(document.getElementById("cargo-space").value) || 100;
    const maxPrice = parseFloat(document.getElementById("price").value) || 3000000; // Use slider value as max price
    const minGroundClearance = parseFloat(document.getElementById("ground-clearance").value) || 2;
    const seating = parseInt(document.getElementById("seating").value) || 0;

    console.log("🚀 Filters Applied:");
    console.log("Starting applyFilters function..."); // Added debugging log
    console.log("Brand:", brand);
    console.log("Model:", model);
    console.log("Body Type:", bodyType);
    console.log("Drive Train:", driveTrain);
    console.log("Transmission:", transmission);
    console.log("Fuel Type:", fuelType);
    console.log("Min HP:", minHp);
    console.log("Min Cargo Space:", minCargo);
    console.log("Min Ground Clearance:", minGroundClearance);
    console.log("Min Seating Capacity:", seating);
    console.log("Brand:", brand);
    console.log("Body Type:", bodyType);
    console.log("Drive Train:", driveTrain);
    console.log("Transmission:", transmission);
    console.log("Fuel Type:", fuelType);
    console.log("Min HP:", minHp);
    console.log("Min Cargo Space:", minCargo);
    console.log("Max Price:", maxPrice);
    console.log("Min Ground Clearance:", minGroundClearance);
    console.log("Min Seating Capacity:", seating);

    // Render API Link //
    const url = new URL(`${baseUrl}/get_cars`);//
    
    if (brand) url.searchParams.append("brand", brand.charAt(0).toUpperCase() + brand.slice(1)); // Append brand filter if specified

    if (model) url.searchParams.append("model", model.charAt(0).toUpperCase() + model.slice(1));

    if (bodyType) url.searchParams.append("body_type", bodyType.charAt(0).toUpperCase() + bodyType.slice(1)); // Append body type filter if specified

    if (driveTrain) url.searchParams.append("drive_train", driveTrain.charAt(0).toUpperCase() + driveTrain.slice(1)); // Append drive train filter if specified

    if (transmission) url.searchParams.append("transmission", transmission.charAt(0).toUpperCase() + transmission.slice(1)); // Append transmission filter if specified

    if (fuelType) url.searchParams.append("fuel_type", fuelType.charAt(0).toUpperCase() + fuelType.slice(1)); // Append fuel type filter if specified

    url.searchParams.append("min_hp", minHp);
    url.searchParams.append("min_cargo", minCargo);
    url.searchParams.append("max_price", maxPrice); // Updated to max_price
    url.searchParams.append("min_ground_clearance", minGroundClearance);
    url.searchParams.append("seating", seating);


    console.log("📤 Sending request to:", url.href); // Log the request URL


    try {
    const response = await fetch(url); // Fetch data from the constructed URL

        const data = await response.json();
        console.log("📥 Received data:", data);
        if (data.length === 0) {
            console.warn("⚠️ No cars found for given filters.");
            alert("No matching cars found. Please try different filters.");
        } else {
            displayFilteredCars(data);
        }
    } catch (error) {
        console.error("🚨 Error fetching data:", error);
        alert("An error occurred while fetching data. Please try again later.");
    }
}

function displayFilteredCars(data) {
    console.log("📊 Displaying cars data:", data); // Debugging log


    const resultsFrame = document.getElementById("results-frame");
    const resultsBody = document.getElementById("car-specs");


    // ✅ Check if elements exist
    if (!resultsFrame || !resultsBody) {
        console.error("❌ Results elements not found!"); 
        return;
    }

    // ✅ Ensure the results frame is visible
    resultsFrame.style.display = "block"; // Make results frame visible

    resultsFrame.classList.add("active");

    // ✅ Clear the table body before inserting new data
    resultsBody.innerHTML = "";

    // ✅ Handle case when no results match
    if (data.length === 0) {
        resultsBody.innerHTML = `<tr><td colspan="12" style="text-align: center;">No matching cars found.</td></tr>`;
        console.warn("⚠️ No cars found for given filters.");
        return;
    }

    data.forEach(car => {

        const row = document.createElement("tr");
        row.innerHTML = `
        <td>${car.Brand || "Unknown"}</td>
        <td>${car.Model || "Unknown"}</td>
        <td>${car.Body_Type || "N/A"}</td>
        <td>${car.Variant || "N/A"}</td>
        <td>${car.Drive_Train || "N/A"}</td>
        <td>${car.Engine || "N/A"}</td>
        <td>${car.Horsepower ? car.Horsepower + " hp" : "N/A"}</td>
        <td>${car.Transmission || "N/A"}</td>
        <td>${car.Fuel_Type || "N/A"}</td>
        <td>${car.Ground_Clearance ? car.Ground_Clearance + " cm" : "N/A"}</td>
        <td>${car.Cargo_space ? car.Cargo_space + " L" : "N/A"}</td>
        <td>${car.Seating_Capacity ? car.Seating_Capacity + " seats" : "N/A"}</td>
        <td>${car.Price ? "₱" + car.Price.toLocaleString() : "N/A"}</td>
        <td>
            <div class="heart-container">
                <i class="fa-regular fa-heart" id="like-icon" onclick="addToFave(event, '${car.Variant}')"></i>
            </div>
        </td>
    `;
        resultsBody.appendChild(row);
    });


    console.log("✅ Table updated successfully!");
}

////////////////////////////////////
//When Filter is button is Pressed//
//////////////////////////////////////


document.addEventListener("DOMContentLoaded", function () {
    loadFavorites(); // Call loadFavorites to populate favorites on page load

    const filterButton = document.getElementById("filter-btn"); 
    const resultsFrame = document.querySelector(".results-frame");

    // Ensure sliders start at minimum values
    const priceSlider = document.getElementById("price");
    const horsepowerSlider = document.getElementById("horsepower");
    const seatingSlider = document.getElementById("seating");

    priceSlider.value = priceSlider.max;
    horsepowerSlider.value = horsepowerSlider.min;
    seatingSlider.value = "0";

    // Update displayed values to match the min values
    updateSliderValue("price", "₱", true);
    updateSliderValue("horsepower", "HP", false);
    updateSliderValue("seating", "seats", false);

});


//////////////////////
// COMPARE Function //
//////////////////////

// Function to populate models based on selected brand
async function populateModels() {
    const brand = document.getElementById('brand').value;
    if (!brand) return;

    const response = await fetch(`${baseUrl}/get_models?brand=${brand}`);
    const models = await response.json();
    
    const modelDropdown = document.getElementById('model');
    modelDropdown.innerHTML = '<option value="">Select Model</option>';
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelDropdown.appendChild(option);
    });
}

// Function to populate variants based on selected model
async function populateVariants() {
    const model = document.getElementById('model').value;
    if (!model) return;

    const response = await fetch(`${baseUrl}/get_variants?model=${model}`);
    const variants = await response.json();
    
    const variantDropdown = document.getElementById('variant');
    variantDropdown.innerHTML = '<option value="">Select Variant</option>';
    variants.forEach(variant => {
        const option = document.createElement('option');
        option.value = variant;
        option.textContent = variant;
        variantDropdown.appendChild(option);
    });
}

// Ensure event listeners are added to dropdowns
document.getElementById('brand').addEventListener('change', populateModels);
document.getElementById('model').addEventListener('change', populateVariants);

// Compare Cars Function
async function compareCars() {
    const selectedVariant = document.getElementById('variant').value;
    if (!selectedVariant) {
        console.warn("No variant selected.");
        return;
    }

    console.log("Fetching specs for variant:", selectedVariant);
    const response = await fetch(`${baseUrl}/get_specs?variant=${selectedVariant}`);
    const specs = await response.json();

    if (Object.keys(specs).length === 0) {
        alert('No specifications found for this variant.');
        return;
    }

    const container = document.getElementById('comparison-container');

    if (document.getElementById(`car-${selectedVariant}`)) {
        alert(`${selectedVariant} is already in the comparison.`);
        return;
    }

    const carColumn = document.createElement('div');
    carColumn.id = `car-${selectedVariant}`;
    carColumn.classList.add('car-column');

    const carTitle = document.createElement('div');
    carTitle.classList.add('car-title');
    carTitle.textContent = selectedVariant;
    carColumn.appendChild(carTitle);

    if (specs['Image']) {
        const imgContainer = document.createElement('div');
        imgContainer.classList.add('car-image-container');

        const img = document.createElement('img');
        img.src = specs['Image'];
        img.alt = `Image of ${selectedVariant}`;
        img.classList.add('car-image');

        imgContainer.appendChild(img);
        carColumn.appendChild(imgContainer);
    }

    const specOrder = {
        "General Specifications": ["Brand", "Model", "BodyType, Variant"],
        "Performance Specifications": ["Horsepower", "Engine", "Transmission", "DriveTrain", "FuelType"],
        "Utility Specifications": ["SeatingCapacity", "GroundClearance", "Cargospace"],
        "Price": []
    };

    // Iterate through the spec categories and their keys
    for (const [category, keys] of Object.entries(specOrder)) {
        if (keys.length > 0) {
            const categoryTitle = document.createElement('div');
            categoryTitle.classList.add('spec-value', 'spec-label');
            categoryTitle.textContent = category;
            carColumn.appendChild(categoryTitle);
        }

        keys.forEach(key => {
            if (specs[key] !== undefined) {
                const specDiv = document.createElement('div');
                specDiv.classList.add('spec-value');
                let formattedValue = specs[key];
                
                // Formatting for specific specs
                if (key === "Horsepower") formattedValue += " hp";
                if (key === "Ground Clearance") formattedValue += " cm";
                if (key === "Cargo Space") formattedValue += " L";
                
                // Add the formatted spec to the car column
                specDiv.innerHTML = `<span class="spec-label">${key}:</span> ${formattedValue}`;
                carColumn.appendChild(specDiv);
            }
        });
    }

    // Price formatting and addition
    if (specs["Price"]) {
        const priceDiv = document.createElement('div');
        priceDiv.classList.add('spec-value');
        const formattedPrice = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(specs["Price"]);
        priceDiv.innerHTML = `<span class="spec-label">Price:</span> ${formattedPrice}`;
        carColumn.appendChild(priceDiv);
    }

    // Add the remove button for the car
    const removeBtn = document.createElement('button');
    removeBtn.classList.add('remove-btn');
    removeBtn.textContent = "Remove Car";
    removeBtn.onclick = () => carColumn.remove();

    carColumn.appendChild(removeBtn);
    container.appendChild(carColumn);
}


async function populateModels() {
    const selectedBrand = document.getElementById('brand').value;
    const modelSelect = document.getElementById('model');

    if (!selectedBrand) {
        // If no brand is selected, fetch all models
        const response = await fetch(`${baseUrl}/get_all_models`);
        const models = await response.json();
        modelSelect.innerHTML = '<option value="">Select Model</option>'; // Reset models
        models.forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model;
          modelSelect.appendChild(option);
        });
    } else {
        // If a brand is selected, fetch models for that brand
        const response = await fetch(`${baseUrl}/get_models?brand=${selectedBrand}`);
        const models = await response.json();
        modelSelect.innerHTML = '<option value="">Select Model</option>'; // Reset models
        models.forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model;
          modelSelect.appendChild(option);
        });
    }
}

async function populateVariants() {
    const selectedModel = document.getElementById('model').value;
    if (!selectedModel) return; // Exit if no model is selected

    const response = await fetch(`${baseUrl}/get_variants?model=${selectedModel}`);

    const variants = await response.json();
    
    const variantSelect = document.getElementById('variant');
    variantSelect.innerHTML = '<option value="">Select Variant</option>'; // Reset models

    variants.forEach(variant => {
        const option = document.createElement('option');
        option.value = variant;
        option.textContent = variant;
        variantSelect.appendChild(option);
    });
}


///////////////////////
//FAVOURITES Function//
///////////////////////
async function addToFave(event, variant) {

    const isLiked = event.target.classList.contains('fa-solid');
    const likedStatus = !isLiked;

    const response = await fetch(`${baseUrl}/toggle-fave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant: variant, liked: likedStatus })
    });
    
    const data = await response.json();
    console.log(data);
    if (data.liked) {
        // Change to solid icon
        event.target.classList.toggle('fa-solid');
    } else {
        // Change to outline icon
        event.target.classList.toggle('fa-solid');
    }

}
async function loadFavorites() {
    console.log("function favorites is running")

    const response = await fetch(`${baseUrl}/get-faves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    });
    const favorites = await response.json();
    const favoritesList = document.getElementById("favorites-items");
    favoritesList.innerHTML = ""; // Clear existing items

    for (const car of favorites) {
        const variantResponse = await fetch(`${baseUrl}/get_specs?variant=${car.variant}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });
        const variantData = await variantResponse.json();

        const cardContainer = document.getElementById("card-container");

        const card = document.createElement("div");
        card.classList.add("card");

        card.innerHTML = `
            <img src="${variantData.Image}" alt="${variantData.Model}">
            <div class="name">${variantData.Brand} ${variantData.Model}</div>
        `;

        card.addEventListener("click", function () {
            console.log("Card clicked - Populating popup");
            console.log(variantData);
            // Populate the popup with the selected car's details
            document.querySelector(".car-title").textContent = `${variantData.Brand} ${variantData.Model}`;
            document.querySelector(".img-fave-frame img").src = variantData.Image;
            document.querySelector(".spec-fave-frame .spec-card-container").innerHTML = `
                <div class="spec-card"><strong class="spec-label">Brand</strong><br><span class="spec-value">${variantData.Brand}</span></div>
                <div class="spec-card"><strong class="spec-label">Model</strong><br><span class="spec-value">${variantData.Model}</span></div>
                <div class="spec-card"><strong class="spec-label">Body Type</strong><br><span class="spec-value">${variantData.BodyType}</span></div>
                <div class="spec-card"><strong class="spec-label">Variant</strong><br><span class="spec-value">${car.Variant}</span></div>
                <div class="spec-card"><strong class="spec-label">Drive Train</strong><br><span class="spec-value">${variantData.DriveTrain}</span></div>
                <div class="spec-card"><strong class="spec-label">Engine</strong><br><span class="spec-value">${variantData.Engine}</span></div>
                <div class="spec-card"><strong class="spec-label">Horsepower</strong><br><span class="spec-value">${variantData.Horsepower}</span></div>
                <div class="spec-card"><strong class="spec-label">Transmission</strong><br><span class="spec-value">${variantData.Transmission}</span></div>
                <div class="spec-card"><strong class="spec-label">Fuel Type</strong><br><span class="spec-value">${variantData.FuelType}</span></div>
                <div class="spec-card"><strong class="spec-label">Ground Clearance</strong><br><span class="spec-value">${variantData.GroundClearance}</span></div>
                <div class="spec-card"><strong class="spec-label">Cargo Space</strong><br><span class="spec-value">${variantData.CargoSpace}</span></div>
                <div class="spec-card"><strong class="spec-label">Seating Capacity</strong><br><span class="spec-value">${variantData.SeatingCapacity}</span></div>
                <div class="spec-card"><strong class="spec-label">Price</strong><br><span class="spec-value">${variantData.Price}</span></div>
            `;

            populateColors(variantData.Model);

            // Open the popup
            togglePopup("card-popup");

        });

        cardContainer.appendChild(card);
        
    }
}

async function populateColors(model) {
    const selectedModel = model;
    if (!selectedModel) return; // Exit if no model is selected
    console.log(model);
    const response = await fetch(`${baseUrl}/get_colors?model=${selectedModel}`);

    const colors = await response.json();

    console.log(colors);

    const colorSelect = document.querySelector('.variant-dropdown');
    colorSelect.innerHTML = '<option value="">Select Color</option>'; // Reset colors

    colors.forEach(color => {
        const option = document.createElement('option');
        option.value = color.color;
        option.textContent = color.color;
        option.dataset.imagePath = color.image_path;
        colorSelect.appendChild(option);
    });

    colorSelect.addEventListener('change', (e) => {
        const selectedColor = e.target.value;
        const selectedOption = colorSelect.querySelector(`option[value="${selectedColor}"]`);
        const imageUrl = selectedOption.dataset.imagePath;
        document.querySelector(".img-fave-frame img").src = imageUrl;
    });
}

function printPopup() {
    const printContent = document.getElementById("printable-popup").innerHTML;
    const originalContent = document.body.innerHTML;

    // Create a new iframe to hold the print content
    const iframe = document.createElement('iframe');
    iframe.style.visibility = 'hidden';
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';

    // Add the iframe to the body
    document.body.appendChild(iframe);

    // Add the print content to the iframe
    iframe.contentWindow.document.body.innerHTML = `
        <html>
            <head>
                <link rel="stylesheet" href="style.css"> <!-- Link to your stylesheet file -->
            </head>
            <body>
                ${printContent}
            </body>
        </html>
    `;

    // Print the iframe content
    iframe.contentWindow.print();

    // Remove the iframe
    document.body.removeChild(iframe);

    // Restore the original content
    document.body.innerHTML = originalContent;
    location.reload(); // Reload to restore event listeners
}
