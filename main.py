from flask import Flask, request, jsonify, redirect, render_template, send_from_directory, session
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
app.config.from_pyfile('config.py')

cred = credentials.Certificate('serviceAccountKey.json')  # Initialize Firebase credentials
print("✅ Firebase credentials initialized.")
firebase_admin.initialize_app(cred)

db = firestore.client()

# Load CSV data
df = pd.read_csv('car_data.csv', encoding='utf-8')

@app.route('/')  # Home route
def home():
    print("🔍 Rendering home page.")
    return render_template('index.html')  # Render the home page

# Serve images from the "resources" folder
@app.route('/resources/<path:filename>')
def serve_resources(filename):
    return send_from_directory(os.path.join(app.root_path, 'resources'), filename)

@app.route('/signup', methods=['POST'])  # Signup route
def signup():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        if not email or not password:
            return jsonify({"status": "error", "message": "All fields are required."}), 400

        try:
            # Check if user already exists
            user = auth.get_user_by_email(email)
            return jsonify({"status": "error", "message": "Email already in use."}), 400
        except firebase_admin.auth.UserNotFoundError:
            pass  # Proceed with user creation if not found

        try:
            # Create a new user in Firebase Authentication
            user = auth.create_user(
                email=email,
                password=password
            )
            app.logger.info("✅ User signed up successfully.")

            return jsonify({"status": "success", "message": "User signed up successfully! Please log in."}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": f"Signup failed: {str(e)}"}), 400


@app.route('/login', methods=['POST'])  # Login route
def login():
   if request.method == 'POST':
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
            session['user'] = user_data['localId']  # Use Firebase UID
            session['idToken'] = user_data['idToken']  # Store token for authentication

            print("Logged in!")
            return jsonify({"status": True, "message": "Welcome back, ", "email": email}), 200
        else:
            print("Incorrect password!")
            return jsonify({"status": False, "message": "Incorrect credentials."}), 400

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user', None)  
    return redirect('/login')  

with open('firebaseConfig.json') as f:
    firebase_config = json.load(f)
    api_key = firebase_config.get('apiKey')  # Extract API key if available

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


# Ensure all relevant columns are strings before extraction
df["Cargo_space"] = df["Cargo_space"].astype(str).str.extract("(\d+)", expand=False).astype(float)
df["Ground_Clearance"] = df["Ground_Clearance"].astype(str).str.extract("([\d.]+)", expand=False).astype(float)
df["Horsepower"] = df["Horsepower"].astype(str).str.extract("(\d+)", expand=False).astype(float)

# Ensure 'Price' is numeric
df["Price"] = pd.to_numeric(df["Price"], errors="coerce")

@app.route('/get-faves', methods=['POST'])  # Get favorites route
def get_faves():
    if 'user' in session:
        user_id = session['user']
        favorites_ref = db.collection('users').document(user_id).collection('favorites')
        favorites = favorites_ref.stream()

        favorite_variants = []
        for favorite in favorites:
            favorite_variants.append(favorite.to_dict())

        return jsonify(favorite_variants)  # Return the list of favorite variants

@app.route('/get_cars', methods=['GET'])  # Get cars route
def get_cars():
    # Debugging - Log received values
    app.logger.info("\n🔍 Received Filters:")  # Log received filters

    # Extract parameters safely with default values
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

    filtered_df = df.copy()  # Create a copy of the DataFrame for filtering


    # 🛠 Handle "Any" selection ("" means no filter applied)
    if brand and brand.lower() not in ["any", "all brands"]:  # Filter by brand if specified

        filtered_df = filtered_df[filtered_df["Brand"].str.lower() == brand.lower()]
    
    if model and model.lower() != "any":  # Filter by model if specified

        filtered_df = filtered_df[filtered_df["Model"].str.lower() == model.lower()]
    
    if body_type:  # Filter by body type if specified

        filtered_df = filtered_df[filtered_df["Body_Type"].str.lower() == body_type.lower()]

    if drive_train:  # Filter by drive train if specified

        filtered_df = filtered_df[filtered_df["Drive_Train"].str.lower().str.contains(drive_train.lower(), na=False)]
        
    if transmission:  # Filter by transmission if specified

        filtered_df = filtered_df[filtered_df["Transmission"].str.lower() == transmission.lower()]
    
    if fuel_type:  # Filter by fuel type if specified

        filtered_df = filtered_df[filtered_df["Fuel_Type"].str.lower().str.contains(fuel_type.lower(), na=False)]

    # 🏎 Apply numerical filters
    filtered_df = filtered_df[  # Apply numerical filters
        (filtered_df["Horsepower"] >= min_hp) &
        (filtered_df["Cargo_space"] >= min_cargo) &
        (filtered_df["Price"] <= max_price) &
        (filtered_df["Ground_Clearance"] >= min_ground_clearance)
    ]
    
    if seating is not None and seating > 0:  # Filter by seating capacity if specified

        filtered_df = filtered_df[filtered_df["Seating_Capacity"] == seating]


    # Debugging: Print filtered results
    app.logger.info("\n📊 Filtered DataFrame:")

    print(filtered_df)

    # Convert DataFrame to JSON
    filtered_cars = filtered_df.fillna("").to_dict(orient="records")

    return jsonify(filtered_cars)  # Return the filtered cars as JSON

@app.route('/get_all_models', methods=['GET'])
def get_all_models():
  models = df["Model"].unique().tolist()
  return jsonify(models)

@app.route('/get_models', methods=['GET'])
def get_models():
    brand = request.args.get("brand", "").strip()

    if not brand:
        return jsonify([])  # Return empty list if no brand is selected

    # Get unique models for the selected brand
    models = df[df["Brand"].str.lower() == brand.lower()]["Model"].unique().tolist()

    return jsonify(models)

@app.route('/get_variants', methods=['GET'])
def get_variants():
    model = request.args.get("model", "").strip()

    if not model:
        return jsonify([])  # Return empty list if no brand is selected

    # Get unique models for the selected brand
    variants = df[df["Model"].str.lower() == model.lower()]["Variant"].unique().tolist()

    return jsonify(variants)

IMAGE_FOLDER = os.path.join(app.static_folder, "resources")

def find_colors(model):
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
    model = ''.join(e for e in model if e.isalnum() or e == '_')
    print(model)
    for filename in os.listdir(IMAGE_FOLDER):
        if filename.lower().startswith(model.lower()):  # Case-insensitive match
            return f"/static/resources/{filename}"  # Return correct image path
    return "/static/resources/tesr.png"  # Fallback image if no match is found

@app.route('/get_specs', methods=['GET'])
def get_specs():
    variant = request.args.get("variant", "").strip()

    if not variant:
        return jsonify({})  # Return empty object if no variant is provided

    # Filter the dataframe to get the specifications of the given variant
    specs = df[df["Variant"].str.lower() == variant.lower()].iloc[0]
    
    image_path = find_car_image(str(specs["Model"]))
    print(image_path)
    # Create a dictionary with the required specifications
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
    if 'user' in session:
        user_id = session['user']
        variant = request.json.get('variant')  # Get the variant from the request
        liked = request.json.get('liked')  # Get the liked status from the request

        # Reference to the user's favorites in Firestore, ensuring user is logged in
        favorites_ref = db.collection('users').document(user_id).collection('favorites')

        # Check if the variant is already in favorites
        existing_fave = favorites_ref.where('variant', '==', variant).get()

        if existing_fave:
            # If it exists and liked is False, remove it
            if not liked:
                for fave in existing_fave:
                    favorites_ref.document(fave.id).delete()
                db.collection('users').document(user_id).update({'favourites': firestore.ArrayRemove([variant])})
                return jsonify({"status": "removed", "variant": variant, "liked": False}), 200  # Return status of removal
        else:
            # If it doesn't exist and liked is True, add it
            if liked:
                favorites_ref.add({'variant': variant})
                return jsonify({"status": "added", "variant": variant, "liked": True}), 200  # Return status of addition

        return jsonify({"status": "no change", "variant": variant, "liked": liked}), 200  # Return status if no change
    else:
        return jsonify({"error": "User not logged in"}), 401  # Return error if user is not logged in

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
