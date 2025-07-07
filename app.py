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
from datetime import datetime, timedelta
import os
from werkzeug.utils import secure_filename
from PIL import Image
import uuid
import re

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

def load_csv_data_enhanced():
    """Load CSV data with detailed tracking and row preservation"""
    global df
    
    try:
        # Check if file exists
        csv_path = 'car_data.csv'
        if not os.path.exists(csv_path):
            app.logger.error(f"❌ CSV file not found at {csv_path}")
            app.logger.info(f"Current directory contents: {os.listdir('.')}")
            return False
        
        app.logger.info(f"📁 CSV file found: {csv_path}")
        app.logger.info(f"📊 File size: {os.path.getsize(csv_path)} bytes")
        
        # Try multiple encodings
        encodings_to_try = ['cp1252', 'utf-8', 'latin-1', 'iso-8859-1']
        
        for encoding in encodings_to_try:
            try:
                app.logger.info(f"🔄 Trying to load CSV with encoding: {encoding}")
                
                # Load CSV with specific encoding
                df_raw = pd.read_csv(csv_path, encoding=encoding)
                app.logger.info(f"✅ CSV loaded successfully with {encoding} encoding")
                app.logger.info(f"📊 Raw data shape: {df_raw.shape}")
                app.logger.info(f"📋 Columns: {list(df_raw.columns)}")
                break
                
            except UnicodeDecodeError as e:
                app.logger.warning(f"⚠️ Encoding {encoding} failed: {e}")
                continue
            except Exception as e:
                app.logger.error(f"❌ Error with {encoding}: {e}")
                continue
        else:
            app.logger.error("❌ Failed to load CSV with any encoding")
            return False
        
        # Step 1: Initial data inspection
        app.logger.info("🔍 STEP 1: Initial data inspection")
        app.logger.info(f"Total rows loaded: {len(df_raw)}")
        app.logger.info(f"Columns: {list(df_raw.columns)}")
        
        # Check for completely empty rows
        empty_rows = df_raw.isnull().all(axis=1).sum()
        app.logger.info(f"Completely empty rows: {empty_rows}")
        
        # Step 2: Remove only completely empty rows
        app.logger.info("🧹 STEP 2: Cleaning completely empty rows")
        df_clean = df_raw.dropna(how='all').copy()
        app.logger.info(f"After removing empty rows: {len(df_clean)} (removed {len(df_raw) - len(df_clean)} rows)")
        
        # Step 3: Standardize Fuel_Type - Convert PHEV to Hybrid:Gasoline
        app.logger.info("🔧 STEP 3: Standardizing Fuel_Type column")
        if 'Fuel_Type' in df_clean.columns:
            # Show original fuel types
            original_fuel_types = df_clean['Fuel_Type'].value_counts()
            app.logger.info(f"Original fuel types: {original_fuel_types.to_dict()}")
            
            # Convert PHEV to Hybrid:Gasoline
            phev_count = (df_clean['Fuel_Type'].str.contains('PHEV', case=False, na=False)).sum()
            if phev_count > 0:
                app.logger.info(f"Found {phev_count} PHEV entries, converting to 'Hybrid:Gasoline'")
                df_clean.loc[df_clean['Fuel_Type'].str.contains('PHEV', case=False, na=False), 'Fuel_Type'] = 'Hybrid:Gasoline'
            
            # Show updated fuel types
            updated_fuel_types = df_clean['Fuel_Type'].value_counts()
            app.logger.info(f"Updated fuel types: {updated_fuel_types.to_dict()}")
        
        # Step 4: Data transformation with row preservation
        app.logger.info("🔧 STEP 4: Data transformation (preserving all rows)")
        df_processed = df_clean.copy()
        
        # Transform Cargo_space
        if 'Cargo_space' in df_processed.columns:
            app.logger.info("Processing Cargo_space column...")
            
            # Convert to string and extract numbers, but keep original if extraction fails
            df_processed['Cargo_space_str'] = df_processed['Cargo_space'].astype(str)
            cargo_extracted = df_processed['Cargo_space_str'].str.extract(r'(\d+)', expand=False)
            df_processed['Cargo_space'] = pd.to_numeric(cargo_extracted, errors='coerce')
            
            # Count successful conversions
            valid_cargo = df_processed['Cargo_space'].notna().sum()
            app.logger.info(f"Cargo_space: {valid_cargo}/{len(df_processed)} values converted successfully")
            
            # Drop temporary column
            df_processed.drop('Cargo_space_str', axis=1, inplace=True)
        
        # Transform Ground_Clearance
        if 'Ground_Clearance' in df_processed.columns:
            app.logger.info("Processing Ground_Clearance column...")
            
            df_processed['Ground_Clearance_str'] = df_processed['Ground_Clearance'].astype(str)
            clearance_extracted = df_processed['Ground_Clearance_str'].str.extract(r'([\d.]+)', expand=False)
            df_processed['Ground_Clearance'] = pd.to_numeric(clearance_extracted, errors='coerce')
            
            valid_clearance = df_processed['Ground_Clearance'].notna().sum()
            app.logger.info(f"Ground_Clearance: {valid_clearance}/{len(df_processed)} values converted successfully")
            
            df_processed.drop('Ground_Clearance_str', axis=1, inplace=True)
        
        # Transform Horsepower
        if 'Horsepower' in df_processed.columns:
            app.logger.info("Processing Horsepower column...")
            
            df_processed['Horsepower_str'] = df_processed['Horsepower'].astype(str)
            hp_extracted = df_processed['Horsepower_str'].str.extract(r'(\d+)', expand=False)
            df_processed['Horsepower'] = pd.to_numeric(hp_extracted, errors='coerce')
            
            valid_hp = df_processed['Horsepower'].notna().sum()
            app.logger.info(f"Horsepower: {valid_hp}/{len(df_processed)} values converted successfully")
            
            df_processed.drop('Horsepower_str', axis=1, inplace=True)
        
        # Transform Price
        if 'Price' in df_processed.columns:
            app.logger.info("Processing Price column...")
            df_processed['Price'] = pd.to_numeric(df_processed['Price'], errors='coerce')
            valid_price = df_processed['Price'].notna().sum()
            app.logger.info(f"Price: {valid_price}/{len(df_processed)} values converted successfully")
        
        # Transform other numeric columns
        numeric_columns = ['Year', 'Seating_Capacity']
        for col in numeric_columns:
            if col in df_processed.columns:
                app.logger.info(f"Processing {col} column...")
                df_processed[col] = pd.to_numeric(df_processed[col], errors='coerce')
                valid_count = df_processed[col].notna().sum()
                app.logger.info(f"{col}: {valid_count}/{len(df_processed)} values converted successfully")
        
        # Step 5: Final validation and statistics
        app.logger.info("📊 STEP 5: Final validation")
        app.logger.info(f"Final DataFrame shape: {df_processed.shape}")
        app.logger.info(f"Rows preserved: {len(df_processed)}/{len(df_raw)} ({(len(df_processed)/len(df_raw)*100):.1f}%)")
        
        # Check essential columns for non-null values
        essential_columns = ['Brand', 'Model', 'Variant', 'Price']
        for col in essential_columns:
            if col in df_processed.columns:
                non_null_count = df_processed[col].notna().sum()
                app.logger.info(f"{col} non-null values: {non_null_count}/{len(df_processed)}")
            else:
                app.logger.warning(f"Essential column {col} not found!")
        
        # Count by brand to check for missing brands
        if 'Brand' in df_processed.columns:
            brand_counts = df_processed['Brand'].value_counts()
            app.logger.info(f"Cars by brand: {brand_counts.to_dict()}")
        
        # Set the global DataFrame
        df = df_processed
        app.logger.info("✅ CSV data loading and processing completed successfully")
        return True
        
    except Exception as e:
        app.logger.error(f"❌ Critical error in CSV loading: {e}")
        app.logger.error(f"Error type: {type(e)}")
        import traceback
        app.logger.error(f"Traceback: {traceback.format_exc()}")
        return False

# Replace your existing CSV loading section with this:
df = pd.DataFrame()
csv_loaded = load_csv_data_enhanced()

if not csv_loaded:
    app.logger.error("❌ CRITICAL: CSV data could not be loaded!")
    df = pd.DataFrame()
else:
    app.logger.info(f"✅ CSV data loaded successfully - {len(df)} records")
    
# Finds Car images    
def find_car_image(model):
    """Find car image based on model name with better error handling"""
    try:
        # Clean model name for filename
        model_clean = model.replace(' ', '_').lower() if model else 'default'
        
        # Check if image exists in resources folder
        image_path = f'/static/resources/{model_clean}.png'
        full_path = f'static/resources/{model_clean}.png'
        
        # Check if file actually exists
        if os.path.exists(full_path):
            return image_path
        
        # Check for common image extensions
        for ext in ['.jpg', '.jpeg', '.gif', '.webp']:
            alt_path = f'static/resources/{model_clean}{ext}'
            if os.path.exists(alt_path):
                return f'/static/resources/{model_clean}{ext}'
        
        # Return a placeholder image that actually exists or a data URL
        placeholder_path = 'static/resources/default_car.png'
        if os.path.exists(placeholder_path):
            return '/static/resources/default_car.png'
        
        # Return a simple data URL placeholder to avoid 404s
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNhciBJbWFnZTwvdGV4dD48L3N2Zz4='
        
    except Exception as e:
        app.logger.warning(f"Error finding image for model {model}: {e}")
        # Return inline SVG placeholder
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNhciBJbWFnZTwvdGV4dD48L3N2Zz4='

# Health check endpoint
@app.route('/health')
def health():
    global df
    
    status = {
        "status": "healthy" if not df.empty else "unhealthy",
        "firebase_initialized": realtime_db_ref is not None,
        "csv_loaded": not df.empty,
        "csv_records": len(df) if not df.empty else 0,
        "firebase_config_loaded": bool(firebase_config),
        "api_key_available": api_key is not None,
        "csv_columns": list(df.columns) if not df.empty else [],
        "csv_file_exists": any(os.path.exists(path) for path in [
            'car_data.csv', './car_data.csv', 'static/car_data.csv', 'data/car_data.csv'
        ]),
        "brand_count": len(df['Brand'].unique()) if not df.empty and 'Brand' in df.columns else 0,
        "model_count": len(df['Model'].unique()) if not df.empty and 'Model' in df.columns else 0,
        "variant_count": len(df['Variant'].unique()) if not df.empty and 'Variant' in df.columns else 0
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

@app.route('/debug/price-range')
def debug_price_range():
    """Check the actual price range in your data"""
    if df.empty:
        return jsonify({"error": "No data loaded"})
    
    try:
        prices = df['Price'].dropna()
        
        price_stats = {
            "total_cars": len(df),
            "min_price": int(prices.min()) if len(prices) > 0 else 0,
            "max_price": int(prices.max()) if len(prices) > 0 else 0,
            "avg_price": int(prices.mean()) if len(prices) > 0 else 0
        }
        
        # Get top 10 most expensive cars
        top_expensive = df.nlargest(10, 'Price')[['Brand', 'Model', 'Variant', 'Year', 'Price']].to_dict('records')
        
        return jsonify({
            "price_statistics": price_stats,
            "top_10_expensive": top_expensive
        })
        
    except Exception as e:
        return jsonify({"error": str(e)})

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

# UPDATED: Enhanced verify-token route to include username (replace existing)
@app.route('/verify-token', methods=['POST'])
def verify_token():
    if not realtime_db_ref:
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
        
        # Get user profile data including username
        user_ref = realtime_db_ref.child('users').child(uid)
        user_data = user_ref.get()
        
        username = None
        profile_picture_url = None
        if user_data:
            username = user_data.get('username')
            profile_picture_url = user_data.get('profilePictureUrl')
        
        # Set comprehensive session data
        session['user'] = uid
        session['email'] = email
        session['username'] = username
        session['profile_picture_url'] = profile_picture_url
        session['idToken'] = id_token
        session['authenticated'] = True
        session['auth_time'] = int(time.time())
        
        # Make session permanent (expires in 30 days)
        session.permanent = True
        app.permanent_session_lifetime = timedelta(days=30)
        
        app.logger.info(f"✅ User {email} logged in successfully with username: {username}")
        return jsonify({
            "status": "success", 
            "message": "Authentication successful",
            "username": username,
            "profile_picture_url": profile_picture_url,
            "uid": uid
        }), 200
        
    except firebase_admin.auth.InvalidIdTokenError as e:
        app.logger.error(f"Invalid token error: {e}")
        return jsonify({"status": "error", "message": "Invalid token"}), 401
    except Exception as e:
        app.logger.error(f"Token verification failed: {str(e)}")
        return jsonify({"status": "error", "message": f"Authentication failed: {str(e)}"}), 500
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
        
        # Get user profile data including username
        user_ref = realtime_db_ref.child('users').child(uid)
        user_data = user_ref.get()
        
        username = None
        if user_data:
            username = user_data.get('username')
        
        # Set enhanced session
        session['user'] = uid
        session['email'] = email
        session['username'] = username  # NEW: Store username in session
        session['idToken'] = id_token
        
        app.logger.info(f"✅ User {email} logged in successfully with username: {username}")
        return jsonify({
            "status": "success", 
            "message": "Authentication successful",
            "username": username
        }), 200
        
    except firebase_admin.auth.InvalidIdTokenError as e:
        app.logger.error(f"Invalid token error: {e}")
        return jsonify({"status": "error", "message": "Invalid token"}), 401
    except Exception as e:
        app.logger.error(f"Token verification failed: {str(e)}")
        return jsonify({"status": "error", "message": f"Authentication failed: {str(e)}"}), 500
    
@app.route('/check-session', methods=['GET'])
def check_session():
    """Check if user has a valid session"""
    if 'user' in session and session.get('authenticated'):
        return jsonify({
            "authenticated": True,
            "user": session.get('user'),
            "email": session.get('email'),
            "username": session.get('username'),
            "profile_picture_url": session.get('profile_picture_url')
        }), 200
    else:
        return jsonify({"authenticated": False}), 200
    
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
    
@app.route('/complete-signup', methods=['POST'])
def complete_signup():
    """Complete user signup with username and profile data"""
    if not realtime_db_ref:
        return jsonify({"status": "error", "message": "Database not available"}), 500
    
    try:
        data = request.get_json()
        uid = data.get('uid')
        email = data.get('email')
        username = data.get('username', '').strip()
        profile_picture_url = data.get('profilePictureUrl')
        
        app.logger.info(f"Completing signup for user {uid} with username: {username}")
        
        if not uid or not email or not username:
            return jsonify({"status": "error", "message": "Missing required fields"}), 400
        
        # Validate username
        is_valid, message = validate_username(username)
        if not is_valid:
            return jsonify({"status": "error", "message": message}), 400
        
        # Check username availability
        users_ref = realtime_db_ref.child('users')
        existing_users = users_ref.order_by_child('username').equal_to(username).get()
        
        if existing_users:
            return jsonify({"status": "error", "message": "Username already taken"}), 400
        
        # Create user profile in database
        user_data = {
            'uid': uid,
            'email': email,
            'username': username,
            'profilePictureUrl': profile_picture_url,
            'memberSince': datetime.utcnow().isoformat() + 'Z',
            'favoriteCount': 0,
            'createdAt': int(time.time() * 1000)
        }
        
        # Store user data
        users_ref.child(uid).set(user_data)
        
        app.logger.info(f"✅ User profile created for {email} with username {username}")
        return jsonify({"status": "success", "message": "Profile created successfully"}), 200
        
    except Exception as e:
        app.logger.error(f"Error completing signup: {e}")
        return jsonify({"status": "error", "message": "Failed to complete signup"}), 500    

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
    """Enhanced logout with proper session cleanup"""
    user_email = session.get('email', 'Unknown')
    app.logger.info(f"User {user_email} logging out")
    
    # Clear all session data
    session.clear()
    
    # Make sure session is properly cleared
    session.permanent = False
    
    return jsonify({
        "status": "success", 
        "message": "Logged out successfully",
        "redirect": "/"
    }), 200

####################
# Profile Function #
####################

UPLOAD_FOLDER = 'static/profile_pictures'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Create upload directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_username(username):
    """Validate username format and length"""
    if not username:
        return False, "Username is required"
    
    username = username.strip()
    
    if len(username) < 3:
        return False, "Username must be at least 3 characters long"
    
    if len(username) > 20:
        return False, "Username must be less than 20 characters long"
    
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return False, "Username can only contain letters, numbers, and underscores"
    
    return True, "Valid username"

def resize_image(image_path, max_size=(300, 300)):
    """Resize image to maximum dimensions while maintaining aspect ratio"""
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary (for PNG with transparency)
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Resize maintaining aspect ratio
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save optimized image
            img.save(image_path, 'JPEG', quality=85, optimize=True)
        
        return True
    except Exception as e:
        app.logger.error(f"Error resizing image {image_path}: {e}")
        return False

# NEW: Check username availability endpoint
@app.route('/check-username', methods=['POST'])
def check_username():
    """Check if username is available"""
    if not realtime_db_ref:
        return jsonify({"available": False, "message": "Database not available"}), 500
    
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        
        # Validate username format
        is_valid, message = validate_username(username)
        if not is_valid:
            return jsonify({"available": False, "message": message}), 400
        
        # Check if username exists in database
        users_ref = realtime_db_ref.child('users')
        existing_users = users_ref.order_by_child('username').equal_to(username).get()
        
        if existing_users:
            return jsonify({
                "available": False, 
                "message": "Username already taken"
            }), 200
        
        return jsonify({
            "available": True, 
            "message": "Username available"
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error checking username: {e}")
        return jsonify({
            "available": False, 
            "message": "Error checking username"
        }), 500

@app.route('/upload-profile-picture', methods=['POST'])
def upload_profile_picture():
    """Upload and process profile picture"""
    try:
        if 'profile_picture' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['profile_picture']
        user_id = request.form.get('user_id')
        
        if not user_id:
            return jsonify({"error": "User ID required"}), 400
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "File type not allowed"}), 400
        
        # Check file size
        if len(file.read()) > MAX_FILE_SIZE:
            return jsonify({"error": "File too large (max 5MB)"}), 400
        
        file.seek(0)  # Reset file pointer
        
        # Generate unique filename
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{user_id}_{uuid.uuid4().hex}.{file_extension}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        # Save file
        file.save(filepath)
        
        # Resize image
        if not resize_image(filepath):
            os.remove(filepath)  # Remove failed file
            return jsonify({"error": "Failed to process image"}), 500
        
        # Generate URL
        file_url = f"/static/profile_pictures/{filename}"
        
        app.logger.info(f"Profile picture uploaded for user {user_id}: {filename}")
        return jsonify({"url": file_url}), 200
        
    except Exception as e:
        app.logger.error(f"Error uploading profile picture: {e}")
        return jsonify({"error": "Failed to upload image"}), 500

# NEW: Get user profile endpoint
@app.route('/get-user-profile', methods=['POST'])
def get_user_profile():
    """Get user profile data"""
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    try:
        data = request.get_json()
        uid = data.get('uid')
        
        if not uid:
            return jsonify({"error": "User ID required"}), 400
        
        # Get user data from database
        user_ref = realtime_db_ref.child('users').child(uid)
        user_data = user_ref.get()
        
        if not user_data:
            # Create basic profile if doesn't exist
            user_data = {
                'uid': uid,
                'email': 'Unknown',
                'username': '',
                'memberSince': datetime.utcnow().isoformat() + 'Z',
                'favoriteCount': 0
            }
            user_ref.set(user_data)
        
        # Get favorite count
        favorites_ref = realtime_db_ref.child('favorites').child(uid)
        favorites = favorites_ref.get() or {}
        user_data['favoriteCount'] = len(favorites)
        
        return jsonify(user_data), 200
        
    except Exception as e:
        app.logger.error(f"Error getting user profile: {e}")
        return jsonify({"error": "Failed to get profile"}), 500

# NEW: Update username endpoint
@app.route('/update-username', methods=['POST'])
def update_username():
    """Update user's username"""
    app.logger.info("🔄 Update username request received")
    
    if not realtime_db_ref:
        app.logger.error("❌ Database not available")
        return jsonify({"error": "Database not available"}), 500
    
    try:
        app.logger.info("📥 Getting request data...")
        data = request.get_json()
        app.logger.info(f"📦 Request data: {data}")
        
        if not data:
            app.logger.error("❌ No JSON data received")
            return jsonify({"error": "No data provided"}), 400
        
        uid = data.get('uid')
        new_username = data.get('newUsername', '').strip()
        
        app.logger.info(f"🔍 UID: {uid}")
        app.logger.info(f"🔍 New username: {new_username}")
        
        if not uid or not new_username:
            app.logger.error("❌ Missing required fields")
            return jsonify({"error": "Missing required fields"}), 400
        
        # Validate username
        app.logger.info("🔄 Validating username...")
        is_valid, message = validate_username(new_username)
        app.logger.info(f"✅ Username validation result: {is_valid}, {message}")
        
        if not is_valid:
            return jsonify({"error": message}), 400
        
        # Check if username is already taken (excluding current user)
        app.logger.info("🔄 Checking username availability...")
        users_ref = realtime_db_ref.child('users')
        
        try:
            existing_users = users_ref.order_by_child('username').equal_to(new_username).get()
            app.logger.info(f"🔍 Existing users check result: {existing_users}")
        except Exception as db_error:
            app.logger.error(f"❌ Database query error: {db_error}")
            return jsonify({"error": "Database query failed"}), 500
        
        # Remove current user from results
        if existing_users:
            existing_users = {k: v for k, v in existing_users.items() if k != uid}
            if existing_users:
                app.logger.warning(f"⚠️ Username already taken: {new_username}")
                return jsonify({"error": "Username already taken"}), 400
        
        # Update username
        app.logger.info("🔄 Updating username in database...")
        try:
            user_ref = users_ref.child(uid)
            user_ref.update({'username': new_username})
            app.logger.info(f"✅ Username updated successfully for user {uid}: {new_username}")
        except Exception as update_error:
            app.logger.error(f"❌ Database update error: {update_error}")
            return jsonify({"error": "Database update failed"}), 500
        
        return jsonify({"message": "Username updated successfully"}), 200
        
    except Exception as e:
        app.logger.error(f"❌ Unexpected error updating username: {e}")
        app.logger.error(f"❌ Error type: {type(e)}")
        import traceback
        app.logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({"error": "Failed to update username"}), 500

# NEW: Update profile picture endpoint
@app.route('/update-profile-picture', methods=['POST'])
def update_profile_picture():
    """Update user's profile picture"""
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    try:
        if 'profile_picture' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['profile_picture']
        uid = request.form.get('uid')
        
        if not uid:
            return jsonify({"error": "User ID required"}), 400
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "File type not allowed"}), 400
        
        # Check file size
        if len(file.read()) > MAX_FILE_SIZE:
            return jsonify({"error": "File too large (max 5MB)"}), 400
        
        file.seek(0)  # Reset file pointer
        
        # Remove old profile picture
        user_ref = realtime_db_ref.child('users').child(uid)
        user_data = user_ref.get()
        
        if user_data and user_data.get('profilePictureUrl'):
            old_url = user_data['profilePictureUrl']
            if old_url.startswith('/static/profile_pictures/'):
                old_filename = old_url.split('/')[-1]
                old_filepath = os.path.join(UPLOAD_FOLDER, old_filename)
                if os.path.exists(old_filepath):
                    os.remove(old_filepath)
        
        # Generate unique filename
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{uid}_{uuid.uuid4().hex}.{file_extension}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        # Save and resize image
        file.save(filepath)
        
        if not resize_image(filepath):
            os.remove(filepath)
            return jsonify({"error": "Failed to process image"}), 500
        
        # Update database
        file_url = f"/static/profile_pictures/{filename}"
        user_ref.update({'profilePictureUrl': file_url})
        
        app.logger.info(f"Profile picture updated for user {uid}: {filename}")
        return jsonify({"url": file_url}), 200
        
    except Exception as e:
        app.logger.error(f"Error updating profile picture: {e}")
        return jsonify({"error": "Failed to update profile picture"}), 500

# NEW: Remove profile picture endpoint
@app.route('/remove-profile-picture', methods=['POST'])
def remove_profile_picture():
    """Remove user's profile picture"""
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    try:
        data = request.get_json()
        uid = data.get('uid')
        
        if not uid:
            return jsonify({"error": "User ID required"}), 400
        
        # Get current profile picture
        user_ref = realtime_db_ref.child('users').child(uid)
        user_data = user_ref.get()
        
        if user_data and user_data.get('profilePictureUrl'):
            old_url = user_data['profilePictureUrl']
            
            # Remove file from disk
            if old_url.startswith('/static/profile_pictures/'):
                old_filename = old_url.split('/')[-1]
                old_filepath = os.path.join(UPLOAD_FOLDER, old_filename)
                if os.path.exists(old_filepath):
                    os.remove(old_filepath)
            
            # Update database
            user_ref.update({'profilePictureUrl': None})
        
        app.logger.info(f"Profile picture removed for user {uid}")
        return jsonify({"message": "Profile picture removed"}), 200
        
    except Exception as e:
        app.logger.error(f"Error removing profile picture: {e}")
        return jsonify({"error": "Failed to remove profile picture"}), 500

# UPDATED: Enhanced profile route (replace existing)
@app.route('/profile', methods=['GET', 'POST'])
def profile():
    if 'user' not in session:
        return redirect(url_for('home'))
    
    if request.method == 'POST':
        # Handle any POST requests if needed
        pass
    
    return render_template('profile.html')

# NEW: Serve profile pictures
@app.route('/static/profile_pictures/<path:filename>')
def serve_profile_picture(filename):
    """Serve profile picture files"""
    try:
        if not os.path.exists(UPLOAD_FOLDER):
            return "Profile pictures directory not found", 404
        
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(file_path):
            return "Profile picture not found", 404
        
        return send_from_directory(UPLOAD_FOLDER, filename)
        
    except Exception as e:
        app.logger.error(f"Error serving profile picture {filename}: {e}")
        return "Error serving profile picture", 500

@app.route('/debug/users')
def debug_users():
    """Debug endpoint to check user data"""
    if not realtime_db_ref:
        return jsonify({"error": "Database not available"}), 500
    
    try:
        users_ref = realtime_db_ref.child('users')
        users_data = users_ref.get() or {}
        
        users_summary = []
        for uid, user_data in users_data.items():
            users_summary.append({
                "uid": uid,
                "email": user_data.get('email', 'Unknown'),
                "username": user_data.get('username', 'None'),
                "memberSince": user_data.get('memberSince', 'Unknown'),
                "hasProfilePicture": bool(user_data.get('profilePictureUrl'))
            })
        
        return jsonify({
            "total_users": len(users_summary),
            "users": users_summary
        })
        
    except Exception as e:
        app.logger.error(f"Error fetching users debug info: {e}")
        return jsonify({"error": str(e)}), 500
    
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
        max_price = request.args.get("max_price", type=int, default=25000000)
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
    
@app.route('/get_variant_years', methods=['GET'])
def get_variant_years():
    """Get available years for a specific brand, model, and variant combination"""
    if df.empty:
        app.logger.warning("No car data available for variant years")
        return jsonify([])
    
    brand = request.args.get("brand", "").strip()
    model = request.args.get("model", "").strip()
    variant = request.args.get("variant", "").strip()
    
    if not brand or not model or not variant:
        app.logger.warning("Missing parameters for variant years lookup")
        return jsonify([])

    try:
        app.logger.info(f"Getting years for brand: {brand}, model: {model}, variant: {variant}")
        
        # Filter by brand, model, and variant, then get unique years
        filtered_df = df[
            (df["Brand"].str.lower() == brand.lower()) &
            (df["Model"].str.lower() == model.lower()) &
            (df["Variant"].str.lower() == variant.lower())
        ]
        
        years = filtered_df["Year"].dropna().unique().tolist()
        
        # Convert to integers and remove any invalid years
        valid_years = []
        for year in years:
            try:
                year_int = int(year)
                if 1900 <= year_int <= 2030:  # Reasonable year range
                    valid_years.append(year_int)
            except (ValueError, TypeError):
                continue
        
        app.logger.info(f"Retrieved {len(valid_years)} valid years for {variant}")
        return jsonify(valid_years)
        
    except Exception as e:
        app.logger.error(f"Error getting variant years: {e}")
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
    year = request.args.get("year", "").strip()  # NEW: Year parameter
    
    if not variant:
        app.logger.warning("No variant specified for specs lookup")
        return jsonify({"error": "Variant parameter required"}), 400

    try:
        app.logger.info(f"Looking up specs for variant: {variant}, year: {year}")
        
        # Build query conditions
        query_conditions = [df["Variant"].str.lower() == variant.lower()]
        
        # Add year condition if provided
        if year:
            try:
                year_int = int(year)
                query_conditions.append(df["Year"] == year_int)
                app.logger.info(f"Including year filter: {year_int}")
            except (ValueError, TypeError):
                app.logger.warning(f"Invalid year format: {year}")
                return jsonify({"error": "Invalid year format"}), 400
        
        # Combine all conditions
        combined_condition = query_conditions[0]
        for condition in query_conditions[1:]:
            combined_condition = combined_condition & condition
        
        car_data = df[combined_condition]
        
        if car_data.empty:
            app.logger.warning(f"No car found for variant: {variant}, year: {year}")
            available_variants = df["Variant"].unique().tolist()[:10]
            app.logger.info(f"Available variants (sample): {available_variants}")
            return jsonify({"error": f"Variant '{variant}' with year '{year}' not found"}), 404
        
        # Get the first matching car (in case of duplicates)
        car = car_data.iloc[0]
        app.logger.info(f"Found car data for variant: {variant}, year: {year}")
        
        # Build specs dictionary (same helper functions as before)
        def safe_get_int(value, default=0):
            try:
                if pd.isna(value) or value == "" or value is None:
                    return default
                return int(float(value))
            except (ValueError, TypeError):
                return default
        
        def safe_get_float(value, default=0.0):
            try:
                if pd.isna(value) or value == "" or value is None:
                    return default
                return float(value)
            except (ValueError, TypeError):
                return default
        
        def safe_get_str(value, default=""):
            try:
                if pd.isna(value) or value is None:
                    return default
                return str(value).strip()
            except (ValueError, TypeError):
                return default
        
        # Build specs dictionary with year included
        specs = {
            # Basic Information
            "Brand": safe_get_str(car.get("Brand", "")),
            "Model": safe_get_str(car.get("Model", "")),
            "BodyType": safe_get_str(car.get("Body_Type", "")),
            "Variant": safe_get_str(car.get("Variant", "")),
            "Year": safe_get_int(car.get("Year", 0)),
            
            # Performance Specifications
            "Horsepower": safe_get_int(car.get("Horsepower", 0)),
            "Engine": safe_get_str(car.get("Engine", "")),
            "Transmission": safe_get_str(car.get("Transmission", "")),
            "DriveTrain": safe_get_str(car.get("Drive_Train", "")),
            "FuelType": safe_get_str(car.get("Fuel_Type", "")),
            
            # Utility Specifications
            "GroundClearance": safe_get_float(car.get("Ground_Clearance", 0)),
            "Cargospace": safe_get_float(car.get("Cargo_space", 0)),
            "SeatingCapacity": safe_get_int(car.get("Seating_Capacity", 0)),
            
            # Pricing
            "Price": safe_get_float(car.get("Price", 0)),
            
            # Image
            "Image": find_car_image(safe_get_str(car.get("Model", "")))
        }
        
        # Log the specs for debugging
        app.logger.info(f"Specs for {variant} ({year}): {specs}")
        
        # Validate that we have essential data
        if not specs["Brand"] and not specs["Model"]:
            app.logger.warning(f"Car found but missing essential data for variant: {variant}")
            return jsonify({"error": "Car data incomplete"}), 404
        
        return jsonify(specs)
        
    except Exception as e:
        app.logger.error(f"Error getting specs for variant {variant}, year {year}: {e}")
        import traceback
        app.logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to get specifications: {str(e)}"}), 500

# ENHANCED: Debug endpoint to check data structure
@app.route('/debug/car_data')
def debug_car_data():
    """Debug endpoint to check CSV data structure"""
    if df.empty:
        return jsonify({"error": "No data loaded"})
    
    try:
        debug_info = {
            "total_records": len(df),
            "columns": list(df.columns),
            "data_types": df.dtypes.to_dict(),
            "sample_record": df.iloc[0].to_dict() if len(df) > 0 else {},
            "unique_brands": df["Brand"].unique().tolist(),
            "unique_models": df["Model"].unique().tolist()[:10],  # First 10
            "unique_variants": df["Variant"].unique().tolist()[:10],  # First 10
            "price_range": {
                "min": float(df["Price"].min()) if "Price" in df.columns else 0,
                "max": float(df["Price"].max()) if "Price" in df.columns else 0
            }
        }
        
        return jsonify(debug_info)
        
    except Exception as e:
        return jsonify({"error": str(e)})

# ENHANCED: Test endpoint for compare functionality
@app.route('/test/compare')
def test_compare():
    """Test endpoint to verify compare functionality"""
    try:
        # Get a sample variant for testing
        if df.empty:
            return jsonify({"error": "No data available"})
        
        sample_variant = df["Variant"].iloc[0] if len(df) > 0 else None
        
        if not sample_variant:
            return jsonify({"error": "No variants available"})
        
        # Test the get_specs functionality
        test_result = {
            "sample_variant": sample_variant,
            "brands_count": len(df["Brand"].unique()),
            "models_count": len(df["Model"].unique()),
            "variants_count": len(df["Variant"].unique()),
            "test_specs_url": f"/get_specs?variant={sample_variant}"
        }
        
        return jsonify(test_result)
        
    except Exception as e:
        return jsonify({"error": str(e)})
    
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
        max_price = request.args.get("max_price", type=int, default=25000000)
        
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
# Compare function #
####################

@app.route('/get_brands', methods=['GET'])
def get_brands():
    """Get all available brands from the CSV data"""
    if df.empty:
        app.logger.warning("No car data available for brands")
        return jsonify([])
    
    try:
        brands = df["Brand"].dropna().unique().tolist()
        brands.sort()  # Sort alphabetically
        app.logger.info(f"Retrieved {len(brands)} brands")
        return jsonify(brands)
    except Exception as e:
        app.logger.error(f"Error getting brands: {e}")
        return jsonify([])

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
           
@app.route('/debug/csv-status')
def debug_csv_status():
    """Quick debug to see CSV loading status"""
    import os
    
    # Check DataFrame status
    df_status = {
        "df_empty": df.empty,
        "df_shape": df.shape if not df.empty else "Empty",
        "df_columns": list(df.columns) if not df.empty else []
    }
    
    # Check file existence
    file_checks = {}
    possible_paths = [
        'car_data.csv',
        './car_data.csv', 
        'static/car_data.csv',
        'data/car_data.csv'
    ]
    
    for path in possible_paths:
        file_checks[path] = {
            "exists": os.path.exists(path),
            "size": os.path.getsize(path) if os.path.exists(path) else 0
        }
    
    # Check current directory
    directory_info = {
        "current_dir": os.getcwd(),
        "files_in_current_dir": os.listdir('.') if os.path.exists('.') else []
    }
    
    return jsonify({
        "dataframe_status": df_status,
        "file_checks": file_checks,
        "directory_info": directory_info,
        "app_root_path": app.root_path if hasattr(app, 'root_path') else "Unknown"
    })
    
@app.route('/get_colors')
def get_colors():
    """Placeholder for car color variants - currently not implemented"""
    model = request.args.get('model', '')
    app.logger.info(f"Color variants requested for model: {model}")
    
    # For now, return empty array since this feature isn't implemented yet
    return jsonify([])

@app.route('/favicon.ico')
def favicon():
    """Handle favicon requests to prevent 404 errors"""
    from flask import Response
    return Response(status=204)  # No content response

###################
# Car Brand Logos #
###################
@app.route('/static/brand_logo/<path:filename>')
def serve_brand_logo(filename):
    """Serve brand logo files"""
    try:
        # Path to your brand_logo folder
        brand_logo_path = os.path.join(app.root_path, 'brand_logo')
        
        # Check if the brand_logo directory exists
        if not os.path.exists(brand_logo_path):
            app.logger.warning(f"Brand logo directory not found: {brand_logo_path}")
            return "Brand logo directory not found", 404
        
        # Check if the specific file exists
        file_path = os.path.join(brand_logo_path, filename)
        if not os.path.exists(file_path):
            app.logger.warning(f"Brand logo file not found: {file_path}")
            # Return a default logo or 404
            return "Logo not found", 404
        
        app.logger.info(f"Serving brand logo: {filename}")
        return send_from_directory(brand_logo_path, filename)
        
    except Exception as e:
        app.logger.error(f"Error serving brand logo {filename}: {e}")
        return "Error serving logo", 500

############################
# Enhanced debug endpoints #
############################
@app.route('/debug/csv-detailed')
def debug_csv_detailed():
    """Detailed CSV debug information"""
    global df
    
    debug_info = {
        "csv_loaded": not df.empty,
        "csv_shape": df.shape if not df.empty else None,
        "csv_columns": list(df.columns) if not df.empty else [],
        "csv_dtypes": df.dtypes.to_dict() if not df.empty else {},
        "sample_data": df.head().to_dict() if not df.empty else None,
        "brand_counts": df['Brand'].value_counts().to_dict() if not df.empty and 'Brand' in df.columns else {},
        "fuel_type_counts": df['Fuel_Type'].value_counts().to_dict() if not df.empty and 'Fuel_Type' in df.columns else {},
        "null_counts": df.isnull().sum().to_dict() if not df.empty else {}
    }
    
    return jsonify(debug_info)

@app.route('/debug/reload-csv-enhanced')
def debug_reload_csv_enhanced():
    """Reload CSV with enhanced logging"""
    global df
    
    try:
        success = load_csv_data_enhanced()
        
        return jsonify({
            "success": success,
            "dataframe_shape": df.shape if not df.empty else None,
            "dataframe_columns": list(df.columns) if not df.empty else [],
            "brand_counts": df['Brand'].value_counts().to_dict() if not df.empty and 'Brand' in df.columns else {},
            "sample_data": df.head().to_dict() if not df.empty else None
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })

@app.route('/debug/files')
def debug_files():
    """Check what files exist on the server"""
    import os
    
    debug_info = {
        "current_directory": os.getcwd(),
        "directory_contents": [],
        "csv_file_checks": {},
        "environment": os.environ.get('RAILWAY_ENVIRONMENT', 'unknown')
    }
    
    # List all files in current directory
    try:
        for item in os.listdir('.'):
            item_path = os.path.join('.', item)
            debug_info["directory_contents"].append({
                "name": item,
                "is_file": os.path.isfile(item_path),
                "is_dir": os.path.isdir(item_path),
                "size": os.path.getsize(item_path) if os.path.isfile(item_path) else 0
            })
    except Exception as e:
        debug_info["directory_error"] = str(e)
    
    # Check specific CSV file locations
    csv_locations = [
        'car_data.csv',
        './car_data.csv',
        'static/car_data.csv',
        'data/car_data.csv'
    ]
    
    for location in csv_locations:
        debug_info["csv_file_checks"][location] = {
            "exists": os.path.exists(location),
            "size": os.path.getsize(location) if os.path.exists(location) else 0,
            "is_readable": os.access(location, os.R_OK) if os.path.exists(location) else False
        }
    
    return jsonify(debug_info)  

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
    
@app.route('/test-db-connection')
def test_db_connection():
    """Test database connection"""
    try:
        if not realtime_db_ref:
            return jsonify({"error": "realtime_db_ref is None"}), 500
        
        # Try a simple read operation
        test_ref = realtime_db_ref.child('test')
        test_data = test_ref.get()
        
        return jsonify({
            "status": "success",
            "message": "Database connection working",
            "realtime_db_ref_exists": realtime_db_ref is not None,
            "test_data": test_data
        }), 200
        
    except Exception as e:
        return jsonify({
            "error": str(e),
            "realtime_db_ref_exists": realtime_db_ref is not None
        }), 500