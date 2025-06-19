////////////////////////
//Global Functionality//
///////////////////////


const isLocalhost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const baseUrl = isLocalhost ? 'http://127.0.0.1:8000' : window.location.origin;
//const baseUrl = "https://a7cbb3da-2928-4d18-ba75-ea41ce8ad0c5-00-g8eiilou0duk.sisko.replit.dev"; // Base URL for API requests

// Firebase initialization 
let auth; // Global auth object
let userName = null; // Keep your existing userName variable
let currentCarData = []; // Global variable to store current car data for sorting
let defaultCarsLoaded = false;


//////////////////////
//Side Menu Function//
//////////////////////

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
    if (!event.target.closest('.profile-container')) {
        const dropdown = document.getElementById('logout-dropdown');
        if (dropdown) dropdown.style.display = 'none';
    }
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

/////////////////////////
//Firebase Related Code//
////////////////////////

// Initialize Firebase when the page loads
async function initializeFirebase() {
    try {
        // Get Firebase config from your Python backend
        const response = await fetch('/firebase-config');
        const firebaseConfig = await response.json();
        
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        
        // Monitor authentication state
        auth.onAuthStateChanged((user) => {
            if (user) {
                userName = user.email;

                // Update welcome message
                const welcomeText = document.getElementById('welcome-text');
                if (welcomeText) welcomeText.textContent = `Welcome, ${userName}`;

                // Hide login button, show profile pic/icon container
                const loginBtn = document.getElementById('login-button');
                const profileContainer = document.getElementById('profile-container');
                if (loginBtn) loginBtn.style.display = 'none';
                if (profileContainer) profileContainer.style.display = 'block';

                // 🌟 Begin: Profile image vs icon logic
                const profilePic = document.getElementById('profile-pic');      // <img>
                const profileIcon = document.getElementById('profile-icon');    // <i>

                if (user.photoURL) {
                    // User has uploaded a real photo
                    if (profileIcon) profileIcon.style.display = 'none';
                    if (profilePic) {
                    profilePic.src = user.photoURL;
                    profilePic.style.display = 'block';
                    }
                    else {
                        profilePic.src = user.photoURL;
                        profilePic.style.display = 'block';
                    }
                } else {
                    // No profile photo uploaded – show default icon
                    if (profileIcon) profileIcon.style.display = 'inline-block';
                    if (profilePic) profilePic.style.display = 'none';
                }
                // 🌟 End: Profile image vs icon logic

                console.log('User is signed in:', user.email);
            } else {
                userName = null;

                const welcomeText = document.getElementById('welcome-text');
                if (welcomeText) welcomeText.textContent = 'Welcome!';

                const loginBtn = document.getElementById('login-button');
                const profileContainer = document.getElementById('profile-container');
                if (loginBtn) loginBtn.style.display = 'block';
                if (profileContainer) profileContainer.style.display = 'none';

                console.log('User is signed out');
            }
        });
        
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization failed:', error);
    }
}

///////////////////////////////////////
//Denies access to users to the User //
// Profile Page, unless signed in    //
///////////////////////////////////////

function handleUserIconClick() {
    if (userName) {
        window.location.href = '/profile';
    } else {
        togglePopup('login-popup');
    }
}

function toggleLogoutDropdown() {
    const dropdown = document.getElementById('logout-dropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

function handleLogout() {
    if (auth) {
        auth.signOut().then(() => {
            console.log('User signed out from Firebase');

            // Tell the backend to remove session cookie
            fetch('/logout', { method: 'POST' })
                .then(() => {
                    const dropdown = document.getElementById('logout-dropdown');
                    if (dropdown) dropdown.style.display = 'none';
                    location.reload(); // Refresh UI
                })
                .catch(error => console.error('Logout error:', error));
        });
    }
}

////////////////////
//Sing Up Function//
////////////////////

function handleSignup(event) {
    event.preventDefault();
    const email = document.querySelector('input[name="email_signup"]').value;
    const password = document.querySelector('input[name="password_signup"]').value;
    
    if (!auth) {
        console.error('Firebase not initialized');
        return;
    }
    
    // Use Firebase client-side authentication
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // User signed up successfully
            const user = userCredential.user;
            console.log('User signed up:', user.email);
            
            // Display success message
            document.querySelector('.success-message').textContent = "Signup successful! Please log in.";
            document.querySelector('.error-message12').textContent = '';
            document.querySelector('.error-message').textContent = '';
            
            // Close signup popup and show login (keep your existing UI logic)
            togglePopup('signup-popup');
            togglePopup('login-popup');
        })
        .catch((error) => {
            console.error('Signup error:', error);
            document.querySelector('.success-message').textContent = '';
            document.querySelector('.error-message12').textContent = getFirebaseErrorMessage(error.code);
        });
}

///////////////////
//Login  Function//
////////s//////////
function handleLogin(event) {
    event.preventDefault();
    const email = document.querySelector('input[name="email"]').value;
    const password = document.querySelector('input[name="password"]').value;
    
    if (!auth) {
        console.error('Firebase not initialized');
        return;
    }
    
    // Use Firebase client-side authentication
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // User logged in successfully
            const user = userCredential.user;
            console.log('User logged in:', user.email);
            
            // Get the ID token and send to your backend for session creation
            user.getIdToken().then((idToken) => {
                return fetch('/verify-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        idToken: idToken,
                        email: user.email
                    })
                });
            }).then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // Update UI (keep your existing UI logic)
                    userName = user.email;
                    const welcomeMessageElement = document.querySelector('.welcome-title');
                    welcomeMessageElement.textContent = `Welcome, ${userName}!`;
                    document.querySelector('.error-message12').textContent = '';
                    document.querySelector('.error-message').textContent = '';
                    togglePopup('login-popup');
                    sidebar.classList.remove('open');
                    menuButton.style.display = 'block'; 
                    closeButton.style.display = 'none';
                }
            });
        })
        .catch((error) => {
            console.error('Login error:', error);
            document.querySelector('.success-message').textContent = '';
            document.querySelector('.error-message').textContent = getFirebaseErrorMessage(error.code);
        });
}

// Helper function for user-friendly error messages
function getFirebaseErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/user-not-found':
            return 'No account found with this email address.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/email-already-in-use':
            return 'Email address already in use.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/invalid-email':
            return 'Invalid email address.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        default:
            return 'Authentication failed. Please try again.';
    }
}

/////////////////////////
//Formats the CSV file //
//data to be readable  //
////////////////////////
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

//////////////////////
//Filtering Function//
//////////////////////

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
    const maxPrice = parseFloat(document.getElementById("price").value) || 3000000;
    const minGroundClearance = parseFloat(document.getElementById("ground-clearance").value) || 2;
    const seating = parseInt(document.getElementById("seating").value) || 0;

    console.log("🚀 Filters Applied:");
    console.log("Brand:", brand);
    console.log("Model:", model);
    console.log("Body Type:", bodyType);
    console.log("Drive Train:", driveTrain);
    console.log("Transmission:", transmission);
    console.log("Fuel Type:", fuelType);
    console.log("Min HP:", minHp);
    console.log("Min Cargo Space:", minCargo);
    console.log("Max Price:", maxPrice);
    console.log("Min Ground Clearance:", minGroundClearance);
    console.log("Min Seating Capacity:", seating);

    // Check if any filters are applied (not default values)
    const hasFilters = brand || model || bodyType || driveTrain || transmission || fuelType || 
                      minHp > 50 || minCargo > 100 || maxPrice < 3000000 || 
                      minGroundClearance > 2 || seating > 0;

    // If no filters are applied, load default cars
    if (!hasFilters) {
        console.log("No filters applied, loading default cars");
        loadDefaultCars();
        return;
    }

    // Render API Link with filters
    const url = new URL(`${baseUrl}/get_cars`);
    
    if (brand) url.searchParams.append("brand", brand.charAt(0).toUpperCase() + brand.slice(1));
    if (model) url.searchParams.append("model", model.charAt(0).toUpperCase() + model.slice(1));
    if (bodyType) url.searchParams.append("body_type", bodyType.charAt(0).toUpperCase() + bodyType.slice(1));
    if (driveTrain) url.searchParams.append("drive_train", driveTrain.charAt(0).toUpperCase() + driveTrain.slice(1));
    if (transmission) url.searchParams.append("transmission", transmission.charAt(0).toUpperCase() + transmission.slice(1));
    if (fuelType) url.searchParams.append("fuel_type", fuelType.charAt(0).toUpperCase() + fuelType.slice(1));

    url.searchParams.append("min_hp", minHp);
    url.searchParams.append("min_cargo", minCargo);
    url.searchParams.append("max_price", maxPrice);
    url.searchParams.append("min_ground_clearance", minGroundClearance);
    url.searchParams.append("seating", seating);

    console.log("📤 Sending request to:", url.href);

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("📥 Received data:", data);
        
        if (data.length === 0) {
            console.warn("⚠️ No cars found for given filters.");
            alert("No matching cars found. Please try different filters.");
        } else {
            displayFilteredCars(data);
            defaultCarsLoaded = true; // Set flag to true after any successful data load
        }
    } catch (error) {
        console.error("🚨 Error fetching data:", error);
        alert("An error occurred while fetching data. Please try again later.");
    }
}

//////////////////////////////// 
//Shows the filtered Results //
//////////////////////////////

function displayFilteredCars(data) {
    console.log("📊 Displaying cars data:", data);

    // ✅ NEW: Store the data globally for sorting
    currentCarData = data;

    const resultsFrame = document.getElementById("results-frame");
    const resultsBody = document.getElementById("car-specs");

    // ✅ Check if elements exist
    if (!resultsFrame || !resultsBody) {
        console.error("❌ Results elements not found!"); 
        return;
    }

    // ✅ Ensure the results frame is visible
    resultsFrame.style.display = "block";
    resultsFrame.classList.add("active");

    // ✅ Clear the table body before inserting new data
    resultsBody.innerHTML = "";

    // ✅ Handle case when no results match
    if (data.length === 0) {
        resultsBody.innerHTML = `<tr><td colspan="14" style="text-align: center;">No matching cars found.</td></tr>`;
        console.warn("⚠️ No cars found for given filters.");
        return;
    }

    data.forEach(car => {
        const row = document.createElement("tr");
        
        // Get the fuel type icon
        const fuelTypeIcon = getFuelTypeIcon(car.Fuel_Type);
        
        row.innerHTML = `
        <td>${car.Brand || "Unknown"}</td>
        <td>${car.Model || "Unknown"}</td>
        <td>${car.Body_Type || "N/A"}</td>
        <td>${car.Variant || "N/A"}</td>
        <td>${car.Drive_Train || "N/A"}</td>
        <td>${car.Engine || "N/A"}</td>
        <td>${car.Horsepower ? car.Horsepower + " hp" : "N/A"}</td>
        <td>${car.Transmission || "N/A"}</td>
        <td>
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 15px;">
                <span style="flex: 1; text-align: center;">${car.Fuel_Type || "N/A"}</span>
                <span style="width: 20px; display: flex; justify-content: center;">
                    ${fuelTypeIcon}
                </span>
            </div>
        </td>
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

/////////////////////////////////
//Adds corresponding Icon to  // 
// the appropriate Car Type  //
//////////////////////////////

function getFuelTypeIcon(fuelType) {
    if (!fuelType || fuelType === "N/A") return "";
    
    const fuelTypeLower = fuelType.toLowerCase();
    
    // Check for hybrid FIRST (priority order matters!)
    if (fuelTypeLower.includes('hybrid')) {
        return '<i class="fa-solid fa-recycle" style="color: #6ca966;"></i>';
    } else if (fuelTypeLower.includes('electric')) {
        return '<i class="fa-solid fa-bolt" style="color: #b49b66;"></i>';
    } else if (fuelTypeLower.includes('diesel')) {
        return '<i class="fa-solid fa-oil-can" style="color: #5e5e5e;"></i>';
    } else if (fuelTypeLower.includes('gas') || fuelTypeLower.includes('gasoline')) {
        return '<i class="fa-solid fa-gas-pump" style="color: #a63e1a;"></i>';
    } else {
        return ""; // No icon for unknown fuel types
    }
}

//////////////////////////////////////
//When Filter is button is Pressed //
////////////////////////////////////


document.addEventListener("DOMContentLoaded", function () {
    loadFavorites(); // Call loadFavorites to populate favorites on page load

    initializeFirebase();

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

function toggleDropdown() {
    const dropdown = document.getElementById("sortDropdown");
    dropdown.classList.toggle("open");
}

// Optional: close if clicking outside
window.addEventListener("click", function (e) {
    const dropdown = document.getElementById("sortDropdown");
    
    // Close dropdown if clicking outside of it
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove("open");
    }
});

function sortBy(type) {
    console.log("Sorting by:", type);
    
    if (currentCarData.length === 0) {
        console.warn("No data to sort");
        return;
    }

    let sortedData = [...currentCarData]; // Create a copy to avoid mutating original data

    switch (type) {
        case 'price-asc':
            sortedData.sort((a, b) => {
                const priceA = parseFloat(a.Price) || 0;
                const priceB = parseFloat(b.Price) || 0;
                return priceA - priceB;
            });
            break;
        
        case 'price-desc':
            sortedData.sort((a, b) => {
                const priceA = parseFloat(a.Price) || 0;
                const priceB = parseFloat(b.Price) || 0;
                return priceB - priceA;
            });
            break;
        
        case 'horsepower-asc':
            sortedData.sort((a, b) => {
                const hpA = parseFloat(a.Horsepower) || 0;
                const hpB = parseFloat(b.Horsepower) || 0;
                return hpA - hpB;
            });
            break;
        
        case 'horsepower-desc':
            sortedData.sort((a, b) => {
                const hpA = parseFloat(a.Horsepower) || 0;
                const hpB = parseFloat(b.Horsepower) || 0;
                return hpB - hpA;
            });
            break;
        
        // NEW: Cargo Space sorting options
        case 'cargo-asc':
            sortedData.sort((a, b) => {
                const cargoA = parseFloat(a.Cargo_space) || 0;
                const cargoB = parseFloat(b.Cargo_space) || 0;
                return cargoA - cargoB;
            });
            break;
        
        case 'cargo-desc':
            sortedData.sort((a, b) => {
                const cargoA = parseFloat(a.Cargo_space) || 0;
                const cargoB = parseFloat(b.Cargo_space) || 0;
                return cargoB - cargoA;
            });
            break;
        
        // NEW: Seating Capacity sorting options
        case 'seating-asc':
            sortedData.sort((a, b) => {
                const seatingA = parseInt(a.Seating_Capacity) || 0;
                const seatingB = parseInt(b.Seating_Capacity) || 0;
                return seatingA - seatingB;
            });
            break;
        
        case 'seating-desc':
            sortedData.sort((a, b) => {
                const seatingA = parseInt(a.Seating_Capacity) || 0;
                const seatingB = parseInt(b.Seating_Capacity) || 0;
                return seatingB - seatingA;
            });
            break;
        
        default:
            console.warn("Unknown sort type:", type);
            return;
    }

    // Update the display with sorted data
    displayFilteredCars(sortedData);
    
    // Close the dropdown after sorting
    const dropdown = document.getElementById("sortDropdown");
    dropdown.classList.remove("open");
} 

///////////////////////////
//reset Filter Function //
/////////////////////////

function refreshResults() {
    console.log("Refreshing results...");
    
    // Add visual feedback - rotate animation
    const refreshIcon = document.querySelector('.refresh-icon');
    refreshIcon.style.transform = 'rotate(360deg)';
    
    // Reset the rotation after animation
    setTimeout(() => {
        refreshIcon.style.transform = 'rotate(0deg)';
    }, 550);
    
    // Clear current results and reset filters
    currentCarData = [];
    const resultsBody = document.getElementById("car-specs");
    if (resultsBody) {
        resultsBody.innerHTML = "";
    }
    
    // Hide results frame
    const resultsFrame = document.getElementById("results-frame");
    if (resultsFrame) {
        resultsFrame.style.display = "none";
        resultsFrame.classList.remove("active");
    }
    
    // Reset all filter inputs to their default values
    resetAllFilters();
    
    console.log("Results refreshed and filters reset!");
}

// Helper function to reset all filters
function resetAllFilters() {
    // Reset dropdowns
    document.getElementById("brand").value = "";
    document.getElementById("model").value = "";
    document.getElementById("body-type").value = "";
    document.getElementById("drive-train").value = "";
    document.getElementById("transmission").value = "";
    document.getElementById("fuel-type").value = "";
    
    // Reset sliders to their initial values
    const priceSlider = document.getElementById("price");
    const horsepowerSlider = document.getElementById("horsepower");
    const seatingSlider = document.getElementById("seating");
    const cargoSlider = document.getElementById("cargo-space");
    const groundClearanceSlider = document.getElementById("ground-clearance");
    
    if (priceSlider) priceSlider.value = priceSlider.max;
    if (horsepowerSlider) horsepowerSlider.value = horsepowerSlider.min;
    if (seatingSlider) seatingSlider.value = "0";
    if (cargoSlider) cargoSlider.value = cargoSlider.min;
    if (groundClearanceSlider) groundClearanceSlider.value = groundClearanceSlider.min;
    
    // Update slider display values
    updateSliderValue("price", "", true);
    updateSliderValue("horsepower", "HP", false);
    updateSliderValue("seating", "seats", false);
    updateSliderValue("cargo-space", "L", false);
    updateSliderValue("ground-clearance", "cm", false);
}

function refreshResults() {
    console.log("Refreshing results...");
    
    // Add visual feedback - rotate animation
    const refreshIcon = document.querySelector('.refresh-icon');
    if (refreshIcon) {
        refreshIcon.style.transform = 'rotate(360deg)';
        
        // Reset the rotation after animation
        setTimeout(() => {
            refreshIcon.style.transform = 'rotate(0deg)';
        }, 550);
    }
    
    // Reset all filter inputs to their default values
    resetAllFilters();
    
    // If default cars haven't been loaded yet, just reset filters and return
    if (!defaultCarsLoaded) {
        console.log("No default cars loaded yet, just resetting filters");
        return;
    }
    
    // If default cars have been loaded, show all cars again
    console.log("Loading default car list...");
    loadDefaultCars();
}

// New function to load all cars by default
async function loadDefaultCars() {
    console.log("Loading default cars...");
    
    try {
        // Fetch all cars without any filters
        const response = await fetch(`${baseUrl}/get_cars`);
        const data = await response.json();
        
        console.log("📥 Received default data:", data);
        
        if (data.length === 0) {
            console.warn("⚠️ No cars found in database.");
            alert("No cars available in the database.");
        } else {
            displayFilteredCars(data);
            defaultCarsLoaded = true; // Set flag to true after loading default cars
        }
    } catch (error) {
        console.error("🚨 Error fetching default cars:", error);
        alert("An error occurred while fetching cars. Please try again later.");
    }
}

///////////////////////
// COMPARE Function //
/////////////////////

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

//////////////////////////////////
// Shows corresponding models  //
// when a specific brand is   //
// selected by the user      //
//////////////////////////////

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

///////////////////////////////////////////
// Shows the corresponding variants     //
// when a specific model is selected   //
// by the user                        //
///////////////////////////////////////

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


////////////////////////
//FAVOURITES Function//
//////////////////////
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

/////////////////////
//Loads the users // 
// Favorite cars //
//////////////////

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

//////////////////////////////
//Allows users to change   //
// the color of the car   //
// image being displayed //
//////////////////////////

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

////////////////////////////////
//Allows users to print      //
// or save the favorite     //
// car specs as a pdf copy //
////////////////////////////

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

//////////////////////
//PRICE CALCULATOR  //
//////////////////////

// Precision helper function to handle floating point arithmetic
function preciseCalculation(callback) {
    // Use higher precision for financial calculations
    const originalToFixed = Number.prototype.toFixed;
    try {
        return callback();
    } finally {
        Number.prototype.toFixed = originalToFixed;
    }
}

// More precise loan calculation with proper rounding
function calculatePresentValue(monthlyPayment, monthlyRate, numPayments) {
    if (monthlyRate === 0) {
        return monthlyPayment * numPayments;
    }
    
    // Use more precise calculation with proper decimal handling
    const factor = Math.pow(1 + monthlyRate, -numPayments);
    const numerator = 1 - factor;
    const denominator = monthlyRate;
    
    return monthlyPayment * (numerator / denominator);
}

// Price Calculator Function with Enhanced Precision
function calculateAffordability() {
    console.log("Calculating affordability with enhanced precision...");
    
    // Get input values
    const monthlyIncome = parseFloat(document.getElementById("monthly-income").value) || 0;
    const totalSavings = parseFloat(document.getElementById("total-savings").value) || 0;
    const downPaymentPercent = parseFloat(document.getElementById("down-payment").value) || 20;
    const interestRate = parseFloat(document.getElementById("interest-rate").value) || 6.5;
    const loanTermYears = parseInt(document.getElementById("loan-term").value) || 5;
    const incomeRatio = parseFloat(document.getElementById("income-ratio").value) || 30;
    
    console.log("Input values:", {
        monthlyIncome,
        totalSavings,
        downPaymentPercent,
        interestRate,
        loanTermYears,
        incomeRatio
    });
    
    // Validation
    if (monthlyIncome <= 0 && totalSavings <= 0) {
        alert("Please enter either your monthly income or total savings.");
        return;
    }
    
    let maxCarPrice = 0;
    let calculationMethod = "";
    let loanBasedPrice = 0;
    let savingsBasedPrice = 0;
    let calculationDetails = {};
    
    // Method 1: Based on Monthly Income (Loan Calculation) - ENHANCED PRECISION
    if (monthlyIncome > 0) {
        const maxMonthlyPayment = (monthlyIncome * incomeRatio) / 100;
        
        // Convert annual rate to precise monthly rate
        const monthlyInterestRate = (interestRate / 100) / 12;
        const totalPayments = loanTermYears * 12;
        
        // Calculate maximum loan amount using enhanced precision
        let maxLoanAmount = 0;
        
        if (monthlyInterestRate > 0) {
            // Use the more precise calculation
            maxLoanAmount = calculatePresentValue(maxMonthlyPayment, monthlyInterestRate, totalPayments);
        } else {
            // If interest rate is 0
            maxLoanAmount = maxMonthlyPayment * totalPayments;
        }
        
        // Calculate total car price (loan + down payment)
        // If loan amount is L and down payment is D%, then:
        // Total Price = Loan Amount / (1 - Down Payment %)
        const downPaymentDecimal = downPaymentPercent / 100;
        loanBasedPrice = maxLoanAmount / (1 - downPaymentDecimal);
        
        // Store detailed calculation info
        calculationDetails.income = {
            maxMonthlyPayment: Math.round(maxMonthlyPayment * 100) / 100,
            monthlyInterestRate: monthlyInterestRate,
            totalPayments: totalPayments,
            maxLoanAmount: Math.round(maxLoanAmount * 100) / 100,
            downPaymentAmount: Math.round((loanBasedPrice * downPaymentDecimal) * 100) / 100,
            totalCarPrice: Math.round(loanBasedPrice * 100) / 100
        };
        
        console.log("Enhanced loan calculation:", calculationDetails.income);
    }
    
    // Method 2: Based on Total Savings
    if (totalSavings > 0) {
        if (monthlyIncome > 0) {
            // If both income and savings are provided, savings can be used as down payment
            // Calculate max car price where savings covers the down payment
            savingsBasedPrice = totalSavings / (downPaymentPercent / 100);
            
            calculationDetails.savings = {
                totalSavings: totalSavings,
                downPaymentPercent: downPaymentPercent,
                maxCarPrice: Math.round(savingsBasedPrice * 100) / 100
            };
            
            console.log("Savings calculation (with financing):", calculationDetails.savings);
        } else {
            // If only savings provided, assume cash purchase
            savingsBasedPrice = totalSavings;
            
            calculationDetails.savings = {
                totalSavings: totalSavings,
                paymentMethod: "cash",
                maxCarPrice: savingsBasedPrice
            };
            
            console.log("Savings calculation (cash only):", calculationDetails.savings);
        }
    }
    
    // Determine final max car price and method - using rounded values for comparison
    const roundedLoanPrice = Math.round(loanBasedPrice * 100) / 100;
    const roundedSavingsPrice = Math.round(savingsBasedPrice * 100) / 100;
    
    if (roundedLoanPrice > 0 && roundedSavingsPrice > 0) {
        // Both methods available - use the more restrictive (lower) one
        if (roundedSavingsPrice <= roundedLoanPrice) {
            maxCarPrice = roundedSavingsPrice;
            calculationMethod = "savings_limited";
        } else {
            maxCarPrice = roundedLoanPrice;
            calculationMethod = "loan";
        }
    } else if (roundedLoanPrice > 0) {
        maxCarPrice = roundedLoanPrice;
        calculationMethod = "loan";
    } else if (roundedSavingsPrice > 0) {
        maxCarPrice = roundedSavingsPrice;
        calculationMethod = monthlyIncome > 0 ? "savings_limited" : "cash";
    }
    
    console.log("Final precise calculation:", {
        loanBasedPrice: roundedLoanPrice,
        savingsBasedPrice: roundedSavingsPrice,
        maxCarPrice: maxCarPrice,
        calculationMethod: calculationMethod,
        details: calculationDetails
    });
    
    // Display results with enhanced precision
    displayAffordabilityResults(maxCarPrice, calculationMethod, {
        monthlyIncome,
        totalSavings,
        downPaymentPercent,
        interestRate,
        loanTermYears,
        incomeRatio,
        loanBasedPrice: roundedLoanPrice,
        savingsBasedPrice: roundedSavingsPrice,
        calculationDetails
    });
    
    // Filter cars based on calculated price
    filterCarsByPrice(maxCarPrice);
}

// Enhanced Display calculation results with precise formatting
function displayAffordabilityResults(maxPrice, method, inputs) {
    const resultsDiv = document.getElementById("calculator-results");
    
    if (!resultsDiv) {
        console.error("Calculator results div not found");
        return;
    }
    
    let methodText = "";
    let additionalInfo = "";
    let limitingFactor = "";
    let precisionNote = "";
    
    if (method === "loan") {
        const details = inputs.calculationDetails.income;
        
        methodText = `Based on your monthly income of ₱${inputs.monthlyIncome.toLocaleString()}`;
        additionalInfo = `
            <div class="calc-detail">
                <strong>Maximum Monthly Payment:</strong> ₱${details.maxMonthlyPayment.toLocaleString()}
            </div>
            <div class="calc-detail">
                <strong>Loan Amount:</strong> ₱${details.maxLoanAmount.toLocaleString()}
            </div>
            <div class="calc-detail">
                <strong>Down Payment Needed:</strong> ₱${details.downPaymentAmount.toLocaleString()} (${inputs.downPaymentPercent}%)
            </div>
            <div class="calc-detail">
                <strong>Loan Term:</strong> ${inputs.loanTermYears} years at ${inputs.interestRate}% interest
            </div>
        `;
        
        // Show precise calculation breakdown
        precisionNote = `
            <div class="precision-note">
                <small><strong>Precise Calculation Breakdown:</strong><br>
                Monthly Rate: ${(inputs.interestRate/100/12).toFixed(8)}<br>
                PV Factor: ${((1 - Math.pow(1 + inputs.interestRate/100/12, -(inputs.loanTermYears * 12))) / (inputs.interestRate/100/12)).toFixed(6)}<br>
                Loan Amount: ₱${details.maxLoanAmount.toFixed(2)}<br>
                Total Car Price: ₱${details.totalCarPrice.toFixed(2)}
                </small>
            </div>
        `;
        
        if (inputs.totalSavings > 0 && inputs.savingsBasedPrice < inputs.loanBasedPrice) {
            limitingFactor = `<div class="limiting-factor">⚠️ Limited by available savings for down payment</div>`;
        }
        
    } else if (method === "savings_limited") {
        const downPaymentAmount = maxPrice * (inputs.downPaymentPercent / 100);
        const loanAmount = maxPrice - downPaymentAmount;
        const monthlyPayment = calculateMonthlyPayment(loanAmount, inputs.interestRate, inputs.loanTermYears);
        const maxMonthlyPayment = (inputs.monthlyIncome * inputs.incomeRatio) / 100;
        
        methodText = `Limited by your available savings of ₱${inputs.totalSavings.toLocaleString()} for down payment`;
        additionalInfo = `
            <div class="calc-detail">
                <strong>Down Payment Required:</strong> ₱${Math.round(inputs.totalSavings * 100) / 100} (${inputs.downPaymentPercent}% of total price)
            </div>
            <div class="calc-detail">
                <strong>Loan Amount:</strong> ₱${Math.round(loanAmount * 100) / 100}
            </div>
            <div class="calc-detail">
                <strong>Monthly Payment:</strong> ₱${Math.round(monthlyPayment * 100) / 100}
            </div>
            <div class="calc-detail">
                <strong>Your Monthly Payment Capacity:</strong> ₱${Math.round(maxMonthlyPayment * 100) / 100}
            </div>
        `;
        
        if (monthlyPayment > maxMonthlyPayment) {
            additionalInfo += `<div class="warning">⚠️ Monthly payment exceeds your capacity by ₱${Math.round((monthlyPayment - maxMonthlyPayment) * 100) / 100}</div>`;
        }
        
    } else if (method === "cash") {
        methodText = `Based on your total savings of ₱${inputs.totalSavings.toLocaleString()}`;
        additionalInfo = `<div class="calc-detail"><strong>Payment Method:</strong> Cash Purchase</div>`;
    }
    
    resultsDiv.innerHTML = `
        <div class="affordability-result">
            <h3>💰 Affordability Calculator Results</h3>
            <div class="main-result">
                <strong>Maximum Car Price You Can Afford:</strong>
                <span class="price-highlight">₱${Math.round(maxPrice * 100) / 100}</span>
            </div>
            <div class="calculation-method">
                ${methodText}
            </div>
            ${limitingFactor}
            ${additionalInfo}
            ${precisionNote}
            <div class="comparison-info">
                ${inputs.loanBasedPrice > 0 && inputs.savingsBasedPrice > 0 ? 
                    `<small>
                        Income-based limit: ₱${Math.round(inputs.loanBasedPrice * 100) / 100} | 
                        Savings-based limit: ₱${Math.round(inputs.savingsBasedPrice * 100) / 100}
                    </small>` : ''
                }
            </div>
            <div class="action-buttons">
                <button onclick="showAffordableCars(${maxPrice})" class="view-cars-btn">
                    View Affordable Cars
                </button>
                <button onclick="resetCalculator()" class="reset-calc-btn">
                    Reset Calculator
                </button>
            </div>
        </div>
    `;
    
    // Show the results section
    resultsDiv.style.display = "block";
}

// Enhanced Helper function to calculate monthly payment with better precision
function calculateMonthlyPayment(loanAmount, annualRate, years) {
    const monthlyRate = (annualRate / 100) / 12;
    const numPayments = years * 12;
    
    if (monthlyRate === 0) {
        return loanAmount / numPayments;
    }
    
    // Enhanced precision calculation
    const factor = Math.pow(1 + monthlyRate, numPayments);
    const monthlyPayment = loanAmount * (monthlyRate * factor) / (factor - 1);
    
    return Math.round(monthlyPayment * 100) / 100;
}

// Test function to verify calculations
function testCalculatorPrecision() {
    console.log("=== TESTING CALCULATOR PRECISION ===");
    
    // Test Case 1 from your example
    const testInputs = {
        monthlyIncome: 25000,
        incomeRatio: 20,
        interestRate: 7,
        loanTermYears: 5,
        downPaymentPercent: 20
    };
    
    const maxMonthlyPayment = (testInputs.monthlyIncome * testInputs.incomeRatio) / 100;
    const monthlyRate = (testInputs.interestRate / 100) / 12;
    const totalPayments = testInputs.loanTermYears * 12;
    
    console.log("Test inputs:", testInputs);
    console.log("Max monthly payment:", maxMonthlyPayment);
    console.log("Monthly rate:", monthlyRate);
    console.log("Total payments:", totalPayments);
    
    // Calculate using enhanced precision
    const maxLoanAmount = calculatePresentValue(maxMonthlyPayment, monthlyRate, totalPayments);
    const totalCarPrice = maxLoanAmount / (1 - testInputs.downPaymentPercent / 100);
    const downPayment = totalCarPrice * (testInputs.downPaymentPercent / 100);
    
    console.log("=== RESULTS ===");
    console.log("Max loan amount:", maxLoanAmount);
    console.log("Total car price:", totalCarPrice);
    console.log("Down payment:", downPayment);
    console.log("Verification - Loan + Down:", maxLoanAmount + downPayment);
    
    return {
        maxLoanAmount: Math.round(maxLoanAmount * 100) / 100,
        totalCarPrice: Math.round(totalCarPrice * 100) / 100,
        downPayment: Math.round(downPayment * 100) / 100
    };
}

// Filter cars by calculated maximum price
async function filterCarsByPrice(maxPrice) {
    console.log(`Filtering cars with max price: ₱${maxPrice.toLocaleString()}`);
    
    try {
        // Use your existing API endpoint with price filter
        const url = new URL(`${baseUrl}/get_cars`);
        url.searchParams.append("max_price", Math.floor(maxPrice));
        
        console.log("📤 Sending price filter request to:", url.href);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log("📥 Received affordable cars data:", data);
        
        if (data.length === 0) {
            alert("No cars found within your budget. Try adjusting your parameters or consider a higher budget.");
        } else {
            // Update the global car data for sorting
            currentCarData = data;
            
            // Display the filtered cars
            displayFilteredCars(data);
            
            // Update the results frame title to show it's filtered by budget
            const resultsFrame = document.getElementById("results-frame");
            if (resultsFrame) {
                const existingTitle = resultsFrame.querySelector('h2') || resultsFrame.querySelector('.results-title');
                if (existingTitle) {
                    existingTitle.textContent = `Cars Within Your Budget (₱${Math.floor(maxPrice).toLocaleString()} or less)`;
                }
            }
            
            defaultCarsLoaded = true;
        }
    } catch (error) {
        console.error("🚨 Error fetching affordable cars:", error);
        alert("An error occurred while fetching affordable cars. Please try again later.");
    }
}

// Show affordable cars (called from results button)
function showAffordableCars(maxPrice) {
    // Scroll to results if they exist, otherwise filter cars
    const resultsFrame = document.getElementById("results-frame");
    
    if (resultsFrame && resultsFrame.style.display === "block") {
        // Results already showing, just scroll to them
        resultsFrame.scrollIntoView({ behavior: 'smooth' });
    } else {
        // Filter and show cars
        filterCarsByPrice(maxPrice);
        
        // Scroll to results after a short delay to allow for rendering
        setTimeout(() => {
            if (resultsFrame) {
                resultsFrame.scrollIntoView({ behavior: 'smooth' });
            }
        }, 500);
    }
}

// Reset calculator form
function resetCalculator() {
    // Reset all input fields
    document.getElementById("monthly-income").value = "";
    document.getElementById("total-savings").value = "";
    document.getElementById("down-payment").value = "20";
    document.getElementById("interest-rate").value = "6.5";
    document.getElementById("loan-term").value = "5";
    document.getElementById("income-ratio").value = "30";
    
    // Hide results
    const resultsDiv = document.getElementById("calculator-results");
    if (resultsDiv) {
        resultsDiv.style.display = "none";
        resultsDiv.innerHTML = "";
    }
    
    // Clear any filtered results
    const resultsFrame = document.getElementById("results-frame");
    if (resultsFrame) {
        resultsFrame.style.display = "none";
        resultsFrame.classList.remove("active");
    }
    
    // Clear car data
    currentCarData = [];
    const resultsBody = document.getElementById("car-specs");
    if (resultsBody) {
        resultsBody.innerHTML = "";
    }
    
    console.log("Calculator reset successfully");
}

// Add event listeners for real-time calculation (optional)
function setupCalculatorListeners() {
    const inputs = [
        "monthly-income",
        "total-savings", 
        "down-payment",
        "interest-rate",
        "loan-term",
        "income-ratio"
    ];
    
    inputs.forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element) {
            element.addEventListener("input", debounce(updateCalculationPreview, 500));
        }
    });
}

// Debounce function to prevent too many calculations
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Optional: Show live preview of affordability (without full calculation)
function updateCalculationPreview() {
    const monthlyIncome = parseFloat(document.getElementById("monthly-income").value) || 0;
    const incomeRatio = parseFloat(document.getElementById("income-ratio").value) || 30;
    
    if (monthlyIncome > 0) {
        const maxMonthlyPayment = (monthlyIncome * incomeRatio) / 100;
        const previewDiv = document.getElementById("calculation-preview");
        
        if (previewDiv) {
            previewDiv.innerHTML = `
                <small>Preview: Max monthly payment ≈ ₱${maxMonthlyPayment.toLocaleString()}</small>
            `;
        }
    }
}

// Initialize calculator when DOM loads (add to your existing DOMContentLoaded)
document.addEventListener("DOMContentLoaded", function () {
    // Your existing code...
    
    // Add calculator setup
    setupCalculatorListeners();
    
    // Reset calculator on page load
    const calculatorForm = document.getElementById("price-calculator-form");
    if (calculatorForm) {
        resetCalculator();
    }
    
    // Run precision test in console
    console.log("Running precision test...");
    const testResults = testCalculatorPrecision();
    console.log("Test completed. Results:", testResults);
});

/////////////////////////
//Testimonials Logic  //
///////////////////////

let testimonialForm;
let testimonialInput;
let titleInput;
let testimonialsContainer;
let addTestimonialBtn;

// Initialize testimonials DOM elements
function initializeTestimonialElements() {
  testimonialForm = document.getElementById('testimonial-form');
  testimonialInput = document.getElementById('testimonial-input');
  titleInput = document.getElementById('title-input');
  testimonialsContainer = document.getElementById('testimonials-container');
  addTestimonialBtn = document.getElementById('add-testimonial-btn');

  // Check if critical elements exist
  if (!testimonialForm || !testimonialInput || !testimonialsContainer || !addTestimonialBtn) {
    console.error('Critical testimonial DOM elements not found. Check your HTML IDs.');
    return false;
  }

  // Initialize form as hidden
  testimonialForm.style.display = 'none';
  return true;
}

// Toggle testimonial form - called from HTML onclick
function toggleTestimonialForm() {
  console.log('toggleTestimonialForm called');
  
  if (!testimonialForm) {
    console.error('Testimonial form element not found');
    return;
  }

  // For demo purposes, we'll skip auth check
  // In your real implementation, uncomment these lines:
  /*
  if (!auth.currentUser) {
    alert("Please sign in to submit a testimonial.");
    return;
  }
  */

  // Toggle form visibility
  const isHidden = testimonialForm.style.display === 'none' || testimonialForm.style.display === '';
  testimonialForm.style.display = isHidden ? 'block' : 'none';
  
  // Clear form when closing
  if (!isHidden) {
    testimonialInput.value = '';
    titleInput.value = '';
  }
  
  console.log('Form display changed to:', testimonialForm.style.display);
}

// Submit testimonial - called from HTML onclick
function submitTestimonial(event) {
  console.log('submitTestimonial called');
  
  if (!testimonialInput || !titleInput) {
    console.error('Testimonial input elements not found');
    return;
  }

  const testimonialText = testimonialInput.value.trim();
  const titleText = titleInput.value.trim();
  
  if (!testimonialText) {
    alert("Please enter a testimonial.");
    return;
  }

  // For demo purposes, we'll create a mock user
  // In your real implementation, get the actual user:
  const mockUser = {
    uid: 'demo-user-' + Date.now(),
    email: 'demo@example.com',
    displayName: 'Demo User',
    photoURL: null
  };

  // Show loading state
  const submitButton = event.target;
  const originalText = submitButton.textContent;
  submitButton.textContent = 'Submitting...';
  submitButton.disabled = true;

  // For demo purposes, we'll simulate the database operation
  // In your real implementation, use your Firebase db:
  /*
  db.collection("testimonials").add({
    message: testimonialText,
    title: titleText || null,
    userId: user.uid,
    userEmail: user.email,
    userName: user.displayName || "Anonymous",
    userPhoto: user.photoURL || null,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
  */

  // Simulate async operation
  setTimeout(() => {
    console.log('Testimonial submitted successfully');
    
    // Add testimonial to display
    addTestimonialToDisplay({
      message: testimonialText,
      title: titleText || null,
      userId: mockUser.uid,
      userEmail: mockUser.email,
      userName: mockUser.displayName || "Anonymous",
      userPhoto: mockUser.photoURL || null,
      timestamp: new Date()
    });

    // Reset form
    testimonialInput.value = '';
    titleInput.value = '';
    testimonialForm.style.display = 'none';
    
    // Reset button state
    submitButton.textContent = originalText;
    submitButton.disabled = false;
    
    alert('Thank you for your testimonial!');
  }, 1000);
}

// Add testimonial to display
function addTestimonialToDisplay(testimonial) {
  if (!testimonialsContainer) {
    console.error('Testimonials container not found');
    return;
  }

  // Remove empty state if it exists
  const emptyState = testimonialsContainer.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }

  const date = testimonial.timestamp instanceof Date ? testimonial.timestamp : new Date(testimonial.timestamp);
  const testimonialElement = document.createElement('div');
  testimonialElement.className = 'testimonial-card expanded';
  testimonialElement.setAttribute('data-expanded', 'true');
  
  testimonialElement.innerHTML = `
    <div class="card-header">
      <div class="profile-section">
        ${testimonial.userPhoto ? 
          `<img src="${escapeHtml(testimonial.userPhoto)}" alt="Profile" class="profile-pic">` :
          `<div class="profile-icon"><i class="fas fa-user"></i></div>`
        }
      </div>
      <button class="toggle-btn" onclick="toggleCard(this)">
        <i class="fas fa-chevron-down"></i>
      </button>
    </div>
    
    <div class="card-content expanded-content">
      <div class="quote-container">
        <i class="fas fa-quote-left quote-left"></i>
        <p class="testimonial-text">${escapeHtml(testimonial.message)}</p>
        <i class="fas fa-quote-right quote-right"></i>
      </div>
      <div class="testimonial-footer">
        <div class="author-info">
          <span class="date">${date.toLocaleDateString()}</span>
          <span class="author-name">${escapeHtml(testimonial.userName)}</span>
          ${testimonial.title ? `<span class="author-title">${escapeHtml(testimonial.title)}</span>` : '<span class="author-title"></span>'}
        </div>
      </div>
    </div>

    <div class="card-content compact-content">
      <p class="compact-text">Check out <span class="author-name">${escapeHtml(testimonial.userName)}</span>'s testimonial!</p>
    </div>
  `;
  
  // Add to the end of the container (before the add button) for newest at bottom
  testimonialsContainer.appendChild(testimonialElement);
}

// Toggle individual testimonial card
function toggleCard(button) {
  const card = button.closest('.testimonial-card');
  const isExpanded = card.classList.contains('expanded');
  
  if (isExpanded) {
    card.classList.remove('expanded');
    card.setAttribute('data-expanded', 'false');
  } else {
    card.classList.add('expanded');
    card.setAttribute('data-expanded', 'true');
  }
}

// Display testimonials (for real Firebase implementation)
function displayTestimonials() {
  if (!testimonialsContainer) {
    console.error('Testimonials container not found');
    return;
  }

  // For demo purposes, we'll show a sample testimonial
  // In your real implementation, use this pattern:
  /*
  db.collection("testimonials")
    .orderBy("timestamp", "asc") // Changed to asc for oldest first
    .onSnapshot((snapshot) => {
      testimonialsContainer.innerHTML = '';
      
      if (snapshot.empty) {
        showEmptyState();
        return;
      }

      snapshot.forEach(doc => {
        const testimonial = doc.data();
        addTestimonialToDisplay(testimonial);
      });
    }, (error) => {
      console.error("Error fetching testimonials: ", error);
      showErrorState();
    });
  */
}

// Show empty state
function showEmptyState() {
  if (!testimonialsContainer) return;
  
  testimonialsContainer.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-comments"></i>
      <h3>No testimonials yet</h3>
      <p>Be the first to share your experience with RideMatch!</p>
    </div>
  `;
}

// Show error state
function showErrorState() {
  if (!testimonialsContainer) return;
  
  testimonialsContainer.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Error loading testimonials</h3>
      <p>Please try again later.</p>
    </div>
  `;
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize testimonials when page loads
function initializeTestimonials() {
  console.log('Initializing testimonials functionality');
  
  if (initializeTestimonialElements()) {
    displayTestimonials();
    console.log('Testimonials system initialized successfully');
  } else {
    console.error('Failed to initialize testimonials system');
  }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeTestimonials();
});

// Make functions globally available for HTML onclick handlers
window.toggleTestimonialForm = toggleTestimonialForm;
window.submitTestimonial = submitTestimonial;
window.toggleCard = toggleCard;