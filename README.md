# flashcards-server

Node/Express/TypeScript backend for the flashcards app.

## Run locally

```bash
npm install
npm run server
```

Server runs on **http://localhost:5001**

## Deploy (Render)

Build command: `npm install && npm run build`
Start command: `npm start`

## Environment variables (.env)

```
ATLAS_URI=...
MONGO_DB=flashcards
MONGO_COLLECTION=flash1
PORT=5001
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /cards?viewer=&subjectId=&topicId= | Get cards |
| POST | /cards/add | Add card |
| PUT | /cards/:id | Update card |
| PATCH | /cards/:id/progress | Update progress color |
| DELETE | /cards/:id | Delete card |
| GET | /subjects | Get all top-level subjects |
| GET | /topics?subjectId= | Get topics for a subject |
| POST | /subjects | Create subject or topic |
| PUT | /subjects/:id | Rename subject/topic |
| DELETE | /subjects/:id | Delete subject and its topics |
| POST | /upload | Upload image to Cloudinary |
