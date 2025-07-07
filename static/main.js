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
let userDisplayName = null; // NEW: For storing username
let userFavorites = new Set();

// Function to get current user name
function getCurrentUserName() {
  if (auth && auth.currentUser) {
    // Priority: username > displayName > email > 'Anonymous'
    return userDisplayName || auth.currentUser.displayName || auth.currentUser.email || 'Anonymous';
  }
  return 'Anonymous';
}

let currentCarData = []; // Global variable to store current car data for sorting
let defaultCarsLoaded = false;

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
function updateUIForAuthState(user = null, userData = null) {
    console.log('🔄 Updating UI for auth state:', user ? 'logged in' : 'logged out');
    
    const loginButton = document.getElementById('login-button');
    const profileContainer = document.getElementById('profile-container');
    const welcomeText = document.getElementById('welcome-text');
    const profileIcon = document.getElementById('profile-icon');
    const profilePic = document.getElementById('profile-pic');

    console.log('🔍 DOM Elements found:', {
        loginButton: !!loginButton,
        profileContainer: !!profileContainer,
        welcomeText: !!welcomeText,
        profileIcon: !!profileIcon,
        profilePic: !!profilePic
    });

    // Use current user if not provided
    const currentUser = user || (auth && auth.currentUser);
    const currentUserData = userData || { username: userDisplayName };

    console.log('👤 User data:', {
        hasCurrentUser: !!currentUser,
        userDisplayName: userDisplayName,
        userEmail: currentUser ? currentUser.email : 'none'
    });

    if (currentUser && (userDisplayName || currentUser.email)) {
        console.log('✅ User is logged in - updating UI');
        
        // User is logged in
        if (loginButton) {
            loginButton.style.display = 'none';
        }
        
        if (profileContainer) {
            profileContainer.style.display = 'flex';
        }
        
        // Update welcome text with username
        const displayName = userDisplayName || currentUser.displayName || currentUser.email;
        if (welcomeText) {
            welcomeText.textContent = `Welcome, ${displayName}!`;
        }
        
        // FIXED: Handle profile picture with proper fallback to icon
        const profilePictureUrl = currentUser.photoURL || currentUserData.profilePictureUrl;
        
        console.log('🖼️ Profile picture URL:', profilePictureUrl);
        
        if (profilePictureUrl && 
            profilePictureUrl !== '' && 
            !profilePictureUrl.includes('data:image/svg+xml') && // Exclude SVG placeholders
            !profilePictureUrl.includes('Car Image')) { // Exclude car image placeholders
            
            console.log('✅ Valid profile picture found, showing image');
            if (profilePic) {
                profilePic.src = profilePictureUrl;
                profilePic.style.display = 'block';
                
                // Hide the image if it fails to load and show icon instead
                profilePic.onerror = function() {
                    console.log('❌ Profile picture failed to load, showing default icon');
                    this.style.display = 'none';
                    if (profileIcon) {
                        profileIcon.style.display = 'block';
                    }
                };
            }
            if (profileIcon) {
                profileIcon.style.display = 'none';
            }
        } else {
            console.log('📷 No valid profile picture, showing default icon');
            // No valid profile picture - show default icon
            if (profilePic) {
                profilePic.style.display = 'none';
                profilePic.src = '';
            }
            if (profileIcon) {
                profileIcon.style.display = 'block';
            }
        }
        
        // Load user favorites for duplicate checking
        if (typeof loadUserFavoritesForDuplicateCheck === 'function') {
            loadUserFavoritesForDuplicateCheck();
        }
        
    } else {
        console.log('❌ User is logged out - updating UI');
        
        // User is logged out
        if (loginButton) {
            loginButton.style.display = 'block';
        }
        if (profileContainer) {
            profileContainer.style.display = 'none';
        }
        if (welcomeText) {
            welcomeText.textContent = 'Welcome!';
        }
        if (profilePic) {
            profilePic.style.display = 'none';
            profilePic.src = '';
        }
        if (profileIcon) {
            profileIcon.style.display = 'block';
        }
        
        // Clear favorites when logged out
        if (typeof userFavorites !== 'undefined' && userFavorites) {
            userFavorites.clear();
        }
    }
    
    console.log('🏁 UI update completed');
}

function updateUIForAuthState(user = null, userData = null) {
    console.log('🔄 Updating UI for auth state:', user ? 'logged in' : 'logged out');
    
    // ✅ SAFELY get DOM elements with proper null checks
    const loginButton = document.getElementById('login-button');
    const profileContainer = document.getElementById('profile-container');
    const welcomeText = document.getElementById('welcome-text');
    const profileIcon = document.getElementById('profile-icon');
    const profilePic = document.getElementById('profile-pic');
    // REMOVED: usernameDisplay - we don't want a separate username display

    console.log('🔍 DOM Elements found:', {
        loginButton: !!loginButton,
        profileContainer: !!profileContainer,
        welcomeText: !!welcomeText,
        profileIcon: !!profileIcon,
        profilePic: !!profilePic
        // REMOVED: usernameDisplay from debug
    });

    // Use current user if not provided
    const currentUser = user || (auth && auth.currentUser);
    const currentUserData = userData || { username: userDisplayName };

    console.log('👤 User data:', {
        hasCurrentUser: !!currentUser,
        userDisplayName: userDisplayName,
        userEmail: currentUser ? currentUser.email : 'none'
    });

    if (currentUser && (userDisplayName || currentUser.email)) {
        console.log('✅ User is logged in - updating UI');
        
        // User is logged in
        if (loginButton) {
            loginButton.style.display = 'none';
        }
        
        if (profileContainer) {
            profileContainer.style.display = 'flex';
        }
        
        // Update welcome text with username (this is the only place we show the name)
        const displayName = userDisplayName || currentUser.displayName || currentUser.email;
        if (welcomeText) {
            welcomeText.textContent = `Welcome, ${displayName}!`;
        }
        
        // REMOVED: Username display update - we don't want separate username text
        
        // Handle profile picture
        const profilePictureUrl = currentUser.photoURL || currentUserData.profilePictureUrl;
        if (profilePictureUrl) {
            if (profilePic) {
                profilePic.src = profilePictureUrl;
                profilePic.style.display = 'block';
            }
            if (profileIcon) {
                profileIcon.style.display = 'none';
            }
        } else {
            if (profilePic) {
                profilePic.style.display = 'none';
            }
            if (profileIcon) {
                profileIcon.style.display = 'block';
            }
        }
        
        // Load user favorites for duplicate checking (only if function exists)
        if (typeof loadUserFavoritesForDuplicateCheck === 'function') {
            loadUserFavoritesForDuplicateCheck();
        }
        
    } else {
        console.log('❌ User is logged out - updating UI');
        
        // User is logged out
        if (loginButton) {
            loginButton.style.display = 'block';
        }
        if (profileContainer) {
            profileContainer.style.display = 'none';
        }
        if (welcomeText) {
            welcomeText.textContent = 'Welcome!';
        }
        // REMOVED: Clear username display - we don't have it anymore
        if (profilePic) {
            profilePic.style.display = 'none';
            profilePic.src = '';
        }
        if (profileIcon) {
            profileIcon.style.display = 'block';
        }
        
        // Clear favorites when logged out
        if (typeof userFavorites !== 'undefined' && userFavorites) {
            userFavorites.clear();
        }
    }
    
    console.log('🏁 UI update completed');
}

function setupAuthStateListener() {
    if (!auth) {
        console.error('❌ Auth not available for listener setup');
        return;
    }
    
    console.log('🔄 Setting up auth state listener...');
    
    auth.onAuthStateChanged(async (user) => {
        console.log('🔄 Auth state changed:', user ? user.email : 'signed out');
        
        if (user) {
            currentUser = user;
            userName = user.email;
            
            try {
                // Get user profile data including username and profile picture
                const profileResponse = await fetch(`${baseUrl}/get-user-profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid: user.uid })
                });
                
                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    userDisplayName = profileData.username || user.displayName || user.email;
                    
                    // FIXED: Update Firebase user object with database profile picture
                    if (profileData.profilePictureUrl) {
                        // Update the currentUser object to include the profile picture
                        currentUser.photoURL = profileData.profilePictureUrl;
                    }
                    
                    console.log('✅ User profile loaded:', profileData);
                    console.log('🖼️ Profile picture URL:', profileData.profilePictureUrl);
                    
                    updateUIForAuthState(currentUser, profileData);
                } else {
                    userDisplayName = user.displayName || user.email;
                    updateUIForAuthState(user, { username: userDisplayName });
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
                userDisplayName = user.displayName || user.email;
                updateUIForAuthState(user, { username: userDisplayName });
            }
            
            console.log('✅ User is signed in:', user.email, 'Username:', userDisplayName);
        } else {
            currentUser = null;
            userName = null;
            userDisplayName = null;
            updateUIForAuthState(null, null);
            console.log('✅ User is signed out');
        }
    });
}

function showFirebaseError() {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
    `;
    errorDiv.textContent = 'Authentication system failed to load. Please refresh the page.';
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

let usernameDisplay = document.getElementById('username-display');

async function checkSessionStatus() {
    try {
        console.log('🔍 Checking session status...');
        
        const response = await fetch('/check-session', {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (response.ok) {
            const sessionData = await response.json();
            console.log('📋 Session data received:', sessionData);
            
            if (sessionData.authenticated) {
                // User has valid session, update global variables
                userName = sessionData.email;
                userDisplayName = sessionData.username || sessionData.email;
                
                // FIXED: Create a proper user object with all profile data
                currentUser = {
                    uid: sessionData.user,
                    email: sessionData.email,
                    displayName: sessionData.username,
                    photoURL: sessionData.profile_picture_url || null // Ensure this is set correctly
                };
                
                console.log('✅ Session is valid, user is logged in:', sessionData.email);
                console.log('🖼️ Profile picture URL from session:', sessionData.profile_picture_url);
                
                // FIXED: Update UI with complete profile data including profile picture
                updateUIForAuthState(currentUser, {
                    username: userDisplayName,
                    profilePictureUrl: sessionData.profile_picture_url
                });
                
                return true;
            } else {
                console.log('❌ No valid session found');
                clearUserData();
                return false;
            }
        } else {
            console.log('⚠️ Session check request failed');
            clearUserData();
            return false;
        }
    } catch (error) {
        console.error('❌ Error checking session:', error);
        clearUserData();
        return false;
    }
}

async function initializeFirebaseWithSession() {
    try {
        console.log('🔄 Starting Firebase initialization with session check...');
        
        // First check if user has a valid session
        const hasValidSession = await checkSessionStatus();
        
        // Then initialize Firebase
        await initializeFirebase();
        
        // If we have a valid session but Firebase auth hasn't loaded yet, 
        // make sure UI is updated correctly
        if (hasValidSession && currentUser) {
            setTimeout(() => {
                updateUIForAuthState(currentUser, {
                    username: userDisplayName
                });
            }, 500);
        }
        
        console.log('✅ Firebase and session initialization completed');
        
    } catch (error) {
        console.error('❌ Firebase and session initialization failed:', error);
    }
}

async function checkSessionAndInitialize() {
    try {
        console.log('🔄 Starting session check and Firebase initialization...');
        
        // First, check if user has a valid session
        const hasValidSession = await checkSessionStatus();
        console.log('📋 Session check result:', hasValidSession);
        
        // Then initialize Firebase
        await initializeFirebase();
        
        // If we have a valid session, make sure UI is updated
        if (hasValidSession && currentUser) {
            console.log('✅ Valid session found, updating UI');
            setTimeout(() => {
                updateUIForAuthState(currentUser, {
                    username: userDisplayName,
                    profilePictureUrl: currentUser.photoURL
                });
            }, 500);
        }
        
        console.log('✅ Session check and Firebase initialization completed');
        
    } catch (error) {
        console.error('❌ Session check and Firebase initialization failed:', error);
        // Even if session check fails, try to initialize Firebase
        try {
            await initializeFirebase();
        } catch (firebaseError) {
            console.error('❌ Firebase initialization also failed:', firebaseError);
        }
    }
}

function setupPageSpecificFeatures() {
    const isFilterPage = document.getElementById('year') !== null;
    const isComparePage = document.getElementById('compare-charts-section') !== null;
    const isProfilePage = window.location.pathname === '/profile';
    
    console.log('🔍 Page detection:', {
        isFilterPage,
        isComparePage,
        isProfilePage,
        pathname: window.location.pathname
    });
    
    if (isFilterPage) {
        setupFilterPage();
    }
    
    if (isComparePage) {
        initializeComparePage();
    }
    
    if (isProfilePage) {
        handleProfilePageAccess();
    }
}

function setupAdditionalFeatures() {
    // Ensure username display element exists (only on pages that need it)
    ensureUsernameDisplay();
    
    // Setup username validation for signup (only if signup form exists)
    if (document.getElementById('username_signup')) {
        setupUsernameValidation();
    }
    
    // Setup profile picture change handler (only if element exists)
    const profilePictureInput = document.getElementById('new-profile-picture');
    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', updateProfilePicture);
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
    console.log('🔄 Logout initiated');
    
    if (auth) {
        // Sign out from Firebase first
        auth.signOut().then(() => {
            console.log('✅ User signed out from Firebase');
            
            // Clear frontend variables
            currentUser = null;
            userName = null;
            userDisplayName = null;
            if (typeof userFavorites !== 'undefined') {
                userFavorites.clear();
            }
            
            // Tell the backend to clear session
            return fetch('/logout', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            });
        }).then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Logout request failed');
        }).then(data => {
            console.log('✅ Backend session cleared successfully');
            
            // Hide logout dropdown
            const dropdown = document.getElementById('logout-dropdown');
            if (dropdown) dropdown.style.display = 'none';
            
            // Update UI to logged out state
            updateUIForAuthState(null, null);
            
            // Show success message
            showLogoutMessage('Successfully logged out');
            
            // Redirect to home page after a short delay
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
            
        }).catch(error => {
            console.error('❌ Logout error:', error);
            
            // Even if backend logout fails, clear frontend state
            updateUIForAuthState(null, null);
            
            // Force redirect to home
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        });
    } else {
        console.log('⚠️ Auth not available, clearing frontend state only');
        
        // Clear frontend state
        currentUser = null;
        userName = null;
        userDisplayName = null;
        
        // Update UI
        updateUIForAuthState(null, null);
        
        // Redirect to home
        window.location.href = '/';
    }
}

async function refreshSession() {
    try {
        const response = await fetch('/refresh-session', {
            method: 'POST',
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            console.log('✅ Session refreshed successfully');
            return true;
        } else {
            console.log('⚠️ Session refresh failed');
            return false;
        }
    } catch (error) {
        console.error('❌ Error refreshing session:', error);
        return false;
    }
}

// NEW: Auto-refresh session periodically
function startSessionRefresh() {
    // Refresh session every 5 minutes if user is active
    setInterval(() => {
        if (currentUser || userName) {
            refreshSession();
        }
    }, 5 * 60 * 1000); // 5 minutes
}

// NEW: Show logout message
function showLogoutMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'logout-notification';
    messageDiv.innerHTML = `
        <i class="fas fa-sign-out-alt"></i>
        <span>${message}</span>
    `;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #3498db;
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

// ENHANCED: Check session status on page focus
window.addEventListener('focus', () => {
    // When user comes back to the page, check session status
    if (document.visibilityState === 'visible') {
        setTimeout(() => {
            checkSessionStatus();
        }, 500);
    }
});

// NEW: Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && (currentUser || userName)) {
        // Page became visible and user should be logged in
        // Check session status
        setTimeout(() => {
            checkSessionStatus();
        }, 1000);
    }
});

function startSessionManagement() {
    console.log('🔄 Starting session management...');
    startSessionRefresh();
    
    // Also refresh session when user interacts with the page
    let interactionTimer;
    const refreshOnInteraction = () => {
        clearTimeout(interactionTimer);
        interactionTimer = setTimeout(() => {
            if (currentUser || userName) {
                refreshSession();
            }
        }, 1000);
    };
    
    // Add interaction listeners
    document.addEventListener('click', refreshOnInteraction);
    document.addEventListener('keypress', refreshOnInteraction);
    document.addEventListener('scroll', refreshOnInteraction);
}

///////////////////////
// Sign Up Function //
/////////////////////

function handleSignup(event) {
    event.preventDefault();
    
    const email = document.querySelector('input[name="email_signup"]').value;
    const password = document.querySelector('input[name="password_signup"]').value;
    const username = document.querySelector('input[name="username"]').value.trim();
    const profilePictureFile = document.getElementById('profile_picture').files[0];
    
    console.log('Signup attempt with username:', username);
    
    if (!auth) {
        console.error('Firebase not initialized');
        return;
    }
    
    // Validate username
    if (username.length < 3 || username.length > 20) {
        document.querySelector('.error-message12').textContent = 'Username must be 3-20 characters long';
        return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        document.querySelector('.error-message12').textContent = 'Username can only contain letters, numbers, and underscores';
        return;
    }
    
    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Creating Account...';
    submitButton.disabled = true;
    
    // Use Firebase client-side authentication
    auth.createUserWithEmailAndPassword(email, password)
        .then(async (userCredential) => {
            const user = userCredential.user;
            console.log('User signed up:', user.email);
            
            try {
                // Prepare user data for backend
                let profilePictureUrl = null;
                
                // Handle profile picture upload if provided
                if (profilePictureFile) {
                    const formData = new FormData();
                    formData.append('profile_picture', profilePictureFile);
                    formData.append('user_id', user.uid);
                    
                    const uploadResponse = await fetch(`${baseUrl}/upload-profile-picture`, {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (uploadResponse.ok) {
                        const uploadResult = await uploadResponse.json();
                        profilePictureUrl = uploadResult.url;
                    }
                }
                
                // Send user data to backend
                const response = await fetch(`${baseUrl}/complete-signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        uid: user.uid,
                        email: user.email,
                        username: username,
                        profilePictureUrl: profilePictureUrl
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to complete signup');
                }
                
                // Update Firebase user profile
                await user.updateProfile({
                    displayName: username,
                    photoURL: profilePictureUrl
                });
                
                // Display success message
                document.querySelector('.success-message').textContent = "Account created successfully! Please log in.";
                document.querySelector('.error-message12').textContent = '';
                document.querySelector('.error-message').textContent = '';
                
                // Close signup popup and show login
                togglePopup('signup-popup');
                togglePopup('login-popup');
                
            } catch (backendError) {
                console.error('Backend signup error:', backendError);
                document.querySelector('.error-message12').textContent = backendError.message || 'Failed to complete account setup';
                
                // Delete the Firebase user since backend setup failed
                await user.delete();
            }
        })
        .catch((error) => {
            console.error('Signup error:', error);
            document.querySelector('.success-message').textContent = '';
            document.querySelector('.error-message12').textContent = getFirebaseErrorMessage(error.code);
        })
        .finally(() => {
            // Reset button
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        });
}

//////////////////////
// Login  Function //
////////////////////

function handleLogin(event) {
    event.preventDefault();
    
    console.log('🔄 Login attempt started');
    console.log('🔍 Firebase available:', typeof firebase !== 'undefined');
    console.log('🔍 Auth object available:', typeof auth !== 'undefined' && auth !== null);
    
    const email = document.querySelector('input[name="email"]').value;
    const password = document.querySelector('input[name="password"]').value;
    
    console.log('📧 Email:', email);
    
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase library not loaded');
        const errorElement = document.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = 'Authentication system not ready. Please refresh the page and try again.';
        }
        return;
    }
    
    // Check if Firebase is initialized
    if (firebase.apps.length === 0) {
        console.error('❌ Firebase not initialized, attempting to initialize...');
        
        // Try to initialize Firebase
        initializeFirebase().then(() => {
            console.log('🔄 Firebase initialized, retrying login...');
            // Retry login after initialization
            setTimeout(() => {
                handleLogin(event);
            }, 1000);
        }).catch(error => {
            console.error('❌ Failed to initialize Firebase:', error);
            const errorElement = document.querySelector('.error-message');
            if (errorElement) {
                errorElement.textContent = 'Authentication system failed to initialize. Please refresh the page.';
            }
        });
        return;
    }
    
    // Check if auth is available
    if (!auth) {
        console.error('❌ Firebase auth not available, attempting to get auth...');
        
        try {
            auth = firebase.auth();
            console.log('✅ Auth object created successfully');
        } catch (initError) {
            console.error('❌ Failed to create auth object:', initError);
            const errorElement = document.querySelector('.error-message');
            if (errorElement) {
                errorElement.textContent = 'Authentication not ready. Please refresh the page and try again.';
            }
            return;
        }
    }
    
    console.log('✅ Firebase auth ready, proceeding with login');
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.textContent : '';
    if (submitButton) {
        submitButton.textContent = 'Logging in...';
        submitButton.disabled = true;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log('✅ User logged in:', user.email);
            
            return user.getIdToken().then((idToken) => {
                console.log('🔄 Sending token to backend for session creation...');
                
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
                console.log('📥 Backend response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(`Backend authentication failed: ${response.status}`);
                }
                
                return response.json();
            })
            .then(data => {
                console.log('📥 Backend response data:', data);
                
                if (data.status === 'success') {
                    console.log('✅ Backend session created successfully');
                    
                    // Update global variables
                    userName = user.email;
                    currentUser = user;
                    userDisplayName = data.username || user.displayName || user.email;
                    
                    const errorMsg = document.querySelector('.error-message');
                    const errorMsg12 = document.querySelector('.error-message12');
                    if (errorMsg) errorMsg.textContent = '';
                    if (errorMsg12) errorMsg12.textContent = '';
                    
                    togglePopup('login-popup');
                    
                    // Update sidebar safely
                    const sidebar = document.getElementById('sidebar');
                    const menuButton = document.getElementById('menu-button');
                    const closeButton = document.getElementById('close-button');
                    
                    if (sidebar) sidebar.classList.remove('open');
                    if (menuButton) menuButton.style.display = 'block';
                    if (closeButton) closeButton.style.display = 'none';
                    
                    // Update UI with complete user data
                    setTimeout(() => {
                        updateUIForAuthState(user, { 
                            username: data.username,
                            profilePictureUrl: data.profile_picture_url
                        });
                    }, 100);
                    
                    // Show success message
                    showSuccessMessage('Login successful! Welcome back.');
                    
                } else {
                    console.error('❌ Backend authentication failed:', data);
                    throw new Error(data.message || 'Backend authentication failed');
                }
            });
        })
        .catch((error) => {
            console.error('❌ Login error:', error);
            const successElement = document.querySelector('.success-message');
            const errorElement = document.querySelector('.error-message');
            
            if (successElement) successElement.textContent = '';
            if (errorElement) {
                errorElement.textContent = getFirebaseErrorMessage(error.code) || error.message;
            }
        })
        .finally(() => {
            if (submitButton) {
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        });
}

// Helper function to show success messages
function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-notification';
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
    }, 3000);
}

// ✅ FIXED: Enhanced DOMContentLoaded with Firebase initialization
document.addEventListener("DOMContentLoaded", function () {
    console.log('🔄 DOM loaded, initializing...');
    
    // STEP 1: First check session, then initialize Firebase
    checkSessionAndInitialize();
    
    // STEP 2: Setup page-specific features after a delay
    setTimeout(() => {
        setupPageSpecificFeatures();
    }, 1000);
    
    // STEP 3: Setup slider values only if sliders exist
    setTimeout(() => {
        setupSliders();
    }, 500);
    
    // STEP 4: Setup other features
    setTimeout(() => {
        setupAdditionalFeatures();
    }, 1500);
    
    // STEP 5: Start session management
    setTimeout(() => {
        startSessionManagement();
    }, 2000);
});

// Setup filter page specific features
function setupFilterPage() {
    console.log('🔧 Setting up filter page features...');
    
    // Populate years for filter page
    if (typeof populateYearsForFilter === 'function') {
        populateYearsForFilter();
    }
    
    // Load default cars if user hasn't applied filters
    setTimeout(() => {
        if (!defaultCarsLoaded && typeof loadDefaultCars === 'function') {
            loadDefaultCars();
        }
    }, 1000);
}

// Enhanced ensureUsernameDisplay with better error handling
function ensureUsernameDisplay() {
    // Don't do anything if we're not on a page that needs this
    try {
        const profileContainer = document.getElementById('profile-container');
        if (!profileContainer) {
            console.log('📝 Profile container not found - skipping username display');
            return;
        }
        
        let usernameDisplay = document.getElementById('username-display');
        if (!usernameDisplay) {
            console.log('🔧 Creating username display element');
            usernameDisplay = document.createElement('span');
            usernameDisplay.id = 'username-display';
            usernameDisplay.className = 'username-display';
            usernameDisplay.style.marginRight = '10px';
            usernameDisplay.style.color = '#b49b66';
            usernameDisplay.style.fontWeight = 'bold';
            
            profileContainer.insertBefore(usernameDisplay, profileContainer.firstChild);
            console.log('✅ Username display created');
        }
    } catch (error) {
        console.error('❌ Error in ensureUsernameDisplay:', error);
        // Don't throw - just continue
    }
}

/////////////////////////////
// Username Functionality //
///////////////////////////

// NEW: Function to check username availability
async function checkUsernameAvailability(username) {
  try {
    const response = await fetch(`${baseUrl}/check-username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error checking username availability:', error);
    return { available: false, error: 'Connection error' };
  }
}

function setupUsernameValidation() {
  const usernameInput = document.getElementById('username_signup');
  const statusElement = document.querySelector('.username-status');
  
  if (!usernameInput || !statusElement) return;
  
  let checkTimeout;
  
  usernameInput.addEventListener('input', function() {
    const username = this.value.trim();
    
    // Clear previous timeout
    clearTimeout(checkTimeout);
    statusElement.textContent = '';
    statusElement.className = 'username-status';
    
    // Basic validation
    if (username.length < 3) {
      statusElement.textContent = 'Username must be at least 3 characters';
      statusElement.className = 'username-status unavailable';
      return;
    }
    
    if (username.length > 20) {
      statusElement.textContent = 'Username must be less than 20 characters';
      statusElement.className = 'username-status unavailable';
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      statusElement.textContent = 'Username can only contain letters, numbers, and underscores';
      statusElement.className = 'username-status unavailable';
      return;
    }
    
    // Check availability after 500ms delay
    checkTimeout = setTimeout(async () => {
      statusElement.textContent = 'Checking availability...';
      statusElement.className = 'username-status';
      
      const result = await checkUsernameAvailability(username);
      
      if (result.available) {
        statusElement.textContent = '✓ Username available';
        statusElement.className = 'username-status available';
      } else {
        statusElement.textContent = result.message || 'Username not available';
        statusElement.className = 'username-status unavailable';
      }
    }, 500);
  });
}

function getProfileContainer() {
    try {
        return document.getElementById('profile-container');
    } catch (error) {
        console.error('❌ Error getting profile container:', error);
        return null;
    }
}

function getProfileContainer() {
    try {
        return document.getElementById('profile-container');
    } catch (error) {
        console.error('❌ Error getting profile container:', error);
        return null;
    }
}

// ✅ SAFE function to check if element exists
function elementExists(elementId) {
    try {
        return document.getElementById(elementId) !== null;
    } catch (error) {
        console.error('❌ Error checking element existence:', error);
        return false;
    }
}

function clearUserData() {
    userName = null;
    userDisplayName = null;
    currentUser = null;
    if (typeof userFavorites !== 'undefined') {
        userFavorites.clear();
    }
    updateUIForAuthState(null, null);
}

/////////////////////////////////
// Profile Page Functionality //
///////////////////////////////

function handleProfilePageAccess() {
    console.log('🔒 Checking profile page access...');
    
    // Wait a bit for session check to complete
    setTimeout(() => {
        if (!currentUser && !userName) {
            console.log('❌ User not authenticated, redirecting to home');
            alert('Please sign in to access your profile.');
            window.location.href = '/';
            return;
        }
        
        console.log('✅ User authenticated, loading profile page');
        if (typeof loadProfilePage === 'function') {
            loadProfilePage();
        }
    }, 1500); // Wait longer for session check to complete
}

function loadProfilePage() {
    if (!currentUser) {
        window.location.href = '/';
        return;
    }
    
    loadUserProfile();
}

async function loadUserProfile() {
    try {
        const response = await fetch(`${baseUrl}/get-user-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: currentUser.uid })
        });
        
        if (response.ok) {
            const profile = await response.json();
            
            // Update profile display
            document.getElementById('current-username').value = profile.username || '';
            document.getElementById('current-email').value = profile.email || '';
            document.getElementById('member-since').textContent = new Date(profile.memberSince).toLocaleDateString() || 'Unknown';
            document.getElementById('total-favorites').textContent = profile.favoriteCount || '0';
            
            // Update profile picture
            const currentPic = document.getElementById('current-profile-pic');
            const defaultIcon = document.getElementById('default-profile-icon');
            
            if (profile.profilePictureUrl) {
                currentPic.src = profile.profilePictureUrl;
                currentPic.style.display = 'block';
                defaultIcon.style.display = 'none';
            } else {
                currentPic.style.display = 'none';
                defaultIcon.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function enableUsernameEdit() {
    document.getElementById('current-username').style.display = 'none';
    document.getElementById('edit-username-btn').style.display = 'none';
    document.getElementById('username-edit-form').style.display = 'block';
    
    const newUsernameInput = document.getElementById('new-username');
    newUsernameInput.value = document.getElementById('current-username').value;
    newUsernameInput.focus();
}

function cancelUsernameEdit() {
    document.getElementById('current-username').style.display = 'block';
    document.getElementById('edit-username-btn').style.display = 'block';
    document.getElementById('username-edit-form').style.display = 'none';
    document.getElementById('username-validation').textContent = '';
}

async function saveUsername() {
    const newUsername = document.getElementById('new-username').value.trim();
    const validation = document.getElementById('username-validation');
    
    // Validate username
    if (newUsername.length < 3 || newUsername.length > 20) {
        validation.textContent = 'Username must be 3-20 characters long';
        validation.className = 'username-validation invalid';
        return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
        validation.textContent = 'Username can only contain letters, numbers, and underscores';
        validation.className = 'username-validation invalid';
        return;
    }
    
    // Check if username is different
    if (newUsername === document.getElementById('current-username').value) {
        cancelUsernameEdit();
        return;
    }
    
    try {
        validation.textContent = 'Saving...';
        validation.className = 'username-validation';
        
        const response = await fetch(`${baseUrl}/update-username`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                uid: currentUser.uid,
                newUsername: newUsername 
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            document.getElementById('current-username').value = newUsername;
            userDisplayName = newUsername;
            
            // Update Firebase user profile
            await currentUser.updateProfile({ displayName: newUsername });
            
            // Update UI
            updateUIForAuthState();
            
            validation.textContent = 'Username updated successfully!';
            validation.className = 'username-validation valid';
            
            setTimeout(() => {
                cancelUsernameEdit();
            }, 2000);
        } else {
            validation.textContent = result.message || 'Failed to update username';
            validation.className = 'username-validation invalid';
        }
    } catch (error) {
        console.error('Error updating username:', error);
        validation.textContent = 'Error updating username';
        validation.className = 'username-validation invalid';
    }
}

// NEW: Profile picture functions
async function updateProfilePicture() {
    const fileInput = document.getElementById('new-profile-picture');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    try {
        const formData = new FormData();
        formData.append('profile_picture', file);
        formData.append('uid', currentUser.uid);
        
        const response = await fetch(`${baseUrl}/update-profile-picture`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Update Firebase user profile
            await currentUser.updateProfile({ photoURL: result.url });
            
            // Update UI
            const currentPic = document.getElementById('current-profile-pic');
            const defaultIcon = document.getElementById('default-profile-icon');
            
            currentPic.src = result.url;
            currentPic.style.display = 'block';
            defaultIcon.style.display = 'none';
            
            // Update header profile pic
            updateUIForAuthState();
            
            alert('Profile picture updated successfully!');
        } else {
            const error = await response.json();
            alert('Failed to update profile picture: ' + error.message);
        }
    } catch (error) {
        console.error('Error updating profile picture:', error);
        alert('Error updating profile picture');
    }
}

async function removeProfilePicture() {
    if (!confirm('Are you sure you want to remove your profile picture?')) return;
    
    try {
        const response = await fetch(`${baseUrl}/remove-profile-picture`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: currentUser.uid })
        });
        
        if (response.ok) {
            // Update Firebase user profile
            await currentUser.updateProfile({ photoURL: null });
            
            // Update UI
            const currentPic = document.getElementById('current-profile-pic');
            const defaultIcon = document.getElementById('default-profile-icon');
            
            currentPic.style.display = 'none';
            defaultIcon.style.display = 'block';
            
            // Update header profile pic
            updateUIForAuthState();
            
            alert('Profile picture removed successfully!');
        } else {
            const error = await response.json();
            alert('Failed to remove profile picture: ' + error.message);
        }
    } catch (error) {
        console.error('Error removing profile picture:', error);
        alert('Error removing profile picture');
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

function setupSliders() {
    console.log('🎚️ Setting up sliders...');
    
    // Check if we're on a page with sliders
    const priceSlider = document.getElementById('price');
    if (!priceSlider) {
        console.log('📍 No sliders found on this page');
        return;
    }
    
    // Initialize all slider values
    updateSliderValue("price", "", true);
    updateSliderValue("horsepower", "HP", false);
    updateSliderValue("seating", "", false); // seating has special handling
    updateSliderValue("cargo-space", "L", false);
    updateSliderValue("ground-clearance", "cm", false);
    
    console.log('✅ Sliders initialized successfully');
}

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
        const isLiked = userFavorites && userFavorites.has(car.Variant);
        const heartClass = isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        const heartColor = isLiked ? '#e74c3c' : '#b49b66';
        
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

// UPDATED: Site-appropriate color palette
const chartColors = [
    '#8b6914', // Dark Gold
    '#7c2d12', // Burgundy Brown
    '#365314', // Forest Green
    '#1e3a8a', // Navy Blue
    '#6b7280', // Warm Gray
    '#92400e', // Amber Brown
    '#374151', // Charcoal
    '#581c87'  // Deep Purple
];

const chartBackgroundColors = [
    'rgba(139, 105, 20, 0.75)',   // Dark Gold
    'rgba(124, 45, 18, 0.75)',    // Burgundy Brown
    'rgba(54, 83, 20, 0.75)',     // Forest Green
    'rgba(30, 58, 138, 0.75)',    // Navy Blue
    'rgba(107, 114, 128, 0.75)',  // Warm Gray
    'rgba(146, 64, 14, 0.75)',    // Amber Brown
    'rgba(55, 65, 81, 0.75)',     // Charcoal
    'rgba(88, 28, 135, 0.75)'     // Deep Purple
];

// FIXED: Initialize compare page properly
function initializeComparePage() {
    console.log('Initializing compare page...');
    
    // Check if we're on the compare page
    const brandDropdown = document.getElementById('brand');
    if (!brandDropdown) {
        console.log('Not on compare page, skipping compare initialization');
        return;
    }
    
    // Load brands immediately
    populateBrandsForCompare();
    
    // Preload some brand logos for better performance
    setTimeout(() => {
        preloadBrandLogos();
    }, 2000);
    
    console.log('Compare page initialized successfully');
}

// FIXED: Improved populateBrandsForCompare function with error handling
async function populateBrandsForCompare() {
    const brandDropdown = document.getElementById('brand');
    
    if (!brandDropdown) {
        console.log('Brand dropdown not found - not on compare page');
        return;
    }

    try {
        console.log('🔍 Fetching all available brands for compare...');
        
        // Show loading state
        brandDropdown.innerHTML = '<option value="" disabled>Loading brands...</option>';
        
        const response = await fetch(`${baseUrl}/get_brands`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const brands = await response.json();
        console.log('📅 Received brands:', brands);
        
        if (!Array.isArray(brands)) {
            console.error('❌ Expected array of brands but got:', brands);
            brandDropdown.innerHTML = '<option value="" disabled>Error loading brands</option>';
            return;
        }
        
        // Clear loading message and add default option
        brandDropdown.innerHTML = '<option value="" selected disabled>Select Brand</option>';
        
        // FIXED: Remove duplicates and normalize brand names
        const uniqueBrands = [...new Set(brands.map(brand => {
            // Normalize brand names to handle duplicates
            let normalizedBrand = brand.trim();
            
            // Handle specific duplicates
            if (normalizedBrand.toLowerCase().includes('mercedes')) {
                normalizedBrand = 'Mercedes-Benz';
            }
            
            return normalizedBrand;
        }))];
        
        // Sort brands alphabetically
        uniqueBrands.sort();
        
        uniqueBrands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            brandDropdown.appendChild(option);
        });
        
        console.log(`✅ Successfully populated ${uniqueBrands.length} unique brands in compare dropdown`);
        
    } catch (error) {
        console.error('❌ Error fetching brands for compare:', error);
        // Show error state in dropdown with retry option
        brandDropdown.innerHTML = `
            <option value="" disabled>Error loading brands</option>
            <option value="retry" style="color: #e74c3c;">Click to retry</option>
        `;
        
        // Add retry functionality
        brandDropdown.addEventListener('change', function(e) {
            if (e.target.value === 'retry') {
                populateBrandsForCompare();
            }
        });
        
        // Show user-friendly error message
        showCompareErrorMessage('Failed to load brands. Please check your connection and try again.');
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
        showCompareErrorMessage('Error fetching variants. Please try again.');
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
        showCompareErrorMessage('Error fetching years. Please try again.');
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
        showCompareErrorMessage('Error fetching car specifications. Please try again.');
    }
}

// FIXED: Enhanced addCarToComparison function with proper image handling
function addCarToComparison(carId, variant, year, specs) {
    const container = document.getElementById('comparison-container');
    if (!container) {
        console.error('Comparison container not found');
        return;
    }
    
    // Show comparison wrapper
    const wrapper = document.getElementById('comparison-cards-wrapper');
    const chartsSection = document.getElementById('compare-charts-section');
    const radarSection = document.getElementById('radar-chart-section');
    
    if (wrapper) wrapper.style.display = 'block';
    if (chartsSection) chartsSection.style.display = 'block';
    if (radarSection) radarSection.style.display = 'block';
    
    // FIXED: Determine image URL with proper fallback
    let imageUrl = '/static/resources/tesr.png'; // Default fallback
    
    // Try different image path patterns
    if (specs.Image && specs.Image.trim() !== '') {
        imageUrl = specs.Image;
    } else if (specs.Brand && specs.Model) {
        // Try to construct image path
        const brandLower = specs.Brand.toLowerCase().replace(/\s+/g, '_');
        const modelLower = specs.Model.toLowerCase().replace(/\s+/g, '_');
        imageUrl = `/static/car_images/${brandLower}_${modelLower}.jpg`;
    }
    
    console.log('Using image URL:', imageUrl, 'for car:', variant);
    
    // Check if car is already liked
    const isLiked = userFavorites.has(variant);
    const heartClass = isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    const heartColor = isLiked ? '#e74c3c' : '#b49b66';
    
    const carColumn = document.createElement('div');
    carColumn.className = 'car-column';
    carColumn.id = `car-${carId}`;
    
    carColumn.innerHTML = `
        <div class="car-title">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span>${specs.Brand} ${specs.Model}</span>
                <div class="heart-container">
                    <i class="${heartClass}" 
                       id="compare-like-icon" 
                       style="color: ${heartColor}; cursor: pointer;" 
                       onclick="addToFave(event, '${variant}')"></i>
                </div>
            </div>
            <div style="font-size: 1rem; color: #666; margin-top: 0.5rem;">
                ${variant} (${year})
            </div>
        </div>
        
        <div class="car-image-container">
            <img src="${imageUrl}" 
                 alt="${specs.Brand} ${specs.Model}" 
                 class="car-image"
                 onerror="this.src='/static/resources/tesr.png'; console.log('Image failed to load, using fallback for ${variant}');">
        </div>
        
        <div class="spec-section">
            <div class="spec-category">Vehicle Details</div>
            <div class="spec-value"><span class="spec-label">Brand:</span> ${specs.Brand || 'N/A'}</div>
            <div class="spec-value"><span class="spec-label">Model:</span> ${specs.Model || 'N/A'}</div>
            <div class="spec-value"><span class="spec-label">Variant:</span> ${variant}</div>
            <div class="spec-value"><span class="spec-label">Year:</span> ${year}</div>
            <div class="spec-value"><span class="spec-label">Body Type:</span> ${specs.BodyType || 'N/A'}</div>
        </div>
        
        <div class="spec-section">
            <div class="spec-category">Performance</div>
            <div class="spec-value"><span class="spec-label">Engine:</span> ${specs.Engine || 'N/A'}</div>
            <div class="spec-value"><span class="spec-label">Horsepower:</span> ${specs.Horsepower ? specs.Horsepower + ' HP' : 'N/A'}</div>
            <div class="spec-value"><span class="spec-label">Transmission:</span> ${specs.Transmission || 'N/A'}</div>
            <div class="spec-value"><span class="spec-label">Drive Train:</span> ${specs.DriveTrain || 'N/A'}</div>
            <div class="spec-value"><span class="spec-label">Fuel Type:</span> ${specs.FuelType || 'N/A'}</div>
        </div>
        
        <div class="spec-section">
            <div class="spec-category">Dimensions & Capacity</div>
            <div class="spec-value"><span class="spec-label">Ground Clearance:</span> ${specs.GroundClearance ? specs.GroundClearance + ' cm' : 'N/A'}</div>
            <div class="spec-value"><span class="spec-label">Cargo Space:</span> ${specs.Cargospace ? specs.Cargospace + ' L' : 'N/A'}</div>
            <div class="spec-value"><span class="spec-label">Seating:</span> ${specs.SeatingCapacity ? specs.SeatingCapacity + ' seats' : 'N/A'}</div>
        </div>
        
        <div class="price-comparison">
            <div class="spec-label">Price</div>
            <div class="price-value">₱${specs.Price ? parseInt(specs.Price).toLocaleString() : 'N/A'}</div>
        </div>
        
        <button class="remove-btn" onclick="removeCarFromComparison('${carId}')">
            <i class="fas fa-trash"></i> Remove Car
        </button>
    `;
    
    container.appendChild(carColumn);
    console.log('Car added to comparison:', variant, year);
}

// Function to remove car from comparison
function removeCarFromComparison(carId) {
    const carElement = document.getElementById(`car-${carId}`);
    if (carElement) {
        carElement.remove();
    }
    
    // Remove from comparedCars array
    comparedCars = comparedCars.filter(car => car.id !== carId);
    
    // Update charts
    if (comparedCars.length > 0) {
        updateAllCharts();
    } else {
        // Hide sections if no cars left
        const wrapper = document.getElementById('comparison-cards-wrapper');
        const chartsSection = document.getElementById('compare-charts-section');
        const radarSection = document.getElementById('radar-chart-section');
        
        if (wrapper) wrapper.style.display = 'none';
        if (chartsSection) chartsSection.style.display = 'none';
        if (radarSection) radarSection.style.display = 'none';
        
        // Clear chart instances
        Object.values(chartInstances).forEach(chart => {
            if (chart) chart.destroy();
        });
        chartInstances = {};
    }
}

/////////////////////////
// Compare Charts Logo //
/////////////////////////

// Global object to store loaded logo images
let brandLogos = {};

// ENHANCED: Enhanced brand processing configurations for problematic logos
const enhancedBrandProcessingConfig = {
    'bmw': {
        type: 'complex_circular',
        removeAllGradients: true,
        forceMonochrome: true,
        textHandling: 'convert_to_paths',
        specialProcessing: 'bmw_circle',
        fallbackText: 'BMW'
    },
    'ford': {
        type: 'oval_with_text',
        removeAllGradients: true,
        forceMonochrome: true,
        textHandling: 'force_simple',
        specialProcessing: 'ford_oval',
        fallbackText: 'FORD'
    },
    'kia': {
        type: 'modern_oval',
        removeAllGradients: true,
        forceMonochrome: true,
        textHandling: 'force_simple',
        specialProcessing: 'kia_oval',
        fallbackText: 'KIA'
    },
    'hyundai': {
        type: 'italic_oval',
        removeAllGradients: true,
        forceMonochrome: true,
        textHandling: 'force_simple',
        specialProcessing: 'hyundai_oval',
        fallbackText: 'HYUNDAI'
    },
    'mg': {
        type: 'octagon_badge',
        removeAllGradients: true,
        forceMonochrome: true,
        textHandling: 'force_simple',
        specialProcessing: 'mg_badge',
        fallbackText: 'MG'
    },
    'mercedes': {
        type: 'three_pointed_star',
        removeAllGradients: true,
        forceMonochrome: true,
        textHandling: 'remove_text',
        specialProcessing: 'mercedes_star',
        fallbackText: 'MB'
    },
    'mercedes-benz': {
        type: 'redirect',
        redirectTo: 'mercedes' // Handle duplicate
    },
    'porsche': {
        type: 'complex_crest',
        removeAllGradients: true,
        forceMonochrome: true,
        textHandling: 'simplify_crest',
        specialProcessing: 'porsche_crest',
        fallbackText: 'P'
    },
    'subaru': {
        type: 'missing_svg',
        fallbackText: 'SUBARU',
        useTextFallback: true
    },
    'tesla': {
        type: 'stylized_t',
        removeAllGradients: true,
        forceMonochrome: true,
        textHandling: 'remove_text',
        specialProcessing: 'tesla_t',
        fallbackText: 'T'
    },
    'volkswagen': {
        type: 'vw_circle',
        removeAllGradients: true,
        forceMonochrome: true,
        textHandling: 'keep_vw_only',
        specialProcessing: 'vw_circle',
        fallbackText: 'VW'
    }
};

// ENHANCED: Better text fallback logo creation with proper text fitting
function createTextFallbackLogo(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    // Background circle using your site's theme color
    ctx.fillStyle = '#b49b66';
    ctx.beginPath();
    ctx.arc(50, 50, 45, 0, 2 * Math.PI);
    ctx.fill();
    
    // Enhanced text fitting logic for long brand names
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let fontSize = 20;
    let lines = [];
    
    // Handle long brand names by splitting them
    if (text.length > 8) {
        // For very long names like "MERCEDES", "HYUNDAI", "PORSCHE"
        if (text.length > 10) {
            // Split into two lines
            const mid = Math.ceil(text.length / 2);
            lines = [text.substring(0, mid), text.substring(mid)];
            fontSize = 10;
        } else {
            // Single line but smaller font
            lines = [text];
            fontSize = 12;
        }
    } else if (text.length > 5) {
        lines = [text];
        fontSize = 14;
    } else if (text.length > 3) {
        lines = [text];
        fontSize = 16;
    } else {
        lines = [text];
        fontSize = 20;
    }
    
    ctx.font = `bold ${fontSize}px Arial`;
    
    // Draw text lines
    if (lines.length === 1) {
        ctx.fillText(lines[0], 50, 50);
    } else {
        // Two lines
        ctx.fillText(lines[0], 50, 42);
        ctx.fillText(lines[1], 50, 58);
    }
    
    // Convert to image
    const img = new Image();
    img.src = canvas.toDataURL();
    
    return new Promise((resolve) => {
        img.onload = () => resolve(img);
    });
}

// Function to preload all brand logos for compared cars
async function preloadBrandLogos() {
    const brands = [...new Set(comparedCars.map(car => car.specs.Brand))];
    console.log('🔄 Preloading SVG logos for brands:', brands);
    
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
}

// ENHANCED: Fixed loadBrandLogo function to prevent Tesla/Hyundai bug
async function loadBrandLogo(brandName) {
    if (!brandName) return null;
    
    // IMPORTANT FIX: Clean the brand name properly to avoid conflicts
    const logoKey = String(brandName).toLowerCase().replace(/[\s-]/g, '').trim();
    
    console.log(`🔍 Loading logo for brand: "${brandName}" (key: "${logoKey}")`);
    
    // Return cached logo if already loaded
    if (brandLogos[logoKey]) {
        console.log(`✅ Using cached logo for: ${brandName}`);
        return brandLogos[logoKey];
    }
    
    const config = enhancedBrandProcessingConfig[logoKey] || {};
    
    // Handle redirects (like mercedes-benz -> mercedes)
    if (config.type === 'redirect') {
        console.log(`🔄 Redirecting ${brandName} to ${config.redirectTo}`);
        return await loadBrandLogo(config.redirectTo);
    }
    
    // Handle missing SVGs with text fallback
    if (config.type === 'missing_svg' || config.useTextFallback) {
        console.log(`📝 Creating text fallback for ${brandName}`);
        const textLogo = await createTextFallbackLogo(config.fallbackText || brandName.toUpperCase());
        brandLogos[logoKey] = textLogo;
        return textLogo;
    }
    
    try {
        const svgPath = `/static/brand_logo/${logoKey}_logo.svg`;
        const response = await fetch(svgPath);
        
        if (!response.ok) {
            console.warn(`⚠️ SVG not found for ${brandName}, using text fallback`);
            const textLogo = await createTextFallbackLogo(config.fallbackText || brandName.toUpperCase());
            brandLogos[logoKey] = textLogo;
            return textLogo;
        }
        
        const svgText = await response.text();
        
        if (!svgText || !svgText.includes('<svg')) {
            throw new Error('Invalid SVG content');
        }
        
        // Process with enhanced method
        const processedSvg = enhancedProcessSvgForChart(svgText, brandName, config);
        
        // Convert to image
        const img = await svgToImageWithRetry(processedSvg, config.fallbackText || brandName.toUpperCase());
        
        brandLogos[logoKey] = img;
        console.log(`✅ Successfully loaded enhanced logo for: ${brandName}`);
        return img;
        
    } catch (error) {
        console.warn(`❌ Error loading SVG for ${brandName}:`, error);
        
        // Create text fallback as last resort
        const textLogo = await createTextFallbackLogo(config.fallbackText || brandName.toUpperCase());
        brandLogos[logoKey] = textLogo;
        return textLogo;
    }
}

// Enhanced SVG processing function
// FIXED: Better SVG processing for problematic brands
function enhancedProcessSvgForChart(svgText, brandName, config) {
    try {
        console.log(`🔧 Enhanced processing for ${brandName}...`);
        
        const themeColor = '#b49b66';
        
        // Create DOM parser for better SVG handling
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgElement = doc.querySelector('svg');
        
        if (!svgElement) {
            throw new Error('No SVG element found');
        }
        
        // FIXED: Set consistent dimensions and viewBox
        svgElement.setAttribute('width', '100');
        svgElement.setAttribute('height', '100');
        svgElement.setAttribute('viewBox', '0 0 100 100');
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet'); // FIXED: Center the content
        
        // Remove problematic elements
        const problematicElements = svgElement.querySelectorAll(
            'defs, style, script, metadata, title, desc, linearGradient, radialGradient, pattern, filter, mask, clipPath'
        );
        problematicElements.forEach(el => el.remove());
        
        // FIXED: Apply consistent coloring
        const allElements = svgElement.querySelectorAll('*');
        allElements.forEach(element => {
            element.setAttribute('fill', themeColor);
            element.setAttribute('stroke', 'none');
            element.style.fill = themeColor;
            element.style.stroke = 'none';
        });
        
        console.log(`✅ Enhanced processing completed for ${brandName}`);
        return svgElement.outerHTML;
        
    } catch (error) {
        console.warn(`❌ Enhanced processing failed for ${brandName}:`, error);
        // FIXED: Return null instead of fallback to prevent inconsistent display
        return null;
    }
}

// Enhanced special processing functions
function applyEnhancedSpecialProcessing(svgElement, processingType, themeColor, config) {
    const allElements = svgElement.querySelectorAll('*');
    
    switch (processingType) {
        case 'bmw_circle':
        case 'mercedes_star':
        case 'tesla_t':
        case 'vw_circle':
            // For circular/simple logos - keep main shapes, remove text
            allElements.forEach(element => {
                if (element.tagName === 'text' || element.tagName === 'tspan') {
                    element.remove();
                } else {
                    element.setAttribute('fill', themeColor);
                    element.setAttribute('stroke', themeColor);
                }
            });
            break;
            
        case 'ford_oval':
        case 'kia_oval':
        case 'hyundai_oval':
            // For oval logos - simplify and keep main shape
            allElements.forEach(element => {
                if (element.tagName === 'text' || element.tagName === 'tspan') {
                    // Keep text but simplify
                    element.setAttribute('fill', themeColor);
                    element.setAttribute('font-family', 'Arial, sans-serif');
                    element.setAttribute('font-weight', 'bold');
                    element.removeAttribute('font-style');
                } else {
                    element.setAttribute('fill', themeColor);
                    element.setAttribute('stroke', themeColor);
                }
            });
            break;
            
        case 'porsche_crest':
            // For complex crests - extreme simplification
            const complexElements = svgElement.querySelectorAll('text, tspan');
            complexElements.forEach(el => el.remove());
            
            allElements.forEach(element => {
                element.setAttribute('fill', themeColor);
                element.setAttribute('stroke', 'none');
                element.removeAttribute('opacity');
                element.removeAttribute('fill-opacity');
            });
            break;
            
        case 'mg_badge':
            // For badges - keep simple shapes only
            allElements.forEach(element => {
                element.setAttribute('fill', themeColor);
                element.setAttribute('stroke', themeColor);
                element.removeAttribute('stroke-width');
            });
            break;
    }
}

// Force complete monochrome conversion
function forceCompleteMonochrome(svgElement, themeColor, config) {
    const allElements = svgElement.querySelectorAll('*');
    
    allElements.forEach(element => {
        // Remove all color-related attributes
        const colorAttributes = [
            'fill', 'stroke', 'stop-color', 'flood-color', 
            'lighting-color', 'fill-opacity', 'stroke-opacity',
            'opacity', 'color'
        ];
        
        colorAttributes.forEach(attr => {
            element.removeAttribute(attr);
        });
        
        // Set new attributes
        if (['path', 'circle', 'rect', 'polygon', 'ellipse', 'g'].includes(element.tagName)) {
            element.setAttribute('fill', themeColor);
            element.setAttribute('stroke', 'none');
        }
        
        if (['text', 'tspan'].includes(element.tagName)) {
            element.setAttribute('fill', themeColor);
            element.setAttribute('stroke', 'none');
            element.setAttribute('font-family', 'Arial, sans-serif');
            element.setAttribute('font-weight', 'bold');
        }
        
        // Force style attributes
        element.style.fill = themeColor;
        element.style.stroke = 'none';
        element.style.color = themeColor;
        element.style.opacity = '1';
    });
}

// Create fallback SVG for processing failures
function createFallbackSvg(text) {
    return `
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="#b49b66" stroke="none"/>
            <text x="50" y="55" text-anchor="middle" fill="white" 
                  font-family="Arial, sans-serif" font-weight="bold" font-size="16">
                ${text}
            </text>
        </svg>
    `;
}

// Enhanced SVG to Image conversion with retry logic
async function svgToImageWithRetry(svgString, fallbackText, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Converting SVG to image (attempt ${attempt}/${maxRetries})`);
            
            const img = new Image();
            
            return new Promise((resolve, reject) => {
                img.onload = () => {
                    console.log(`✅ SVG converted successfully on attempt ${attempt}`);
                    resolve(img);
                };
                
                img.onerror = (error) => {
                    console.warn(`❌ SVG conversion failed on attempt ${attempt}:`, error);
                    reject(error);
                };
                
                // Create blob URL with proper MIME type
                const svgBlob = new Blob([svgString], { 
                    type: 'image/svg+xml;charset=utf-8' 
                });
                const svgUrl = URL.createObjectURL(svgBlob);
                
                img.src = svgUrl;
                
                // Cleanup and timeout
                setTimeout(() => {
                    URL.revokeObjectURL(svgUrl);
                    if (!img.complete) {
                        reject(new Error(`SVG loading timeout on attempt ${attempt}`));
                    }
                }, 3000);
            });
            
        } catch (error) {
            console.warn(`⚠️ Attempt ${attempt} failed:`, error);
            
            if (attempt === maxRetries) {
                console.log(`🔄 All attempts failed, creating text fallback for: ${fallbackText}`);
                return await createTextFallbackLogo(fallbackText || 'LOGO');
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

// COMPLETE WORKING Brand Logo Plugin
const brandLogoPlugin = {
    id: 'brandLogo',
    afterDatasetsDraw: function(chart, args, options) {
        const { ctx, data } = chart;
        
        if (!data.datasets || !data.datasets[0] || !comparedCars || comparedCars.length === 0) {
            return;
        }
        
        ctx.save();
        
        // Loop through each bar
        data.datasets[0].data.forEach((value, index) => {
            if (index >= comparedCars.length) return;
            
            const car = comparedCars[index];
            const brandName = car.specs.Brand;
            
            if (!brandName) return;
            
            // Get the correct logo using the brand name
            const logoKey = String(brandName).toLowerCase().replace(/[\s-]/g, '').trim();
            const logo = brandLogos[logoKey];
            
            // Get bar position
            const meta = chart.getDatasetMeta(0);
            const bar = meta.data[index];
            
            if (!bar) return;
            
            // Calculate positions
            const barWidth = Math.abs(bar.width || 40);
            const barHeight = Math.abs((bar.y || 0) - (bar.base || 0));
            const centerX = bar.x || 0;
            
            let centerY;
            if (bar.y < bar.base) {
                centerY = bar.y + (bar.base - bar.y) / 2;
            } else {
                centerY = bar.base + (bar.y - bar.base) / 2;
            }
            
            // Smart logo sizing
            let logoSize = Math.min(barWidth * 0.6, 45);
            logoSize = Math.max(25, Math.min(logoSize, 60));
            
            // Only show logo if bar is big enough
            const minBarHeight = logoSize + 20;
            const minBarWidth = logoSize + 10;
            
            if (barHeight > minBarHeight && barWidth > minBarWidth) {
                if (logo && logo.complete && logo.naturalHeight !== 0) {
                    try {
                        // Draw white circular background
                        const backgroundRadius = logoSize / 2 + 5;
                        ctx.beginPath();
                        ctx.arc(centerX, centerY, backgroundRadius, 0, 2 * Math.PI);
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(180, 155, 102, 0.7)';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                        
                        // FIXED: Proper logo positioning
                        const logoX = centerX - logoSize / 2;
                        const logoY = centerY - logoSize / 2;
                        
                        // Ensure we're within canvas bounds
                        if (logoX >= 0 && logoY >= 0 && 
                            logoX + logoSize <= chart.width && 
                            logoY + logoSize <= chart.height) {
                            
                            ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
                        }
                        
                    } catch (error) {
                        console.warn(`❌ Error drawing logo for ${brandName}:`, error);
                    }
                }
            }
        });
        
        ctx.restore();
    }
};

// FIXED: Fallback function (keep it simple)
function drawBrandTextFallback(ctx, centerX, centerY, brandName, size) {
    // Simple implementation - don't show fallback text to avoid inconsistencies
    return;
}

// FIXED: New function to properly center SVG content
async function svgToProperlycenteredImage(svgText, brandName) {
    return new Promise((resolve, reject) => {
        try {
            // FIXED: Process SVG to ensure proper centering
            const processedSvg = `
                <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <g transform="translate(50,50)">
                        <g transform="translate(-50,-50) scale(1,1)">
                            ${svgText.replace(/<svg[^>]*>|<\/svg>/gi, '').replace(/width="[^"]*"/gi, '').replace(/height="[^"]*"/gi, '')}
                        </g>
                    </g>
                </svg>
            `;
            
            const img = new Image();
            
            img.onload = () => {
                console.log(`✅ SVG properly centered for: ${brandName}`);
                resolve(img);
            };
            
            img.onerror = (error) => {
                console.warn(`❌ SVG centering failed for ${brandName}:`, error);
                reject(error);
            };
            
            // Create blob URL
            const svgBlob = new Blob([processedSvg], { 
                type: 'image/svg+xml;charset=utf-8' 
            });
            const svgUrl = URL.createObjectURL(svgBlob);
            
            img.src = svgUrl;
            
            // Cleanup
            setTimeout(() => {
                URL.revokeObjectURL(svgUrl);
            }, 5000);
            
        } catch (error) {
            reject(error);
        }
    });
}

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

// ENHANCED: Updated chart functions with Brand + Model labels and new colors

// FIXED: Horsepower Chart with Brand-First Labels
function updateHorsepowerChart() {
    const canvas = document.getElementById('horsepowerChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (chartInstances.horsepower) {
        chartInstances.horsepower.destroy();
    }

    // FIXED: Brand-first labels
    const labels = comparedCars.map(car => {
        const brand = car.specs.Brand || 'Unknown';
        const model = car.specs.Model || 'Unknown';
        const variant = car.variant || 'Unknown';
        const year = car.year || '';
        
        return `${brand} ${model}\n${variant} (${year})`;
    });
    
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
                            return `${car.specs.Brand} ${car.specs.Model} ${car.variant} (${car.year})`;
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
                    maxRotation: 0, // FIXED: No rotation, keep horizontal
                    minRotation: 0, // FIXED: Force horizontal
                    color: '#666',
                    font: { size: 10 },
                    callback: function(value, index) {
                        // FIXED: Truncate long labels to fit
                        const label = this.getLabelForValue(value);
                        const maxLength = 15; // Adjust based on your needs
                        if (label && label.length > maxLength) {
                            return label.substring(0, maxLength) + '...';
                        }
                        return label;
                        }
                    }
                }
            }
        },
        plugins: [brandLogoPlugin]
    });
}

// FIXED: Price Chart with Brand-First Labels
function updatePriceChart() {
    const canvas = document.getElementById('priceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (chartInstances.price) {
        chartInstances.price.destroy();
    }

    // FIXED: Brand-first labels
    const labels = comparedCars.map(car => {
        const brand = car.specs.Brand || 'Unknown';
        const model = car.specs.Model || 'Unknown';
        const variant = car.variant || 'Unknown';
        const year = car.year || '';
        
        return `${brand} ${model}\n${variant} (${year})`;
    });
    
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
                            return `${car.specs.Brand} ${car.specs.Model} ${car.variant} (${car.year})`;
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
                        maxRotation: 0, // FIXED: No rotation, keep horizontal
                        minRotation: 0, // FIXED: Force horizontal
                        color: '#666',
                        font: { size: 10 },
                        callback: function(value, index) {
                            // FIXED: Truncate long labels to fit
                            const label = this.getLabelForValue(value);
                            const maxLength = 15; // Adjust based on your needs
                            if (label && label.length > maxLength) {
                                return label.substring(0, maxLength) + '...';
                            }
                            return label;
                        }
                    }
                }
            }
        },
        plugins: [brandLogoPlugin]
    });
}

// FIXED: Ground Clearance Chart with Brand-First Labels
function updateGroundClearanceChart() {
    const canvas = document.getElementById('groundClearanceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (chartInstances.groundClearance) {
        chartInstances.groundClearance.destroy();
    }

    // FIXED: Brand-first labels
    const labels = comparedCars.map(car => {
        const brand = car.specs.Brand || 'Unknown';
        const model = car.specs.Model || 'Unknown';
        const variant = car.variant || 'Unknown';
        const year = car.year || '';
        
        return `${brand} ${model}\n${variant} (${year})`;
    });
    
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
                            return `${car.specs.Brand} ${car.specs.Model} ${car.variant} (${car.year})`;
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
                        maxRotation: 0, // FIXED: No rotation, keep horizontal
                        minRotation: 0, // FIXED: Force horizontal
                        color: '#666',
                        font: { size: 10 },
                        callback: function(value, index) {
                            // FIXED: Truncate long labels to fit
                            const label = this.getLabelForValue(value);
                            const maxLength = 15; // Adjust based on your needs
                            if (label && label.length > maxLength) {
                                return label.substring(0, maxLength) + '...';
                            }
                            return label;
                        }
                    }
                }
            }
        },
        plugins: [brandLogoPlugin]
    });
}

// FIXED: Seating Capacity Chart with Brand-First Labels
function updateSeatingCapacityChart() {
    const canvas = document.getElementById('seatingCapacityChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (chartInstances.seatingCapacity) {
        chartInstances.seatingCapacity.destroy();
    }

    // FIXED: Brand-first labels
    const labels = comparedCars.map(car => {
        const brand = car.specs.Brand || 'Unknown';
        const model = car.specs.Model || 'Unknown';
        const variant = car.variant || 'Unknown';
        const year = car.year || '';
        
        return `${brand} ${model}\n${variant} (${year})`;
    });
    
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
                            return `${car.specs.Brand} ${car.specs.Model} ${car.variant} (${car.year})`;
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
                        maxRotation: 0, // FIXED: No rotation, keep horizontal
                        minRotation: 0, // FIXED: Force horizontal
                        color: '#666',
                        font: { size: 10 },
                        callback: function(value, index) {
                            // FIXED: Truncate long labels to fit
                            const label = this.getLabelForValue(value);
                            const maxLength = 15; // Adjust based on your needs
                            if (label && label.length > maxLength) {
                                return label.substring(0, maxLength) + '...';
                            }
                            return label;
                        }
                    }
                }
            }
        },
        plugins: [brandLogoPlugin]
    });
}

// FIXED: Cargo Space Chart with Brand-First Labels
function updateCargoSpaceChart() {
    const canvas = document.getElementById('cargoSpaceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (chartInstances.cargoSpace) {
        chartInstances.cargoSpace.destroy();
    }

    // FIXED: Brand-first labels
    const labels = comparedCars.map(car => {
        const brand = car.specs.Brand || 'Unknown';
        const model = car.specs.Model || 'Unknown';
        const variant = car.variant || 'Unknown';
        const year = car.year || '';
        
        return `${brand} ${model}\n${variant} (${year})`;
    });
    
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
                            return `${car.specs.Brand} ${car.specs.Model} ${car.variant} (${car.year})`;
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
                        maxRotation: 0, // FIXED: No rotation, keep horizontal
                        minRotation: 0, // FIXED: Force horizontal
                        color: '#666',
                        font: { size: 10 },
                        callback: function(value, index) {
                            // FIXED: Truncate long labels to fit
                            const label = this.getLabelForValue(value);
                            const maxLength = 15; // Adjust based on your needs
                            if (label && label.length > maxLength) {
                                return label.substring(0, maxLength) + '...';
                            }
                            return label;
                        }
                    }
                }
            }
        },
        plugins: [brandLogoPlugin]
    });
}

// Make toggle functions globally available
window.toggleRadarCarVisibility = toggleRadarCarVisibility;

// FIXED: Enhanced updateRadarChart function with better scaling
function updateRadarChart() {
    const canvas = document.getElementById('radarChart');
    if (!canvas || comparedCars.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    
    if (chartInstances.radar) {
        chartInstances.radar.destroy();
    }

    // Prepare data for radar chart - RESTORED ORIGINAL LOGIC
    const datasets = comparedCars.map((car, index) => {
        // Get actual values
        const horsepower = parseFloat(car.specs.Horsepower) || 0;
        const price = parseFloat(car.specs.Price) || 0;
        const groundClearance = parseFloat(car.specs.GroundClearance) || 0;
        const cargoSpace = parseFloat(car.specs.Cargospace) || 0;
        const seatingCapacity = parseInt(car.specs.SeatingCapacity) || 0;
        
        // Store max values for dynamic scaling
        const maxValues = comparedCars.reduce((max, c) => ({
            hp: Math.max(max.hp, parseFloat(c.specs.Horsepower) || 0),
            price: Math.max(max.price, parseFloat(c.specs.Price) || 0),
            gc: Math.max(max.gc, parseFloat(c.specs.GroundClearance) || 0),
            cargo: Math.max(max.cargo, parseFloat(c.specs.Cargospace) || 0),
            seating: Math.max(max.seating, parseInt(c.specs.SeatingCapacity) || 0)
        }), { hp: 0, price: 0, gc: 0, cargo: 0, seating: 0 });
        
        // Scale to 0-100 based on max values among compared cars
        const scaledData = [
            (horsepower / maxValues.hp) * 100,
            (price / maxValues.price) * 100,
            (groundClearance / maxValues.gc) * 100,
            (cargoSpace / maxValues.cargo) * 100,
            (seatingCapacity / maxValues.seating) * 100
        ];
        
        return {
            label: `${car.specs.Brand} ${car.specs.Model} ${car.variant} (${car.year})`,
            data: scaledData,
            backgroundColor: chartBackgroundColors[index % chartBackgroundColors.length],
            borderColor: chartColors[index % chartColors.length],
            borderWidth: 2,
            pointBackgroundColor: chartColors[index % chartColors.length],
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: true,
            fillOpacity: 0.1
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
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        color: '#333',
                        generateLabels: function(chart) {
                            const original = Chart.defaults.plugins.legend.labels.generateLabels;
                            const labels = original.call(this, chart);
                            return labels.map(label => ({
                                ...label,
                                text: label.text.length > 30 ? 
                                      label.text.substring(0, 30) + '...' : 
                                      label.text
                            }));
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(45, 45, 45, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#b49b66',
                    borderWidth: 2,
                    cornerRadius: 8,
                    callbacks: {
                        title: function(context) {
                            return context[0].dataset.label;
                        },
                        label: function(context) {
                            const carIndex = context.datasetIndex;
                            const car = comparedCars[carIndex];
                            const labels = ['Power', 'Price', 'Clearance', 'Cargo', 'Seating'];
                            const actualValues = [
                                car.specs.Horsepower + ' HP',
                                '₱' + parseInt(car.specs.Price || 0).toLocaleString(),
                                car.specs.GroundClearance + ' cm',
                                car.specs.Cargospace + ' L',
                                car.specs.SeatingCapacity + ' seats'
                            ];
                            return `${labels[context.dataIndex]}: ${actualValues[context.dataIndex]}`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    min: 0,
                    ticks: {
                        stepSize: 20,
                        color: '#666',
                        font: {
                            size: 11
                        },
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        color: 'rgba(180, 155, 102, 0.2)',
                        lineWidth: 1
                    },
                    angleLines: {
                        color: 'rgba(180, 155, 102, 0.3)',
                        lineWidth: 1
                    },
                    pointLabels: {
                        color: '#b49b66',
                        font: {
                            size: 13,
                            weight: 'bold'
                        }
                    }
                }
            },
            elements: {
                line: {
                    borderWidth: 2,
                    tension: 0.1
                },
                point: {
                    radius: 5,
                    hoverRadius: 7
                }
            }
        }
    });

    // Add dynamic scale info and individual toggles
    addRadarScaleInfo();
    addRadarToggleControls();
}

function addRadarToggleControls() {
    const radarSection = document.getElementById('radar-chart-section');
    if (!radarSection || comparedCars.length === 0) return;

    // Remove existing toggles
    const existingToggles = radarSection.querySelector('.car-visibility-controls');
    if (existingToggles) {
        existingToggles.remove();
    }

    // Create new toggle container with checkboxes
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'car-visibility-controls';
    toggleContainer.innerHTML = `
        <div style="background: rgba(249, 246, 238, 0.8); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(180, 155, 102, 0.3);">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; justify-content: center;">
                <i class="bx bx-show" style="color: #b49b66; font-size: 1.2rem;"></i>
                <h4 style="color: #b49b66; margin: 0; font-size: 1.1rem;">Individual Car Visibility Controls</h4>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; align-items: center;">
                ${comparedCars.map((car, index) => `
                    <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: white; border-radius: 8px; border: 1px solid rgba(180, 155, 102, 0.2); transition: all 0.2s ease;">
                        <input type="checkbox" 
                               id="visibility-toggle-${index}" 
                               checked 
                               onchange="toggleRadarCarVisibility(${index})"
                               style="transform: scale(1.3); accent-color: ${chartColors[index % chartColors.length]}; cursor: pointer;">
                        <div style="width: 12px; height: 12px; background: ${chartColors[index % chartColors.length]}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 3px rgba(0,0,0,0.2);"></div>
                        <label for="visibility-toggle-${index}" 
                               style="color: ${chartColors[index % chartColors.length]}; 
                                      font-weight: bold; 
                                      font-size: 0.85rem;
                                      cursor: pointer;
                                      margin: 0;">
                            ${car.specs.Brand} ${car.specs.Model}
                        </label>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Append to the end of the radar section
    radarSection.appendChild(toggleContainer);
}

// Toggle function for individual radar datasets
function toggleRadarCarVisibility(index) {
    if (!chartInstances.radar || !chartInstances.radar.data.datasets[index]) return;
    
    const dataset = chartInstances.radar.data.datasets[index];
    const isVisible = !dataset.hidden;
    
    // Toggle visibility
    dataset.hidden = isVisible;
    
    // Update the chart
    chartInstances.radar.update('none'); // No animation for instant feedback
    
    console.log(`Toggled visibility for car ${index}: ${isVisible ? 'hidden' : 'visible'}`);
}

// Make toggle function globally available
window.toggleRadarCarVisibility = toggleRadarCarVisibility;

// Function to update all charts including radar
function updateAllCharts() {
    if (comparedCars.length === 0) return;
    
    console.log('Updating all charts for', comparedCars.length, 'cars');
    
    // Preload brand logos before updating charts
    preloadBrandLogos().then(() => {
        updateHorsepowerChart();
        updatePriceChart();
        updateGroundClearanceChart();
        updateSeatingCapacityChart();
        updateCargoSpaceChart();
        updateRadarChart(); // FIXED: Include radar chart in updates
    });
}

// FIXED: Enhanced showSuccessMessage function
function showSuccessMessage() {
    const successDiv = document.getElementById('compare-success-message');
    if (successDiv) {
        successDiv.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }
}

// FIXED: Enhanced resetCompareForm function
function resetCompareForm() {
    const form = document.getElementById('compare-form');
    if (form) {
        form.reset();
        
        // Reset all dropdowns to their default states
        const brandSelect = document.getElementById('brand');
        const modelSelect = document.getElementById('model');
        const variantSelect = document.getElementById('variant');
        const yearSelect = document.getElementById('year');
        
        if (brandSelect) brandSelect.selectedIndex = 0;
        if (modelSelect) modelSelect.innerHTML = '<option value="">Select Model</option>';
        if (variantSelect) variantSelect.innerHTML = '<option value="">Select Variant</option>';
        if (yearSelect) yearSelect.innerHTML = '<option value="">Select Year</option>';
    }
}

// Helper function to show error messages
function showCompareErrorMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'compare-error-message';
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
        max-width: 300px;
    `;
    messageDiv.innerHTML = `
        <i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>
        ${message}
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

// Main filter page functions
window.populateModels = populateModels;

// Make functions globally available
window.populateModelsForCompare = populateModelsForCompare;
window.populateVariants = populateVariants;
window.populateYears = populateYears;
window.compareCars = compareCars;
window.removeCarFromComparison = removeCarFromComparison;
window.initializeComparePage = initializeComparePage;

//////////////////////////////////
// Shows corresponding models  //
// when a specific brand is   //
// selected by the user      //
//////////////////////////////

async function populateModels() {
    console.log('populateModels called');
    
    const brandSelect = document.getElementById('brand');
    const modelSelect = document.getElementById('model');
    
    if (!brandSelect || !modelSelect) {
        console.error('Required elements not found for populateModels');
        return;
    }
    
    const selectedBrand = brandSelect.value;
    
    // Safely get optional elements (they may not exist on all pages)
    const variantSelect = document.getElementById('variant');
    const yearSelect = document.getElementById('year');

    // Reset model dropdown
    modelSelect.innerHTML = '<option value="">Select Model</option>';
    
    // Reset variant dropdown only if it exists (compare page)
    if (variantSelect) {
        console.log('Resetting variant dropdown');
        variantSelect.innerHTML = '<option value="">Select Variant</option>';
    }
    
    // Reset year dropdown only if it exists
    if (yearSelect) {
        console.log('Resetting year dropdown');
        yearSelect.innerHTML = '<option value="">Select Year</option>';
    }

    if (!selectedBrand || selectedBrand === '') {
        console.log('No brand selected, skipping model population');
        return;
    }

    try {
        console.log(`🔍 Fetching models for brand: ${selectedBrand}`);
        
        modelSelect.innerHTML = '<option value="">Loading models...</option>';
        
        const response = await fetch(`${baseUrl}/get_models?brand=${encodeURIComponent(selectedBrand)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const models = await response.json();
        console.log(`📦 Received ${models.length} models for ${selectedBrand}:`, models);
        
        modelSelect.innerHTML = '<option value="">Select Model</option>';
        
        // Remove duplicates and sort models
        const uniqueModels = [...new Set(models.map(model => String(model).trim()))].sort();
        
        uniqueModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelSelect.appendChild(option);
        });
        
        console.log(`✅ Successfully populated ${uniqueModels.length} unique models for ${selectedBrand}`);
        
    } catch (error) {
        console.error('❌ Error fetching models:', error);
        modelSelect.innerHTML = '<option value="">Error loading models</option>';
        
        // Show user-friendly error message
        if (typeof showCompareErrorMessage === 'function') {
            showCompareErrorMessage('Error fetching models. Please try again.');
        } else {
            console.warn('Error message function not available');
        }
    }
}

// Keep this function separate for compare page
async function populateModelsForCompare() {
    console.log('populateModelsForCompare called');
    
    const selectedBrand = document.getElementById('brand').value;
    const modelSelect = document.getElementById('model');
    const variantSelect = document.getElementById('variant');
    const yearSelect = document.getElementById('year');

    // Verify all required elements exist for compare page
    if (!modelSelect || !variantSelect || !yearSelect) {
        console.error('Required compare page elements not found');
        return;
    }

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
        
        const response = await fetch(`${baseUrl}/get_models?brand=${encodeURIComponent(selectedBrand)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const models = await response.json();
        console.log(`📦 Received ${models.length} models for ${selectedBrand}:`, models);
        
        modelSelect.innerHTML = '<option value="">Select Model</option>';
        
        // Remove duplicates and sort models
        const uniqueModels = [...new Set(models.map(model => model.trim()))].sort();
        
        uniqueModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelSelect.appendChild(option);
        });
        
        console.log(`✅ Successfully populated ${uniqueModels.length} unique models for ${selectedBrand}`);
        
    } catch (error) {
        console.error('❌ Error fetching models:', error);
        modelSelect.innerHTML = '<option value="">Error loading models</option>';
        showCompareErrorMessage('Error fetching models. Please try again.');
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

function loadUserFavoritesForDuplicateCheck() {
    if (!auth || !auth.currentUser) {
        userFavorites.clear();
        return;
    }

    fetch(`${baseUrl}/get-faves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Failed to load favorites');
    })
    .then(favorites => {
        userFavorites.clear();
        favorites.forEach(fav => {
            userFavorites.add(fav.variant);
        });
        console.log('Loaded favorites for duplicate check:', userFavorites);
        updateHeartColorsOnPage();
    })
    .catch(error => {
        console.error('Error loading favorites for duplicate check:', error);
    });
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

// NEW: Make profile functions globally available
window.enableUsernameEdit = enableUsernameEdit;
window.cancelUsernameEdit = cancelUsernameEdit;
window.saveUsername = saveUsername;
window.removeProfilePicture = removeProfilePicture;
