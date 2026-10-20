🚨 SUSPOT

Spot the danger. Send the alert. Save time.

SUSPOT is a smart mobile-web emergency reporting application developed for the Sime Darby Hackathon. Designed to bridge the critical gap between panicked bystanders and emergency dispatchers, the system leverages artificial intelligence to instantly analyze visual evidence, assess incident urgency, and route critical data to a centralized command dashboard in real-time.

Core Features
1. AI Visual Triage: Integrates the Google Gemini API to analyze user-uploaded photos, automatically categorizing the hazard (e.g., Fire & Hazards, Road Incident) and calculating an actionable priority level (High, Medium, or Low).

2. Forensic Fraud Detection: Prevents system abuse by cross-referencing the user's text description with the visual evidence to actively flag mismatched, AI-generated, or fake reports before they waste responder resources.

3. Dynamic Authority Dispatch: Adapts to the situation by prompting automated, animated dialing to the correct local authorities (e.g., 994 for Fire, 999 for Police) for life-threatening emergencies, while offering optional, non-intrusive contact actions for low-risk nuisances.

4. Real-Time Location Mapping: Utilizes device GPS and Leaflet mapping to instantly capture and attach precise street-level coordinates to every submitted report.

5. Centralized Admin Dashboard: Provides a live, organized feed for dispatchers to monitor incoming alerts, complete with timestamps, user notes, and structured AI situational summaries for immediate awareness before arriving on the scene.

Tech Stack
1. Frontend Framework: React.js (Bootstrapped with Vite)
2. Styling: Tailwind CSS
3. Mapping & Geolocation: Leaflet, React-Leaflet, OpenStreetMap API
4. Artificial Intelligence: Google Gemini API (Flash Model)
5. Icons: Lucide React
6. Deployment: Netlify

Running the Project Locally
If you want to run this project on your local machine, follow these steps:

1. Clone the repository:
git clone https://github.com/your-username/suspot.git
cd suspot

2. Install dependencies:
npm install

3. Set up your API Key:
Create a new file named .env in the root folder (next to package.json) and add your Google Gemini API key:
VITE_GEMINI_API_KEY=your_actual_api_key_here
(Note: The .env file is included in .gitignore and will not be uploaded to GitHub to protect your secret key).

4. Start the development server:
npm run dev

5. Open your browser:
Ctrl+Click the local link provided in the terminal (usually http://localhost:5173).

Developed for the Sime Darby Hackathon.
