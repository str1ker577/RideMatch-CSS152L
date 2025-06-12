from flask import Flask, request, jsonify, redirect, render_template, send_from_directory, session, url_for
from flask_cors import CORS 
import pandas as pd
import json
import requests
import firebase_admin
from firebase_admin import credentials, auth, firestore
import numpy as np
import os
import logging

app = Flask(__name__)
CORS(app)

# Configure logging for Railway
logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)

app.secret_key = os.environ.get('SECRET_KEY', 'fallback_secret_key')

# Load configuration safely
try:
    app.config.from_pyfile('config.py')
    app.logger.info("✅ Config.py loaded successfully")
except Exception as e:
    app.logger.info(f"⚠️ config.py not found: {e}, using environment variables")

# Initialize Firebase safely
db = None
try:
    # Load serviceAccountKey.json
    if 'SERVICE_ACCOUNT_KEY_JSON' in os.environ:
        service_account = json.loads(os.environ['SERVICE_ACCOUNT_KEY_JSON'])
        cred = credentials.Certificate(service_account)
        app.logger.info("✅ Firebase credentials loaded from environment")
    else:
        cred = credentials.Certificate('serviceAccountKey.json')
        app.logger.info("✅ Firebase credentials loaded from file")
    
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    app.logger.info("✅ Firebase initialized successfully")
except Exception as e:
    app.logger.error(f"❌ Firebase initialization failed: {e}")
    db = None

# Load Firebase config safely
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

# Load CSV data safely
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
        "firebase_initialized": db is not None,
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
    if not db:
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
        
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        
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

@app.route('/signup', methods=['POST'])
def signup():
    if not db:
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

@app.route('/get-faves', methods=['POST'])
def get_faves():
    if not db:
        app.logger.error("Database not available for get-faves")
        return jsonify({"error": "Database not available"}), 500
    
    if 'user' in session:
        user_id = session['user']
        try:
            favorites_ref = db.collection('users').document(user_id).collection('favorites')
            favorites = favorites_ref.stream()

            favorite_variants = []
            for favorite in favorites:
                favorite_variants.append(favorite.to_dict())

            app.logger.info(f"Retrieved {len(favorite_variants)} favorites for user {user_id}")
            return jsonify(favorite_variants)
        except Exception as e:
            app.logger.error(f"Error retrieving favorites: {e}")
            return jsonify({"error": f"Failed to retrieve favorites: {str(e)}"}), 500
    else:
        app.logger.warning("Unauthorized access to favorites")
        return jsonify({"error": "Not logged in"}), 401

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
        
        model = ''.join(e for e in model if e.isalnum() or e == '_')
        for filename in os.listdir(IMAGE_FOLDER):
            if filename.lower().startswith(model.lower()):
                return f"/static/resources/{filename}"
        
        app.logger.info(f"No image found for model {model}, using default")
        return "/static/resources/tesr.png"
    except Exception as e:
        app.logger.error(f"Error finding image for model {model}: {e}")
        return "/static/resources/tesr.png"

@app.route('/get_specs', methods=['GET'])
def get_specs():
    if df.empty:
        app.logger.error("Car data not available for specs")
        return jsonify({"error": "Car data not available"}), 500
    
    variant = request.args.get("variant", "").strip()
    if not variant:
        app.logger.warning("No variant specified for specs lookup")
        return jsonify({}), 400

    try:
        specs_df = df[df["Variant"].str.lower() == variant.lower()]
        if specs_df.empty:
            app.logger.warning(f"Variant not found: {variant}")
            return jsonify({"error": "Variant not found"}), 404
        
        specs = specs_df.iloc[0]
        image_path = find_car_image(str(specs["Model"]))
        
        car_specs = {
            "Brand": str(specs["Brand"]),
            "Model": str(specs["Model"]),
            "Engine": str(specs["Engine"]),
            "Horsepower": int(specs["Horsepower"]),
            "DriveTrain": str(specs["Drive_Train"]),
            "Transmission": str(specs["Transmission"]),
            "BodyType": str(specs["Body_Type"]),
            "FuelType": str(specs["Fuel_Type"]),
            "GroundClearance": float(specs["Ground_Clearance"]),
            "SeatingCapacity": int(specs["Seating_Capacity"]),
            "CargoSpace": int(specs["Cargo_space"]),
            "Price": float(specs["Price"]),
            "Image": image_path
        }

        app.logger.info(f"Retrieved specs for variant: {variant}")
        return jsonify(car_specs)
        
    except Exception as e:
        app.logger.error(f"Error getting specs for variant {variant}: {e}")
        return jsonify({"error": f"Failed to get specs: {str(e)}"}), 500

@app.route('/toggle-fave', methods=['POST'])
def toggle_fave():
    if not db:
        app.logger.error("Database not available for toggle-fave")
        return jsonify({"error": "Database not available"}), 500
    
    if 'user' in session:
        user_id = session['user']
        data = request.get_json()
        
        if not data:
            app.logger.error("No JSON data received for toggle-fave")
            return jsonify({"error": "No data provided"}), 400
            
        variant = data.get('variant')
        liked = data.get('liked')

        if not variant:
            app.logger.error("No variant specified for toggle-fave")
            return jsonify({"error": "Variant required"}), 400

        try:
            favorites_ref = db.collection('users').document(user_id).collection('favorites')
            existing_fave = favorites_ref.where('variant', '==', variant).get()

            if existing_fave:
                if not liked:
                    for fave in existing_fave:
                        favorites_ref.document(fave.id).delete()
                    app.logger.info(f"Removed favorite: {variant}")
                    return jsonify({"status": "removed", "variant": variant, "liked": False}), 200
            else:
                if liked:
                    favorites_ref.add({'variant': variant})
                    app.logger.info(f"Added favorite: {variant}")
                    return jsonify({"status": "added", "variant": variant, "liked": True}), 200

            return jsonify({"status": "no change", "variant": variant, "liked": liked}), 200
            
        except Exception as e:
            app.logger.error(f"Error toggling favorite: {e}")
            return jsonify({"error": f"Failed to toggle favorite: {str(e)}"}), 500
    else:
        app.logger.warning("Unauthorized access to toggle-fave")
        return jsonify({"error": "User not logged in"}), 401

# Error handlers
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