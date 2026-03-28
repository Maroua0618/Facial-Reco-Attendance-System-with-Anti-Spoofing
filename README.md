# 📂 Secure Face Recognition Attendance System - File Structure

## 🎨 FRONTEND (React)

### `App.jsx`
**Purpose:** Main application router  
**Responsibilities:**
- Controls navigation between core pages (Home, Register, Attendance)
- Defines route structure using React Router
- Sets up main application wrapper and global state providers

### `pages/Home.jsx`
**Purpose:** Landing page with main menu  
**Responsibilities:**
- Displays welcome interface with two action buttons
- Handles navigation to Register and Attendance pages
- Shows system status and quick statistics

### `pages/Register.jsx`
**Purpose:** Student registration interface  
**Responsibilities:**
- Collects student information (name, group)
- Integrates camera feed for face capture
- Sends registration data to backend API
- Provides visual feedback during registration process

### `pages/Attendance.jsx`
**Purpose:** Attendance tracking interface  
**Responsibilities:**
- Renders dropdowns for week (1-14) and group selection
- Manages attendance session lifecycle (start/stop)
- Displays real-time recognition results
- Shows live feedback for each detected face

### `components/CameraFeed.jsx`
**Purpose:** Webcam handling component  
**Responsibilities:**
- Accesses user webcam via MediaDevices API
- Manages video stream lifecycle
- Captures and sends frames to backend at configurable intervals
- Handles camera errors and permissions

### `components/StudentForm.jsx`
**Purpose:** Reusable form component  
**Responsibilities:**
- Manages input fields for name and group
- Implements client-side validation
- Handles form state and submission
- Provides error messages and success feedback

### `services/api.js`
**Purpose:** API communication layer  
**Responsibilities:**
- Centralizes all backend API calls
- Manages request/response interceptors
- Handles error handling and retry logic
- Provides typed API methods for registration and attendance

---

## ⚙️ BACKEND (Flask)

### `app.py`
**Purpose:** Application entry point  
**Responsibilities:**
- Initializes Flask application
- Configures CORS, middleware, and extensions
- Registers all route blueprints
- Starts the development/production server

### `routes/register.py`
**Purpose:** Registration endpoint handler  
**Responsibilities:**
- Processes POST requests to `/register`
- Validates incoming registration data
- Triggers face embedding generation
- Orchestrates student data storage

### `routes/attendance.py`
**Purpose:** Attendance session management  
**Responsibilities:**
- Handles attendance session initialization
- Processes individual frame submissions
- Coordinates face detection, anti-spoofing, and recognition
- Returns real-time attendance decisions

---

## 🧠 SERVICES (Business Logic)

### `services/face_service.py`
**Purpose:** Face recognition orchestration  
**Responsibilities:**
- Manages face detection pipeline
- Generates and compares face embeddings
- Integrates with AI models for recognition
- Handles caching for performance optimization

### `services/anti_spoofing.py`
**Purpose:** Liveness detection service  
**Responsibilities:**
- Loads and manages anti-spoofing model
- Preprocesses frames for model input
- Determines authenticity of detected faces
- Logs spoofing attempts for security audit

---

## 🤖 AI MODULE (Machine Learning)

### `ai/face_model/embeddings.py`
**Purpose:** Face embedding generation  
**Responsibilities:**
- Loads pretrained face recognition model
- Converts face images to 128/512-dimension vectors
- Normalizes embeddings for consistent comparison
- Handles batch processing for efficiency

### `ai/face_model/recognition.py`
**Purpose:** Face matching logic  
**Responsibilities:**
- Implements similarity metrics (cosine, Euclidean)
- Finds closest match in student database
- Applies threshold-based decision making
- Handles unknown face identification

### `ai/anti_spoofing/predict.py`
**Purpose:** Liveness prediction wrapper  
**Responsibilities:**
- Loads and initializes anti-spoofing model
- Preprocesses frames for model inference
- Runs prediction and returns confidence scores
- Handles model warmup and optimization

### `ai/anti_spoofing/model.h5`
**Purpose:** Pretrained liveness detection model  
**Model Architecture:**
- CNN-based classifier trained on real/fake face datasets
- Distinguishes between live faces, printed photos, and screen displays
- Optimized for real-time inference on CPU/GPU

---

## 🗄️ DATABASE LAYER

### `database/db.py`
**Purpose:** Database connection management  
**Responsibilities:**
- Creates and manages SQLite connections
- Provides connection pooling for concurrent requests
- Implements context managers for transaction handling
- Handles connection cleanup and error recovery

### `models/student.py`
**Purpose:** Student data operations  
**Responsibilities:**
- Defines Student model schema
- Implements CRUD operations for student records
- Handles embedding serialization/deserialization
- Provides query methods for filtering by group

### `models/attendance.py`
**Purpose:** Attendance record management  
**Responsibilities:**
- Defines Attendance model schema
- Implements attendance marking logic
- Provides aggregation queries for reporting
- Handles bulk operations for performance

---

## 📊 DATA FILES

### `data/embeddings.pkl`
**Purpose:** Serialized embedding cache  
**Format:** Python pickle dictionary  
**Content:** 
- Student ID to embedding vector mappings
- Timestamps for cache invalidation
- Metadata for version control

### `data/attendance_records.csv`
**Purpose:** Attendance backup/export  
**Format:** CSV with headers  
**Fields:**
- student_id, name, group, week, status, timestamp
- Used for offline analysis and data migration

---

## ⚙️ CONFIGURATION

### `config/config.py`
**Purpose:** Central configuration management  
**Configuration Sections:**
```python
# Database settings
DB_PATH = "database.db"
DB_BACKUP_INTERVAL = 3600

# Face recognition settings
FACE_THRESHOLD = 0.6
EMBEDDING_DIM = 128

# Anti-spoofing settings
SPOOF_THRESHOLD = 0.5
MODEL_PATH = "ai/anti_spoofing/model.h5"

# Camera settings
CAMERA_INDEX = 0
FRAME_SKIP = 2  # Process every nth frame

# API settings
API_HOST = "0.0.0.0"
API_PORT = 5000
