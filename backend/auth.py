from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import sqlite3
import pandas as pd
import os
import joblib
import sklearn
from sklearn import __version__ as sklearn_version
from packaging import version
from backend.database import add_user, verify_user, init_db
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize database
init_db()

# Version check
required_version = "1.3.0"
current_version = sklearn_version
if version.parse(current_version) != version.parse(required_version):
    print(f"Warning: Current scikit-learn version ({current_version}) does not match required version ({required_version})")
    print("Please run: pip install scikit-learn==1.3.0")
    exit(1)

# Paths
db_path = os.getenv('DATABASE_URL', r'C:\Users\HP\Documents\Projects Data\ML Project\user_database.db')
model_path = os.getenv('MODEL_PATH', r'C:\Users\HP\Documents\Projects Data\ML Project\tree_model.pkl')
output_path = os.path.join(os.getcwd(), 'student_risk_report.xlsx')
expected_columns = ['health', 'attendance', 'scholarship', 'gpa1', 'gpa2', 'gpa3', 'cgpa']

# Load model
try:
    model = joblib.load(model_path)
    print(f"Model loaded successfully! Using sklearn version: {sklearn_version}")
except FileNotFoundError:
    print(f"Error: Model file not found at {model_path}. Please check the path.")
    model = None
except Exception as e:
    print(f"Error loading model: {str(e)}")
    model = None

@app.route("/")
def home():
    return "Welcome to the Student Risk Prediction System!"

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        username = data.get('username')
        password = data.get('password')
        if not username or not password:
            return jsonify({'error': 'Missing required fields'}), 400
        if add_user(username, password):
            return jsonify({'message': 'Registration successful'}), 201
        else:
            return jsonify({'error': 'Username already exists'}), 409
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': 'Server error during registration'}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        username = data.get('username')
        password = data.get('password')
        if not username or not password:
            return jsonify({'error': 'Missing credentials'}), 400
        if verify_user(username, password):
            return jsonify({'message': 'Login successful'}), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'Server error during login'}), 500

@app.route("/predict", methods=["POST"])
def predict_risk():
    if not model:
        return jsonify({"message": "Model not loaded. Check the model file."}), 500

    if 'file' not in request.files:
        return jsonify({"message": "No file provided"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    if not file.filename.endswith('.xlsx'):
        return jsonify({"message": "Invalid file type. Please upload an Excel file."}), 400

    try:
        df = pd.read_excel(file)
        if not all(col in df.columns for col in expected_columns):
            return jsonify({"message": "Column mismatch. Please upload a file with the correct columns."}), 400

        # Mapping
        health_mapping = {"Stable": 2, "Unstable": 1, "Critical": 0}
        attendance_mapping = {"Excellent": 2, "Good": 1, "Poor": 0}
        scholarship_mapping = {"Safe": 2, "Uncertain": 1, "Endangered": 0}

        df["health"] = df["health"].map(health_mapping).fillna(0).astype(int)
        df["attendance"] = df["attendance"].map(attendance_mapping).fillna(0).astype(int)
        df["scholarship"] = df["scholarship"].map(scholarship_mapping).fillna(0).astype(int)

        for col in ['gpa1', 'gpa2', 'gpa3', 'cgpa']:
            df[col] = pd.to_numeric(df[col], errors='coerce')

        predictions = model.predict(df[expected_columns])
        df['Risk'] = predictions

        # Reverse mapping
        df["health"] = df["health"].map({2: "Stable", 1: "Unstable", 0: "Critical"})
        df["attendance"] = df["attendance"].map({2: "Excellent", 1: "Good", 0: "Poor"})
        df["scholarship"] = df["scholarship"].map({2: "Safe", 1: "Uncertain", 0: "Endangered"})
        df["Risk"] = df["Risk"].map({2: "Low Risk", 1: "Moderate Risk", 0: "High Risk"})

        df.to_excel(output_path, index=False)

        return jsonify({
            "message": "Prediction completed. Click 'Download' and check your Downloads folder.",
            "status": "success",
            "download_url": "/download"
        }), 200

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"message": f"Error processing file: {str(e)}"}), 500

@app.route("/download", methods=["GET"])
def download_file():
    try:
        if os.path.exists(output_path):
            return send_file(
                output_path,
                as_attachment=True,
                download_name="student_risk_report.xlsx",
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        else:
            return jsonify({"message": "File not found"}), 404
    except Exception as e:
        return jsonify({"message": f"Error downloading file: {str(e)}"}), 500

@app.route("/visualization", methods=["POST"])
def visualization():
    if 'file' not in request.files:
        return jsonify({"message": "No file provided"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    if not file.filename.endswith('.xlsx'):
        return jsonify({"message": "Invalid file type. Please upload an Excel file."}), 400

    try:
        df = pd.read_excel(file)
        risk_counts = df['Risk'].value_counts().to_dict()
        health_risk = df.groupby(['health', 'Risk']).size().reset_index(name='count').to_dict('records')
        attendance_risk = df.groupby(['attendance', 'Risk']).size().reset_index(name='count').to_dict('records')
        scholarship_risk = df.groupby(['scholarship', 'Risk']).size().reset_index(name='count').to_dict('records')
        gpa_data = df[['cgpa', 'Risk']].to_dict('records')
        performance_stats = df.groupby('Risk')['cgpa'].agg(['mean', 'min', 'max']).reset_index().to_dict('records')
        risk_trend = df['Risk'].value_counts().sort_index().to_dict()

        combined_metrics = {
            'health': health_risk,
            'attendance': attendance_risk,
            'scholarship': scholarship_risk
        }

        data = {
            'risk_distribution': risk_counts,
            'health_stats': health_risk,
            'attendance_stats': attendance_risk,
            'gpa_data': gpa_data,
            'scholarship_stats': scholarship_risk,
            'performance_stats': performance_stats,
            'risk_trend': risk_trend,
            'combined_metrics': combined_metrics
        }

        return jsonify({
            "message": "Visualization data generated successfully",
            "data": data
        }), 200

    except Exception as e:
        print(f"Error in visualization: {str(e)}")
        return jsonify({"message": f"Error generating visualization data: {str(e)}"}), 500

@app.route('/users', methods=['GET'])
def get_users():
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT id, username, password FROM users')
        users = cursor.fetchall()
        conn.close()

        return jsonify({
            'message': 'Users retrieved successfully',
            'users': [{'id': u[0], 'username': u[1], 'password_hash': u[2]} for u in users],
            'total_users': len(users)
        }), 200

    except Exception as e:
        print(f"Error retrieving users: {e}")
        return jsonify({'error': 'Failed to retrieve users'}), 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
