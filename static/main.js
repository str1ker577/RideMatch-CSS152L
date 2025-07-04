////////////////////////
//Global Functionality//
///////////////////////

const isLocalhost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const baseUrl = isLocalhost ? 'http://127.0.0.1:8000' : window.location.origin;
//const baseUrl = "https://a7cbb3da-2928-4d18-ba75-ea41ce8ad0c5-00-g8eiilou0duk.sisko.replit.dev"; // Base URL for API requests

// Firebase initialization 
let auth; // Global auth object
let userName = null; // Keep your existing userName variable
let currentUser = null;

// Function to get current user name
function getCurrentUserName() {
  if (auth && auth.currentUser) {
    return auth.currentUser.displayName || auth.currentUser.email || 'Anonymous';
  }
  return 'Anonymous';
}

let currentCarData = []; // Global variable to store current car data for sorting
let defaultCarsLoaded = false;

function updateUIForAuthState() {
  console.log('Forum: Updating UI for auth state, currentUser:', currentUser ? currentUser.email : 'none');
  
  const askBtn = document.querySelector('.ask-btn');
  if (!askBtn) {
    console.log('Forum: Ask button not found, not on forum page');
    return; // Not on forum page
  }
  
  if (!currentUser) {
    console.log('Forum: User not logged in, showing login prompt');
    askBtn.innerHTML = '<i class="bx bx-plus"></i>Login to Ask';
    askBtn.onclick = () => {
      if (typeof togglePopup === 'function') {
        togglePopup('login-popup');
      }
    };
  } else {
    console.log('Forum: User logged in, showing ask question button');
    askBtn.innerHTML = '<i class="bx bx-plus"></i>Ask a Question';
    askBtn.onclick = () => openAskModal();
  }
}


window.removeFavoriteFromDisplay = removeFavoriteFromDisplay;
window.addToFave = addToFave;


const isComparePage = document.getElementById('compare-charts-section') !== null;
const isFilterPage = document.getElementById('year') !== null;

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

////////////////////////////
// Firebase Related Code //
//////////////////////////

// Initialize Firebase when the page loads
async function initializeFirebase() {
    try {
        // Get Firebase config from your Python backend
        const response = await fetch('/firebase-config');
        const firebaseConfig = await response.json();
        
        // IMPORTANT: Always use the correct database URL for your Asia Southeast region
        firebaseConfig.databaseURL = 'https://ridematch-db867-default-rtdb.asia-southeast1.firebasedatabase.app';
        
        console.log('Firebase config with correct database URL:', firebaseConfig);
        
        // Initialize Firebase only if not already initialized
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('Firebase initialized successfully');
        } else {
            console.log('Firebase already initialized');
        }
        
        auth = firebase.auth();
        
        // FIXED: Test database connection properly
        try {
            // Test the database connection
            const database = firebase.database();
            const testRef = database.ref('test');
            await testRef.once('value'); // This will throw an error if connection fails
            console.log('✅ Firebase database connection successful');
        } catch (dbError) {
            console.error('❌ Firebase database connection failed:', dbError);
            // Don't throw here, let the app continue but log the error
        }
        
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

                // Profile image vs icon logic
                const profilePic = document.getElementById('profile-pic');
                const profileIcon = document.getElementById('profile-icon');

                currentUser = user;
                updateUIForAuthState();

                if (user.photoURL) {
                    if (profileIcon) profileIcon.style.display = 'none';
                    if (profilePic) {
                        profilePic.src = user.photoURL;
                        profilePic.style.display = 'block';
                    }
                } else {
                    if (profileIcon) profileIcon.style.display = 'inline-block';
                    if (profilePic) profilePic.style.display = 'none';
                }

                console.log('User is signed in:', user.email);
            } else {
                userName = null;

                const welcomeText = document.getElementById('welcome-text');
                if (welcomeText) welcomeText.textContent = 'Welcome!';

                const loginBtn = document.getElementById('login-button');
                const profileContainer = document.getElementById('profile-container');
                if (loginBtn) loginBtn.style.display = 'block';
                if (profileContainer) profileContainer.style.display = 'none';

                currentUser = null;
                updateUIForAuthState();

                console.log('User is signed out');
            }
        });
        
    } catch (error) {
        console.error('Firebase initialization failed:', error);
    }
}

/////////////////////////////////////////
// Denies access to users to the User //
// Profile Page, unless signed in    //
//////////////////////////////////////

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

///////////////////////
// Sign Up Function //
/////////////////////

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

//////////////////////
// Login  Function //
////////////////////

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
                console.log('Sending token to backend for session creation...');
                
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
            }).then(response => {
                console.log('Backend response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(`Backend authentication failed: ${response.status}`);
                }
                
                return response.json();
            })
            .then(data => {
                console.log('Backend response data:', data);
                
                if (data.status === 'success') {
                    console.log('✅ Backend session created successfully');
                    
                    // Update UI (keep your existing UI logic)
                    userName = user.email;
                    const welcomeMessageElement = document.querySelector('.welcome-title');
                    if (welcomeMessageElement) {
                        welcomeMessageElement.textContent = `Welcome, ${userName}!`;
                    }
                    
                    // Clear error messages
                    const errorMsg = document.querySelector('.error-message');
                    const errorMsg12 = document.querySelector('.error-message12');
                    if (errorMsg) errorMsg.textContent = '';
                    if (errorMsg12) errorMsg12.textContent = '';
                    
                    // Close popup and update UI
                    togglePopup('login-popup');
                    
                    // Update sidebar if elements exist
                    if (typeof sidebar !== 'undefined' && sidebar) {
                        sidebar.classList.remove('open');
                    }
                    if (typeof menuButton !== 'undefined' && menuButton) {
                        menuButton.style.display = 'block';
                    }
                    if (typeof closeButton !== 'undefined' && closeButton) {
                        closeButton.style.display = 'none';
                    }
                } else {
                    console.error('❌ Backend authentication failed:', data);
                    throw new Error(data.message || 'Backend authentication failed');
                }
            })
            .catch(backendError => {
                console.error('Backend session creation failed:', backendError);
                
                // Show error to user
                const errorElement = document.querySelector('.error-message');
                if (errorElement) {
                    errorElement.textContent = 'Login succeeded but session creation failed. Please try again.';
                }
                
                // Sign out from Firebase since backend session failed
                auth.signOut();
            });
        })
        .catch((error) => {
            console.error('Firebase login error:', error);
            const successElement = document.querySelector('.success-message');
            const errorElement = document.querySelector('.error-message');
            
            if (successElement) successElement.textContent = '';
            if (errorElement) errorElement.textContent = getFirebaseErrorMessage(error.code);
        });
}

// Helper function for user-friendly error messages (keep your existing one)
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

////////////////////////////
// Formats the CSV file  //
// data to be readable  //
/////////////////////////

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

// New function to update slider values dynamically
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

/////////////////////////
// Filtering Function //
///////////////////////

async function applyFilters() {
    console.log("apply filters clicked");

    const brand = document.getElementById("brand").value.trim().toLowerCase();
    const model = document.getElementById("model").value.trim().toLowerCase();
    const bodyType = document.getElementById("body-type").value.trim().toLowerCase();
    const driveTrain = document.getElementById("drive-train").value.trim().toLowerCase();
    const transmission = document.getElementById("transmission").value.trim().toLowerCase();
    const fuelType = document.getElementById("fuel-type").value.trim().toLowerCase();
    const year = document.getElementById("year").value.trim(); 
    const minHp = parseFloat(document.getElementById("horsepower").value) || 50;
    const minCargo = parseFloat(document.getElementById("cargo-space").value) || 100;
    const maxPrice = parseFloat(document.getElementById("price").value) || 25000000;
    const minGroundClearance = parseFloat(document.getElementById("ground-clearance").value) || 2;
    const seating = parseInt(document.getElementById("seating").value) || 0;

    console.log("🚀 Filters Applied:");
    console.log("Brand:", brand);
    console.log("Model:", model);
    console.log("Body Type:", bodyType);
    console.log("Drive Train:", driveTrain);
    console.log("Transmission:", transmission);
    console.log("Fuel Type:", fuelType);
    console.log("Year:", year); // NEW: Log year filter
    console.log("Min HP:", minHp);
    console.log("Min Cargo Space:", minCargo);
    console.log("Max Price:", maxPrice);
    console.log("Min Ground Clearance:", minGroundClearance);
    console.log("Min Seating Capacity:", seating);

    // Check if any filters are applied (not default values)
    const hasFilters = brand || model || bodyType || driveTrain || transmission || fuelType || year || // NEW: Include year in filter check
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
    if (year) url.searchParams.append("year", year); // NEW: Add year parameter

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
        
        // NEW: Check if the response is an error object
        if (data.error) {
            console.error("❌ Server returned error:", data.error);
            alert(`Server Error: ${data.error}\n\nThis usually means the car database is not loaded. Please contact support.`);
            return;
        }
        
        // NEW: Check if data is actually an array
        if (!Array.isArray(data)) {
            console.error("❌ Expected array but got:", typeof data, data);
            alert("Unexpected data format from server. Please try refreshing the page.");
            return;
        }
        
        if (data.length === 0) {
            console.warn("⚠️ No cars found for given filters.");
            alert("No matching cars found. Please try different filters.");
        } else {
            displayFilteredCars(data);
            defaultCarsLoaded = true;
        }
    } catch (error) {
        console.error("🚨 Error fetching data:", error);
        alert("Network error occurred while fetching data. Please check your connection and try again.");
    }
}

// NEW: Function to populate years dropdown
async function populateYearsAlternative() {
    const brand = document.getElementById('brand').value;
    const model = document.getElementById('model').value;
    const variant = document.getElementById('variant').value;
    const yearDropdown = document.getElementById('year');
    
    // Reset year dropdown
    yearDropdown.innerHTML = '<option value="">Select Year</option>';
    
    if (!brand || !model || !variant) return;

    try {
        console.log(`🔍 Fetching years for: brand=${brand}, model=${model}, variant=${variant}`);
        const response = await fetch(`${baseUrl}/get_variant_years?brand=${brand}&model=${model}&variant=${variant}`);
        const years = await response.json();
        
        console.log('📦 Raw API response:', years);
        
        if (!Array.isArray(years)) {
            console.error('❌ API did not return an array:', years);
            return;
        }
        
        // AGGRESSIVE APPROACH: Use Map to ensure uniqueness
        const yearMap = new Map();
        
        years.forEach(year => {
            const cleanYear = parseInt(String(year).trim(), 10);
            if (!isNaN(cleanYear) && cleanYear >= 1900 && cleanYear <= 2030) {
                yearMap.set(cleanYear, cleanYear); // Map key = value ensures uniqueness
            }
        });
        
        // Get unique years and sort
        const uniqueYears = Array.from(yearMap.values()).sort((a, b) => b - a);
        
        console.log('📅 Final unique years:', uniqueYears);
        
        // Populate dropdown
        uniqueYears.forEach(year => {
            const option = document.createElement('option');
            option.value = String(year);
            option.textContent = String(year);
            yearDropdown.appendChild(option);
        });
        
        console.log(`✅ Successfully populated ${uniqueYears.length} unique years using Map approach`);
        
    } catch (error) {
        console.error('❌ Error fetching years:', error);
        alert('Error fetching years. Please try again.');
    }
}

async function populateYearsForFilter() {
    /**
     * Populate the year dropdown on the main filter page
     */
    const yearDropdown = document.getElementById('year');
    
    if (!yearDropdown) {
        console.log('Year dropdown not found - not on filter page');
        return;
    }

    try {
        console.log('🔍 Fetching all available years for filter...');
        
        const response = await fetch(`${baseUrl}/get_years`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const years = await response.json();
        console.log('📅 Received years:', years);
        
        if (!Array.isArray(years)) {
            console.error('❌ Expected array of years but got:', years);
            return;
        }
        
        // Sort years in descending order (newest first)
        const sortedYears = years.sort((a, b) => b - a);
        
        // Add each year as an option (keep existing default options)
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = String(year);
            option.textContent = String(year);
            yearDropdown.appendChild(option);
        });
        
        console.log(`✅ Successfully populated ${sortedYears.length} years in filter dropdown`);
        
    } catch (error) {
        console.error('❌ Error fetching years for filter:', error);
    }
}

// UPDATED: Helper function to reset all filters
function resetAllFilters() {
    // Reset dropdowns
    document.getElementById("brand").value = "";
    document.getElementById("model").value = "";
    document.getElementById("body-type").value = "";
    document.getElementById("drive-train").value = "";
    document.getElementById("transmission").value = "";
    document.getElementById("fuel-type").value = "";
    document.getElementById("year").value = ""; // NEW: Reset year dropdown
    
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

// UPDATED: DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", function () {
    console.log('DOM loaded, initializing...');
    
    // Initialize Firebase first
    initializeFirebase();

    // NEW: Populate years dropdown for main filter page
    populateYearsForFilter();

    // Only load favorites if the favorites container exists
    const favoritesContainer = document.getElementById("favorites-items");
    if (favoritesContainer) {
        console.log('Favorites page detected, will load favorites after auth');
        // Don't load favorites immediately, wait for auth state
        // The auth state change handler will trigger loadFavorites when user is confirmed
        
        // Set up a listener for when the user auth state is determined
        const checkAuthAndLoadFavorites = () => {
            if (auth && auth.currentUser) {
                console.log('Auth confirmed, loading favorites');
                loadFavorites();
            } else if (auth) {
                console.log('No current user, skipping favorites load');
            } else {
                // Auth not ready yet, check again in a bit
                setTimeout(checkAuthAndLoadFavorites, 500);
            }
        };
        
        // Start checking after a small delay to let Firebase initialize
        setTimeout(checkAuthAndLoadFavorites, 1000);
    }

    // Initialize other components as before
    const filterButton = document.getElementById("filter-btn"); 
    const resultsFrame = document.querySelector(".results-frame");

    // Only initialize sliders if they exist on this page
    const priceSlider = document.getElementById("price");
    const horsepowerSlider = document.getElementById("horsepower");
    const seatingSlider = document.getElementById("seating");

    // Check if all required slider elements exist before trying to use them
    if (priceSlider && horsepowerSlider && seatingSlider) {
        // Set sliders to their initial values
        priceSlider.value = priceSlider.max; // This will be 25,000,000 now
        horsepowerSlider.value = horsepowerSlider.min;
        seatingSlider.value = "0";

        // Update displayed values to match the values
        updateSliderValue("price", "₱", true);
        updateSliderValue("horsepower", "HP", false);
        updateSliderValue("seating", "seats", false);
    }
});


//////////////////////////////// 
// Shows the filtered Results //
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

    // ✅ Handle case when no results match - UPDATED: Changed colspan from 14 to 15 for the new Year column
    if (data.length === 0) {
        resultsBody.innerHTML = `<tr><td colspan="15" style="text-align: center;">No matching cars found.</td></tr>`;
        console.warn("⚠️ No cars found for given filters.");
        return;
    }

    data.forEach(car => {
        const row = document.createElement("tr");
        
        // Get the fuel type icon
        const fuelTypeIcon = getFuelTypeIcon(car.Fuel_Type);
        
        // UPDATED: Check if car is already liked and set appropriate heart style
        const isLiked = userFavorites.has(car.Variant);
        const heartClass = isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        const heartColor = isLiked ? '#e74c3c' : '#b49b66'; // Red if liked, gold if not
        
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
        <td>${car.Year || "N/A"}</td>
        <td>${car.Ground_Clearance ? car.Ground_Clearance + " cm" : "N/A"}</td>
        <td>${car.Cargo_space ? car.Cargo_space + " L" : "N/A"}</td>
        <td>${car.Seating_Capacity ? car.Seating_Capacity + " seats" : "N/A"}</td>
        <td>${car.Price ? "₱" + car.Price.toLocaleString() : "N/A"}</td>
        <td>
            <div class="heart-container">
                <i class="${heartClass}" 
                   id="like-icon" 
                   style="color: ${heartColor}; cursor: pointer;" 
                   onclick="addToFave(event, '${car.Variant}')"></i>
            </div>
        </td>
    `;
        resultsBody.appendChild(row);
    });

    console.log("✅ Table updated successfully!");
}

//////////////////////////////////
// Adds corresponding Icon to  // 
// the appropriate Car Type   //
///////////////////////////////

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
    console.log('DOM loaded, initializing...');
    
    // Initialize Firebase first
    initializeFirebase();

    // Only load favorites if the favorites container exists
    const favoritesContainer = document.getElementById("favorites-items");
    if (favoritesContainer) {
        console.log('Favorites page detected, will load favorites after auth');
        // Don't load favorites immediately, wait for auth state
        // The auth state change handler will trigger loadFavorites when user is confirmed
        
        // Set up a listener for when the user auth state is determined
        const checkAuthAndLoadFavorites = () => {
            if (auth && auth.currentUser) {
                console.log('Auth confirmed, loading favorites');
                loadFavorites();
            } else if (auth) {
                console.log('No current user, skipping favorites load');
            } else {
                // Auth not ready yet, check again in a bit
                setTimeout(checkAuthAndLoadFavorites, 500);
            }
        };
        
        // Start checking after a small delay to let Firebase initialize
        setTimeout(checkAuthAndLoadFavorites, 1000);
    }

    // Initialize other components as before
    const filterButton = document.getElementById("filter-btn"); 
    const resultsFrame = document.querySelector(".results-frame");

    // Only initialize sliders if they exist on this page
    const priceSlider = document.getElementById("price");
    const horsepowerSlider = document.getElementById("horsepower");
    const seatingSlider = document.getElementById("seating");

    // Check if all required slider elements exist before trying to use them
    if (priceSlider && horsepowerSlider && seatingSlider) {
        // Ensure sliders start at minimum values
        priceSlider.value = priceSlider.max;
        horsepowerSlider.value = horsepowerSlider.min;
        seatingSlider.value = "0";

        // Update displayed values to match the min values
        updateSliderValue("price", "₱", true);
        updateSliderValue("horsepower", "HP", false);
        updateSliderValue("seating", "seats", false);
    }
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
        
        // NEW: Year sorting options
        case 'year-asc':
            sortedData.sort((a, b) => {
                const yearA = parseInt(a.Year) || 0;
                const yearB = parseInt(b.Year) || 0;
                return yearA - yearB;
            });
            break;
        
        case 'year-desc':
            sortedData.sort((a, b) => {
                const yearA = parseInt(a.Year) || 0;
                const yearB = parseInt(b.Year) || 0;
                return yearB - yearA;
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

////////////////////////////
// Reset Filter Function //
//////////////////////////

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
    document.getElementById("year").value = ""; // NEW: Reset year dropdown
    
    // Reset sliders to their initial values
    const priceSlider = document.getElementById("price");
    const horsepowerSlider = document.getElementById("horsepower");
    const seatingSlider = document.getElementById("seating");
    const cargoSlider = document.getElementById("cargo-space");
    const groundClearanceSlider = document.getElementById("ground-clearance");
    
    if (priceSlider) priceSlider.value = priceSlider.max; // Now 25M
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
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("📥 Received default data:", data);
        
        // NEW: Check for error response
        if (data.error) {
            console.error("❌ Server error loading default cars:", data.error);
            alert(`Unable to load cars: ${data.error}\n\nThe car database may not be available. Please try again later.`);
            return;
        }
        
        // NEW: Validate data format
        if (!Array.isArray(data)) {
            console.error("❌ Expected array but got:", typeof data, data);
            alert("Unexpected data format from server. Please refresh the page.");
            return;
        }
        
        if (data.length === 0) {
            console.warn("⚠️ No cars found in database.");
            alert("No cars available in the database.");
        } else {
            displayFilteredCars(data);
            defaultCarsLoaded = true;
        }
    } catch (error) {
        console.error("🚨 Error fetching default cars:", error);
        alert("Network error occurred while loading cars. Please check your connection and try again.");
    }
}

///////////////////////
// Comparison  Page //
/////////////////////

// Global variables for compare page
let comparedCars = [];
let chartInstances = {};

// UPDATED: More distinct color palette
const chartColors = [
    '#2d5016', // Forest Green
    '#722f37', // Burgundy  
    '#1e3a8a', // Navy Blue
    '#7c2d12', // Earth Brown
    '#6b7280'  // Warm Gray
];

const chartBackgroundColors = [
    'rgba(45, 80, 22, 0.8)',   // Forest Green
    'rgba(114, 47, 55, 0.8)',  // Burgundy
    'rgba(30, 58, 138, 0.8)',  // Navy Blue
    'rgba(124, 45, 18, 0.8)',  // Earth Brown
    'rgba(107, 114, 128, 0.8)' // Warm Gray
];

// Function to populate models based on selected brand
async function populateModels() {
    const brand = document.getElementById('brand').value;
    const modelDropdown = document.getElementById('model');
    const variantDropdown = document.getElementById('variant');
    const yearDropdown = document.getElementById('year');
    
    // Reset dependent dropdowns
    modelDropdown.innerHTML = '<option value="">Select Model</option>';
    variantDropdown.innerHTML = '<option value="">Select Variant</option>';
    yearDropdown.innerHTML = '<option value="">Select Year</option>';
    
    if (!brand) return;

    try {
        const response = await fetch(`${baseUrl}/get_models?brand=${brand}`);
        const models = await response.json();
        
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelDropdown.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error fetching models:', error);
        alert('Error fetching models. Please try again.');
    }
}

// Function to populate variants based on selected model
async function populateVariants() {
    const model = document.getElementById('model').value;
    const variantDropdown = document.getElementById('variant');
    const yearDropdown = document.getElementById('year');
    
    // Reset dependent dropdowns
    variantDropdown.innerHTML = '<option value="">Select Variant</option>';
    yearDropdown.innerHTML = '<option value="">Select Year</option>';
    
    if (!model) return;

    try {
        const response = await fetch(`${baseUrl}/get_variants?model=${model}`);
        const variants = await response.json();
        
        variants.forEach(variant => {
            const option = document.createElement('option');
            option.value = variant;
            option.textContent = variant;
            variantDropdown.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error fetching variants:', error);
        alert('Error fetching variants. Please try again.');
    }
}

// UPDATED: Simplified and more reliable populateYears function
async function populateYears() {
    const brand = document.getElementById('brand').value;
    const model = document.getElementById('model').value;
    const variant = document.getElementById('variant').value;
    const yearDropdown = document.getElementById('year');
    
    if (!brand || !model || !variant) {
        yearDropdown.innerHTML = '<option value="">Select Year</option>';
        return;
    }

    try {
        console.log(`🔍 Fetching years for: ${brand} ${model} ${variant}`);
        
        const response = await fetch(`${baseUrl}/get_variant_years?brand=${brand}&model=${model}&variant=${variant}`);
        const years = await response.json();
        
        console.log('📦 Raw API response:', years);
        
        if (!Array.isArray(years)) {
            console.error('❌ API did not return an array');
            yearDropdown.innerHTML = '<option value="">Select Year</option>';
            return;
        }

        // STEP 1: Completely clear the dropdown
        yearDropdown.innerHTML = '';
        
        // STEP 2: Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Year';
        yearDropdown.appendChild(defaultOption);
        
        // STEP 3: Process years with aggressive deduplication
        const processedYears = new Set(); // Use Set from the beginning
        
        years.forEach(year => {
            const cleanYear = String(year).trim();
            const numYear = parseInt(cleanYear, 10);
            
            // Validate year
            if (!isNaN(numYear) && numYear >= 1900 && numYear <= 2030) {
                processedYears.add(numYear); // Set automatically handles duplicates
            }
        });
        
        console.log('✨ Processed unique years:', Array.from(processedYears));
        
        // STEP 4: Convert to array and sort
        const uniqueYears = Array.from(processedYears).sort((a, b) => b - a);
        
        console.log('📅 Final sorted years:', uniqueYears);
        
        // STEP 5: Add years to dropdown ONE BY ONE with duplicate check
        const addedYears = new Set();
        
        uniqueYears.forEach(year => {
            const yearString = String(year);
            
            // Double-check for duplicates before adding
            if (!addedYears.has(yearString)) {
                const option = document.createElement('option');
                option.value = yearString;
                option.textContent = yearString;
                yearDropdown.appendChild(option);
                addedYears.add(yearString);
                console.log(`✅ Added year: ${yearString}`);
            } else {
                console.log(`⚠️ Skipped duplicate year: ${yearString}`);
            }
        });
        
        // STEP 6: Final verification
        const finalOptions = Array.from(yearDropdown.options)
            .slice(1) // Skip default option
            .map(opt => opt.value);
        
        console.log('🔍 Final dropdown options:', finalOptions);
        
        // STEP 7: Remove any remaining duplicates from DOM
        const seenValues = new Set(['']); // Include empty value
        Array.from(yearDropdown.options).forEach(option => {
            if (seenValues.has(option.value)) {
                console.log(`🗑️ Removing duplicate DOM option: ${option.value}`);
                option.remove();
            } else {
                seenValues.add(option.value);
            }
        });
        
        console.log(`✅ Successfully populated ${uniqueYears.length} unique years`);
        
    } catch (error) {
        console.error('❌ Error fetching years:', error);
        yearDropdown.innerHTML = '<option value="">Select Year</option>';
        alert('Error fetching years. Please try again.');
    }
}

// Compare Cars Function with Year
async function compareCars() {
    const selectedVariant = document.getElementById('variant').value;
    const selectedYear = document.getElementById('year').value;
    
    if (!selectedVariant) {
        alert("Please select a variant to compare.");
        return;
    }
    
    if (!selectedYear) {
        alert("Please select a year to compare.");
        return;
    }

    try {
        console.log('Fetching specs for variant:', selectedVariant, 'year:', selectedYear);
        
        // Include year in the API call
        const response = await fetch(`${baseUrl}/get_specs?variant=${selectedVariant}&year=${selectedYear}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const specs = await response.json();
        console.log('Received specs:', specs);

        if (!specs || Object.keys(specs).length === 0) {
            alert('No specifications found for this variant and year.');
            return;
        }

        // Create unique identifier including year
        const carId = `${selectedVariant}-${selectedYear}`;
        
        if (document.getElementById(`car-${carId}`)) {
            alert(`${selectedVariant} (${selectedYear}) is already in the comparison.`);
            return;
        }

        // Limit to 5 cars for better visualization
        if (comparedCars.length >= 5) {
            alert('Maximum 5 cars can be compared at once. Please remove a car first.');
            return;
        }

        addCarToComparison(carId, selectedVariant, selectedYear, specs);
        comparedCars.push({
            id: carId,
            variant: selectedVariant, 
            year: selectedYear,
            specs: specs
        });
        
        // Update all charts including radar
        setTimeout(() => {
            updateAllCharts();
        }, 100);
        
        // Show success message and reset form
        showSuccessMessage();
        resetCompareForm();

    } catch (error) {
        console.error('Error fetching car specs:', error);
        alert('Error fetching car specifications. Please try again.');
    }
}

// NEW: Function to populate brands dynamically
async function populateBrandsForCompare() {
    const brandDropdown = document.getElementById('brand');
    
    if (!brandDropdown) {
        console.log('Brand dropdown not found - not on compare page');
        return;
    }

    try {
        console.log('🔍 Fetching all available brands for compare...');
        
        const response = await fetch(`${baseUrl}/get_brands`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const brands = await response.json();
        console.log('📅 Received brands:', brands);
        
        if (!Array.isArray(brands)) {
            console.error('❌ Expected array of brands but got:', brands);
            return;
        }
        
        // Clear loading message and populate with brands
        brandDropdown.innerHTML = '<option value="" selected disabled>Select Brand</option>';
        
        brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            brandDropdown.appendChild(option);
        });
        
        console.log(`✅ Successfully populated ${brands.length} brands in compare dropdown`);
        
    } catch (error) {
        console.error('❌ Error fetching brands for compare:', error);
        // Show error state in dropdown
        brandDropdown.innerHTML = '<option value="" disabled>Error loading brands</option>';
    }
}

// Global object to store loaded logo images
let brandLogos = {};

// Function to load brand logo SVGs
async function loadBrandLogo(brandName) {
    if (!brandName) return null;
    
    const logoKey = brandName.toLowerCase();
    
    // Return cached logo if already loaded
    if (brandLogos[logoKey]) {
        return brandLogos[logoKey];
    }
    
    try {
        console.log(`Loading SVG logo for brand: ${brandName}`);
        
        // Fetch the SVG file
        const svgPath = `/static/brand_logo/${logoKey}_logo.svg`;
        const response = await fetch(svgPath);
        
        if (!response.ok) {
            console.warn(`SVG not found for brand: ${brandName} at ${svgPath}`);
            brandLogos[logoKey] = null;
            return null;
        }
        
        const svgText = await response.text();
        
        // Validate SVG content
        if (!svgText || !svgText.includes('<svg')) {
            console.warn(`Invalid SVG content for brand: ${brandName}`);
            brandLogos[logoKey] = null;
            return null;
        }
        
        // Create a new SVG element with consistent styling
        const processedSvg = processSvgForChart(svgText, brandName);
        
        // Convert SVG to image for canvas rendering
        const img = await svgToImage(processedSvg);
        
        brandLogos[logoKey] = img;
        console.log(`✅ Successfully loaded logo for: ${brandName}`);
        return img;
        
    } catch (error) {
        console.warn(`Error loading SVG logo for brand ${brandName}:`, error);
        brandLogos[logoKey] = null;
        return null;
    }
}

// Function to process SVG and apply consistent styling
function processSvgForChart(svgText, brandName) {
    try {
        // Create a temporary div to parse the SVG
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svgText;
        const svgElement = tempDiv.querySelector('svg');
        
        if (!svgElement) {
            throw new Error('No SVG element found');
        }
        
        // Set consistent dimensions
        svgElement.setAttribute('width', '100');
        svgElement.setAttribute('height', '100');
        svgElement.setAttribute('viewBox', svgElement.getAttribute('viewBox') || '0 0 100 100');
        
        // Apply consistent color styling - your theme color
        const themeColor = '#b49b66'; // Your site's gold/brown color
        
        // More robust color processing for different SVG structures
        const allElements = svgElement.querySelectorAll('*');
        allElements.forEach(element => {
            // Remove any existing styles that might interfere
            element.removeAttribute('style');
            
            // Apply theme color to fill and stroke attributes
            if (element.hasAttribute('fill') && element.getAttribute('fill') !== 'none') {
                element.setAttribute('fill', themeColor);
            }
            if (element.hasAttribute('stroke') && element.getAttribute('stroke') !== 'none') {
                element.setAttribute('stroke', themeColor);
            }
            
            // Handle elements that might not have explicit fill/stroke
            if (element.tagName && ['path', 'circle', 'rect', 'polygon', 'ellipse', 'line'].includes(element.tagName.toLowerCase())) {
                element.setAttribute('fill', themeColor);
                element.setAttribute('stroke', 'none');
            }
        });
        
        // Special handling for specific brands that might have complex structures
        switch(brandName.toLowerCase()) {
            case 'bmw':
                // BMW logo often has complex nested structures
                svgElement.style.fill = themeColor;
                svgElement.style.color = themeColor;
                break;
            case 'tesla':
                // Tesla logo might have specific styling needs
                svgElement.style.fill = themeColor;
                svgElement.style.color = themeColor;
                break;
            case 'geely':
                svgElement.style.transform = 'scale(0.9)';
                break;
            case 'baojun':
                svgElement.style.transform = 'scale(0.95)';
                break;
        }
        
        // Add comprehensive styling to ensure visibility
        svgElement.style.background = 'transparent';
        svgElement.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
        
        // Force color through CSS as well
        svgElement.style.cssText += `
            fill: ${themeColor} !important;
            color: ${themeColor} !important;
        `;
        
        return svgElement.outerHTML;
        
    } catch (error) {
        console.warn(`Error processing SVG for ${brandName}:`, error);
        return svgText; // Return original if processing fails
    }
}

// Function to convert SVG to Image for canvas rendering
function svgToImage(svgString) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
            console.log('SVG converted to image successfully');
            resolve(img);
        };
        
        img.onerror = (error) => {
            console.error('Error converting SVG to image:', error);
            reject(error);
        };
        
        try {
            // Create data URL from SVG with proper encoding
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);
            
            img.src = svgUrl;
            
            // Clean up the blob URL after image loads
            img.onload = () => {
                URL.revokeObjectURL(svgUrl);
                resolve(img);
            };
            
            // Set a timeout for loading
            setTimeout(() => {
                if (!img.complete) {
                    URL.revokeObjectURL(svgUrl);
                    reject(new Error('SVG loading timeout'));
                }
            }, 5000);
            
        } catch (error) {
            reject(error);
        }
    });
}

// Add helper function for rounded rectangles (if not available)
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        this.beginPath();
        this.moveTo(x + radius, y);
        this.arcTo(x + width, y, x + width, y + height, radius);
        this.arcTo(x + width, y + height, x, y + height, radius);
        this.arcTo(x, y + height, x, y, radius);
        this.arcTo(x, y, x + width, y, radius);
        this.closePath();
        return this;
    };
}

// Function to preload all brand logos for compared cars
async function preloadBrandLogos() {
    const brands = [...new Set(comparedCars.map(car => car.specs.Brand))];
    console.log('🔄 Preloading SVG logos for brands:', brands);
    
    // Show loading indicator
    showLogoLoadingStatus(`Loading logos for ${brands.length} brands...`);
    
    const loadPromises = brands.map(async (brand) => {
        try {
            await loadBrandLogo(brand);
            return { brand, success: true };
        } catch (error) {
            console.warn(`Failed to load logo for ${brand}:`, error);
            return { brand, success: false };
        }
    });
    
    const results = await Promise.all(loadPromises);
    
    const successCount = results.filter(r => r.success).length;
    const failedBrands = results.filter(r => !r.success).map(r => r.brand);
    
    console.log(`✅ Loaded ${successCount}/${brands.length} brand logos`);
    if (failedBrands.length > 0) {
        console.warn('❌ Failed to load logos for:', failedBrands);
    }
    
    showLogoLoadingStatus(`Loaded ${successCount}/${brands.length} logos`, 2000);
    
    console.log('📊 Available brand logos:', Object.keys(brandLogos).filter(key => brandLogos[key] !== null));
}

// Function to show logo loading status
function showLogoLoadingStatus(message, autoHideDelay = null) {
    let statusElement = document.getElementById('logo-loading-status');
    
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'logo-loading-status';
        statusElement.className = 'logo-loading-status';
        statusElement.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #b49b66, #d4af37);
            color: white;
            padding: 0.75rem 1.25rem;
            border-radius: 25px;
            font-size: 0.85rem;
            font-weight: 600;
            z-index: 10000;
            transition: all 0.3s ease;
            opacity: 0;
            transform: translateY(20px);
            box-shadow: 0 8px 25px rgba(180, 155, 102, 0.4);
        `;
        document.body.appendChild(statusElement);
    }
    
    statusElement.textContent = message;
    statusElement.style.opacity = '1';
    statusElement.style.transform = 'translateY(0)';
    
    if (autoHideDelay) {
        setTimeout(() => {
            statusElement.style.opacity = '0';
            statusElement.style.transform = 'translateY(20px)';
        }, autoHideDelay);
    }
}

// Custom Chart.js plugin for drawing brand logos
const brandLogoPlugin = {
    id: 'brandLogo',
    afterDatasetsDraw: function(chart, args, options) {
        const { ctx, data, chartArea, scales } = chart;
        
        if (!data.datasets || !data.datasets[0] || !comparedCars) return;
        
        ctx.save();
        
        // Loop through each bar
        data.datasets[0].data.forEach((value, index) => {
            if (index >= comparedCars.length) return;
            
            const car = comparedCars[index];
            const brandName = car.specs.Brand;
            const logo = brandLogos[brandName.toLowerCase()];
            
            // Get bar position
            const meta = chart.getDatasetMeta(0);
            const bar = meta.data[index];
            
            if (!bar) return;
            
            // Calculate bar dimensions
            const barWidth = bar.width;
            const barHeight = Math.abs(bar.y - bar.base);
            
            // IMPROVED: More flexible logo sizing
            let logoSize;
            
            // Base logo size on both width and height, with better scaling
            const widthBasedSize = barWidth * 0.6; // Reduced from 0.7 to prevent cropping
            const heightBasedSize = barHeight * 0.4; // Allow logo to use 40% of height
            
            // Choose the smaller dimension to ensure logo fits
            logoSize = Math.min(widthBasedSize, heightBasedSize);
            
            // Set reasonable bounds
            const maxLogoSize = 50;
            const minLogoSize = 20; // Reduced minimum size for better display in small bars
            logoSize = Math.max(minLogoSize, Math.min(logoSize, maxLogoSize));
            
            // Position logo in the center of the bar
            const logoX = bar.x - logoSize / 2;
            const logoY = bar.y + (bar.base - bar.y) / 2 - logoSize / 2;
            
            // IMPROVED: More lenient threshold for showing logos
            const minBarHeightForLogo = logoSize + 8; // Reduced padding requirement
            
            if (barHeight > minBarHeightForLogo && logo) {
                try {
                    // IMPROVED: Enhanced white circle background
                    ctx.beginPath();
                    const circleRadius = logoSize / 2 + 4;
                    ctx.arc(bar.x, bar.y + (bar.base - bar.y) / 2, circleRadius, 0, 2 * Math.PI);
                    
                    // White background with subtle gradient
                    const gradient = ctx.createRadialGradient(
                        bar.x, bar.y + (bar.base - bar.y) / 2, 0,
                        bar.x, bar.y + (bar.base - bar.y) / 2, circleRadius
                    );
                    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.92)');
                    
                    ctx.fillStyle = gradient;
                    ctx.fill();
                    
                    // Border
                    ctx.strokeStyle = 'rgba(180, 155, 102, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    // Draw the logo
                    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
                    
                } catch (error) {
                    console.warn('Error drawing logo for', brandName, ':', error);
                    drawBrandNameFallback(ctx, chart, index, brandName, logoSize);
                }
            } else if (barHeight > 25) { // Even smaller bars can show brand name
                // Show brand name for smaller bars or when logo fails
                drawBrandNameFallback(ctx, chart, index, brandName, Math.min(logoSize, 30));
            }
        });
        
        ctx.restore();
    }
};

// Fallback function to draw brand name when logo is not available or bar is too small
function drawBrandNameFallback(ctx, chart, index, brandName, size) {
    const meta = chart.getDatasetMeta(0);
    const bar = meta.data[index];
    
    if (!bar) return;
    
    const barHeight = Math.abs(bar.y - bar.base);
    const barWidth = bar.width;
    
    // Only draw text if bar is tall enough
    if (barHeight > 20) {
        ctx.save();
        
        // Determine font size based on available space
        const fontSize = Math.min(Math.max(size * 0.3, 10), 14);
        
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Prepare brand name text
        const displayText = brandName.length > 6 ? brandName.substring(0, 6) : brandName;
        const textWidth = ctx.measureText(displayText).width;
        
        // Create background circle/rectangle for text
        const centerX = bar.x;
        const centerY = bar.y + (bar.base - bar.y) / 2;
        
        // Background
        ctx.beginPath();
        if (barWidth < textWidth + 10) {
            // If bar is narrow, use circular background
            const radius = Math.min(barWidth * 0.4, fontSize + 8);
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        } else {
            // If bar is wide enough, use rounded rectangle
            const rectWidth = textWidth + 8;
            const rectHeight = fontSize + 6;
            ctx.roundRect(centerX - rectWidth/2, centerY - rectHeight/2, rectWidth, rectHeight, 4);
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(180, 155, 102, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw text
        ctx.fillStyle = '#b49b66';
        
        if (barWidth < textWidth + 10 && barHeight > textWidth + 10) {
            // Rotate text for narrow bars if there's enough height
            ctx.translate(centerX, centerY);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(displayText, 0, 0);
        } else {
            // Normal horizontal text
            ctx.fillText(displayText, centerX, centerY);
        }
        
        ctx.restore();
    }
}

function initializeComparePage() {
    // Check if we're on the compare page
    const brandDropdown = document.getElementById('brand');
    const isComparePage = brandDropdown && document.getElementById('compare-charts-section');
    
    if (isComparePage) {
        console.log('🔧 Initializing compare page...');
        
        // Populate brands when page loads
        populateBrandsForCompare();
        
        console.log('✅ Compare page initialized');
    }
}

function showSuccessMessage() {
    const successMessage = document.getElementById('compare-success-message');
    if (successMessage) {
        successMessage.style.display = 'flex';
        
        // Hide message after 3 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);
    }
}

function resetCompareForm() {
    // Reset all dropdowns to default
    const brandSelect = document.getElementById('brand');
    const modelSelect = document.getElementById('model');
    const variantSelect = document.getElementById('variant');
    const yearSelect = document.getElementById('year');
    
    if (brandSelect) brandSelect.selectedIndex = 0;
    if (modelSelect) modelSelect.innerHTML = '<option value="">Select Model</option>';
    if (variantSelect) variantSelect.innerHTML = '<option value="">Select Variant</option>';
    if (yearSelect) yearSelect.innerHTML = '<option value="">Select Year</option>';
}

// UPDATED: Remove car function to handle separate radar section
function removeCarFromComparison(carId) {
    const cardElement = document.querySelector(`#car-${carId}`);
    if (cardElement) {
        cardElement.remove();
    }
    
    comparedCars = comparedCars.filter(car => car.id !== carId);
    updateAllCharts();
    
    // Hide comparison sections if no cars left
    if (comparedCars.length === 0) {
        const cardsWrapper = document.getElementById('comparison-cards-wrapper');
        const chartsSection = document.getElementById('compare-charts-section');
        const radarSection = document.getElementById('radar-chart-section');
        
        if (cardsWrapper) cardsWrapper.style.display = 'none';
        if (chartsSection) chartsSection.style.display = 'none';
        if (radarSection) radarSection.style.display = 'none';
    }
}

// UPDATED: Add car to comparison with year display and new remove function
function addCarToComparison(carId, variant, year, specs) {
    const container = document.getElementById('comparison-container');
    const carColumn = document.createElement('div');
    carColumn.id = `car-${carId}`;
    carColumn.classList.add('car-column');

    // Check if car is already liked and set appropriate heart style
    const isLiked = userFavorites.has(variant);
    const heartClass = isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    const heartColor = isLiked ? '#e74c3c' : '#b49b66'; // Red if liked, gold if not

    // Car title with year and heart icon
    const carTitle = document.createElement('div');
    carTitle.classList.add('car-title');
    carTitle.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span style="flex: 1; text-align: center;">${variant} (${year})</span>
            <div class="heart-container" style="margin-left: 10px;">
                <i class="${heartClass}" 
                   id="compare-like-icon" 
                   style="color: ${heartColor}; cursor: pointer; font-size: 1.2rem;" 
                   onclick="addToFave(event, '${variant}')"></i>
            </div>
        </div>
    `;
    carColumn.appendChild(carTitle);

    // Car image
    if (specs['Image']) {
        const imgContainer = document.createElement('div');
        imgContainer.classList.add('car-image-container');
        const img = document.createElement('img');
        img.src = specs['Image'];
        img.alt = `Image of ${variant} ${year}`;
        img.classList.add('car-image');
        imgContainer.appendChild(img);
        carColumn.appendChild(imgContainer);
    }

    // Spec sections with year included
    const specSections = {
        "General Specifications": ["Brand", "Model", "Year"],
        "Performance Specifications": ["Horsepower", "Engine", "Transmission", "DriveTrain", "FuelType"],
        "Utility Specifications": ["SeatingCapacity", "GroundClearance", "Cargospace"]
    };

    for (const [category, keys] of Object.entries(specSections)) {
        const sectionDiv = document.createElement('div');
        sectionDiv.classList.add('spec-section');
        
        const categoryTitle = document.createElement('div');
        categoryTitle.classList.add('spec-category');
        categoryTitle.textContent = category;
        sectionDiv.appendChild(categoryTitle);

        keys.forEach(key => {
            if (specs[key] !== undefined && specs[key] !== "" && specs[key] !== 0) {
                const specDiv = document.createElement('div');
                specDiv.classList.add('spec-value');
                
                let formattedValue = specs[key];
                if (key === "Horsepower") formattedValue += " hp";
                if (key === "GroundClearance") formattedValue += " cm";
                if (key === "Cargospace") formattedValue += " L";
                
                specDiv.innerHTML = `<span class="spec-label">${key.replace(/([A-Z])/g, ' $1').trim()}:</span> ${formattedValue}`;
                
                // Add performance bar for numeric values
                if (key === "Horsepower" || key === "SeatingCapacity" || key === "GroundClearance") {
                    const progressBar = createProgressBar(formattedValue, key);
                    specDiv.appendChild(progressBar);
                }
                
                sectionDiv.appendChild(specDiv);
            }
        });

        carColumn.appendChild(sectionDiv);
    }

    // Price section
    if (specs["Price"]) {
        const priceDiv = document.createElement('div');
        priceDiv.classList.add('price-comparison');
        const formattedPrice = new Intl.NumberFormat('en-PH', { 
            style: 'currency', 
            currency: 'PHP' 
        }).format(specs["Price"]);
        priceDiv.innerHTML = `<div class="price-value">${formattedPrice}</div>`;
        carColumn.appendChild(priceDiv);
    }

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.classList.add('remove-btn');
    removeBtn.textContent = "Remove Car";
    removeBtn.onclick = () => removeCarFromComparison(carId);

    carColumn.appendChild(removeBtn);
    container.appendChild(carColumn);
    
    // Show the comparison cards wrapper
    const cardsWrapper = document.getElementById('comparison-cards-wrapper');
    if (cardsWrapper) cardsWrapper.style.display = 'block';
}

function createProgressBar(value, type) {
    const progressContainer = document.createElement('div');
    progressContainer.classList.add('performance-bar');
    
    const progressFill = document.createElement('div');
    progressFill.classList.add('performance-fill');
    
    // Calculate percentage based on type with dynamic scaling
    let percentage = 0;
    const numValue = parseInt(value);
    
    switch(type) {
        case "Horsepower":
            const maxHP = comparedCars.length > 0 ? Math.max(...comparedCars.map(car => parseInt(car.specs.Horsepower) || 0), numValue) : Math.max(numValue, 200);
            percentage = (numValue / maxHP) * 100;
            break;
        case "SeatingCapacity":
            percentage = (numValue / 8) * 100;
            break;
        case "GroundClearance":
            const maxClearance = comparedCars.length > 0 ? Math.max(...comparedCars.map(car => parseInt(car.specs.GroundClearance) || 0), numValue) : Math.max(numValue, 25);
            percentage = (numValue / maxClearance) * 100;
            break;
    }
    
    progressFill.style.width = `${Math.min(percentage, 100)}%`;
    progressContainer.appendChild(progressFill);
    
    return progressContainer;
}

// UPDATED: Dynamic Radar Chart Implementation with Dynamic Scaling
function updateRadarChart() {
    const canvas = document.getElementById('radarChart');
    if (!canvas) {
        console.error('Radar chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (chartInstances.radar) {
        chartInstances.radar.destroy();
    }

    // Set canvas size for better clarity
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // IMPROVED: Balanced scaling approach
    const actualMaxValues = {
        horsepower: Math.max(...comparedCars.map(car => parseInt(car.specs.Horsepower) || 0)),
        price: Math.max(...comparedCars.map(car => parseFloat(car.specs.Price) || 0)),
        groundClearance: Math.max(...comparedCars.map(car => parseFloat(car.specs.GroundClearance) || 0)),
        cargoSpace: Math.max(...comparedCars.map(car => parseFloat(car.specs.Cargospace) || 0)),
        seatingCapacity: Math.max(...comparedCars.map(car => parseInt(car.specs.SeatingCapacity) || 0))
    };

    const actualMinValues = {
        horsepower: Math.min(...comparedCars.map(car => parseInt(car.specs.Horsepower) || 0)),
        price: Math.min(...comparedCars.map(car => parseFloat(car.specs.Price) || 0)),
        groundClearance: Math.min(...comparedCars.map(car => parseFloat(car.specs.GroundClearance) || 0)),
        cargoSpace: Math.min(...comparedCars.map(car => parseFloat(car.specs.Cargospace) || 0)),
        seatingCapacity: Math.min(...comparedCars.map(car => parseInt(car.specs.SeatingCapacity) || 0))
    };

    // HYBRID SCALING: Use reasonable fixed maximums, but scale down if all cars are much lower
    const reasonableMaximums = {
        horsepower: 400,
        price: 4000000,
        groundClearance: 35,
        cargoSpace: 1500,
        seatingCapacity: 8
    };

    const scalingMaxValues = {};
    
    Object.keys(actualMaxValues).forEach(key => {
        const actualMax = actualMaxValues[key];
        const reasonableMax = reasonableMaximums[key];
        
        // If the actual max is less than 70% of reasonable max, scale down
        if (actualMax < (reasonableMax * 0.7)) {
            scalingMaxValues[key] = actualMax * 1.3; // Make best car show at ~77%
        } else {
            scalingMaxValues[key] = reasonableMax;
        }
    });

    console.log('🎯 Balanced scaling values:', scalingMaxValues);
    console.log('📊 Actual max values:', actualMaxValues);

    // Store for tooltip reference
    window.radarScalingMaxValues = scalingMaxValues;
    window.radarActualMaxValues = actualMaxValues;

    // Prepare datasets with balanced scaling
    const datasets = comparedCars.map((car, index) => {
        const specs = car.specs;
        
        // Scale using balanced approach
        const horsepower = Math.min(((parseInt(specs.Horsepower) || 0) / scalingMaxValues.horsepower) * 100, 100);
        const priceScore = Math.min(((parseFloat(specs.Price) || 0) / scalingMaxValues.price) * 100, 100);
        const groundClearance = Math.min(((parseFloat(specs.GroundClearance) || 0) / scalingMaxValues.groundClearance) * 100, 100);
        const cargoSpace = Math.min(((parseFloat(specs.Cargospace) || 0) / scalingMaxValues.cargoSpace) * 100, 100);
        const seatingCapacity = Math.min(((parseInt(specs.SeatingCapacity) || 0) / scalingMaxValues.seatingCapacity) * 100, 100);
        
        return {
            label: `${car.variant} (${car.year})`,
            data: [horsepower, priceScore, groundClearance, cargoSpace, seatingCapacity],
            backgroundColor: chartBackgroundColors[index % chartBackgroundColors.length],
            borderColor: chartColors[index % chartColors.length],
            borderWidth: 4,
            pointBackgroundColor: chartColors[index % chartColors.length],
            pointBorderColor: '#fff',
            pointBorderWidth: 3,
            pointRadius: 7,
            hidden: false
        };
    });

    chartInstances.radar = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Power', 'Price', 'Clearance', 'Cargo', 'Seating'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: dpr,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: '#b49b66',
                        font: { weight: 'bold', size: 16 }, // Increased font size
                        padding: 25,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        generateLabels: function(chart) {
                            const original = Chart.defaults.plugins.legend.labels.generateLabels;
                            const labels = original.call(this, chart);
                            
                            labels.forEach(label => {
                                label.text = `📊 ${label.text}`;
                            });
                            
                            return labels;
                        }
                    },
                    onHover: function(evt, item, legend) {
                        evt.native.target.style.cursor = 'pointer';
                    },
                    onLeave: function(evt, item, legend) {
                        evt.native.target.style.cursor = 'default';
                    },
                    onClick: function(evt, item, legend) {
                        const index = item.datasetIndex;
                        const chart = legend.chart;
                        
                        if (chart.isDatasetVisible(index)) {
                            chart.hide(index);
                        } else {
                            chart.show(index);
                        }
                        
                        chart.update();
                    }
                },
                tooltip: {
                    titleFont: { size: 16 },
                    bodyFont: { size: 14 },
                    callbacks: {
                        label: function(context) {
                            const car = comparedCars[context.datasetIndex];
                            const specs = car.specs;
                            
                            switch(context.dataIndex) {
                                case 0: return `Power: ${specs.Horsepower || 0} HP`;
                                case 1: return `Price: ₱${parseInt(specs.Price || 0).toLocaleString()}`;
                                case 2: return `Clearance: ${specs.GroundClearance || 0} cm`;
                                case 3: return `Cargo: ${specs.Cargospace || 0} L`;
                                case 4: return `Seating: ${specs.SeatingCapacity || 0} seats`;
                                default: return '';
                            }
                        },
                        afterLabel: function(context) {
                            const percentage = context.parsed.r.toFixed(1);
                            return `${percentage}% on scale`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        display: true,
                        stepSize: 25,
                        color: '#b49b66',
                        font: { size: 14, weight: 'bold' }, // Increased font size
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        color: 'rgba(180, 155, 102, 0.3)',
                        lineWidth: 2
                    },
                    angleLines: {
                        color: 'rgba(180, 155, 102, 0.4)',
                        lineWidth: 2
                    },
                    pointLabels: {
                        color: '#b49b66',
                        font: { 
                            weight: 'bold',
                            size: 18 // Increased font size
                        }
                    }
                }
            },
            interaction: {
                intersect: false
            },
            elements: {
                line: {
                    borderWidth: 4
                },
                point: {
                    radius: 7,
                    hoverRadius: 10
                }
            }
        }
    });

    // Add individual toggle controls only (no instructions)
    addIndividualToggleControls();
}

// UPDATED: Helper function to format max values for tooltips
function formatMaxValue(maxValue, dataIndex) {
    switch(dataIndex) {
        case 0: return `${Math.round(maxValue)} HP`;
        case 1: return `₱${(maxValue / 1000000).toFixed(1)}M`;
        case 2: return `${maxValue.toFixed(1)} cm`;
        case 3: return `${Math.round(maxValue)} L`;
        case 4: return `${Math.round(maxValue)} seats`;
        default: return maxValue.toString();
    }
}

// NEW: Add individual toggle controls for better UX
function addIndividualToggleControls() {
    // Remove existing toggle controls
    const existingToggles = document.querySelector('.individual-toggles');
    if (existingToggles) {
        existingToggles.remove();
    }

    const radarContainer = document.querySelector('.radar-chart-container');
    if (radarContainer && comparedCars.length > 1) {
        const togglesDiv = document.createElement('div');
        togglesDiv.className = 'individual-toggles';
        togglesDiv.style.cssText = `
            margin-top: 1.5rem;
            padding: 1.5rem;
            background: rgba(180, 155, 102, 0.1);
            border-radius: 10px;
            border: 1px solid rgba(180, 155, 102, 0.3);
        `;

        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = `
            <div style="
                text-align: center; 
                font-weight: bold; 
                color: #b49b66; 
                margin-bottom: 1rem;
                font-size: 1.1rem;
            ">
                <i class='bx bx-show' style='margin-right: 0.5rem;'></i>
                Individual Car Visibility Controls
            </div>
        `;
        togglesDiv.appendChild(titleDiv);

        const controlsContainer = document.createElement('div');
        controlsContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 1.2rem;
            justify-content: center;
            align-items: center;
        `;

        comparedCars.forEach((car, index) => {
            const checkboxContainer = document.createElement('div');
            checkboxContainer.style.cssText = `
                display: flex;
                align-items: center;
                gap: 0.7rem;
                padding: 0.7rem 1rem;
                background: white;
                border-radius: 8px;
                border: 1px solid rgba(180, 155, 102, 0.3);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                transition: all 0.2s ease;
            `;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `toggle-car-${index}`;
            checkbox.checked = true;
            checkbox.style.cssText = `
                width: 18px;
                height: 18px;
                accent-color: #b49b66;
                cursor: pointer;
            `;

            const label = document.createElement('label');
            label.htmlFor = `toggle-car-${index}`;
            label.textContent = `${car.variant} (${car.year})`;
            label.style.cssText = `
                font-size: 0.9rem;
                color: #333;
                cursor: pointer;
                font-weight: 500;
            `;

            // Color indicator
            const colorIndicator = document.createElement('div');
            colorIndicator.style.cssText = `
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background-color: ${chartColors[index % chartColors.length]};
                border: 2px solid #fff;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            `;

            checkbox.addEventListener('change', function() {
                const chart = chartInstances.radar;
                if (chart) {
                    if (this.checked) {
                        chart.show(index);
                    } else {
                        chart.hide(index);
                    }
                    chart.update();
                }
            });

            // Add hover effect
            checkboxContainer.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            });

            checkboxContainer.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            });

            checkboxContainer.appendChild(colorIndicator);
            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
            controlsContainer.appendChild(checkboxContainer);
        });

        togglesDiv.appendChild(controlsContainer);
        radarContainer.appendChild(togglesDiv);
    }
}

// Bar chart functions with updated colors
function updateHorsepowerChart() {
    const canvas = document.getElementById('horsepowerChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (chartInstances.horsepower) {
        chartInstances.horsepower.destroy();
    }

    const labels = comparedCars.map(car => `${car.variant}\n(${car.year})`);
    const data = comparedCars.map(car => parseInt(car.specs.Horsepower) || 0);
    const colors = chartBackgroundColors.slice(0, comparedCars.length);
    const borderColors = chartColors.slice(0, comparedCars.length);

    chartInstances.horsepower = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Horsepower (HP)',
                data: data,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(45, 45, 45, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#b49b66',
                    borderWidth: 2,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            const carIndex = context[0].dataIndex;
                            const car = comparedCars[carIndex];
                            return `${car.specs.Brand} ${car.variant} (${car.year})`;
                        },
                        label: function(context) {
                            return `Horsepower: ${context.parsed.y} HP`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Horsepower (HP)',
                        color: '#b49b66',
                        font: { weight: 'bold', size: 14 }
                    },
                    grid: { color: 'rgba(180, 155, 102, 0.1)' },
                    ticks: {
                        color: '#666',
                        font: { size: 12 }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { 
                        maxRotation: 45, 
                        minRotation: 0,
                        color: '#666',
                        font: { size: 11 }
                    }
                }
            }
        },
        plugins: [brandLogoPlugin]
    });
}

// REPLACE your existing updatePriceChart function with this:
function updatePriceChart() {
    const canvas = document.getElementById('priceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (chartInstances.price) {
        chartInstances.price.destroy();
    }

    const labels = comparedCars.map(car => `${car.variant}\n(${car.year})`);
    const data = comparedCars.map(car => parseFloat(car.specs.Price) || 0);
    const colors = chartBackgroundColors.slice(0, comparedCars.length);
    const borderColors = chartColors.slice(0, comparedCars.length);

    chartInstances.price = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Price (PHP)',
                data: data,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(45, 45, 45, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#b49b66',
                    borderWidth: 2,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            const carIndex = context[0].dataIndex;
                            const car = comparedCars[carIndex];
                            return `${car.specs.Brand} ${car.variant} (${car.year})`;
                        },
                        label: function(context) {
                            return `Price: ${new Intl.NumberFormat('en-PH', { 
                                style: 'currency', 
                                currency: 'PHP' 
                            }).format(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Price (PHP)',
                        color: '#b49b66',
                        font: { weight: 'bold', size: 14 }
                    },
                    grid: { color: 'rgba(180, 155, 102, 0.1)' },
                    ticks: {
                        color: '#666',
                        font: { size: 12 },
                        callback: function(value) {
                            return '₱' + (value / 1000000).toFixed(1) + 'M';
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { 
                        maxRotation: 45, 
                        minRotation: 0,
                        color: '#666',
                        font: { size: 11 }
                    }
                }
            }
        },
        plugins: [brandLogoPlugin]
    });
}

// REPLACE your existing updateGroundClearanceChart function with this:
function updateGroundClearanceChart() {
    const canvas = document.getElementById('groundClearanceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (chartInstances.groundClearance) {
        chartInstances.groundClearance.destroy();
    }

    const labels = comparedCars.map(car => `${car.variant}\n(${car.year})`);
    const data = comparedCars.map(car => parseFloat(car.specs.GroundClearance) || 0);
    const colors = chartBackgroundColors.slice(0, comparedCars.length);
    const borderColors = chartColors.slice(0, comparedCars.length);

    chartInstances.groundClearance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ground Clearance (cm)',
                data: data,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(45, 45, 45, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#b49b66',
                    borderWidth: 2,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            const carIndex = context[0].dataIndex;
                            const car = comparedCars[carIndex];
                            return `${car.specs.Brand} ${car.variant} (${car.year})`;
                        },
                        label: function(context) {
                            return `Ground Clearance: ${context.parsed.y} cm`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Ground Clearance (cm)',
                        color: '#b49b66',
                        font: { weight: 'bold', size: 14 }
                    },
                    grid: { color: 'rgba(180, 155, 102, 0.1)' },
                    ticks: {
                        color: '#666',
                        font: { size: 12 }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { 
                        maxRotation: 45, 
                        minRotation: 0,
                        color: '#666',
                        font: { size: 11 }
                    }
                }
            }
        },
        plugins: [brandLogoPlugin]
    });
}

// REPLACE your existing updateSeatingCapacityChart function with this:
function updateSeatingCapacityChart() {
    const canvas = document.getElementById('seatingCapacityChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (chartInstances.seatingCapacity) {
        chartInstances.seatingCapacity.destroy();
    }

    const labels = comparedCars.map(car => `${car.variant}\n(${car.year})`);
    const data = comparedCars.map(car => parseInt(car.specs.SeatingCapacity) || 0);
    const colors = chartBackgroundColors.slice(0, comparedCars.length);
    const borderColors = chartColors.slice(0, comparedCars.length);

    chartInstances.seatingCapacity = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Seating Capacity',
                data: data,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(45, 45, 45, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#b49b66',
                    borderWidth: 2,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            const carIndex = context[0].dataIndex;
                            const car = comparedCars[carIndex];
                            return `${car.specs.Brand} ${car.variant} (${car.year})`;
                        },
                        label: function(context) {
                            return `Seating: ${context.parsed.y} seats`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Seating Capacity',
                        color: '#b49b66',
                        font: { weight: 'bold', size: 14 }
                    },
                    grid: { color: 'rgba(180, 155, 102, 0.1)' },
                    ticks: { 
                        stepSize: 1,
                        color: '#666',
                        font: { size: 12 }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { 
                        maxRotation: 45, 
                        minRotation: 0,
                        color: '#666',
                        font: { size: 11 }
                    }
                }
            }
        },
        plugins: [brandLogoPlugin]
    });
}

// REPLACE your existing updateCargoSpaceChart function with this:
function updateCargoSpaceChart() {
    const canvas = document.getElementById('cargoSpaceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (chartInstances.cargoSpace) {
        chartInstances.cargoSpace.destroy();
    }

    const labels = comparedCars.map(car => `${car.variant}\n(${car.year})`);
    const data = comparedCars.map(car => parseFloat(car.specs.Cargospace) || 0);
    const colors = chartBackgroundColors.slice(0, comparedCars.length);
    const borderColors = chartColors.slice(0, comparedCars.length);

    chartInstances.cargoSpace = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cargo Space (L)',
                data: data,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(45, 45, 45, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#b49b66',
                    borderWidth: 2,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            const carIndex = context[0].dataIndex;
                            const car = comparedCars[carIndex];
                            return `${car.specs.Brand} ${car.variant} (${car.year})`;
                        },
                        label: function(context) {
                            return `Cargo Space: ${context.parsed.y} L`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cargo Space (Liters)',
                        color: '#b49b66',
                        font: { weight: 'bold', size: 14 }
                    },
                    grid: { color: 'rgba(180, 155, 102, 0.1)' },
                    ticks: {
                        color: '#666',
                        font: { size: 12 }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { 
                        maxRotation: 45, 
                        minRotation: 0,
                        color: '#666',
                        font: { size: 11 }
                    }
                }
            }
        },
        plugins: [brandLogoPlugin]
    });
}

// REPLACE your existing updateAllCharts function with this:
async function updateAllCharts() {
    console.log('🔄 Updating all charts for', comparedCars.length, 'cars');
    
    if (comparedCars.length === 0) {
        const chartsSection = document.getElementById('compare-charts-section');
        const radarSection = document.getElementById('radar-chart-section');
        const cardsWrapper = document.getElementById('comparison-cards-wrapper');
        
        if (chartsSection) chartsSection.style.display = 'none';
        if (radarSection) radarSection.style.display = 'none';
        if (cardsWrapper) cardsWrapper.style.display = 'none';
        
        // Destroy all existing charts
        Object.values(chartInstances).forEach(chart => {
            if (chart) chart.destroy();
        });
        chartInstances = {};
        return;
    }

    // Show all sections
    const chartsSection = document.getElementById('compare-charts-section');
    const radarSection = document.getElementById('radar-chart-section');
    const cardsWrapper = document.getElementById('comparison-cards-wrapper');
    
    if (chartsSection) chartsSection.style.display = 'block';
    if (radarSection) radarSection.style.display = 'block';
    if (cardsWrapper) cardsWrapper.style.display = 'block';
    
    // Preload brand logos first
    await preloadBrandLogos();
    
    // Wait for DOM to be ready, then create all charts
    setTimeout(() => {
        console.log('🎨 Creating charts with brand logos...');
        updateHorsepowerChart();
        updatePriceChart();
        updateGroundClearanceChart();
        updateCargoSpaceChart();
        updateSeatingCapacityChart();
        updateRadarChart(); // Keep your existing radar chart function
        console.log('✅ All charts updated with logos');
    }, 300);
}

// Event listeners for dropdowns
document.addEventListener('DOMContentLoaded', function() {
    const brandDropdown = document.getElementById('brand');
    const modelDropdown = document.getElementById('model');
    const variantDropdown = document.getElementById('variant');

    if (brandDropdown) {
        brandDropdown.addEventListener('change', populateModels);
    }
    if (modelDropdown) {
        modelDropdown.addEventListener('change', populateVariants);
    }
    if (variantDropdown) {
        variantDropdown.addEventListener('change', populateYears);
    }
});

// Handle window resize for responsive charts
window.addEventListener('resize', function() {
    Object.values(chartInstances).forEach(chart => {
        if (chart) {
            chart.resize();
        }
    });
});

// Clean up chart instances when page unloads
window.addEventListener('beforeunload', function() {
    Object.values(chartInstances).forEach(chart => {
        if (chart) {
            chart.destroy();
        }
    });
});

//////////////////////////////////
// Shows corresponding models  //
// when a specific brand is   //
// selected by the user      //
//////////////////////////////

async function populateModels() {
    const selectedBrand = document.getElementById('brand').value;
    const modelSelect = document.getElementById('model');
    const variantSelect = document.getElementById('variant');
    const yearSelect = document.getElementById('year');

    // Reset dependent dropdowns
    modelSelect.innerHTML = '<option value="">Select Model</option>';
    variantSelect.innerHTML = '<option value="">Select Variant</option>';
    yearSelect.innerHTML = '<option value="">Select Year</option>';

    if (!selectedBrand) {
        return;
    }

    try {
        console.log(`🔍 Fetching models for brand: ${selectedBrand}`);
        modelSelect.innerHTML = '<option value="">Loading models...</option>';
        
        const response = await fetch(`${baseUrl}/get_models?brand=${selectedBrand}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const models = await response.json();
        console.log(`📦 Received ${models.length} models for ${selectedBrand}:`, models);
        
        modelSelect.innerHTML = '<option value="">Select Model</option>';
        
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelSelect.appendChild(option);
        });
        
        console.log(`✅ Successfully populated ${models.length} models for ${selectedBrand}`);
        
    } catch (error) {
        console.error('❌ Error fetching models:', error);
        modelSelect.innerHTML = '<option value="">Error loading models</option>';
        alert('Error fetching models. Please try again.');
    }
}

///////////////////////////////////////////
// Shows the corresponding variants     //
// when a specific model is selected   //
// by the user                        //
///////////////////////////////////////

async function populateVariants() {
    const selectedModel = document.getElementById('model').value;
    const variantSelect = document.getElementById('variant');
    const yearSelect = document.getElementById('year');
    
    // Reset dependent dropdowns
    variantSelect.innerHTML = '<option value="">Select Variant</option>';
    yearSelect.innerHTML = '<option value="">Select Year</option>';
    
    if (!selectedModel) {
        return;
    }

    try {
        console.log(`🔍 Fetching variants for model: ${selectedModel}`);
        variantSelect.innerHTML = '<option value="">Loading variants...</option>';
        
        const response = await fetch(`${baseUrl}/get_variants?model=${selectedModel}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const variants = await response.json();
        console.log(`📦 Received ${variants.length} variants for ${selectedModel}:`, variants);
        
        variantSelect.innerHTML = '<option value="">Select Variant</option>';
        
        variants.forEach(variant => {
            const option = document.createElement('option');
            option.value = variant;
            option.textContent = variant;
            variantSelect.appendChild(option);
        });
        
        console.log(`✅ Successfully populated ${variants.length} variants for ${selectedModel}`);
        
    } catch (error) {
        console.error('❌ Error fetching variants:', error);
        variantSelect.innerHTML = '<option value="">Error loading variants</option>';
        alert('Error fetching variants. Please try again.');
    }
}

////////////////////////
//FAVOURITES Function//
//////////////////////
async function addToFave(event, variant) {
    // Prevent event bubbling
    event.stopPropagation();
    
    // Check if user is authenticated
    if (!auth || !auth.currentUser) {
        alert('Please sign in to save favorites');
        return;
    }

    const isCurrentlyLiked = userFavorites.has(variant);
    const newLikedStatus = !isCurrentlyLiked;

    console.log('Like action:', variant, 'currently liked:', isCurrentlyLiked, 'new status:', newLikedStatus);

    // REQUIREMENT 1 & 4: Check for duplicates when trying to like
    if (newLikedStatus && userFavorites.has(variant)) {
        showLikeErrorMessage("You already liked this car!");
        return;
    }

    try {
        // Show loading state on heart
        const originalColor = event.target.style.color;
        event.target.style.color = '#95a5a6'; // Gray loading color
        
        const response = await fetch(`${baseUrl}/toggle-fave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variant: variant, liked: newLikedStatus })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const data = await response.json();
        
        // REQUIREMENT 2: Update heart appearance with new colors
        if (data.liked || data.status === 'added') {
            // Added to favorites - solid red heart
            event.target.classList.remove('fa-regular');
            event.target.classList.add('fa-solid');
            event.target.style.color = '#e74c3c'; // Red
            
            userFavorites.add(variant);
            showLikeSuccessMessage("Added to favorites!");
            
        } else {
            // Removed from favorites - outline gold heart
            event.target.classList.remove('fa-solid');
            event.target.classList.add('fa-regular');
            event.target.style.color = '#b49b66'; // Gold
            
            userFavorites.delete(variant);
            showLikeSuccessMessage("Removed from favorites!");
        }

        // If we're on the favorites page, reload the favorites immediately
        const favoritesContainer = document.getElementById("favorites-items");
        if (favoritesContainer) {
            setTimeout(() => {
                loadFavorites();
            }, 500);
        }

    } catch (error) {
        console.error('Error toggling favorite:', error);
        event.target.style.color = originalColor;
        showLikeErrorMessage('Error updating favorites. Please try again.');
    }
}

// NEW: Calculator page like function (separate from main filter function)
async function addToFaveFromCalculator(event, variant) {
    // Prevent event bubbling
    event.stopPropagation();
    
    // Check if user is authenticated
    if (!auth || !auth.currentUser) {
        alert('Please sign in to save favorites');
        return;
    }

    const isCurrentlyLiked = userFavorites.has(variant);
    const newLikedStatus = !isCurrentlyLiked;

    console.log('Calculator like action:', variant, 'currently liked:', isCurrentlyLiked, 'new status:', newLikedStatus);

    // Check for duplicates when trying to like
    if (newLikedStatus && userFavorites.has(variant)) {
        showLikeErrorMessage("You already liked this car!");
        return;
    }

    try {
        // Show loading state on heart
        const originalColor = event.target.style.color;
        event.target.style.color = '#95a5a6'; // Gray loading color
        
        const response = await fetch(`${baseUrl}/toggle-fave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variant: variant, liked: newLikedStatus })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const data = await response.json();
        
        // Update heart appearance with colors
        if (data.liked || data.status === 'added') {
            // Added to favorites - solid red heart
            event.target.classList.remove('fa-regular');
            event.target.classList.add('fa-solid');
            event.target.style.color = '#e74c3c'; // Red
            
            userFavorites.add(variant);
            showLikeSuccessMessage("Added to favorites!");
            
        } else {
            // Removed from favorites - outline gold heart  
            event.target.classList.remove('fa-solid');
            event.target.classList.add('fa-regular');
            event.target.style.color = '#b49b66'; // Gold
            
            userFavorites.delete(variant);
            showLikeSuccessMessage("Removed from favorites!");
        }

    } catch (error) {
        console.error('Error toggling favorite from calculator:', error);
        event.target.style.color = originalColor;
        showLikeErrorMessage('Error updating favorites. Please try again.');
    }
}

///////////////////////////////////////
// ENHANCED FAVOURITES FUNCTIONALITY //
///////////////////////////////////////

// Global variable to store user's current favorites for quick checking
let userFavorites = new Set();

// Load user favorites into memory for quick duplicate checking
async function loadUserFavoritesForDuplicateCheck() {
    if (!auth || !auth.currentUser) {
        userFavorites.clear();
        return;
    }

    try {
        const response = await fetch(`${baseUrl}/get-faves`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
            const favorites = await response.json();
            userFavorites.clear();
            favorites.forEach(fav => {
                userFavorites.add(fav.variant);
            });
            console.log('Loaded favorites for duplicate check:', userFavorites);
            
            // Update heart colors on current page
            updateHeartColorsOnPage();
        }
    } catch (error) {
        console.error('Error loading favorites for duplicate check:', error);
    }
}

// Update heart colors based on current favorites
function updateHeartColorsOnPage() {
    // Update main filter page hearts
    document.querySelectorAll('[id="like-icon"]').forEach(heart => {
        const onclick = heart.getAttribute('onclick');
        if (onclick) {
            // Extract variant from onclick attribute
            const match = onclick.match(/addToFave\(event,\s*['"`]([^'"`]+)['"`]\)/);
            if (match) {
                const variant = match[1];
                if (userFavorites.has(variant)) {
                    // Already liked - red heart
                    heart.className = 'fa-solid fa-heart';
                    heart.style.color = '#e74c3c'; // Red
                } else {
                    // Not liked - gold outline heart
                    heart.className = 'fa-regular fa-heart';
                    heart.style.color = '#b49b66'; // Gold
                }
            }
        }
    });

    // Update calculator page hearts
    document.querySelectorAll('[id="calculator-like-icon"]').forEach(heart => {
        const onclick = heart.getAttribute('onclick');
        if (onclick) {
            const match = onclick.match(/addToFaveFromCalculator\(event,\s*['"`]([^'"`]+)['"`]\)/);
            if (match) {
                const variant = match[1];
                if (userFavorites.has(variant)) {
                    heart.className = 'fa-solid fa-heart';
                    heart.style.color = '#e74c3c'; // Red
                } else {
                    heart.className = 'fa-regular fa-heart';
                    heart.style.color = '#b49b66'; // Gold
                }
            }
        }
    });

    // NEW: Update comparison page hearts
    document.querySelectorAll('[id="compare-like-icon"]').forEach(heart => {
        const onclick = heart.getAttribute('onclick');
        if (onclick) {
            const match = onclick.match(/addToFave\(event,\s*['"`]([^'"`]+)['"`]\)/);
            if (match) {
                const variant = match[1];
                if (userFavorites.has(variant)) {
                    heart.className = 'fa-solid fa-heart';
                    heart.style.color = '#e74c3c'; // Red
                } else {
                    heart.className = 'fa-regular fa-heart';
                    heart.style.color = '#b49b66'; // Gold
                }
            }
        }
    });
}

// Success message display
function showLikeSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'like-message success';
    messageDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }
    }, 2000);
}

// Error message display
function showLikeErrorMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'like-message error';
    messageDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }
    }, 3000);
}

// Add CSS animations for the notification messages
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(styleSheet);


//////////////////////
// Loads the users // 
// Favorite cars  //
///////////////////

async function loadFavorites() {
    console.log("Loading favorites...");

    // Check if user is authenticated
    if (!auth || !auth.currentUser) {
        console.log('User not authenticated for loading favorites');
        return;
    }

    try {
        // Use Flask backend
        const response = await fetch(`${baseUrl}/get-faves`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        console.log('Get favorites response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Get favorites error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const favorites = await response.json();
        console.log('Received favorites:', favorites);
        
        // Check if favorites list element exists before trying to use it
        const favoritesList = document.getElementById("favorites-items");
        if (!favoritesList) {
            console.warn("favorites-items element not found on this page");
            return;
        }
        
        favoritesList.innerHTML = ""; // Clear existing items

        // Check if card container exists
        const cardContainer = document.getElementById("card-container");
        if (!cardContainer) {
            console.warn("card-container element not found on this page");
            return;
        }

        if (favorites.length > 0) {
            console.log(`Processing ${favorites.length} favorites`);
            
            for (const car of favorites) {
                console.log('Processing favorite car:', car);
                
                try {
                    const variantResponse = await fetch(`${baseUrl}/get_specs?variant=${encodeURIComponent(car.variant)}`, {
                        method: "GET",
                        headers: { "Content-Type": "application/json" }
                    });
                    
                    if (!variantResponse.ok) {
                        console.error(`Failed to fetch specs for variant: ${car.variant}, status: ${variantResponse.status}`);
                        continue;
                    }
                    
                    const variantData = await variantResponse.json();
                    console.log('Got variant data:', variantData);

                    const card = document.createElement("div");
                    card.classList.add("card");

                    card.innerHTML = `
                        <img src="${variantData.Image || '/static/resources/tesr.png'}" alt="${variantData.Model || 'Car'}">
                        <div class="name">${variantData.Brand || 'Unknown'} ${variantData.Model || 'Model'}</div>
                        <div class="favorite-actions">
                            <button class="remove-favorite-btn" onclick="removeFavoriteFromDisplay('${car.variant}', this)">
                                <i class="fas fa-heart-broken"></i> Remove
                            </button>
                        </div>
                    `;

                    card.addEventListener("click", function (e) {
                        // Don't trigger popup if remove button was clicked
                        if (e.target.closest('.remove-favorite-btn')) return;
                        
                        console.log("Card clicked - Populating popup");
                        
                        // Check if popup elements exist before trying to populate them
                        const carTitleElement = document.querySelector(".car-title");
                        const imgElement = document.querySelector(".img-fave-frame img");
                        const specContainer = document.querySelector(".spec-fave-frame .spec-card-container");
                        
                        if (carTitleElement && imgElement && specContainer) {
                            // Populate the popup with the selected car's details
                            carTitleElement.textContent = `${variantData.Brand} ${variantData.Model}`;
                            imgElement.src = variantData.Image || '/static/resources/tesr.png';
                            specContainer.innerHTML = `
                                <div class="spec-card"><strong class="spec-label">Brand</strong><br><span class="spec-value">${variantData.Brand}</span></div>
                                <div class="spec-card"><strong class="spec-label">Model</strong><br><span class="spec-value">${variantData.Model}</span></div>
                                <div class="spec-card"><strong class="spec-label">Body Type</strong><br><span class="spec-value">${variantData.BodyType}</span></div>
                                <div class="spec-card"><strong class="spec-label">Variant</strong><br><span class="spec-value">${car.variant}</span></div>
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

                            // Check if populateColors function exists before calling it
                            if (typeof populateColors === 'function') {
                                populateColors(variantData.Model);
                            }

                            // Open the popup - check if togglePopup function exists
                            if (typeof togglePopup === 'function') {
                                togglePopup("card-popup");
                            }
                        } else {
                            console.warn("Popup elements not found on this page");
                        }
                    });

                    cardContainer.appendChild(card);
                    
                } catch (specError) {
                    console.error('Error fetching specs for variant:', car.variant, specError);
                    continue;
                }
            }
        } else {
            console.log('No favorites found');
            cardContainer.innerHTML = '<div class="no-favorites"><i class="fas fa-heart"></i><p>No favorite cars yet. Start adding some!</p></div>';
        }
    } catch (error) {
        console.error("Error loading favorites:", error);
        // Show user-friendly error message
        const cardContainer = document.getElementById("card-container");
        if (cardContainer) {
            cardContainer.innerHTML = '<p style="color: red; text-align: center;">Error loading favorites. Please try again later.</p>';
        }
    }
}

// FIXED: Better removeFavoriteFromDisplay function
async function removeFavoriteFromDisplay(variant, buttonElement) {
    if (!auth || !auth.currentUser) return;

    console.log('Removing favorite from display:', variant);

    try {
        const response = await fetch(`${baseUrl}/toggle-fave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variant: variant, liked: false })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Remove favorite error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Remove the card from display
        const card = buttonElement.closest('.card');
        if (card) {
            card.remove();
        }
        
        console.log('Removed from favorites:', variant);
        
        // Check if no more favorites and show empty state
        const cardContainer = document.getElementById("card-container");
        if (cardContainer && cardContainer.children.length === 0) {
            cardContainer.innerHTML = '<div class="no-favorites"><i class="fas fa-heart"></i><p>No favorite cars yet. Start adding some!</p></div>';
        }
        
    } catch (error) {
        console.error('Error removing favorite:', error);
        alert('Error removing favorite. Please try again.');
    }
}

//////////////////////////////
// Allows users to change  //
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
// Allows users to print     //
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

// ADDED: Global variable to store current calculator max price
let calculatorMaxPrice = 0;

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
    
    // ADDED: Store the max price globally for the car display function
    calculatorMaxPrice = maxCarPrice;
    
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

// ADDED: New function specifically for calculator car filtering - independent from main filter
async function fetchAffordableCars(maxPrice) {
    console.log(`🔍 Fetching affordable cars with max price: ₱${maxPrice.toLocaleString()}`);
    
    try {
        const url = new URL(`${baseUrl}/get_cars`);
        url.searchParams.append("max_price", Math.floor(maxPrice));
        
        console.log("📤 Sending calculator request to:", url.href);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("📥 Received calculator cars data:", data);
        
        // NEW: Check for error response
        if (data.error) {
            console.error("❌ Server error in calculator:", data.error);
            throw new Error(`Server Error: ${data.error}`);
        }
        
        // NEW: Validate data format
        if (!Array.isArray(data)) {
            console.error("❌ Expected array but got:", typeof data, data);
            throw new Error("Invalid data format from server");
        }
        
        return data;
    } catch (error) {
        console.error("🚨 Error fetching affordable cars:", error);
        throw error; // Re-throw so the calling function can handle it
    }
}

// ADDED: Function to determine affordability level based on price vs budget
function getAffordabilityLevel(carPrice, maxBudget) {
    const percentage = (carPrice / maxBudget) * 100;
    
    if (percentage <= 60) {
        return { level: "Excellent", class: "affordability-excellent", description: "Very comfortable budget" };
    } else if (percentage <= 75) {
        return { level: "Good", class: "affordability-good", description: "Comfortable budget" };
    } else if (percentage <= 90) {
        return { level: "Fair", class: "affordability-fair", description: "Moderate budget" };
    } else {
        return { level: "Tight", class: "affordability-tight", description: "Maximum budget" };
    }
}

// ADDED: Function to display calculator car results in table format
function displayCalculatorCarResults(cars, maxBudget) {
    const resultsContainer = document.getElementById("calculator-car-results");
    const resultsCount = document.getElementById("calculator-results-count");
    const carSpecs = document.getElementById("calculator-car-specs");
    
    if (!resultsContainer || !resultsCount || !carSpecs) {
        console.error("Calculator results elements not found");
        return;
    }
    
    // Update results count
    resultsCount.textContent = `${cars.length} car${cars.length !== 1 ? 's' : ''} found within your budget`;
    
    // Clear existing results
    carSpecs.innerHTML = "";
    
    if (cars.length === 0) {
        carSpecs.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
                    No cars found within your budget of ₱${Math.floor(maxBudget).toLocaleString()}.<br>
                    <small>Try adjusting your income, savings, or loan parameters.</small>
                </td>
            </tr>
        `;
    } else {
        // Sort cars by price (ascending)
        cars.sort((a, b) => parseFloat(a.Price) - parseFloat(b.Price));
        
        // Generate table rows with heart icons
        cars.forEach(car => {
            const price = parseFloat(car.Price) || 0;
            const affordability = getAffordabilityLevel(price, maxBudget);
            
            // Check if car is already liked and set appropriate heart style
            const isLiked = userFavorites.has(car.Variant);
            const heartClass = isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
            const heartColor = isLiked ? '#e74c3c' : '#b49b66'; // Red if liked, gold if not
            
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${car.Brand || 'N/A'}</td>
                <td>${car.Model || 'N/A'}</td>
                <td>${car.Variant || 'N/A'}</td>
                <td>${car.Fuel_Type || 'N/A'}</td>
                <td class="price-cell">₱${price.toLocaleString()}</td>
                <td class="affordability-cell ${affordability.class}" title="${affordability.description}">
                    ${affordability.level}
                </td>
                <td class="heart-cell">
                    <div class="heart-container">
                        <i class="${heartClass}" 
                           id="calculator-like-icon" 
                           style="color: ${heartColor}; cursor: pointer;" 
                           onclick="addToFaveFromCalculator(event, '${car.Variant}')"></i>
                    </div>
                </td>
            `;
            carSpecs.appendChild(row);
        });
    }
    
    // Show the results container
    resultsContainer.style.display = "block";
    
    // Scroll to results
    setTimeout(() => {
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// MODIFIED: Updated function to handle car display for calculator
async function showAffordableCars(maxPrice) {
    console.log(`📋 Showing affordable cars for budget: ₱${maxPrice.toLocaleString()}`);
    
    try {
        // Show loading state
        const resultsContainer = document.getElementById("calculator-car-results");
        if (resultsContainer) {
            resultsContainer.style.display = "block";
            const carSpecs = document.getElementById("calculator-car-specs");
            if (carSpecs) {
                carSpecs.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 2rem;">
                            <div>Loading affordable cars...</div>
                        </td>
                    </tr>
                `;
            }
        }
        
        // Fetch affordable cars
        const cars = await fetchAffordableCars(maxPrice);
        
        // Display the results
        displayCalculatorCarResults(cars, maxPrice);
        
    } catch (error) {
        console.error("🚨 Error showing affordable cars:", error);
        
        // Show error message
        const carSpecs = document.getElementById("calculator-car-specs");
        if (carSpecs) {
            carSpecs.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: #d32f2f;">
                        <div>❌ Error loading cars. Please try again.</div>
                        <small>Error: ${error.message}</small>
                    </td>
                </tr>
            `;
        }
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
    
    // MODIFIED: Hide calculator car results instead of main filter results
    const calculatorResults = document.getElementById("calculator-car-results");
    if (calculatorResults) {
        calculatorResults.style.display = "none";
    }
    
    // Clear calculator car data
    const carSpecs = document.getElementById("calculator-car-specs");
    if (carSpecs) {
        carSpecs.innerHTML = "";
    }
    
    // Reset global max price
    calculatorMaxPrice = 0;
    
    console.log("Calculator reset successfully");
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

// MODIFIED: Initialize calculator when DOM loads
document.addEventListener("DOMContentLoaded", function () {
    console.log('DOM loaded, initializing enhanced like functionality...');
    
    // Initialize Firebase first
    initializeFirebase();

    // NEW: Initialize compare page
    initializeComparePage();

    // Set up auth state listener to load favorites when user logs in
    const setupFavoritesLoader = () => {
        if (typeof auth !== 'undefined' && auth) {
            auth.onAuthStateChanged((user) => {
                if (user) {
                    // User logged in - load their favorites for duplicate checking
                    console.log('User logged in, loading favorites for duplicate checking');
                    setTimeout(() => {
                        loadUserFavoritesForDuplicateCheck();
                    }, 1000); // Small delay to ensure everything is ready
                } else {
                    // User logged out - clear favorites
                    console.log('User logged out, clearing favorites');
                    userFavorites.clear();
                }
            });
        } else {
            // Auth not ready yet, try again
            setTimeout(setupFavoritesLoader, 500);
        }
    };
    
    setupFavoritesLoader();

    // Rest of your existing DOMContentLoaded code...
    const favoritesContainer = document.getElementById("favorites-items");
    if (favoritesContainer) {
        const checkAuthAndLoadFavorites = () => {
            if (auth && auth.currentUser) {
                loadFavorites();
            } else if (auth) {
                console.log('No current user, skipping favorites load');
            } else {
                setTimeout(checkAuthAndLoadFavorites, 500);
            }
        };
        setTimeout(checkAuthAndLoadFavorites, 1000);
    }

    // Your existing slider initialization code...
    const priceSlider = document.getElementById("price");
    const horsepowerSlider = document.getElementById("horsepower");
    const seatingSlider = document.getElementById("seating");

    if (priceSlider && horsepowerSlider && seatingSlider) {
        priceSlider.value = priceSlider.max;
        horsepowerSlider.value = horsepowerSlider.min;
        seatingSlider.value = "0";

        updateSliderValue("price", "₱", true);
        updateSliderValue("horsepower", "HP", false);
        updateSliderValue("seating", "seats", false);
    }
});

// Make functions globally available
window.addToFave = addToFave;
window.addToFaveFromCalculator = addToFaveFromCalculator;
window.loadUserFavoritesForDuplicateCheck = loadUserFavoritesForDuplicateCheck;

/////////////////////////
//Testimonials Logic  //
///////////////////////

// Wrap everything in an IIFE to avoid global namespace pollution
(function() {
  'use strict';

  // Private variables within the module
  const testimonialElements = {
    form: null,
    input: null,
    titleInput: null,
    container: null,
    addBtn: null,
    submitBtn: null,
    cancelBtn: null,
    closeBtn: null,
    initialized: false,
    loading: false
  };

  let testimonialRefreshInterval = null;

  // Show loading indicator
  function showLoadingIndicator() {
    if (testimonialElements.loading) return;
    
    testimonialElements.loading = true;
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'testimonial-loading';
    loadingDiv.className = 'testimonial-loading';
    loadingDiv.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading testimonials...</p>
      </div>
    `;
    
    if (testimonialElements.container) {
      testimonialElements.container.appendChild(loadingDiv);
    }
  }

  // Hide loading indicator
  function hideLoadingIndicator() {
    testimonialElements.loading = false;
    const loadingDiv = document.getElementById('testimonial-loading');
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }

  // Function to get current user name
  function getCurrentUserName() {
    if (typeof auth !== 'undefined' && auth && auth.currentUser) {
      return auth.currentUser.displayName || auth.currentUser.email || 'Anonymous';
    }
    return 'Anonymous';
  }

  // Initialize testimonials DOM elements
  function initializeTestimonialElements() {
    try {
      console.log('Initializing testimonial elements...');
      
      testimonialElements.form = document.getElementById('testimonial-form');
      testimonialElements.input = document.getElementById('testimonial-input');
      testimonialElements.titleInput = document.getElementById('title-input');
      testimonialElements.container = document.getElementById('testimonials-container');
      testimonialElements.addBtn = document.getElementById('add-testimonial-btn');
      testimonialElements.submitBtn = document.querySelector('.submit-btn');
      testimonialElements.cancelBtn = document.querySelector('.cancel-btn');
      testimonialElements.closeBtn = document.querySelector('.close-btn');

      // Check if critical elements exist
      if (!testimonialElements.form || !testimonialElements.input || !testimonialElements.container || !testimonialElements.addBtn) {
        console.error('Critical testimonial DOM elements not found. Check your HTML IDs.');
        console.log('Found elements:', {
          form: !!testimonialElements.form,
          input: !!testimonialElements.input,
          container: !!testimonialElements.container,
          addBtn: !!testimonialElements.addBtn,
          submitBtn: !!testimonialElements.submitBtn,
          cancelBtn: !!testimonialElements.cancelBtn,
          closeBtn: !!testimonialElements.closeBtn
        });
        return false;
      }

      // Initialize form as hidden
      testimonialElements.form.style.display = 'none';
      testimonialElements.initialized = true;
      
      console.log('Testimonial elements initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing testimonial elements:', error);
      return false;
    }
  }

  // Bind event listeners to DOM elements
  function bindEventListeners() {
    console.log('Binding event listeners...');
    
    // Add testimonial button
    if (testimonialElements.addBtn) {
      testimonialElements.addBtn.addEventListener('click', toggleTestimonialForm);
    }

    // Submit button
    if (testimonialElements.submitBtn) {
      testimonialElements.submitBtn.addEventListener('click', submitTestimonial);
    }

    // Cancel button
    if (testimonialElements.cancelBtn) {
      testimonialElements.cancelBtn.addEventListener('click', toggleTestimonialForm);
    }

    // Close button
    if (testimonialElements.closeBtn) {
      testimonialElements.closeBtn.addEventListener('click', toggleTestimonialForm);
    }

    // Form submission prevention
    if (testimonialElements.form) {
      testimonialElements.form.addEventListener('submit', function(event) {
        event.preventDefault();
        submitTestimonial(event);
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(event) {
      // Escape key to close form
      if (event.key === 'Escape' && testimonialElements.form && testimonialElements.form.style.display === 'block') {
        toggleTestimonialForm();
      }
    });

    console.log('Event listeners bound successfully');
  }

  // Safe element getter with automatic initialization
  function getTestimonialElements() {
    if (!testimonialElements.initialized) {
      console.log('Elements not initialized, initializing now...');
      if (!initializeTestimonialElements()) {
        return null;
      }
      bindEventListeners();
    }
    return testimonialElements;
  }

  // Toggle testimonial form
  function toggleTestimonialForm() {
    console.log('toggleTestimonialForm called');
    
    // Get elements safely
    const elements = getTestimonialElements();
    
    if (!elements || !elements.initialized || !elements.form) {
      console.error('Failed to initialize testimonial elements');
      alert('Testimonial form is not ready yet. Please try again in a moment.');
      return;
    }

    // Check authentication (uncomment when ready)
    /*
    if (typeof auth !== 'undefined' && auth && !auth.currentUser) {
      alert("Please sign in to submit a testimonial.");
      return;
    }
    */

    // Toggle form visibility
    const isHidden = elements.form.style.display === 'none' || elements.form.style.display === '';
    elements.form.style.display = isHidden ? 'block' : 'none';
    
    // Clear form when closing
    if (!isHidden && elements.input && elements.titleInput) {
      elements.input.value = '';
      elements.titleInput.value = '';
    }

    // Focus on first input when opening
    if (isHidden && elements.titleInput) {
      setTimeout(() => elements.titleInput.focus(), 100);
    }
    
    console.log('Form display changed to:', elements.form.style.display);
  }

  // Submit testimonial
  async function submitTestimonial(event) {
    console.log('submitTestimonial called');
    
    // Prevent default form submission
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    
    // Get elements safely
    const elements = getTestimonialElements();
    
    if (!elements || !elements.initialized || !elements.input || !elements.titleInput) {
      console.error('Failed to initialize testimonial elements');
      alert('Testimonial form is not ready yet. Please try again in a moment.');
      return;
    }

    const testimonialText = elements.input.value.trim();
    const titleText = elements.titleInput.value.trim();
    
    console.log('Testimonial text:', testimonialText);
    console.log('Title text:', titleText);
    
    if (!testimonialText) {
      alert("Please enter a testimonial.");
      elements.input.focus();
      return;
    }

    // Show loading state
    const submitButton = elements.submitBtn;
    if (submitButton) {
      const originalText = submitButton.textContent;
      submitButton.textContent = 'Submitting...';
      submitButton.disabled = true;

      try {
        // Get user name
        const userName = getCurrentUserName();
        console.log('User name:', userName);
        
        // Prepare testimonial data for Flask API
        const testimonialData = {
          name: userName,
          testimonial: testimonialText,
          title: titleText || null,
          rating: 5
        };

        console.log('Sending testimonial data:', testimonialData);

        // Send to Flask API
        const response = await fetch('/api/testimonials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testimonialData)
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const newTestimonial = await response.json();
        console.log('Testimonial submitted successfully:', newTestimonial);

        // Reset form
        elements.input.value = '';
        elements.titleInput.value = '';
        elements.form.style.display = 'none';
        
        // Refresh testimonials to show the new one
        await loadTestimonials();
        
        // Show success message
        showSuccessMessage('Thank you for your testimonial!');

      } catch (error) {
        console.error('Error submitting testimonial:', error);
        showErrorMessage('Failed to submit testimonial. Please try again.');
      } finally {
        // Reset button state
        if (submitButton) {
          submitButton.textContent = originalText;
          submitButton.disabled = false;
        }
      }
    }
  }

  // Load testimonials from Flask API
  async function loadTestimonials() {
    // Get elements safely
    const elements = getTestimonialElements();
    
    if (!elements || !elements.initialized || !elements.container) {
      console.error('Failed to initialize testimonial elements for loading');
      return;
    }

    try {
      console.log('Loading testimonials from API...');
      showLoadingIndicator();
      
      const response = await fetch('/api/testimonials');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const testimonials = await response.json();
      console.log('Testimonials loaded:', testimonials);

      // Clear container
      elements.container.innerHTML = '';

      if (!testimonials || testimonials.length === 0) {
        showEmptyState();
        return;
      }

      // Add each testimonial to display
      testimonials.forEach(testimonial => {
        addTestimonialToDisplay(testimonial);
      });

    } catch (error) {
      console.error('Error loading testimonials:', error);
      showErrorState();
    } finally {
      hideLoadingIndicator();
    }
  }

  // Add testimonial to display
  function addTestimonialToDisplay(testimonial) {
    const elements = getTestimonialElements();
    
    if (!elements || !elements.initialized || !elements.container) {
      console.error('Testimonials container not found');
      return;
    }

    // Remove empty state if it exists
    const emptyState = elements.container.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }

    // Convert timestamp to date
    const date = testimonial.timestamp ? new Date(testimonial.timestamp) : new Date();
    
    const testimonialElement = document.createElement('div');
    testimonialElement.className = 'testimonial-card expanded';
    testimonialElement.setAttribute('data-expanded', 'true');
    testimonialElement.setAttribute('data-id', testimonial.id);
    
    testimonialElement.innerHTML = `
      <div class="card-header">
        <div class="profile-section">
          ${testimonial.userPhoto ? 
            `<img src="${escapeHtml(testimonial.userPhoto)}" alt="Profile" class="profile-pic">` :
            `<div class="profile-icon"><i class="fas fa-user"></i></div>`
          }
        </div>
        <button class="toggle-btn" data-action="toggle-card">
          <i class="fas fa-chevron-down"></i>
        </button>
      </div>
      
      <div class="card-content expanded-content">
        <div class="quote-container">
          <i class="fas fa-quote-left quote-left"></i>
          <p class="testimonial-text">${escapeHtml(testimonial.testimonial)}</p>
          <i class="fas fa-quote-right quote-right"></i>
        </div>
        <div class="testimonial-footer">
          <div class="author-info">
            <span class="date">${date.toLocaleDateString()}</span>
            <span class="author-name">${escapeHtml(testimonial.name)}</span>
            ${testimonial.title ? `<span class="author-title">${escapeHtml(testimonial.title)}</span>` : '<span class="author-title"></span>'}
          </div>
        </div>
      </div>

      <div class="card-content compact-content">
        <p class="compact-text">Check out <span class="author-name">${escapeHtml(testimonial.name)}</span>'s testimonial!</p>
      </div>
    `;
    
    // Add event listener for toggle button
    const toggleBtn = testimonialElement.querySelector('.toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function() {
        toggleCard(testimonialElement);
      });
    }
    
    // Add to the end of the container
    elements.container.appendChild(testimonialElement);
  }

  // Toggle individual testimonial card
  function toggleCard(card) {
    if (!card) return;
    
    const isExpanded = card.classList.contains('expanded');
    
    if (isExpanded) {
      card.classList.remove('expanded');
      card.setAttribute('data-expanded', 'false');
    } else {
      card.classList.add('expanded');
      card.setAttribute('data-expanded', 'true');
    }
  }

  // Delete testimonial (for admin use)
  async function deleteTestimonial(testimonialId) {
    if (!confirm('Are you sure you want to delete this testimonial?')) {
      return;
    }

    try {
      const response = await fetch(`/api/testimonials/${testimonialId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Testimonial deleted successfully');
      showSuccessMessage('Testimonial deleted successfully');
      
      // Reload testimonials
      await loadTestimonials();
      
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      showErrorMessage('Failed to delete testimonial.');
    }
  }

  // Show empty state
  function showEmptyState() {
    const elements = getTestimonialElements();
    if (!elements || !elements.initialized || !elements.container) return;
    
    elements.container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-comments"></i>
        <h3>No testimonials yet</h3>
        <p>Be the first to share your experience with RideMatch!</p>
      </div>
    `;
  }

  // Show error state
  function showErrorState() {
    const elements = getTestimonialElements();
    if (!elements || !elements.initialized || !elements.container) return;
    
    elements.container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error loading testimonials</h3>
        <p>Please try again later.</p>
        <button class="retry-btn" onclick="TestimonialsModule.loadTestimonials()">Retry</button>
      </div>
    `;
  }

  // Show success message
  function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'testimonial-message success';
    messageDiv.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }

  // Show error message
  function showErrorMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'testimonial-message error';
    messageDiv.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 5000);
  }

  // Helper function to escape HTML to prevent XSS
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Set up real-time updates
  function startTestimonialRefresh() {
    // Only start if not already running
    if (testimonialRefreshInterval) return;
    
    // Refresh testimonials every 30 seconds
    testimonialRefreshInterval = setInterval(() => {
      loadTestimonials();
    }, 30000);
  }

  function stopTestimonialRefresh() {
    if (testimonialRefreshInterval) {
      clearInterval(testimonialRefreshInterval);
      testimonialRefreshInterval = null;
    }
  }

    // Initialize testimonials when page loads
    function initializeTestimonials() {
    console.log('Initializing testimonials functionality');
    
    // First check if testimonial elements exist on this page
    const testimonialForm = document.getElementById('testimonial-form');
    const testimonialContainer = document.getElementById('testimonials-container');
    const addBtn = document.getElementById('add-testimonial-btn');
    
    if (!testimonialForm || !testimonialContainer || !addBtn) {
        console.log('Testimonial elements not found on this page, skipping initialization');
        return;
    }
    
    // Show initial loading state
    showLoadingIndicator();
    
    // Wait a bit for DOM to be fully ready
    setTimeout(() => {
        if (initializeTestimonialElements()) {
        bindEventListeners();
        loadTestimonials();
        startTestimonialRefresh();
        console.log('Testimonials system initialized successfully');
        } else {
        console.error('Failed to initialize testimonials system');
        hideLoadingIndicator();
        }
    }, 100);
    }

  // Auto-initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTestimonials);
  } else {
    // DOM is already loaded
    initializeTestimonials();
  }

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    stopTestimonialRefresh();
  });

  // Public API - expose only necessary functions to global scope
  window.TestimonialsModule = {
    loadTestimonials: loadTestimonials,
    deleteTestimonial: deleteTestimonial,
    refresh: function() {
      loadTestimonials();
    },
    init: initializeTestimonials
  };

})();

///////////////////////
// Forum Page Logic //
/////////////////////

(function() {
  'use strict';

  // Private variables
  const forumElements = {
    form: null,
    postsContainer: null,
    askBtn: null,
    tabs: null,
    initialized: false,
    loading: false
  };

  let currentUser = null;
  let activeTab = 'recent';
  let expandedPosts = new Set();
  let expandedComments = new Set();
  let currentForumPosts = [];

  // Initialize forum elements
  function initializeForumElements() {
    try {
      console.log('Initializing forum elements...');
      
      forumElements.form = document.getElementById('askModal');
      forumElements.postsContainer = document.getElementById('forum-posts');
      forumElements.askBtn = document.querySelector('.ask-btn');
      forumElements.tabs = document.querySelectorAll('.forum-tab');

      if (!forumElements.postsContainer) {
        console.log('Not on forum page, skipping forum initialization');
        return false;
      }

      forumElements.initialized = true;
      console.log('Forum elements initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing forum elements:', error);
      return false;
    }
  }

  // Check authentication state
  function checkAuthState() {
    console.log('Forum: Checking auth state...');
    
    if (typeof auth !== 'undefined' && auth && auth.currentUser) {
      console.log('Forum: Found existing user:', auth.currentUser.email);
      currentUser = auth.currentUser;
      updateUIForAuthState();
    } else {
      console.log('Forum: No current user found');
    }

    const setupAuthListener = () => {
      if (typeof auth !== 'undefined' && auth) {
        console.log('Forum: Setting up auth listener');
        auth.onAuthStateChanged((user) => {
          console.log('Forum: Auth state changed:', user ? user.email : 'no user');
          currentUser = user;
          updateUIForAuthState();
        });
      } else {
        console.log('Forum: Auth not ready, retrying in 500ms...');
        setTimeout(setupAuthListener, 500);
      }
    };
    
    setupAuthListener();
  }

  // Update UI based on auth state
  function updateUIForAuthState() {
    console.log('Forum: Updating UI, currentUser:', currentUser ? currentUser.email : 'none');
    
    const askBtn = document.querySelector('.ask-btn');
    
    if (!askBtn) {
      console.log('Forum: Ask button not found - not on forum page or not ready yet');
      return;
    }
    
    if (!currentUser) {
      console.log('Forum: Setting up login prompt');
      askBtn.innerHTML = '<i class="bx bx-plus"></i>Login to Ask';
      askBtn.onclick = () => {
        if (typeof togglePopup === 'function') {
          togglePopup('login-popup');
        }
      };
    } else {
      console.log('Forum: Setting up ask question button');
      askBtn.innerHTML = '<i class="bx bx-plus"></i>Ask a Question';
      askBtn.onclick = () => {
        openAskModal();
      };
    }
    
    if (typeof forumElements !== 'undefined' && forumElements) {
      forumElements.askBtn = askBtn;
    }
  }

  // CLEANED: Load posts (removed tag filtering)
  async function loadPosts() {
    if (!forumElements.postsContainer) return;
    
    try {
      showLoadingIndicator();
      console.log('Loading forum posts from API...');
      
      const response = await fetch('/api/forum/posts');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const posts = await response.json();
      console.log('Forum posts loaded:', posts);

      currentForumPosts = posts;
      window.currentForumPosts = posts;

      forumElements.postsContainer.innerHTML = '';

      if (!posts || posts.length === 0) {
        showEmptyState();
        return;
      }

      sortPosts(posts);
      posts.forEach(post => {
        addPostToDisplay(post);
      });

    } catch (error) {
      console.error('Error loading forum posts:', error);
      showErrorState();
    } finally {
      hideLoadingIndicator();
    }
  }

  // Sort posts based on active tab
function sortPosts(posts) {
  switch (activeTab) {
    case 'recent':
      posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'popular':
      posts.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
      break;
    case 'answered':
      posts.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
      break;
    case 'trending':
      // NEW: Sort by activity score (views + comments + votes)
      posts.sort((a, b) => {
        const scoreA = (a.views || 0) + (a.commentCount || 0) + (a.upvotes || 0);
        const scoreB = (b.views || 0) + (b.commentCount || 0) + (b.upvotes || 0);
        return scoreB - scoreA;
      });
      break;
    default:
      // Default to recent if unknown tab
      posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

  // Add post to display with expand arrow and anonymous option
  function addPostToDisplay(post) {
    if (!forumElements.postsContainer) return;

    const timeAgo = getTimeAgo(post.createdAt);
    const isExpanded = expandedPosts.has(post.id);
    const tags = post.tags ? post.tags.split(',').map(tag => tag.trim()) : [];
    
    // Handle anonymous posts
    const authorName = post.isAnonymous ? 'Anonymous' : (post.authorName || 'Anonymous');
    
    const postElement = document.createElement('div');
    postElement.className = `forum-post ${isExpanded ? 'expanded' : ''}`;
    postElement.setAttribute('data-post-id', post.id);
    
    postElement.innerHTML = `
      <div class="post-header" onclick="togglePost('${post.id}')">
        <div class="post-vote">
          <button class="vote-btn" onclick="event.stopPropagation(); voteOnPost('${post.id}', 'up')">
            ▲
          </button>
          <span class="vote-count">${(post.upvotes || 0) - (post.downvotes || 0)}</span>
          <button class="vote-btn" onclick="event.stopPropagation(); voteOnPost('${post.id}', 'down')">
            ▼
          </button>
        </div>
        
        <div class="post-content">
          <h3 class="post-title">${escapeHtml(post.title)}</h3>
          <div class="post-meta">
            <span class="post-author">by ${escapeHtml(authorName)}</span>
            <span class="post-time">${timeAgo}</span>
          </div>
        </div>
        
        <div class="post-stats">
          <div class="stat-item">
            <i class="bx bx-message-square"></i>
            <span>${post.commentCount || 0}</span>
          </div>
          <div class="stat-item">
            <i class="bx bx-show"></i>
            <span>${post.views || 0}</span>
          </div>
          <!-- Expand/Collapse Arrow -->
          <div class="expand-arrow">
            <i class="bx ${isExpanded ? 'bx-chevron-up' : 'bx-chevron-down'}"></i>
          </div>
        </div>
      </div>
      
      ${isExpanded ? renderExpandedPost(post, tags) : ''}
    `;
    
    forumElements.postsContainer.appendChild(postElement);
  }

  // Render expanded post with "Tags:" label
  function renderExpandedPost(post, tags) {
    const authorName = post.isAnonymous ? 'Anonymous' : (post.authorName || 'Anonymous');
    
    return `
      <div class="post-body">
        <div class="post-description">
          ${escapeHtml(post.body).replace(/\n/g, '<br>')}
        </div>
        
        ${tags.length > 0 ? `
          <div class="post-tags">
            <span class="tags-label">Tags: </span>
            ${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
        
        <div class="post-actions">
          <div class="action-buttons">
            <button class="action-btn" onclick="sharePost('${post.id}')">
              <i class="bx bx-share"></i>
              Share
            </button>
          </div>
        </div>
        
        <div class="comments-section">
          <div class="comments-header">
            <h4 class="comments-title">Comments (${post.commentCount || 0})</h4>
          </div>
          
          ${currentUser ? `
            <div class="comment-form">
              <textarea 
                class="comment-input" 
                id="comment-input-${post.id}"
                placeholder="Write your comment..."></textarea>
              <div class="comment-form-actions">
                <label class="anonymous-toggle">
                  <input type="checkbox" id="anonymous-comment-${post.id}">
                  <span>Post anonymously</span>
                </label>
                <button 
                  class="comment-submit" 
                  onclick="submitComment('${post.id}')">
                  Post Comment
                </button>
              </div>
            </div>
          ` : `
            <p style="text-align: center; color: #666; font-style: italic;">
              <a href="#" onclick="togglePopup('login-popup')">Login</a> to post a comment
            </p>
          `}
          
          <div class="comments-list" id="comments-${post.id}">
            <div class="loading"><i class="bx bx-loader-alt"></i> Loading comments...</div>
          </div>
        </div>
      </div>
    `;
  }

  // Toggle post with arrow animation
  async function togglePost(postId) {
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (!postElement) return;
    
    // Update arrow direction
    const arrow = postElement.querySelector('.expand-arrow i');
    
    if (expandedPosts.has(postId)) {
      expandedPosts.delete(postId);
      postElement.classList.remove('expanded');
      const postBody = postElement.querySelector('.post-body');
      if (postBody) postBody.remove();
      
      // Update arrow to point down
      if (arrow) {
        arrow.className = 'bx bx-chevron-down';
      }
    } else {
      expandedPosts.add(postId);
      postElement.classList.add('expanded');
      
      // Update arrow to point up
      if (arrow) {
        arrow.className = 'bx bx-chevron-up';
      }
      
      try {
        await fetch(`/api/forum/posts/${postId}/views`, { method: 'POST' });
      } catch (error) {
        console.error('Error incrementing views:', error);
      }
      
      const post = currentForumPosts.find(p => p.id === postId);
      if (post) {
        const tags = post.tags ? post.tags.split(',').map(tag => tag.trim()) : [];
        
        const expandedContent = document.createElement('div');
        expandedContent.innerHTML = renderExpandedPost(post, tags);
        postElement.appendChild(expandedContent.firstElementChild);
        
        setTimeout(() => loadComments(postId), 100);
      }
    }
  }

  // Load comments with voting and replies
  async function loadComments(postId) {
    const commentsContainer = document.getElementById(`comments-${postId}`);
    if (!commentsContainer) return;
    
    const hasComments = commentsContainer.children.length > 0 && 
                       !commentsContainer.querySelector('.loading');
    
    if (!hasComments) {
      commentsContainer.innerHTML = '<div class="loading"><i class="bx bx-loader-alt"></i> Loading comments...</div>';
    }
    
    try {
      console.log('Loading comments for post:', postId);
      
      const response = await fetch(`/api/forum/posts/${postId}/comments`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const comments = await response.json();
      console.log('Comments loaded:', comments.length);
      
      // Organize comments by parent/child relationships
      const organizedComments = organizeComments(comments);
      
      commentsContainer.innerHTML = organizedComments.length > 0 
        ? organizedComments.map(comment => renderComment(comment, postId)).join('')
        : '<p style="text-align: center; color: #666; font-style: italic;">No comments yet</p>';
        
    } catch (error) {
      console.error('Error loading comments:', error);
      commentsContainer.innerHTML = '<p style="color: red;">Error loading comments</p>';
    }
  }

  // Organize comments with replies
  function organizeComments(comments) {
    const commentMap = new Map();
    const rootComments = [];
    
    // First pass: create map of all comments
    comments.forEach(comment => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    });
    
    // Second pass: organize parent-child relationships
    comments.forEach(comment => {
      if (comment.parentId && commentMap.has(comment.parentId)) {
        commentMap.get(comment.parentId).replies.push(comment);
      } else {
        rootComments.push(comment);
      }
    });
    
    return rootComments;
  }

  // Render comment with voting and reply functionality
  function renderComment(comment, postId, isReply = false) {
    const timeAgo = getTimeAgo(comment.createdAt);
    const authorName = comment.isAnonymous ? 'Anonymous' : (comment.authorName || 'Anonymous');
    const indentClass = isReply ? 'comment-reply' : '';
    
    let html = `
      <div class="comment ${indentClass}" data-comment-id="${comment.id}">
        <div class="comment-content">
          <!-- Comment voting -->
          <div class="comment-vote">
            <button class="vote-btn comment-vote-btn" onclick="voteOnComment('${postId}', '${comment.id}', 'up')">
              ▲
            </button>
            <span class="vote-count">${(comment.upvotes || 0) - (comment.downvotes || 0)}</span>
            <button class="vote-btn comment-vote-btn" onclick="voteOnComment('${postId}', '${comment.id}', 'down')">
              ▼
            </button>
          </div>
          
          <div class="comment-main">
            <div class="comment-header">
              <span class="comment-author">${escapeHtml(authorName)}</span>
              <span class="comment-time">${timeAgo}</span>
            </div>
            <div class="comment-text">${escapeHtml(comment.text).replace(/\n/g, '<br>')}</div>
            
            <!-- Reply button -->
            ${currentUser ? `
              <div class="comment-actions">
                <button class="reply-btn" onclick="toggleReplyForm('${postId}', '${comment.id}')">
                  <i class="bx bx-reply"></i> Reply
                </button>
              </div>
              
              <!-- Reply form (hidden by default) -->
              <div class="reply-form" id="reply-form-${comment.id}" style="display: none;">
                <textarea 
                  class="reply-input" 
                  id="reply-input-${comment.id}"
                  placeholder="Write your reply..."></textarea>
                <div class="reply-form-actions">
                  <label class="anonymous-toggle">
                    <input type="checkbox" id="anonymous-reply-${comment.id}">
                    <span>Reply anonymously</span>
                  </label>
                  <button class="reply-submit" onclick="submitReply('${postId}', '${comment.id}')">
                    Post Reply
                  </button>
                  <button class="reply-cancel" onclick="toggleReplyForm('${postId}', '${comment.id}')">
                    Cancel
                  </button>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Render replies -->
        ${comment.replies && comment.replies.length > 0 ? `
          <div class="comment-replies">
            ${comment.replies.map(reply => renderComment(reply, postId, true)).join('')}
          </div>
        ` : ''}
      </div>
    `;
    
    return html;
  }

  // Vote on comments
  async function voteOnComment(postId, commentId, direction) {
    if (!currentUser) {
      if (typeof togglePopup === 'function') {
        togglePopup('login-popup');
      }
      return;
    }

    try {
      const response = await fetch(`/api/forum/comments/${commentId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Update vote count in UI
      const voteCountElement = document.querySelector(`[data-comment-id="${commentId}"] .vote-count`);
      if (voteCountElement) {
        voteCountElement.textContent = result.upvotes - result.downvotes;
      }

    } catch (error) {
      console.error('Error voting on comment:', error);
      showErrorMessage('Failed to vote on comment. Please try again.');
    }
  }

  // Toggle reply form
  function toggleReplyForm(postId, commentId) {
    const replyForm = document.getElementById(`reply-form-${commentId}`);
    if (!replyForm) return;
    
    const isHidden = replyForm.style.display === 'none';
    replyForm.style.display = isHidden ? 'block' : 'none';
    
    if (isHidden) {
      const replyInput = document.getElementById(`reply-input-${commentId}`);
      if (replyInput) {
        setTimeout(() => replyInput.focus(), 100);
      }
    }
  }

  // Submit reply to comment
  async function submitReply(postId, parentCommentId) {
    if (!currentUser) {
      if (typeof togglePopup === 'function') {
        togglePopup('login-popup');
      }
      return;
    }

    const replyInput = document.getElementById(`reply-input-${parentCommentId}`);
    const anonymousCheckbox = document.getElementById(`anonymous-reply-${parentCommentId}`);
    
    if (!replyInput) return;
    
    const replyText = replyInput.value.trim();
    if (!replyText) return;

    const isAnonymous = anonymousCheckbox ? anonymousCheckbox.checked : false;

    try {
      const response = await fetch(`/api/forum/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: replyText,
          parentId: parentCommentId,
          isAnonymous: isAnonymous
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Clear reply form and reload comments
      replyInput.value = '';
      if (anonymousCheckbox) anonymousCheckbox.checked = false;
      toggleReplyForm(postId, parentCommentId);
      
      loadComments(postId);
      updateCommentCount(postId, 1);

    } catch (error) {
      console.error('Error submitting reply:', error);
      showErrorMessage('Failed to post reply. Please try again.');
    }
  }

  // Vote on a post
  async function voteOnPost(postId, direction) {
    if (!currentUser) {
      if (typeof togglePopup === 'function') {
        togglePopup('login-popup');
      }
      return;
    }

    try {
      const response = await fetch(`/api/forum/posts/${postId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      const voteCountElement = document.querySelector(`[data-post-id="${postId}"] .vote-count`);
      if (voteCountElement) {
        voteCountElement.textContent = result.upvotes - result.downvotes;
      }

      const localPost = currentForumPosts.find(p => p.id === postId);
      if (localPost) {
        localPost.upvotes = result.upvotes;
        localPost.downvotes = result.downvotes;
      }

    } catch (error) {
      console.error('Error voting:', error);
      showErrorMessage('Failed to vote. Please try again.');
    }
  }

  // Submit comment with anonymous option
  async function submitComment(postId) {
    if (!currentUser) {
      if (typeof togglePopup === 'function') {
        togglePopup('login-popup');
      }
      return;
    }

    const commentInput = document.getElementById(`comment-input-${postId}`);
    const anonymousCheckbox = document.getElementById(`anonymous-comment-${postId}`);
    
    if (!commentInput) return;
    
    const commentText = commentInput.value.trim();
    if (!commentText) return;

    const isAnonymous = anonymousCheckbox ? anonymousCheckbox.checked : false;

    const submitBtn = commentInput.parentElement.querySelector('.comment-submit');
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.textContent = 'Posting...';
      submitBtn.disabled = true;
    }

    try {
      const response = await fetch(`/api/forum/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: commentText,
          isAnonymous: isAnonymous
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      commentInput.value = '';
      if (anonymousCheckbox) anonymousCheckbox.checked = false;
      
      loadComments(postId);
      updateCommentCount(postId, 1);

    } catch (error) {
      console.error('Error submitting comment:', error);
      showErrorMessage('Failed to post comment. Please try again.');
    } finally {
      if (submitBtn) {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    }
  }

  // Helper function to update comment count
  function updateCommentCount(postId, increment) {
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (postElement) {
      const commentCountElement = postElement.querySelector('.stat-item span');
      if (commentCountElement) {
        const currentCount = parseInt(commentCountElement.textContent) || 0;
        const newCount = currentCount + increment;
        commentCountElement.textContent = newCount;

        const commentsTitle = postElement.querySelector('.comments-title');
        if (commentsTitle) {
          commentsTitle.textContent = `Comments (${newCount})`;
        }

        const localPost = currentForumPosts.find(p => p.id === postId);
        if (localPost) {
          localPost.commentCount = newCount;
        }
      }
    }
  }

  // Submit question with anonymous option
  async function submitQuestion(event) {
    if (event) event.preventDefault();
    
    if (!currentUser) {
      if (typeof togglePopup === 'function') {
        togglePopup('login-popup');
      }
      return;
    }

    const title = document.getElementById('question-title')?.value.trim();
    const body = document.getElementById('question-body')?.value.trim();
    const tags = document.getElementById('question-tags')?.value.trim();
    const isAnonymous = document.getElementById('anonymous-post')?.checked || false;

    if (!title || !body) {
      alert('Please fill in both title and description');
      return;
    }

    try {
      const response = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title,
          body: body,
          tags: tags,
          isAnonymous: isAnonymous
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      closeAskModal();
      loadPosts();
      showSuccessMessage('Question posted successfully!');

    } catch (error) {
      console.error('Error submitting question:', error);
      showErrorMessage('Failed to post question. Please try again.');
    }
  }

  // Modal functions
  function openAskModal() {
    const modal = document.getElementById('askModal');
    if (modal) modal.style.display = 'block';
  }

  function closeAskModal() {
    const modal = document.getElementById('askModal');
    if (modal) modal.style.display = 'none';
    
    const form = document.getElementById('askForm');
    if (form) form.reset();
  }

  // Tab switching
  function switchTab(tabType) {
    document.querySelectorAll('.forum-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    const activeTabElement = document.querySelector(`[data-tab="${tabType}"]`);
    if (activeTabElement) activeTabElement.classList.add('active');
    
    activeTab = tabType;
    loadPosts();
  }

  // Bind event listeners
  function bindEventListeners() {
    forumElements.tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabType = e.target.getAttribute('data-tab');
        switchTab(tabType);
      });
    });

    const askForm = document.getElementById('askForm');
    if (askForm) {
      askForm.addEventListener('submit', submitQuestion);
    }

    const askModal = document.getElementById('askModal');
    if (askModal) {
      askModal.addEventListener('click', (e) => {
        if (e.target.id === 'askModal') {
          closeAskModal();
        }
      });
    }
  }

  // Utility functions
  function showLoadingIndicator() {
    if (!forumElements.postsContainer || forumElements.loading) return;
    
    forumElements.loading = true;
    forumElements.postsContainer.innerHTML = `
      <div class="loading">
        <i class="bx bx-loader-alt"></i>
        <p>Loading posts...</p>
      </div>
    `;
  }

  function hideLoadingIndicator() {
    forumElements.loading = false;
  }

  function showEmptyState() {
    if (!forumElements.postsContainer) return;
    
    forumElements.postsContainer.innerHTML = `
      <div class="empty-state">
        <i class="bx bx-message-square"></i>
        <h3>No posts yet</h3>
        <p>Be the first to ask a question!</p>
      </div>
    `;
  }

  function showErrorState() {
    if (!forumElements.postsContainer) return;
    
    forumElements.postsContainer.innerHTML = `
      <div class="empty-state">
        <i class="bx bx-error"></i>
        <h3>Error loading posts</h3>
        <p>Please try refreshing the page</p>
      </div>
    `;
  }

  function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'testimonial-message success';
    messageDiv.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(messageDiv);
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }

  function showErrorMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'testimonial-message error';
    messageDiv.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(messageDiv);
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 5000);
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}mo ago`;
  }

  function sharePost(postId) {
    const url = `${window.location.origin}${window.location.pathname}#post-${postId}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Check out this forum post',
        url: url
      });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        showSuccessMessage('Link copied to clipboard!');
      });
    }
  }

  // Initialize forum
  function initializeForum() {
    console.log('Initializing forum functionality');
    
    if (!initializeForumElements()) {
      return;
    }
    
    setTimeout(() => {
      bindEventListeners();
      checkAuthState();
      loadPosts();
      console.log('Forum system initialized successfully');
    }, 100);
  }

  // Auto-initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeForum);
  } else {
    initializeForum();
  }

  // Global functions for onclick handlers
  window.togglePost = togglePost;
  window.voteOnPost = voteOnPost;
  window.voteOnComment = voteOnComment;
  window.submitComment = submitComment;
  window.submitReply = submitReply;
  window.toggleReplyForm = toggleReplyForm;
  window.sharePost = sharePost;
  window.openAskModal = openAskModal;
  window.closeAskModal = closeAskModal;

})();