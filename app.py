from flask import Flask, request, jsonify, redirect, render_template, send_from_directory, session, url_for
from flask_cors import CORS 
import pandas as pd
import json
import requests
import firebase_admin
from firebase_admin import credentials, auth, firestore
import numpy as np
import os

app = Flask(__name__)
CORS(app)

app.secret_key = os.environ.get('SECRET_KEY', 'fallback_secret_key')

# Load configuration safely
try:
    app.config.from_pyfile('config.py')
except:
    print("⚠️ config.py not found, using environment variables")

# Initialize Firebase safely
try:
    # Load serviceAccountKey.json
    if 'SERVICE_ACCOUNT_KEY_JSON' in os.environ:
        service_account = json.loads(os.environ['SERVICE_ACCOUNT_KEY_JSON'])
        cred = credentials.Certificate(service_account)
    else:
        cred = credentials.Certificate('serviceAccountKey.json')
    
    print("✅ Firebase credentials initialized.")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f"❌ Firebase initialization failed: {e}")
    db = None

# Load Firebase config safely
try:
    if 'FIREBASE_CONFIG_JSON' in os.environ:
        firebase_config = json.loads(os.environ['FIREBASE_CONFIG_JSON'])
    else:
        with open('firebaseConfig.json') as f:
            firebase_config = json.load(f)
    
    api_key = firebase_config.get('apiKey')
except Exception as e:
    print(f"⚠️ Firebase config not loaded: {e}")
    firebase_config = {}
    api_key = None

# Load CSV data safely
try:
    df = pd.read_csv('car_data.csv', encoding='utf-8')
    
    # Ensure all relevant columns are strings before extraction
    df["Cargo_space"] = df["Cargo_space"].astype(str).str.extract("(\d+)", expand=False).astype(float)
    df["Ground_Clearance"] = df["Ground_Clearance"].astype(str).str.extract("([\d.]+)", expand=False).astype(float)
    df["Horsepower"] = df["Horsepower"].astype(str).str.extract("(\d+)", expand=False).astype(float)
    df["Price"] = pd.to_numeric(df["Price"], errors="coerce")
    
    print("✅ CSV data loaded successfully")
except Exception as e:
    print(f"❌ CSV loading failed: {e}")
    df = pd.DataFrame()  # Empty dataframe as fallback

@app.route('/')
def home():
    print("🔍 Rendering home page.")
    return render_template('index.html')

# Serve images from the "resources" folder
@app.route('/resources/<path:filename>')
def serve_resources(filename):
    return send_from_directory(os.path.join(app.root_path, 'resources'), filename)

@app.route('/firebase-config')
def get_firebase_config():
    if not firebase_config:
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
    return jsonify(client_config)

@app.route('/verify-token', methods=['POST'])
def verify_token():
    if not db:
        return jsonify({"status": "error", "message": "Database not available"}), 500
    
    try:
        data = request.get_json()
        id_token = data.get('idToken')
        email = data.get('email')
        
        if not id_token:
            return jsonify({"status": "error", "message": "No token provided"}), 400
        
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        
        session['user'] = uid
        session['email'] = email
        session['idToken'] = id_token
        
        app.logger.info(f"✅ User {email} logged in successfully.")
        return jsonify({"status": "success", "message": "Authentication successful"}), 200
        
    except firebase_admin.auth.InvalidIdTokenError:
        return jsonify({"status": "error", "message": "Invalid token"}), 401
    except Exception as e:
        app.logger.error(f"Token verification failed: {str(e)}")
        return jsonify({"status": "error", "message": "Authentication failed"}), 500

@app.route('/signup', methods=['POST'])
def signup():
    if not db:
        return jsonify({"status": "error", "message": "Database not available"}), 500
    
    email = request.form.get('email')
    password = request.form.get('password')

    if not email or not password:
        return jsonify({"status": "error", "message": "All fields are required."}), 400

    try:
        user = auth.get_user_by_email(email)
        return jsonify({"status": "error", "message": "Email already in use."}), 400
    except firebase_admin.auth.UserNotFoundError:
        pass

    try:
        user = auth.create_user(email=email, password=password)
        app.logger.info("✅ User signed up successfully.")
        return jsonify({"status": "success", "message": "User signed up successfully! Please log in."}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Signup failed: {str(e)}"}), 400

@app.route('/login', methods=['POST'])
def login():
    if not api_key:
        return jsonify({"status": False, "message": "Authentication not configured"}), 500
    
    email = request.form.get('email')
    password = request.form.get('password')

    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }

    response = requests.post(url, json=payload)
    if response.status_code == 200:
        user_data = response.json()
        session['user'] = user_data['localId']
        session['idToken'] = user_data['idToken']

        print("Logged in!")
        return jsonify({"status": True, "message": "Welcome back, ", "email": email}), 200
    else:
        print("Incorrect password!")
        return jsonify({"status": False, "message": "Incorrect credentials."}), 400

@app.route('/logout', methods=['POST'])
def logout():
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
        return jsonify({"error": "Database not available"}), 500
    
    if 'user' in session:
        user_id = session['user']
        favorites_ref = db.collection('users').document(user_id).collection('favorites')
        favorites = favorites_ref.stream()

        favorite_variants = []
        for favorite in favorites:
            favorite_variants.append(favorite.to_dict())

        return jsonify(favorite_variants)
    return jsonify({"error": "Not logged in"}), 401

@app.route('/get_cars', methods=['GET'])
def get_cars():
    if df.empty:
        return jsonify({"error": "Car data not available"}), 500
    
    app.logger.info("\n🔍 Received Filters:")

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

    filtered_df = df.copy()

    if brand and brand.lower() not in ["any", "all brands"]:
        filtered_df = filtered_df[filtered_df["Brand"].str.lower() == brand.lower()]
    
    if model and model.lower() != "any":
        filtered_df = filtered_df[filtered_df["Model"].str.lower() == model.lower()]
    
    if body_type:
        filtered_df = filtered_df[filtered_df["Body_Type"].str.lower() == body_type.lower()]

    if drive_train:
        filtered_df = filtered_df[filtered_df["Drive_Train"].str.lower().str.contains(drive_train.lower(), na=False)]
        
    if transmission:
        filtered_df = filtered_df[filtered_df["Transmission"].str.lower() == transmission.lower()]
    
    if fuel_type:
        filtered_df = filtered_df[filtered_df["Fuel_Type"].str.lower().str.contains(fuel_type.lower(), na=False)]

    filtered_df = filtered_df[
        (filtered_df["Horsepower"] >= min_hp) &
        (filtered_df["Cargo_space"] >= min_cargo) &
        (filtered_df["Price"] <= max_price) &
        (filtered_df["Ground_Clearance"] >= min_ground_clearance)
    ]
    
    if seating is not None and seating > 0:
        filtered_df = filtered_df[filtered_df["Seating_Capacity"] == seating]

    app.logger.info("\n📊 Filtered DataFrame:")
    print(filtered_df)

    filtered_cars = filtered_df.fillna("").to_dict(orient="records")
    return jsonify(filtered_cars)

@app.route('/get_all_models', methods=['GET'])
def get_all_models():
    if df.empty:
        return jsonify([])
    models = df["Model"].unique().tolist()
    return jsonify(models)

@app.route('/get_models', methods=['GET'])
def get_models():
    if df.empty:
        return jsonify([])
    
    brand = request.args.get("brand", "").strip()
    if not brand:
        return jsonify([])

    models = df[df["Brand"].str.lower() == brand.lower()]["Model"].unique().tolist()
    return jsonify(models)

@app.route('/get_variants', methods=['GET'])
def get_variants():
    if df.empty:
        return jsonify([])
    
    model = request.args.get("model", "").strip()
    if not model:
        return jsonify([])

    variants = df[df["Model"].str.lower() == model.lower()]["Variant"].unique().tolist()
    return jsonify(variants)

def find_colors(model):
    IMAGE_FOLDER = os.path.join(app.static_folder, "resources")
    if not os.path.exists(IMAGE_FOLDER):
        return []
    
    model = ''.join(e for e in model if e.isalnum())
    colors = []
    for filename in os.listdir(IMAGE_FOLDER):
        if filename.lower().startswith(model.lower()) and '_' in filename:
            color = filename.split('_')[1].split('.')[0]
            image_path = find_car_image(filename.split('.')[0])
            colors.append({"color": color, "image_path": image_path})
    return colors

@app.route('/get_colors', methods=['GET'])
def get_colors():
    model = request.args.get("model", "").strip()
    colors = find_colors(model)
    return jsonify(colors)

def find_car_image(model):
    IMAGE_FOLDER = os.path.join(app.static_folder, "resources")
    if not os.path.exists(IMAGE_FOLDER):
        return "/static/resources/tesr.png"
    
    model = ''.join(e for e in model if e.isalnum() or e == '_')
    print(model)
    for filename in os.listdir(IMAGE_FOLDER):
        if filename.lower().startswith(model.lower()):
            return f"/static/resources/{filename}"
    return "/static/resources/tesr.png"

@app.route('/get_specs', methods=['GET'])
def get_specs():
    if df.empty:
        return jsonify({"error": "Car data not available"}), 500
    
    variant = request.args.get("variant", "").strip()
    if not variant:
        return jsonify({})

    specs_df = df[df["Variant"].str.lower() == variant.lower()]
    if specs_df.empty:
        return jsonify({"error": "Variant not found"}), 404
    
    specs = specs_df.iloc[0]
    image_path = find_car_image(str(specs["Model"]))
    print(image_path)
    
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

    return jsonify(car_specs)

@app.route('/toggle-fave', methods=['POST'])
def toggle_fave():
    if not db:
        return jsonify({"error": "Database not available"}), 500
    
    if 'user' in session:
        user_id = session['user']
        variant = request.json.get('variant')
        liked = request.json.get('liked')

        favorites_ref = db.collection('users').document(user_id).collection('favorites')
        existing_fave = favorites_ref.where('variant', '==', variant).get()

        if existing_fave:
            if not liked:
                for fave in existing_fave:
                    favorites_ref.document(fave.id).delete()
                db.collection('users').document(user_id).update({'favourites': firestore.ArrayRemove([variant])})
                return jsonify({"status": "removed", "variant": variant, "liked": False}), 200
        else:
            if liked:
                favorites_ref.add({'variant': variant})
                return jsonify({"status": "added", "variant": variant, "liked": True}), 200

        return jsonify({"status": "no change", "variant": variant, "liked": liked}), 200
    else:
        return jsonify({"error": "User not logged in"}), 401

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)  # Set debug=False for production