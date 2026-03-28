# Devhive

A developer networking backend — connect with other developers, manage your profile, and send/receive connection requests.

## Tech Stack

- **Runtime:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (cookie-based) + bcryptjs

## Getting Started

```bash
npm install
npm start
```

Server runs on `http://localhost:3009`. Frontend expected at `http://localhost:5173`.

## Environment Variables

```env
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
MONGO_URI=your_mongodb_connection_string
```

## API Reference

### Auth — `/api/auth`

| Method | Endpoint   | Description                        |
|--------|------------|------------------------------------|
| POST   | `/signup`  | Register a new user                |
| POST   | `/login`   | Login, returns JWT cookie          |
| POST   | `/logout`  | Clear JWT cookie and log out       |

### Profile — `/api/profile`

| Method | Endpoint          | Description                        |
|--------|-------------------|------------------------------------|
| GET    | `/view`           | Get my own profile                 |
| GET    | `/view/:userId`   | Get any user's profile by ID       |
| PATCH  | `/edit`           | Update profile fields              |

**Editable fields:** `firstName`, `lastName`, `age`, `gender`, `photo`, `skills`, `about`

### Requests — `/api/request`

| Method | Endpoint                        | Description                              |
|--------|---------------------------------|------------------------------------------|
| POST   | `/send/:status/:toUserId`       | Send a connection request (`interested` or `ignored`) |
| POST   | `/review/:status/:requestId`    | Accept or reject a received request (`accepted` or `rejected`) |

### User — `/api/user`

| Method | Endpoint              | Description                                      |
|--------|-----------------------|--------------------------------------------------|
| GET    | `/connections`        | Get all mutual connections                       |
| GET    | `/requests/received`  | Get all pending connection requests sent to me   |
| GET    | `/feed`               | Get paginated list of users to discover          |

**Feed query params:** `?page=1&limit=10` (max limit: 50)
