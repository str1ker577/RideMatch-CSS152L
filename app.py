from flask import Flask, request, jsonify, redirect, render_template, send_from_directory, session, url_for
from flask_cors import CORS 
import pandas as pd
import json
import requests
import firebase_admin
from firebase_admin import credentials, auth, firestore, db as realtime_db
import numpy as np
import os
import logging
import time
from datetime import datetime

app = Flask(__name__)
CORS(app)

#########################################
# Railway Hosting Service Configuration #
#########################################

logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)

##############################
# Pulls RideMatch secret key #
##############################

app.secret_key = os.environ.get('SECRET_KEY', 'fallback_secret_key')

#############################
# Load configuration safely #
#############################

try:
    app.config.from_pyfile('config.py')
    app.logger.info("✅ Config.py loaded successfully")
except Exception as e:
    app.logger.info(f"⚠️ config.py not found: {e}, using environment variables")

##############################
# Initialize Firebase safely #
##############################

firestore_db = None
realtime_db_ref = None  # Changed variable name to avoid confusion

try:
    # Load serviceAccountKey.json
    if 'SERVICE_ACCOUNT_KEY_JSON' in os.environ:
        service_account = json.loads(os.environ['SERVICE_ACCOUNT_KEY_JSON'])
        cred = credentials.Certificate(service_account)
        app.logger.info("✅ Firebase credentials loaded from environment")
    else:
        cred = credentials.Certificate('serviceAccountKey.json')
        app.logger.info("✅ Firebase credentials loaded from file")
    
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://ridematch-db867-default-rtdb.asia-southeast1.firebasedatabase.app/'  
    })
    
    realtime_db_ref = realtime_db.reference()  # Use the imported realtime_db module
    firestore_db = firestore.client()
    app.logger.info("✅ Firebase initialized successfully")
    
except Exception as e:
    app.logger.error(f"❌ Firebase initialization failed: {e}")
    realtime_db_ref = None
    firestore_db = None
    
###############################
# Load Firebase config safely #
############################### 

firebase_config = {}
api_key = None
try:
    if 'FIREBASE_CONFIG_JSON' in os.environ:
        firebase_config = json.loads(os.environ['FIREBASE_CONFIG_JSON'])
        app.logger.info("✅ Firebase config loaded from environment")
    else:
        with open('firebaseConfig.json') as f:
            firebase_config = json.load(f)
        app.logger.info("✅ Firebase config loaded from file")
    
    api_key = firebase_config.get('apiKey')
    if api_key:
        app.logger.info("✅ Firebase API key loaded")
    else:
        app.logger.warning("⚠️ Firebase API key not found")
        
except Exception as e:
    app.logger.error(f"❌ Firebase config not loaded: {e}")
    firebase_config = {}
    api_key = None


########################
# Load CSV data safely #
########################

df = pd.DataFrame()
try:
    # Check if file exists first
    csv_path = 'car_data.csv'
    if not os.path.exists(csv_path):
        app.logger.error(f"❌ CSV file not found at {csv_path}")
        app.logger.info(f"Current directory contents: {os.listdir('.')}")
    else:
        df = pd.read_csv(csv_path, encoding='utf-8')
        
        # Ensure all relevant columns are strings before extraction (FIXED REGEX PATTERNS)
        df["Cargo_space"] = df["Cargo_space"].astype(str).str.extract(r"(\d+)", expand=False).astype(float)
        df["Ground_Clearance"] = df["Ground_Clearance"].astype(str).str.extract(r"([\d.]+)", expand=False).astype(float)
        df["Horsepower"] = df["Horsepower"].astype(str).str.extract(r"(\d+)", expand=False).astype(float)
        df["Price"] = pd.to_numeric(df["Price"], errors="coerce")
        
        app.logger.info(f"✅ CSV data loaded successfully - {len(df)} records")
        app.logger.info(f"CSV columns: {list(df.columns)}")
        
except Exception as e:
    app.logger.error(f"❌ CSV loading failed: {e}")
    df = pd.DataFrame()

# Health check endpoint
@app.route('/health')
def health():
    status = {
        "status": "healthy",
        "firebase_initialized": realtime_db_ref is not None,
        "csv_loaded": not df.empty,
        "csv_records": len(df) if not df.empty else 0,
        "firebase_config_loaded": bool(firebase_config),
        "api_key_available": api_key is not None
    }
    app.logger.info(f"Health check: {status}")
    return jsonify(status)

@app.route('/')
def home():
    app.logger.info("🔍 Rendering home page.")
    return render_template('index.html')

# Serve images from the "resources" folder
@app.route('/resources/<path:filename>')
def serve_resources(filename):
    resources_path = os.path.join(app.root_path, 'resources')
    if not os.path.exists(resources_path):
        app.logger.warning(f"Resources directory not found: {resources_path}")
        return "Resource not found", 404
    return send_from_directory(resources_path, filename)

##########################
# Firebase Configuration #
##########################

@app.route('/firebase-config')
def get_firebase_config():
    if not firebase_config:
        app.logger.error("Firebase config not available")
        return jsonify({"error": "Firebase config not available"}), 500
    
    client_config = {
        'apiKey': firebase_config.get('apiKey'),
        'authDomain': firebase_config.get('authDomain'), 
        'projectId': firebase_config.get('projectId'),
        'storageBucket': firebase_config.get('storageBucket'),
        'messagingSenderId': firebase_config.get('messagingSenderId'),
        'appId': firebase_config.get('appId'),
        'measurementId': firebase_config.get('measurementId')
    }
    app.logger.info("Firebase config requested")
    return jsonify(client_config)

@app.route('/verify-token', methods=['POST'])
def verify_token():
    # FIXED: Changed 'db' to 'firestore_db' to match your variable names
    if not firestore_db:
        app.logger.error("Database not available for token verification")
        return jsonify({"status": "error", "message": "Database not available"}), 500
    
    try:
        data = request.get_json()
        if not data:
            app.logger.error("No JSON data received")
            return jsonify({"status": "error", "message": "No data provided"}), 400
            
        id_token = data.get('idToken')
        email = data.get('email')
        
        if not id_token:
            app.logger.error("No token provided in request")
            return jsonify({"status": "error", "message": "No token provided"}), 400
        
        # Verify token with Firebase Admin
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        
        # Set session
        session['user'] = uid
        session['email'] = email
        session['idToken'] = id_token
        
        app.logger.info(f"✅ User {email} logged in successfully.")
        return jsonify({"status": "success", "message": "Authentication successful"}), 200
        
    except firebase_admin.auth.InvalidIdTokenError as e:
        app.logger.error(f"Invalid token error: {e}")
        return jsonify({"status": "error", "message": "Invalid token"}), 401
    except Exception as e:
        app.logger.error(f"Token verification failed: {str(e)}")
        return jsonify({"status": "error", "message": f"Authentication failed: {str(e)}"}), 500
    
###################
# Signup Function #
###################

@app.route('/signup', methods=['POST'])
def signup():
    if not realtime_db_ref:
        app.logger.error("Database not available for signup")
        return jsonify({"status": "error", "message": "Database not available"}), 500
    
    email = request.form.get('email')
    password = request.form.get('password')
    
    app.logger.info(f"Signup attempt for email: {email}")

    if not email or not password:
        app.logger.error("Missing email or password in signup")
        return jsonify({"status": "error", "message": "All fields are required."}), 400

    try:
        user = auth.get_user_by_email(email)
        app.logger.warning(f"Email already exists: {email}")
        return jsonify({"status": "error", "message": "Email already in use."}), 400
    except firebase_admin.auth.UserNotFoundError:
        pass

    try:
        user = auth.create_user(email=email, password=password)
        app.logger.info(f"✅ User {email} signed up successfully.")
        return jsonify({"status": "success", "message": "User signed up successfully! Please log in."}), 200
    except Exception as e:
        app.logger.error(f"Signup failed for {email}: {str(e)}")
        return jsonify({"status": "error", "message": f"Signup failed: {str(e)}"}), 400
    
##################
# Login Function #
##################

@app.route('/login', methods=['POST'])
def login():
    if not api_key:
        app.logger.error("API key not available for login")
        return jsonify({"status": False, "message": "Authentication not configured"}), 500
    
    email = request.form.get('email')
    password = request.form.get('password')
    
    app.logger.info(f"Login attempt for email: {email}")

    if not email or not password:
        app.logger.error("Missing email or password in login")
        return jsonify({"status": False, "message": "Email and password required"}), 400

    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        app.logger.info(f"Firebase auth response status: {response.status_code}")
        
        if response.status_code == 200:
            user_data = response.json()
            session['user'] = user_data['localId']
            session['idToken'] = user_data['idToken']
            session['email'] = email

            app.logger.info(f"✅ User {email} logged in successfully!")
            return jsonify({"status": True, "message": "Welcome back!", "email": email}), 200
        else:
            error_data = response.json()
            app.logger.error(f"Login failed for {email}: {error_data}")
            return jsonify({"status": False, "message": "Incorrect credentials."}), 400
            
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Network error during login: {e}")
        return jsonify({"status": False, "message": "Network error during authentication"}), 500
    except Exception as e:
        app.logger.error(f"Unexpected error during login: {e}")
        return jsonify({"status": False, "message": "Authentication failed"}), 500

@app.route('/logout', methods=['POST'])
def logout():
    app.logger.info("User logged out")
    session.clear()
    return jsonify({"status": "success", "message": "Logged out successfully"}), 200

###################
# HTML Page Links #
###################

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/compare')
def compare():
    return render_template('compare.html')

@app.route('/contacts')
def contacts():
    return render_template('contacts.html')

@app.route('/favourites', methods=['GET', 'POST'])
def favourites():
    if 'user' in session:
        return render_template('favourites.html')
    return render_template('index.html')

@app.route('/testimonials')
def testimonials():
    return render_template('testimonials.html')

@app.route('/patches')
def patches():
    return render_template('patches.html')

@app.route('/calculator')
def calculator():
    return render_template('calculator.html')

@app.route('/forum')
def forum():
    return render_template('forum.html')

@app.route('/profile', methods=['GET', 'POST'])
def profile():
    if 'user' not in session:
        return redirect(url_for('home'))
    
    if request.method == 'POST':
        pass
    
    return render_template('profile.html')

#################################
# Toggle Favorite/Like Function #
#################################
def sanitize_firebase_key(key):
    """Sanitize a string to be used as a Firebase key"""
    # Replace illegal characters with safe alternatives
    sanitized = key.replace('.', '_DOT_')
    sanitized = sanitized.replace(' ', '_SPACE_')
    sanitized = sanitized.replace('/', '_SLASH_')
    sanitized = sanitized.replace('[', '_LBRACKET_')
    sanitized = sanitized.replace(']', '_RBRACKET_')
    sanitized = sanitized.replace('#', '_HASH_')
    sanitized = sanitized.replace('$', '_DOLLAR_')
    return sanitized

def unsanitize_firebase_key(key):
    """Convert sanitized Firebase key back to original"""
    original = key.replace('_DOT_', '.')
    original = original.replace('_SPACE_', ' ')
    original = original.replace('_SLASH_', '/')
    original = original.replace('_LBRACKET_', '[')
    original = original.replace('_RBRACKET_', ']')
    original = original.replace('_HASH_', '#')
    original = original.replace('_DOLLAR_', '$')
    return original

@app.route('/toggle-fave', methods=['POST'])
def toggle_fave():
    """Toggle favorite status using Firebase Realtime Database"""
    if 'user' not in session:
        app.logger.warning("Unauthorized access to toggle-fave")
        return jsonify({"error": "User not logged in"}), 401
    
    if not realtime_db_ref:
        app.logger.error("Database not available for toggle-fave")
        return jsonify({"error": "Database not available"}), 500
    
    try:
        user_id = session['user']
        data = request.get_json()
        
        app.logger.info(f"Toggle fave request from user {user_id}: {data}")
        
        if not data:
            app.logger.error("No JSON data received for toggle-fave")
            return jsonify({"error": "No data provided"}), 400
            
        variant = data.get('variant')
        liked = data.get('liked')

        if not variant:
            app.logger.error("No variant specified for toggle-fave")
            return jsonify({"error": "Variant required"}), 400

        # Sanitize the variant for Firebase path
        sanitized_variant = sanitize_firebase_key(variant)
        app.logger.info(f"Processing variant: {variant} -> {sanitized_variant}")

        # Use Firebase Realtime Database
        favorites_ref = realtime_db_ref.child('favorites').child(user_id)
        existing_fave = favorites_ref.child(sanitized_variant).get()

        app.logger.info(f"Existing favorite check for {sanitized_variant}: {existing_fave}")

        if liked:
            # Add to favorites
            favorite_data = {
                'variant': variant,  # Store original variant name
                'sanitized_key': sanitized_variant,  # Store sanitized key for reference
                'timestamp': int(time.time() * 1000),
                'dateAdded': datetime.utcnow().isoformat() + 'Z',
                'userEmail': session.get('email', 'Unknown')
            }
            
            # Set the favorite data
            favorites_ref.child(sanitized_variant).set(favorite_data)
            app.logger.info(f"✅ Added favorite: {variant} (key: {sanitized_variant}) for user {user_id}")
            
            return jsonify({
                "status": "added", 
                "variant": variant, 
                "liked": True,
                "message": "Added to favorites"
            }), 200
        else:
            # Remove from favorites
            if existing_fave:
                favorites_ref.child(sanitized_variant).delete()
                app.logger.info(f"✅ Removed favorite: {variant} (key: {sanitized_variant}) for user {user_id}")
                
                return jsonify({
                    "status": "removed", 
                    "variant": variant, 
                    "liked": False,
                    "message": "Removed from favorites"
                }), 200
            else:
                app.logger.info(f"Favorite not found for removal: {variant}")
                return jsonify({
                    "status": "not_found", 
                    "variant": variant, 
                    "liked": False,
                    "message": "Favorite not found"
                }), 200
            
    except Exception as e:
        app.logger.error(f"Error toggling favorite: {e}")
        import traceback
        app.logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to toggle favorite: {str(e)}"}), 500

@app.route('/get-faves', methods=['POST'])
def get_faves():
    """Get user's favorites using Firebase Realtime Database"""
    if 'user' not in session:
        app.logger.warning("Unauthorized access to favorites")
        return jsonify({"error": "Not logged in"}), 401
    
    if not realtime_db_ref:
        app.logger.error("Database not available for get-faves")
        return jsonify({"error": "Database not available"}), 500
    
    try:
        user_id = session['user']
        app.logger.info(f"Getting favorites for user: {user_id}")
        
        # Get favorites from Firebase Realtime Database
        favorites_ref = realtime_db_ref.child('favorites').child(user_id)
        favorites_data = favorites_ref.get() or {}
        
        app.logger.info(f"Raw favorites data for {user_id}: {favorites_data}")

        # Convert to list format
        favorite_variants = []
        for sanitized_key, variant_data in favorites_data.items():
            if isinstance(variant_data, dict):
                # Use the original variant name from the stored data
                original_variant = variant_data.get('variant', unsanitize_firebase_key(sanitized_key))
                
                # Ensure we have the complete variant data
                complete_variant_data = {
                    'variant': original_variant,
                    'sanitized_key': sanitized_key,
                    'timestamp': variant_data.get('timestamp', int(time.time() * 1000)),
                    'dateAdded': variant_data.get('dateAdded', datetime.utcnow().isoformat() + 'Z'),
                    'userEmail': variant_data.get('userEmail', session.get('email', 'Unknown'))
                }
                
                favorite_variants.append(complete_variant_data)

        app.logger.info(f"✅ Retrieved {len(favorite_variants)} favorites for user {user_id}")
        
        # Sort by timestamp (newest first)
        favorite_variants.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
        
        return jsonify(favorite_variants), 200
        
    except Exception as e:
        app.logger.error(f"Error retrieving favorites: {e}")
        import traceback
        app.logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to retrieve favorites: {str(e)}"}), 500
    
#########################
# Filter Function Logic #
#########################

@app.route('/get_cars', methods=['GET'])
def get_cars():
    if df.empty:
        app.logger.error("Car data not available for filtering")
        return jsonify({"error": "Car data not available"}), 500
    
    app.logger.info("🔍 Processing car filter request")
    app.logger.info(f"Request args: {dict(request.args)}")
    app.logger.info(f"DataFrame shape: {df.shape}")
    app.logger.info(f"DataFrame columns: {list(df.columns)}")

    try:
        # Get filter parameters
        brand = request.args.get("brand", "").strip()
        model = request.args.get("model", "").strip()
        body_type = request.args.get("body_type", "").strip()
        drive_train = request.args.get("drive_train", "").strip()
        transmission = request.args.get("transmission", "").strip()
        fuel_type = request.args.get("fuel_type", "").strip()
        year = request.args.get("year", "").strip()  # NEW: Year filter parameter
        min_hp = request.args.get("min_hp", type=int, default=50)
        min_cargo = request.args.get("min_cargo", type=int, default=100)
        max_price = request.args.get("max_price", type=int, default=3000000)
        min_ground_clearance = request.args.get("min_ground_clearance", type=float, default=13.3)
        seating = request.args.get("seating", type=int, default=None)

        app.logger.info(f"Filter parameters: brand={brand}, model={model}, body_type={body_type}, year={year}")  # NEW: Include year in logging
        app.logger.info(f"Numeric filters: min_hp={min_hp}, min_cargo={min_cargo}, max_price={max_price}, min_ground_clearance={min_ground_clearance}, seating={seating}")

        filtered_df = df.copy()
        initial_count = len(filtered_df)
        app.logger.info(f"Starting with {initial_count} cars")

        # Check data types and sample values
        app.logger.info(f"Horsepower dtype: {filtered_df['Horsepower'].dtype}")
        app.logger.info(f"Cargo_space dtype: {filtered_df['Cargo_space'].dtype}")
        app.logger.info(f"Ground_Clearance dtype: {filtered_df['Ground_Clearance'].dtype}")
        app.logger.info(f"Price dtype: {filtered_df['Price'].dtype}")
        app.logger.info(f"Year dtype: {filtered_df['Year'].dtype}")  # NEW: Log year data type
        
        # Sample values
        app.logger.info(f"Sample Horsepower values: {filtered_df['Horsepower'].head().tolist()}")
        app.logger.info(f"Sample Cargo_space values: {filtered_df['Cargo_space'].head().tolist()}")
        app.logger.info(f"Sample Ground_Clearance values: {filtered_df['Ground_Clearance'].head().tolist()}")
        app.logger.info(f"Sample Price values: {filtered_df['Price'].head().tolist()}")
        app.logger.info(f"Sample Year values: {filtered_df['Year'].head().tolist()}")  # NEW: Log year sample values

        # Apply filters step by step
        if brand and brand.lower() not in ["any", "all brands"]:
            app.logger.info(f"Applying brand filter: {brand}")
            app.logger.info(f"Available brands: {filtered_df['Brand'].unique().tolist()}")
            filtered_df = filtered_df[filtered_df["Brand"].str.lower() == brand.lower()]
            app.logger.info(f"After brand filter: {len(filtered_df)} cars")
        
        if model and model.lower() != "any":
            app.logger.info(f"Applying model filter: {model}")
            app.logger.info(f"Available models: {filtered_df['Model'].unique().tolist()}")
            filtered_df = filtered_df[filtered_df["Model"].str.lower() == model.lower()]
            app.logger.info(f"After model filter: {len(filtered_df)} cars")
        
        if body_type:
            app.logger.info(f"Applying body type filter: {body_type}")
            app.logger.info(f"Available body types: {filtered_df['Body_Type'].unique().tolist()}")
            filtered_df = filtered_df[filtered_df["Body_Type"].str.lower() == body_type.lower()]
            app.logger.info(f"After body type filter: {len(filtered_df)} cars")

        if drive_train:
            app.logger.info(f"Applying drive train filter: {drive_train}")
            app.logger.info(f"Available drive trains: {filtered_df['Drive_Train'].unique().tolist()}")
            filtered_df = filtered_df[filtered_df["Drive_Train"].str.lower().str.contains(drive_train.lower(), na=False)]
            app.logger.info(f"After drive train filter: {len(filtered_df)} cars")
            
        if transmission:
            app.logger.info(f"Applying transmission filter: {transmission}")
            app.logger.info(f"Available transmissions: {filtered_df['Transmission'].unique().tolist()}")
            filtered_df = filtered_df[filtered_df["Transmission"].str.lower() == transmission.lower()]
            app.logger.info(f"After transmission filter: {len(filtered_df)} cars")
        
        if fuel_type:
            app.logger.info(f"Applying fuel type filter: {fuel_type}")
            app.logger.info(f"Available fuel types: {filtered_df['Fuel_Type'].unique().tolist()}")
            filtered_df = filtered_df[filtered_df["Fuel_Type"].str.lower().str.contains(fuel_type.lower(), na=False)]
            app.logger.info(f"After fuel type filter: {len(filtered_df)} cars")

        # NEW: Apply year filter
        if year:
            app.logger.info(f"Applying year filter: {year}")
            app.logger.info(f"Available years: {filtered_df['Year'].unique().tolist()}")
            
            try:
                year_int = int(year)
                filtered_df = filtered_df[filtered_df["Year"] == year_int]
                app.logger.info(f"After year filter: {len(filtered_df)} cars")
            except (ValueError, TypeError):
                app.logger.warning(f"Invalid year format: {year}")

        # Apply numeric filters
        app.logger.info("Applying numeric filters...")
        
        # Check for NaN values before filtering
        nan_hp = filtered_df["Horsepower"].isna().sum()
        nan_cargo = filtered_df["Cargo_space"].isna().sum()
        nan_price = filtered_df["Price"].isna().sum()
        nan_clearance = filtered_df["Ground_Clearance"].isna().sum()
        
        app.logger.info(f"NaN values - HP: {nan_hp}, Cargo: {nan_cargo}, Price: {nan_price}, Clearance: {nan_clearance}")
        
        # Apply numeric filters with proper handling of NaN values
        before_numeric = len(filtered_df)
        filtered_df = filtered_df[
            (filtered_df["Horsepower"].notna()) &
            (filtered_df["Cargo_space"].notna()) &
            (filtered_df["Price"].notna()) &
            (filtered_df["Ground_Clearance"].notna()) &
            (filtered_df["Horsepower"] >= min_hp) &
            (filtered_df["Cargo_space"] >= min_cargo) &
            (filtered_df["Price"] <= max_price) &
            (filtered_df["Ground_Clearance"] >= min_ground_clearance)
        ]
        app.logger.info(f"After numeric filters: {len(filtered_df)} cars (removed {before_numeric - len(filtered_df)} cars)")
        
        if seating is not None and seating > 0:
            app.logger.info(f"Applying seating filter: {seating}")
            app.logger.info(f"Available seating capacities: {filtered_df['Seating_Capacity'].unique().tolist()}")
            filtered_df = filtered_df[filtered_df["Seating_Capacity"] == seating]
            app.logger.info(f"After seating filter: {len(filtered_df)} cars")

        # Convert to JSON
        app.logger.info("Converting to JSON...")
        filtered_cars = filtered_df.fillna("").to_dict(orient="records")
        
        app.logger.info(f"✅ Returning {len(filtered_cars)} filtered cars")
        
        # Log first car if any results
        if filtered_cars:
            app.logger.info(f"Sample result: {filtered_cars[0]}")
            
        return jsonify(filtered_cars)
        
    except Exception as e:
        app.logger.error(f"Error filtering cars: {e}")
        app.logger.error(f"Exception type: {type(e)}")
        import traceback
        app.logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to filter cars: {str(e)}"}), 500

# NEW: Route to get all available years
@app.route('/get_years', methods=['GET'])
def get_years():
    if df.empty:
        app.logger.warning("No car data available for years")
        return jsonify([])
    
    try:
        # Get unique years and convert to list
        years = df["Year"].dropna().unique().tolist()
        
        # Convert to integers and remove any invalid years
        valid_years = []
        for year in years:
            try:
                year_int = int(year)
                if 1900 <= year_int <= 2030:  # Reasonable year range
                    valid_years.append(year_int)
            except (ValueError, TypeError):
                continue
        
        app.logger.info(f"Retrieved {len(valid_years)} valid years")
        return jsonify(valid_years)
        
    except Exception as e:
        app.logger.error(f"Error getting years: {e}")
        return jsonify([])

# Keep your existing routes as they are:
@app.route('/get_all_models', methods=['GET'])
def get_all_models():
    if df.empty:
        app.logger.warning("No car data available for models")
        return jsonify([])
    try:
        models = df["Model"].unique().tolist()
        app.logger.info(f"Retrieved {len(models)} models")
        return jsonify(models)
    except Exception as e:
        app.logger.error(f"Error getting models: {e}")
        return jsonify([])

@app.route('/get_models', methods=['GET'])
def get_models():
    if df.empty:
        app.logger.warning("No car data available for brand models")
        return jsonify([])
    
    brand = request.args.get("brand", "").strip()
    if not brand:
        app.logger.warning("No brand specified for model lookup")
        return jsonify([])

    try:
        models = df[df["Brand"].str.lower() == brand.lower()]["Model"].unique().tolist()
        app.logger.info(f"Retrieved {len(models)} models for brand {brand}")
        return jsonify(models)
    except Exception as e:
        app.logger.error(f"Error getting models for brand {brand}: {e}")
        return jsonify([])

@app.route('/get_variants', methods=['GET'])
def get_variants():
    if df.empty:
        app.logger.warning("No car data available for variants")
        return jsonify([])
    
    model = request.args.get("model", "").strip()
    if not model:
        app.logger.warning("No model specified for variant lookup")
        return jsonify([])

    try:
        variants = df[df["Model"].str.lower() == model.lower()]["Variant"].unique().tolist()
        app.logger.info(f"Retrieved {len(variants)} variants for model {model}")
        return jsonify(variants)
    except Exception as e:
        app.logger.error(f"Error getting variants for model {model}: {e}")
        return jsonify([])
    
    
###########################
# Pull Data from CSV file #
###########################

@app.route('/get_specs', methods=['GET'])
def get_specs():
    if df.empty:
        app.logger.error("Car data not available for specs")
        return jsonify({"error": "Car data not available"}), 500
    
    variant = request.args.get("variant", "").strip()
    
    if not variant:
        app.logger.warning("No variant specified for specs lookup")
        return jsonify({})

    try:
        # Find the car with matching variant
        car_data = df[df["Variant"].str.lower() == variant.lower()]
        
        if car_data.empty:
            app.logger.warning(f"No car found for variant: {variant}")
            return jsonify({})
        
        # Get the first matching car (in case of duplicates)
        car = car_data.iloc[0]
        
        # Build specs dictionary
        specs = {
            "Brand": str(car.get("Brand", "")),
            "Model": str(car.get("Model", "")),
            "BodyType": str(car.get("Body_Type", "")),
            "Variant": str(car.get("Variant", "")),
            "DriveTrain": str(car.get("Drive_Train", "")),
            "Engine": str(car.get("Engine", "")),
            "Horsepower": int(car.get("Horsepower", 0)) if pd.notna(car.get("Horsepower")) else 0,
            "Transmission": str(car.get("Transmission", "")),
            "FuelType": str(car.get("Fuel_Type", "")),
            "Year": int(car.get("Year", 0)) if pd.notna(car.get("Year")) else 0,
            "GroundClearance": float(car.get("Ground_Clearance", 0)) if pd.notna(car.get("Ground_Clearance")) else 0,
            "Cargospace": float(car.get("Cargo_space", 0)) if pd.notna(car.get("Cargo_space")) else 0,
            "SeatingCapacity": int(car.get("Seating_Capacity", 0)) if pd.notna(car.get("Seating_Capacity")) else 0,
            "Price": float(car.get("Price", 0)) if pd.notna(car.get("Price")) else 0,
            "Image": find_car_image(str(car.get("Model", "")))
        }
        
        app.logger.info(f"Retrieved specs for variant: {variant}")
        return jsonify(specs)
        
    except Exception as e:
        app.logger.error(f"Error getting specs for variant {variant}: {e}")
        import traceback
        app.logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to get specs: {str(e)}"}), 500
    
###############################
# Testimonials Function Logic #
###############################   
    

@app.route('/api/testimonials', methods=['GET'])
def get_testimonials():
    """Get all testimonials"""
    try:
        if realtime_db_ref is None:  # Changed variable name
            return jsonify({'error': 'Database not initialized'}), 500
        
        testimonials_ref = realtime_db_ref.child('testimonials')
        testimonials = testimonials_ref.get()
        
        if testimonials is None:
            return jsonify([])
        
        # Convert to list format for frontend
        testimonials_list = []
        for key, value in testimonials.items():
            testimonial = value
            testimonial['id'] = key
            testimonials_list.append(testimonial)
        
        # Sort by timestamp (newest first)
        testimonials_list.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
        
        return jsonify(testimonials_list)
    
    except Exception as e:
        app.logger.error(f"Error getting testimonials: {e}")
        return jsonify({'error': 'Failed to get testimonials'}), 500

@app.route('/api/testimonials', methods=['POST'])
def add_testimonial():
    """Add a new testimonial"""
    try:
        if realtime_db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        data = request.get_json()
        
        # Validate required fields
        if not data or not data.get('name') or not data.get('testimonial'):
            return jsonify({'error': 'Name and testimonial are required'}), 400
        
        # Create testimonial object
        testimonial = {
            'name': data['name'].strip(),
            'testimonial': data['testimonial'].strip(),
            'timestamp': int(time.time() * 1000),  # Current timestamp in milliseconds
            'email': data.get('email', '').strip() if data.get('email') else None,
            'rating': data.get('rating', 5),  # Default 5 stars
            'approved': False  # You might want to moderate testimonials
        }
        
        # Add to Real-time Database
        testimonials_ref = realtime_db.reference('testimonials')
        new_testimonial_ref = testimonials_ref.push(testimonial)
        
        # Return the created testimonial with its ID
        testimonial['id'] = new_testimonial_ref.key
        
        app.logger.info(f"✅ Testimonial added: {new_testimonial_ref.key}")
        return jsonify(testimonial), 201
    
    except Exception as e:
        app.logger.error(f"Error adding testimonial: {e}")
        return jsonify({'error': 'Failed to add testimonial'}), 500

@app.route('/api/testimonials/<testimonial_id>', methods=['DELETE'])
def delete_testimonial(testimonial_id):
    """Delete a testimonial (admin only)"""
    try:
        if realtime_db is None:
            return jsonify({'error': 'Database not initialized'}), 500
        
        # You might want to add authentication check here
        testimonial_ref = realtime_db.reference(f'testimonials/{testimonial_id}')
        testimonial_ref.delete()
        
        app.logger.info(f"✅ Testimonial deleted: {testimonial_id}")
        return jsonify({'message': 'Testimonial deleted successfully'})
    
    except Exception as e:
        app.logger.error(f"Error deleting testimonial: {e}")
        return jsonify({'error': 'Failed to delete testimonial'}), 500   
    
@app.route('/get_affordable_cars', methods=['GET'])
def get_affordable_cars():
    """Dedicated endpoint for calculator - returns only essential car data"""
    if df.empty:
        app.logger.error("Car data not available for calculator")
        return jsonify({"error": "Car data not available"}), 500
    
    app.logger.info("🧮 Processing calculator car request")
    
    try:
        max_price = request.args.get("max_price", type=int, default=3000000)
        
        # Filter cars by price only
        filtered_df = df[
            (df["Price"].notna()) &
            (df["Price"] <= max_price)
        ].copy()
        
        # Select only the columns needed for calculator display
        calculator_columns = ['Brand', 'Model', 'Variant', 'Fuel_Type', 'Price']
        filtered_df = filtered_df[calculator_columns]
        
        # Convert to JSON
        affordable_cars = filtered_df.fillna("").to_dict(orient="records")
        
        app.logger.info(f"✅ Calculator returning {len(affordable_cars)} affordable cars")
        return jsonify(affordable_cars)
        
    except Exception as e:
        app.logger.error(f"Error in calculator endpoint: {e}")
        return jsonify({"error": f"Failed to get affordable cars: {str(e)}"}), 500
    
    
####################
# Forum API Routes #
####################

@app.route('/api/forum/posts', methods=['GET'])
def get_forum_posts():
    """Get all forum posts (unchanged - supports filtering on frontend)"""
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    try:
        posts_ref = realtime_db_ref.child('forum').child('posts')
        posts_data = posts_ref.get() or {}
        
        # Convert to list with IDs
        posts_list = []
        for post_id, post_data in posts_data.items():
            post_data['id'] = post_id
            posts_list.append(post_data)
        
        # Sort by creation date (newest first)
        posts_list.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        
        return jsonify(posts_list)
    except Exception as e:
        app.logger.error(f"Error fetching forum posts: {e}")
        return jsonify({"error": "Failed to fetch posts"}), 500

@app.route('/api/forum/posts', methods=['POST'])
def create_forum_post():
    """Create a new forum post with anonymous option"""
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    try:
        data = request.json
        user_id = session['user']
        user_email = session.get('email', 'Anonymous')
        
        # Validate input
        if not data.get('title') or not data.get('body'):
            return jsonify({'error': 'Title and body are required'}), 400
        
        # FEATURE 3: Handle anonymous posting
        is_anonymous = data.get('isAnonymous', False)
        author_name = 'Anonymous' if is_anonymous else user_email
        
        post_data = {
            'title': data.get('title'),
            'body': data.get('body'),
            'tags': data.get('tags', ''),
            'authorId': user_id,
            'authorName': author_name,
            'isAnonymous': is_anonymous,  # Store anonymous flag
            'createdAt': datetime.utcnow().isoformat() + 'Z',
            'upvotes': 0,
            'downvotes': 0,
            'views': 0,
            'commentCount': 0
        }
        
        # Push to Firebase Realtime Database
        posts_ref = realtime_db_ref.child('forum').child('posts')
        new_post = posts_ref.push(post_data)
        
        # Return the created post with its ID
        post_data['id'] = new_post.key
        return jsonify(post_data), 201
        
    except Exception as e:
        app.logger.error(f"Error creating forum post: {e}")
        return jsonify({'error': 'Failed to create post'}), 500


@app.route('/api/forum/comments/<comment_id>/vote', methods=['POST'])
def vote_on_comment(comment_id):
    """Vote on a comment"""
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    try:
        data = request.json
        direction = data.get('direction')  # 'up' or 'down'
        user_id = session['user']
        
        if direction not in ['up', 'down']:
            return jsonify({'error': 'Invalid vote direction'}), 400
        
        # Find the comment in all posts (we need to search since we don't know the post_id)
        posts_ref = realtime_db_ref.child('forum').child('posts')
        posts_data = posts_ref.get() or {}
        
        comment_ref = None
        post_id = None
        
        # Search for the comment across all posts
        for pid, post_data in posts_data.items():
            comments_ref = realtime_db_ref.child('forum').child('comments').child(pid)
            comments_data = comments_ref.get() or {}
            
            if comment_id in comments_data:
                comment_ref = comments_ref.child(comment_id)
                post_id = pid
                break
        
        if not comment_ref:
            return jsonify({'error': 'Comment not found'}), 404
        
        # Check current vote
        vote_ref = realtime_db_ref.child('forum').child('comment_votes').child(comment_id).child(user_id)
        current_vote = vote_ref.get()
        
        # Get current comment data
        comment_data = comment_ref.get()
        upvotes = comment_data.get('upvotes', 0)
        downvotes = comment_data.get('downvotes', 0)
        
        # Remove previous vote if exists
        if current_vote == 'up':
            upvotes -= 1
        elif current_vote == 'down':
            downvotes -= 1
        
        # Add new vote if different from current
        if current_vote != direction:
            if direction == 'up':
                upvotes += 1
            else:
                downvotes += 1
            vote_ref.set(direction)
        else:
            # Remove vote if same as current
            vote_ref.delete()
        
        # Update comment vote counts
        comment_ref.update({
            'upvotes': upvotes,
            'downvotes': downvotes
        })
        
        return jsonify({
            'upvotes': upvotes,
            'downvotes': downvotes,
            'userVote': direction if current_vote != direction else None
        })
        
    except Exception as e:
        app.logger.error(f"Error voting on comment: {e}")
        return jsonify({'error': 'Failed to vote on comment'}), 500

@app.route('/api/forum/posts/<post_id>/vote', methods=['POST'])
def vote_on_post(post_id):
    """Vote on a forum post (unchanged)"""
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    try:
        data = request.json
        direction = data.get('direction')  # 'up' or 'down'
        user_id = session['user']
        
        if direction not in ['up', 'down']:
            return jsonify({'error': 'Invalid vote direction'}), 400
        
        # Check current vote
        vote_ref = realtime_db_ref.child('forum').child('votes').child(post_id).child(user_id)
        current_vote = vote_ref.get()
        
        # Get current post data
        post_ref = realtime_db_ref.child('forum').child('posts').child(post_id)
        post_data = post_ref.get()
        
        if not post_data:
            return jsonify({'error': 'Post not found'}), 404
        
        upvotes = post_data.get('upvotes', 0)
        downvotes = post_data.get('downvotes', 0)
        
        # Remove previous vote if exists
        if current_vote == 'up':
            upvotes -= 1
        elif current_vote == 'down':
            downvotes -= 1
        
        # Add new vote if different from current
        if current_vote != direction:
            if direction == 'up':
                upvotes += 1
            else:
                downvotes += 1
            vote_ref.set(direction)
        else:
            # Remove vote if same as current
            vote_ref.delete()
        
        # Update post vote counts
        post_ref.update({
            'upvotes': upvotes,
            'downvotes': downvotes
        })
        
        return jsonify({
            'upvotes': upvotes,
            'downvotes': downvotes,
            'userVote': direction if current_vote != direction else None
        })
        
    except Exception as e:
        app.logger.error(f"Error voting on post: {e}")
        return jsonify({'error': 'Failed to vote'}), 500


@app.route('/api/forum/posts/<post_id>/comments', methods=['GET'])
def get_post_comments(post_id):
    """Get comments for a specific post (unchanged - supports replies)"""
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    try:
        comments_ref = realtime_db_ref.child('forum').child('comments').child(post_id)
        comments_data = comments_ref.get() or {}
        
        # Convert to list with IDs
        comments_list = []
        for comment_id, comment_data in comments_data.items():
            comment_data['id'] = comment_id
            comments_list.append(comment_data)
        
        # Sort by creation date (oldest first for comments)
        comments_list.sort(key=lambda x: x.get('createdAt', ''))
        
        return jsonify(comments_list)
    except Exception as e:
        app.logger.error(f"Error fetching comments: {e}")
        return jsonify({"error": "Failed to fetch comments"}), 500

@app.route('/api/forum/posts/<post_id>/comments', methods=['POST'])
def create_comment(post_id):
    """Create a comment on a post with anonymous option and reply support"""
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    try:
        data = request.json
        user_id = session['user']
        user_email = session.get('email', 'Anonymous')
        
        # Validate input
        if not data.get('text'):
            return jsonify({'error': 'Comment text is required'}), 400
        
        # FEATURE 3: Handle anonymous commenting
        is_anonymous = data.get('isAnonymous', False)
        author_name = 'Anonymous' if is_anonymous else user_email
        
        comment_data = {
            'text': data.get('text'),
            'authorId': user_id,
            'authorName': author_name,
            'isAnonymous': is_anonymous,
            'postId': post_id,
            'createdAt': datetime.utcnow().isoformat() + 'Z',
            'upvotes': 0,
            'downvotes': 0
        }
        
        # FEATURE 6: Handle replies to comments
        parent_id = data.get('parentId')
        if parent_id:
            comment_data['parentId'] = parent_id
        
        # Add comment to database
        comments_ref = realtime_db_ref.child('forum').child('comments').child(post_id)
        new_comment = comments_ref.push(comment_data)
        
        # Update comment count on post
        post_ref = realtime_db_ref.child('forum').child('posts').child(post_id)
        post_data = post_ref.get()
        if post_data:
            current_count = post_data.get('commentCount', 0)
            post_ref.update({'commentCount': current_count + 1})
        
        # Return the created comment with its ID
        comment_data['id'] = new_comment.key
        return jsonify(comment_data), 201
        
    except Exception as e:
        app.logger.error(f"Error creating comment: {e}")
        return jsonify({'error': 'Failed to create comment'}), 500

@app.route('/api/forum/posts/<post_id>/views', methods=['POST'])
def increment_post_views(post_id):
    """Increment view count for a post (unchanged)"""
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    try:
        post_ref = realtime_db_ref.child('forum').child('posts').child(post_id)
        post_data = post_ref.get()
        
        if not post_data:
            return jsonify({'error': 'Post not found'}), 404
        
        current_views = post_data.get('views', 0)
        post_ref.update({'views': current_views + 1})
        
        return jsonify({'views': current_views + 1})
        
    except Exception as e:
        app.logger.error(f"Error incrementing views: {e}")
        return jsonify({'error': 'Failed to increment views'}), 500
    
##################
# Error handlers #
##################

@app.errorhandler(404)
def not_found(error):
    app.logger.warning(f"404 error: {request.url}")
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f"500 error: {error}")
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8000))
    app.logger.info(f"Starting app on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
    
@app.route('/debug/session')
def debug_session():
    return jsonify({
        'session_data': dict(session),
        'has_user': 'user' in session,
        'user_id': session.get('user'),
        'email': session.get('email'),
        'session_keys': list(session.keys())
    })