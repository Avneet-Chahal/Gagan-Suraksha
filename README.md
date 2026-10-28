# 🛰️ Gagan Suraksha
### AI-Powered Satellite Collision Risk Monitoring & Space Situational Awareness

Gagan Suraksha is a space situational awareness project designed to analyze satellite conjunctions, monitor orbital objects, and assess potential collision risks using orbital data processing, historical conjunction records, and machine-learning-assisted severity analysis.

The goal is to help users identify potentially risky close approaches between space objects and present useful information through a unified dashboard.

## ✨ Key Features

- **Orbital Data Integration:** Designed to work with orbital data providers such as CelesTrak and other supported sources.
- **Historical Conjunction Analysis:** Processes historical conjunction records for analysis, validation, and model development.
- **Conjunction Screening:** Identifies potentially close approaches between tracked orbital objects.
- **ML-Assisted Severity Assessment:** Supports risk/severity analysis using available conjunction features.
- **Orbital Propagation:** Supports orbital position calculations using compatible orbital data and propagation tools.
- **Dashboard & API:** Connects backend processing with a frontend interface for presenting satellite and conjunction information.
- **Data Validation:** Includes tests for data ingestion, orbital providers, screening, persistence, and pipeline components.
- **Extensible Architecture:** Structured to support additional data sources, prediction methods, and monitoring capabilities.

> **Important:** A close approach is not necessarily a collision. Risk estimates depend on data quality, prediction uncertainty, and the availability of reliable conjunction information.

## 🧠 How It Works

1. **Collect orbital data** from configured orbital data providers.
2. **Load historical records** for analysis and validation.
3. **Process orbital information** and calculate or obtain relevant conjunction features.
4. **Screen close approaches** between tracked objects.
5. **Assess severity** using implemented rules and/or a trained model.
6. **Display results** through the application interface and backend API.

## 🏗️ Technology Stack

The project includes the following technologies and components, subject to the current implementation:

- **Backend:** Python, FastAPI/Uvicorn
- **Frontend:** TypeScript and a JavaScript-based frontend toolchain
- **Orbital Data:** CelesTrak and other configured providers
- **Orbital Mechanics:** SGP4-compatible propagation tools
- **Machine Learning:** Python-based model and severity pipeline
- **Testing:** Pytest
- **Version Control:** Git and GitHub

## 📂 Project Structure

```text
Gagan-Suraksha/
├── backend/
│   ├── app/
│   ├── main.py
│   └── ...
├── tests/
│   ├── test_api.py
│   ├── test_celestrak.py
│   ├── test_historical_ingestion.py
│   ├── test_historical_pipeline.py
│   ├── test_ml_integration.py
│   ├── test_orbit_propagation.py
│   ├── test_orbital_providers.py
│   └── ...
├── conjunctions_data.json
├── README.md
└── ...
```

*The structure above is illustrative. Some files and folders may differ in the current repository.*

## ⚙️ Getting Started

### Prerequisites

Install the following before running the project:

- Python 3.11 or another Python version supported by the project's dependencies
- Node.js and npm, if the frontend uses a Node-based toolchain
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Avneet-Chahal/Gagan-Suraksha.git
cd Gagan-Suraksha
```

### 2. Set Up the Python Environment

In PowerShell:

```powershell
python -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1
```

Install backend dependencies using the project's dependency file. For example, if `requirements.txt` exists inside `backend`:

```powershell
pip install -r backend\requirements.txt
```

If dependencies are declared in `pyproject.toml` or another file, follow that file instead.

### 3. Configure Environment Variables

Create a local `.env` file if the project requires API credentials or configuration.

Example:

```env
# Add only variables required by your application
# CELESTRAK_BASE_URL=
# SPACE_TRACK_USERNAME=
# SPACE_TRACK_PASSWORD=
```

Use the variable names expected by the actual application configuration. Never commit real credentials, API keys, or passwords to GitHub.

### 4. Start the Backend

Use the startup command documented by the backend's actual entry point. For a FastAPI application, the command may resemble:

```powershell
python -m uvicorn main:app --reload
```

Run this from the directory containing the relevant `main.py`, or use the module path required by the project's package structure.

If supported, open the interactive API documentation at:

```text
http://127.0.0.1:8000/docs
```

### 5. Start the Frontend

Navigate to the directory containing the frontend's `package.json`:

```powershell
cd frontend
npm install
npm run dev
```

If the frontend is located elsewhere, use that directory and its documented scripts. Open the local URL printed by the development server.

## 📊 Historical Data & Machine Learning

Historical conjunction records can help analyze close approaches and develop or evaluate severity-assessment methods.

Before using historical records for training:

- Validate timestamps, units, object identifiers, and missing values.
- Check for duplicate conjunction events and inconsistent records.
- Keep raw source data separate from cleaned and processed datasets.
- Use chronological or event-based train/validation/test splits to reduce data leakage.
- Evaluate the model against appropriate baselines.
- Report metrics only when they have actually been measured on a valid evaluation dataset.

**Scientific limitation:** Historical close approaches alone do not establish whether a collision occurred. Verified collision outcomes or defensible proxy labels are needed to train and evaluate a true collision-outcome classifier. Without them, the model should be described as a risk-ranking or severity-assessment system, not a proven collision predictor.

## 🧪 Testing

The repository contains tests covering components such as:

- API endpoints and application health
- Historical data ingestion and processing
- Orbital data providers
- Orbital propagation and SGP4
- Conjunction screening
- ML integration and severity assessment
- Persistence and end-to-end processing

Run the test suite from the directory containing the project's test configuration:

```powershell
python -m pytest -v
```

Use the project's configured Python environment and install the required test dependencies first. Actual test results should be verified before claiming that all tests pass.

## 🔐 Data Sources & Reliability

Gagan Suraksha is intended to use reliable orbital information from configured data providers.

- **CelesTrak:** Public orbital element data, subject to source availability and update frequency.
- **Historical conjunction datasets:** Used according to their documented fields, timestamps, units, and licensing terms.
- **Additional conjunction warning sources:** Integrate only when the provider offers suitable data and access.

Orbital elements alone do not provide every operational conjunction parameter, such as probability of collision or covariance-based uncertainty. Results should identify their source, data timestamp, and limitations wherever possible.

## 🚀 Future Improvements

- Improve automated orbital data refresh and stale-data detection.
- Expand historical event validation and data provenance.
- Add uncertainty-aware conjunction risk assessment where suitable inputs are available.
- Improve model evaluation with verified labels and leakage-resistant splits.
- Add monitoring, alerting, and notification workflows.
- Enhance visualization of orbital objects and close approaches.
- Improve deployment, documentation, and automated testing.

## 🤝 Contributing

Contributions and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes and add relevant tests.
4. Open a pull request describing the changes.

## ⚠️ Disclaimer

Gagan Suraksha is a research and development project. Its outputs should not be treated as authoritative collision warnings or as a replacement for validated conjunction
