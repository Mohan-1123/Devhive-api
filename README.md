# Devhive

A developer networking backend — connect with other developers, manage your profile, chat in real-time, and unlock lifetime premium membership.

## Tech Stack

- **Runtime:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (cookie-based) + bcryptjs
- **Real-time:** Socket.IO
- **Payments:** Razorpay

## Getting Started

```bash
npm install
npm start
```

Server runs on `http://localhost:3009`. Frontend expected at `http://localhost:5173`.

## Environment Variables

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=xxxx
RAZORPAY_WEBHOOK_SECRET=xxxx
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

### Chat — `/api/chat`

| Method | Endpoint          | Description                                      |
|--------|-------------------|--------------------------------------------------|
| GET    | `/:userId`        | Get paginated message history with a user        |
| POST   | `/:userId`        | Send a message via REST                          |
| PATCH  | `/:userId/seen`   | Mark all messages from a user as seen            |

**Query params:** `?page=1&limit=20` (max limit: 50)

> Only available between mutually connected users.

### Payment — `/api/payment`

| Method | Endpoint    | Description                                              |
|--------|-------------|----------------------------------------------------------|
| POST   | `/order`    | Create a Razorpay order for lifetime premium (₹999)      |
| POST   | `/verify`   | Verify payment signature and activate premium            |
| POST   | `/webhook`  | Razorpay webhook — backup activation on payment capture  |

**Payment Flow:**
1. `POST /order` → returns `orderId`, `amount`, `key_id`
2. Open Razorpay checkout on frontend
3. On success → `POST /verify` with `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`
4. User `isPremium` set to `true` permanently

**Webhook URL (set in Razorpay dashboard):**
```
https://your-domain.com/api/payment/webhook
```

## Socket.IO Events

| Event (client → server) | Payload | Description |
|--------------------------|---------|-------------|
| `joinRoom` | `{ targetUserId }` | Join private chat room |
| `sendMessage` | `{ receiverId, text }` | Send a message |
| `typing` | `{ targetUserId }` | Notify other user you are typing |
| `markSeen` | `{ senderId }` | Mark all messages from a user as seen |

| Event (server → client) | Payload | Description |
|--------------------------|---------|-------------|
| `receiveMessage` | message object | New incoming message |
| `userTyping` | `{ senderId }` | Other user is typing |
| `messagesSeen` | `{ by: userId }` | Your messages were read |

**Authentication:** Pass JWT token in socket handshake:
```js
const socket = io("http://localhost:3009", {
  auth: { token: "your_jwt_token" },
  withCredentials: true,
});
```
