# BE-SMART
This is for the development of Backend for the VRP Algorithm and Smart Scan Technology

pip install requirements.txt

backend
cd backend
python -m venv venv
.venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
http://localhost:8000/health

frontend
cd frontend
npm install expo

npx expo start