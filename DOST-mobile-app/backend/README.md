cd backend 
python -m venv venv 

  .venv\Scripts\activate 

uvicorn main:app --reload --host 0.0.0.0 --port 8082 

http://localhost:8000/health

frontend/mobile app

cd frontend 

npm install expo

npx expo start

.env

EXPO_PUBLIC_API_URL=http://192.168.1.122:8082