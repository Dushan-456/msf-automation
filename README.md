# MSF Automation

**MSF Automation** is a full-stack web application designed to automate SurveyMonkey workflows. It allows users to bulk-create surveys and send them to doctors by simply uploading a CSV file, or process individual entries manually. The system features a responsive frontend and a robust backend that handles background processing, tracks job progress, and interacts with the SurveyMonkey API.

## 🚀 Features

### Core Functionality
- **Automated Survey Creation**: Upload a CSV file containing doctor details (`doctorName`, `trainerName`, `specialty`, `level`, `emails`) to automatically generate and distribute surveys in the background.
- **Manual Entry**: Form-based direct submission for a single doctor's survey.
- **Live Job Tracking**: Real-time progress monitoring for bulk survey creation jobs.
- **Survey Management**: View all created surveys with pagination and search functionality.
- **Reminders**: Automatically send reminder emails to non-respondents for specific surveys.

### Technical Highlights
- **Dockerized Environment**: Fully containerized using `docker-compose` for an easy and consistent setup across development and production environments.
- **Asynchronous Processing**: Uses background tasks to process large CSV files without blocking the main event loop.
- **Modern Tech Stack**: React and Vite on the frontend, Express and Node.js on the backend.

---

## 🛠️ Tech Stack

**Frontend**
- React 19
- Vite
- Tailwind CSS
- React Router DOM
- Lucide React (Icons)
- React Dropzone (File Upload)

**Backend**
- Node.js
- Express.js
- Multer & CSV-Parser (File handling and processing)
- Axios (HTTP client for SurveyMonkey API)

**Infrastructure**
- Docker & Docker Compose

---

## 🏗️ Project Structure

```text
msf-automation/
├── Backend/                 # Node.js + Express Application
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── routes/          # API route definitions
│   │   └── services/        # Background jobs & SurveyMonkey API logic
│   ├── package.json
│   ├── server.mjs           # Entry point
│   └── Dockerfile
├── Frontend/                # React + Vite Application
│   ├── src/
│   │   ├── components/      # Reusable UI components (Sidebar, etc.)
│   │   ├── pages/           # Page views (AutomatedCreation, AllSurveys)
│   │   ├── App.jsx          # Main application component
│   │   └── main.jsx         # Entry point
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml       # Docker services configuration
```

---

## 🚦 Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed on your machine.
- Optional: Node.js (v18+) if you wish to run the project without Docker.

### Running with Docker (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Dushan-456/msf-automation
   cd msf-automation
   ```

2. **Configure Environment Variables:**
   - Create a `.env` file in the `Backend` directory and populate it with your SurveyMonkey API credentials and any other required configurations:
     ```env
     PORT=5000
     SM_ACCESS_TOKEN=access token
     FRONTEND_URL=http://localhost:5173
     BASE_TEMPLATE_ID=your_template_id
     TARGET_FOLDER_ID=your_target_folder_id
     ```

3. **Start the containers:**
   Run the following command in the root directory:
   ```bash
   docker-compose up --build
   ```
   > **Note:** The backend service runs on `http://localhost:5000` and the frontend proxy maps to `http://localhost:3000`.

4. **Access the application:**
   Open your browser and navigate to `http://localhost:3000`.

---

## 💡 Usage

### Uploading a CSV for Automation
1. Navigate to the **Automated Creation** page on the frontend sidebar.
2. Ensure your CSV has headers exactly matching: `doctorName`, `trainerName`, `specialty`, `level`, `emails`.
3. Drag and drop the CSV file or click to upload.
4. The system will process the file, start the SurveyMonkey automation in the background, and track its progress visually.

### Managing Surveys
1. Navigate to the **All Surveys** page.
2. View existing surveys, use the search feature to find specific doctors, and interact with options such as sending reminders to non-respondents.

---

## 🔌 API Endpoints (Backend)

The main API endpoints defined under `/api/v1/`:

- `POST /automate-surveys`: Upload a CSV to start the background automation job.
- `GET /status/:jobId`: Fetch the live status and progress of a background job.
- `GET /surveys`: Retrieve a paginated list of all managed surveys.
- `POST /surveys/:surveyId/reminders`: Send reminders to users who haven't completed a given survey.
- `POST /automate-manual`: Submit JSON data to process a single manual survey entry.
- `GET /api/health`: Health check endpoint.



