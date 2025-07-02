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
        min_hp = request.args.get("min_hp", type=int, default=50)
        min_cargo = request.args.get("min_cargo", type=int, default=100)
        max_price = request.args.get("max_price", type=int, default=3000000)
        min_ground_clearance = request.args.get("min_ground_clearance", type=float, default=13.3)
        seating = request.args.get("seating", type=int, default=None)

        app.logger.info(f"Filter parameters: brand={brand}, model={model}, body_type={body_type}")
        app.logger.info(f"Numeric filters: min_hp={min_hp}, min_cargo={min_cargo}, max_price={max_price}, min_ground_clearance={min_ground_clearance}, seating={seating}")

        filtered_df = df.copy()
        initial_count = len(filtered_df)
        app.logger.info(f"Starting with {initial_count} cars")

        # Check data types and sample values
        app.logger.info(f"Horsepower dtype: {filtered_df['Horsepower'].dtype}")
        app.logger.info(f"Cargo_space dtype: {filtered_df['Cargo_space'].dtype}")
        app.logger.info(f"Ground_Clearance dtype: {filtered_df['Ground_Clearance'].dtype}")
        app.logger.info(f"Price dtype: {filtered_df['Price'].dtype}")
        
        # Sample values
        app.logger.info(f"Sample Horsepower values: {filtered_df['Horsepower'].head().tolist()}")
        app.logger.info(f"Sample Cargo_space values: {filtered_df['Cargo_space'].head().tolist()}")
        app.logger.info(f"Sample Ground_Clearance values: {filtered_df['Ground_Clearance'].head().tolist()}")
        app.logger.info(f"Sample Price values: {filtered_df['Price'].head().tolist()}")

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

def find_colors(model):
    try:
        IMAGE_FOLDER = os.path.join(app.static_folder, "resources")
        if not os.path.exists(IMAGE_FOLDER):
            app.logger.warning(f"Image folder not found: {IMAGE_FOLDER}")
            return []
        
        model = ''.join(e for e in model if e.isalnum())
        colors = []
        for filename in os.listdir(IMAGE_FOLDER):
            if filename.lower().startswith(model.lower()) and '_' in filename:
                color = filename.split('_')[1].split('.')[0]
                image_path = find_car_image(filename.split('.')[0])
                colors.append({"color": color, "image_path": image_path})
        
        app.logger.info(f"Found {len(colors)} colors for model {model}")
        return colors
    except Exception as e:
        app.logger.error(f"Error finding colors for model {model}: {e}")
        return []

@app.route('/get_colors', methods=['GET'])
def get_colors():
    model = request.args.get("model", "").strip()
    colors = find_colors(model)
    return jsonify(colors)

def find_car_image(model):
    try:
        IMAGE_FOLDER = os.path.join(app.static_folder, "resources")
        if not os.path.exists(IMAGE_FOLDER):
            app.logger.warning(f"Image folder not found: {IMAGE_FOLDER}")
            return "/static/resources/tesr.png"
        
        # Clean the model name for matching
        model_clean = ''.join(e for e in model if e.isalnum() or e == '_')
        
        # Try different matching strategies
        for filename in os.listdir(IMAGE_FOLDER):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                filename_clean = filename.lower()
                model_lower = model_clean.lower()
                
                # Try exact match
                if filename_clean.startswith(model_lower):
                    app.logger.info(f"Found image for {model}: {filename}")
                    return f"/static/resources/{filename}"
                
                # Try partial match
                if model_lower in filename_clean:
                    app.logger.info(f"Found partial match image for {model}: {filename}")
                    return f"/static/resources/{filename}"
        
        app.logger.info(f"No image found for model {model}, using default")
        return "/static/resources/tesr.png"
        
    except Exception as e:
        app.logger.error(f"Error finding image for model {model}: {e}")
        return "/static/resources/tesr.png"
    
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
        return jsonify({"error": "Variant parameter required"}), 400

    try:
        app.logger.info(f"Looking up specs for variant: {variant}")
        
        # Try exact match first
        specs_df = df[df["Variant"].str.lower() == variant.lower()]
        
        if specs_df.empty:
            app.logger.warning(f"Exact variant not found: {variant}")
            # Try partial match as fallback
            specs_df = df[df["Variant"].str.contains(variant, case=False, na=False)]
            
            if specs_df.empty:
                app.logger.warning(f"No variant found for: {variant}")
                available_variants = df["Variant"].dropna().unique()[:10]  # Show first 10 for debugging
                app.logger.info(f"Available variants (sample): {list(available_variants)}")
                return jsonify({"error": "Variant not found", "available_variants": list(available_variants)}), 404
        
        specs = specs_df.iloc[0]
        image_path = find_car_image(str(specs["Model"]))
        
        car_specs = {
            "Brand": str(specs.get("Brand", "Unknown")),
            "Model": str(specs.get("Model", "Unknown")),
            "Engine": str(specs.get("Engine", "N/A")),
            "Horsepower": int(specs.get("Horsepower", 0)) if pd.notna(specs.get("Horsepower")) else 0,
            "DriveTrain": str(specs.get("Drive_Train", "N/A")),
            "Transmission": str(specs.get("Transmission", "N/A")),
            "BodyType": str(specs.get("Body_Type", "N/A")),
            "FuelType": str(specs.get("Fuel_Type", "N/A")),
            "GroundClearance": float(specs.get("Ground_Clearance", 0)) if pd.notna(specs.get("Ground_Clearance")) else 0,
            "SeatingCapacity": int(specs.get("Seating_Capacity", 0)) if pd.notna(specs.get("Seating_Capacity")) else 0,
            "CargoSpace": int(specs.get("Cargo_space", 0)) if pd.notna(specs.get("Cargo_space")) else 0,
            "Price": float(specs.get("Price", 0)) if pd.notna(specs.get("Price")) else 0,
            "Image": image_path,
            "Variant": str(specs.get("Variant", variant))  # Include the variant in response
        }

        app.logger.info(f"✅ Retrieved specs for variant: {variant}")
        return jsonify(car_specs)
        
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
    
    
#######################
# Username API Routes #
#######################

@app.route('/api/check-username', methods=['POST'])
def check_username():
    """Check if a username is available"""
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        
        if not username:
            return jsonify({"available": False, "error": "Username is required"})
        
        if len(username) < 3 or len(username) > 20:
            return jsonify({"available": False, "error": "Username must be 3-20 characters"})
        
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            return jsonify({"available": False, "error": "Username can only contain letters, numbers, and underscores"})
        
        # Check if username exists in Firebase
        usernames_ref = realtime_db_ref.child('usernames')
        users = usernames_ref.order_by_value().equal_to(username).get()
        
        available = len(users) == 0
        return jsonify({"available": available})
        
    except Exception as e:
        app.logger.error(f"Error checking username: {e}")
        return jsonify({"error": "Failed to check username"}), 500

@app.route('/api/set-username', methods=['POST'])
def set_username():
    """Set username for authenticated user"""
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    # Check if user is authenticated
    if 'user' not in session:
        return jsonify({"error": "Authentication required"}), 401
    
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
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
        return jsonify({"error": f"Failed to retrieve favorites: {str(e)}"}), 500']
        
        if not username:
            return jsonify({"error": "Username is required"}), 400
        
        # Validate username format
        if len(username) < 3 or len(username) > 20:
            return jsonify({"error": "Username must be 3-20 characters"}), 400
        
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            return jsonify({"error": "Username can only contain letters, numbers, and underscores"}), 400
        
        # Check if username is already taken
        usernames_ref = realtime_db_ref.child('usernames')
        existing_users = usernames_ref.order_by_value().equal_to(username).get()
        
        if len(existing_users) > 0:
            return jsonify({"error": "Username already taken"}), 400
        
        # Set username mapping
        usernames_ref.child(user_id).set(username)
        
        # Update user profile
        user_profile = {
            'username': username,
            'email': session.get('email'),
            'createdAt': {''.join([str(x) for x in time.gmtime()]): True},
            'profilePicture': None
        }
        
        users_ref = realtime_db_ref.child('users').child(user_id)
        users_ref.set(user_profile)
        
        app.logger.info(f"Username set successfully: {username} for user {user_id}")
        return jsonify({"success": True, "message": "Username set successfully"})
        
    except Exception as e:
        app.logger.error(f"Error setting username: {e}")
        return jsonify({"error": "Failed to set username"}), 500

@app.route('/api/get-user-profile', methods=['GET'])
def get_user_profile():
    """Get current user's profile information"""
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    if 'user' not in session:
        return jsonify({"error": "Authentication required"}), 401
    
    try:
        user_id = session['user']
        
        # Get user profile
        users_ref = realtime_db_ref.child('users').child(user_id)
        user_data = users_ref.get()
        
        if user_data:
            return jsonify({
                "success": True,
                "profile": user_data
            })
        else:
            return jsonify({
                "success": True,
                "profile": None
            })
        
    except Exception as e:
        app.logger.error(f"Error getting user profile: {e}")
        return jsonify({"error": "Failed to get user profile"}), 500

@app.route('/api/update-profile', methods=['POST'])
def update_profile():
    """Update user profile (username, profile picture, etc.)"""
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    if 'user' not in session:
        return jsonify({"error": "Authentication required"}), 401
    
    try:
        data = request.get_json()
        user_id = session['user']
        
        # Get current user profile
        users_ref = realtime_db_ref.child('users').child(user_id)
        current_profile = users_ref.get() or {}
        
        # Handle username update
        new_username = data.get('username')
        if new_username and new_username != current_profile.get('username'):
            # Validate new username
            new_username = new_username.strip()
            if len(new_username) < 3 or len(new_username) > 20:
                return jsonify({"error": "Username must be 3-20 characters"}), 400
            
            if not re.match(r'^[a-zA-Z0-9_]+, new_username):
                return jsonify({"error": "Username can only contain letters, numbers, and underscores"}), 400
            
            # Check if new username is available
            usernames_ref = realtime_db_ref.child('usernames')
            existing_users = usernames_ref.order_by_value().equal_to(new_username).get()
            
            if len(existing_users) > 0:
                return jsonify({"error": "Username already taken"}), 400
            
            # Remove old username mapping if exists
            if current_profile.get('username'):
                usernames_ref.child(user_id).delete()
            
            # Set new username mapping
            usernames_ref.child(user_id).set(new_username)
            current_profile['username'] = new_username
        
        # Handle profile picture update
        if 'profilePicture' in data:
            current_profile['profilePicture'] = data['profilePicture']
        
        # Update last modified timestamp
        current_profile['lastModified'] = {''.join([str(x) for x in time.gmtime()]): True}
        
        # Save updated profile
        users_ref.set(current_profile)
        
        app.logger.info(f"Profile updated successfully for user {user_id}")
        return jsonify({"success": True, "message": "Profile updated successfully", "profile": current_profile})
        
    except Exception as e:
        app.logger.error(f"Error updating profile: {e}")
        return jsonify({"error": "Failed to update profile"}), 500

@app.route('/api/get-username-by-id/<user_id>')
def get_username_by_id(user_id):
    """Get username by user ID (for displaying in testimonials/forums)"""
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    try:
        # Get username from mapping
        usernames_ref = realtime_db_ref.child('usernames').child(user_id)
        username = usernames_ref.get()
        
        if username:
            return jsonify({"success": True, "username": username})
        else:
            # Fallback to user profile
            users_ref = realtime_db_ref.child('users').child(user_id)
            user_data = users_ref.get()
            
            if user_data and user_data.get('email'):
                return jsonify({"success": True, "username": user_data['email']})
            else:
                return jsonify({"success": True, "username": "Anonymous"})
        
    except Exception as e:
        app.logger.error(f"Error getting username for user {user_id}: {e}")
        return jsonify({"success": True, "username": "Anonymous"})

#########################
# Profile Picture Routes #
#########################

@app.route('/api/upload-profile-picture', methods=['POST'])
def upload_profile_picture():
    """Handle profile picture upload"""
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    if 'user' not in session:
        return jsonify({"error": "Authentication required"}), 401
    
    try:
        if 'profile_picture' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['profile_picture']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        if not ('.' in file.filename and 
                file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({"error": "Invalid file type. Use PNG, JPG, JPEG, GIF, or WebP"}), 400
        
        # Validate file size (max 5MB)
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > 5 * 1024 * 1024:  # 5MB
            return jsonify({"error": "File too large. Maximum size is 5MB"}), 400
        
        user_id = session['user']
        
        # Create uploads directory if it doesn't exist
        uploads_dir = os.path.join(app.root_path, 'static', 'uploads', 'profile_pictures')
        os.makedirs(uploads_dir, exist_ok=True)
        
        # Generate unique filename
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{user_id}_{int(time.time())}.{file_extension}"
        file_path = os.path.join(uploads_dir, filename)
        
        # Save file
        file.save(file_path)
        
        # Generate URL for the uploaded file
        profile_picture_url = f"/static/uploads/profile_pictures/{filename}"
        
        # Update user profile with new profile picture URL
        users_ref = realtime_db_ref.child('users').child(user_id)
        current_profile = users_ref.get() or {}
        current_profile['profilePicture'] = profile_picture_url
        current_profile['lastModified'] = {''.join([str(x) for x in time.gmtime()]): True}
        users_ref.set(current_profile)
        
        app.logger.info(f"Profile picture uploaded successfully for user {user_id}")
        return jsonify({
            "success": True, 
            "message": "Profile picture uploaded successfully",
            "profilePictureUrl": profile_picture_url
        })
        
    except Exception as e:
        app.logger.error(f"Error uploading profile picture: {e}")
        return jsonify({"error": "Failed to upload profile picture"}), 500

@app.route('/api/set-default-avatar', methods=['POST'])
def set_default_avatar():
    """Set a default avatar for the user"""
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    if 'user' not in session:
        return jsonify({"error": "Authentication required"}), 401
    
    try:
        data = request.get_json()
        avatar_name = data.get('avatar')
        
        if not avatar_name:
            return jsonify({"error": "Avatar name is required"}), 400
        
        # List of available default avatars
        available_avatars = [
            'avatar1.png', 'avatar2.png', 'avatar3.png', 'avatar4.png', 'avatar5.png',
            'avatar6.png', 'avatar7.png', 'avatar8.png', 'avatar9.png', 'avatar10.png'
        ]
        
        if avatar_name not in available_avatars:
            return jsonify({"error": "Invalid avatar selection"}), 400
        
        user_id = session['user']
        avatar_url = f"/static/default_avatars/{avatar_name}"
        
        # Update user profile
        users_ref = realtime_db_ref.child('users').child(user_id)
        current_profile = users_ref.get() or {}
        current_profile['profilePicture'] = avatar_url
        current_profile['lastModified'] = {''.join([str(x) for x in time.gmtime()]): True}
        users_ref.set(current_profile)
        
        app.logger.info(f"Default avatar set for user {user_id}: {avatar_name}")
        return jsonify({
            "success": True,
            "message": "Avatar updated successfully",
            "profilePictureUrl": avatar_url
        })
        
    except Exception as e:
        app.logger.error(f"Error setting default avatar: {e}")
        return jsonify({"error": "Failed to set avatar"}), 500

##################
# Profile Page   #
##################

@app.route('/profile')
def profile_page():
    """Render the user profile page"""
    if 'user' not in session:
        app.logger.info("Unauthorized access to profile page - redirecting to home")
        return redirect('/')
    
    app.logger.info(f"Rendering profile page for user: {session.get('email')}")
    return render_template('profile.html')

# Add import for regex at the top of your file
import re
import time

#######################
# Forum API Routes    #
#######################

@app.route('/api/forum/posts', methods=['POST'])
def create_forum_post():
    """Create a new forum post"""
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    # Use the new authentication check
    if not check_authentication():
        app.logger.warning("Unauthenticated forum post attempt")
        return jsonify({"error": "Not authenticated"}), 401
    
    try:
        data = request.get_json()
        user_id = session['user']
        
        # Get user's display name
        username = get_user_display_name(user_id)
        
        post_data = {
            'userId': user_id,
            'title': data.get('title'),
            'body': data.get('body'),
            'tags': data.get('tags', ''),
            'isAnonymous': data.get('isAnonymous', False),
            'authorName': 'Anonymous' if data.get('isAnonymous', False) else username,
            'createdAt': int(time.time() * 1000),  # Use timestamp in milliseconds
            'upvotes': 0,
            'downvotes': 0,
            'views': 0,
            'commentCount': 0
        }
        
        # Save to Firebase
        posts_ref = realtime_db_ref.child('forum-posts')
        new_post_ref = posts_ref.push(post_data)
        
        # Add the ID to the response
        post_data['id'] = new_post_ref.key
        
        app.logger.info(f"Forum post created successfully by user {user_id}")
        return jsonify(post_data), 201
        
    except Exception as e:
        app.logger.error(f"Error creating forum post: {e}")
        return jsonify({"error": "Failed to create post"}), 500

@app.route('/api/forum/posts/<post_id>/comments', methods=['POST'])
def create_comment():
    """Create a comment on a forum post"""
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    # Use the new authentication check
    if not check_authentication():
        return jsonify({"error": "Not authenticated"}), 401
    
    try:
        data = request.get_json()
        user_id = session['user']
        
        # Get user's display name
        username = get_user_display_name(user_id)
        
        comment_data = {
            'userId': user_id,
            'text': data.get('text'),
            'isAnonymous': data.get('isAnonymous', False),
            'authorName': 'Anonymous' if data.get('isAnonymous', False) else username,
            'createdAt': int(time.time() * 1000),  # Use timestamp in milliseconds
            'upvotes': 0,
            'downvotes': 0,
            'parentId': data.get('parentId')  # For replies
        }
        
        # Save comment
        comments_ref = realtime_db_ref.child('forum-posts').child(post_id).child('comments')
        new_comment_ref = comments_ref.push(comment_data)
        
        # Update comment count
        post_ref = realtime_db_ref.child('forum-posts').child(post_id)
        post_data = post_ref.get()
        if post_data:
            current_count = post_data.get('commentCount', 0)
            post_ref.update({'commentCount': current_count + 1})
        
        comment_data['id'] = new_comment_ref.key
        
        app.logger.info(f"Comment created successfully by user {user_id}")
        return jsonify(comment_data), 201
        
    except Exception as e:
        app.logger.error(f"Error creating comment: {e}")
        return jsonify({"error": "Failed to create comment"}), 500

@app.route('/api/forum/posts/<post_id>/comments', methods=['GET'])
def get_comments():
    """Get comments for a forum post"""
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    try:
        comments_ref = realtime_db_ref.child('forum-posts').child(post_id).child('comments')
        comments_data = comments_ref.get()
        
        if not comments_data:
            return jsonify([])
        
        # Convert to list format
        comments = []
        for comment_id, comment_data in comments_data.items():
            comment_data['id'] = comment_id
            comments.append(comment_data)
        
        return jsonify(comments)
        
    except Exception as e:
        app.logger.error(f"Error getting comments: {e}")
        return jsonify({"error": "Failed to get comments"}), 500

def get_user_display_name(user_id):
    """Helper function to get user's display name"""
    try:
        # Try to get username first
        username_ref = realtime_db_ref.child('usernames').child(user_id)
        username = username_ref.get()
        
        if username:
            return username
        
        # Fallback to user profile
        user_ref = realtime_db_ref.child('users').child(user_id)
        user_data = user_ref.get()
        
        if user_data and user_data.get('username'):
            return user_data['username']
        
        # Final fallback to email from session
        return session.get('email', 'Anonymous')
        
    except Exception as e:
        app.logger.error(f"Error getting display name for user {user_id}: {e}")
        return 'Anonymous'
    
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