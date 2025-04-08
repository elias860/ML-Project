import sqlite3
import os
import hashlib
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the database path
db_path = os.getenv('DATABASE_URL', 'user_database.db')
# Make path absolute if it isn't already
if not os.path.isabs(db_path):
    db_path = os.path.join(os.path.dirname(__file__), db_path)

def init_db():
    try:
        # Create database directory if it doesn't exist
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        logger.info(f"Database directory created/verified at {os.path.dirname(db_path)}")

        # Create database connection
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Create users table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
        ''')

        # Commit and close
        conn.commit()
        conn.close()
        logger.info(f"Database and users table created successfully at {db_path}")
        return True
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        return False

def add_user(username, password):
    try:
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, password_hash))
        conn.commit()
        conn.close()
        logger.info(f"User {username} added successfully")
        return True
    except sqlite3.IntegrityError:
        logger.warning(f"Username {username} already exists")
        return False
    except Exception as e:
        logger.error(f"Error adding user: {str(e)}")
        return False

def verify_user(username, password):
    try:
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE username=? AND password=?', (username, password_hash))
        user = cursor.fetchone()
        conn.close()
        if user:
            logger.info(f"User {username} verified successfully")
        else:
            logger.warning(f"Failed verification for user {username}")
        return user is not None
    except Exception as e:
        logger.error(f"Error verifying user: {str(e)}")
        return False