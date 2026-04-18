# CineReserve

A full-stack movie ticket booking website built with React, Express, MongoDB, and Docker.

## Services

- `frontend`: React app served by Nginx on port `3000`
- `backend`: Express + MongoDB API on port `5000`
- `mongo`: MongoDB database on port `27017`

## Run with Docker

```bash
docker compose up --build
```

Open `http://localhost:3000`.

## API routes

- `GET /api/health`
- `GET /api/movies`
- `GET /api/bookings`
- `GET /api/stats`
- `POST /api/bookings`

## Local development

Frontend:

```bash
cd frontend
npm install
npm start
```

Optional frontend env for custom API host:

```bash
REACT_APP_API_BASE_URL=http://localhost:5000
```

Backend:

```bash
cd backend
npm install
npm run dev
```

MongoDB should be available at `mongodb://localhost:27017/movie_booking_app`.
