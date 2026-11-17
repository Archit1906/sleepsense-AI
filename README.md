# SleepSense AI (backend core)

Windows:
  cd backend
  python -m venv venv
  venv\Scripts\activate
  pip install -r requirements.txt
  python test_hmm.py
  python app.py   (http://localhost:5000/api/health)

Frontend (second terminal):
  cd frontend
  npm install
  npm run dev     (open http://localhost:5173; /api is proxied to Flask on port 5000)
