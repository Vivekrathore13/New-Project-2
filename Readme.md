# Expense Splitter Backend 

<p align="left">

![NodeJS](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![Express](https://img.shields.io/badge/Express.js-Backend-black?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-darkgreen?logo=mongodb)
![JWT](https://img.shields.io/badge/JWT-Auth-blueviolet?logo=jsonwebtokens)
![Postman](https://img.shields.io/badge/Postman-API%20Testing-orange?logo=postman)
![License](https://img.shields.io/badge/License-MIT-lightgrey)
![MadeWithLove](https://img.shields.io/badge/Made%20with-%E2%9D%A4-red)


A Node.js + Express + MongoDB backend for an Expense Splitter application (Splitwise-like).  
This project supports groups, invites, expenses, settlements, balances and notifications.

---

## ✅ Features

### 🔐 Authentication
- User Signup
- User Login
- JWT Access Token + Refresh Token

### 👥 Groups
- Create group (Admin)
- Get group details
- Get my groups
- Get group members
- Delete group (Admin)
- Remove member (Admin)

### ✉️ Invites
- Invite members by email
- Generate invite link/token
- Verify invite token
- Join group using invite

### 💸 Expenses
- Create expense inside a group
- Split types supported:
  - equal
  - exact
  - percentage (optional usage)
- Get group expenses
- Update expense
- Delete expense
- Get expense by id

### 🤝 Settlements
- Get group balances
- Settlement suggestions (minimum transactions)
- Create settlement logs
- Get settlement logs

### 🔔 Notifications
- Get my notifications
- Mark notification as read
- Mark all as read

---

## 🧱 Tech Stack
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT Authentication
- Express Validator
- Postman for testing

---

## 📁 Folder Structure

```

src/
├── controllers/
├── models/
├── routes/
├── middlewares/
├── utils/
├── app.js
└── index.js

````

---

## ⚙️ Environment Variables

Create a `.env` file and add:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
ACCESS_TOKEN_SECRET=your_access_secret
REFRESH_TOKEN_SECRET=your_refresh_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=7d
CORS_ORIGIN=http://localhost:3000
````

---

## 🚀 Installation & Run

### 1) Clone the repo

```bash
git clone <repo_url>
cd expense-splitter-backend
```

### 2) Install dependencies

```bash
npm install
```

### 3) Start server

```bash
npm run dev
```

Server will run at:

```
http://localhost:5000
```

Base API:

```
http://localhost:5000/api
```

---

## 🧪 Postman Testing Flow (End-to-End)

1. Signup (Admin + members)
2. Login and copy tokens
3. Create Group (Admin)
4. Invite members by email
5. Join group using invite token
6. Create 2-3 expenses
7. Get group balance
8. Get settlement suggestions
9. Create settlements
10. Check notifications

---

## ✅ Future Improvements

* Add AI based expense category suggestion
* Add real-time notifications (Socket.io)
* Add expense analytics & charts
* Add role-based permissions (admin/member)

---

## 👨‍💻 Author

Vivek (Backend Project)

```

---

# ✅ 2) API Documentation (Backend Endpoints)

> Base URL:
```

[http://localhost:5000/api](http://localhost:5000/api)

````

---

## 🔐 Auth APIs

### ✅ Signup
**POST** `/signup`

Body:
```json
{
  "fullName": "Vivek Admin",
  "email": "vivek@gmail.com",
  "password": "12345678"
}
````

---

### ✅ Login

**POST** `/login`

Body:

```json
{
  "email": "vivek@gmail.com",
  "password": "12345678"
}
```

✅ Response gives:

* accessToken
* refreshToken
* user object

---

### ✅ Refresh Token

**POST** `/refresh-token`

Body:

```json
{
  "refreshToken": "<REFRESH_TOKEN>"
}
```

---

## 👥 Group APIs

> All group routes require:

```
Authorization: Bearer <ACCESS_TOKEN>
```

### ✅ Create Group

**POST** `/group/create`

Body:

```json
{
  "groupname": "Goa Trip"
}
```

---

### ✅ Get My Groups

**GET** `/group/my`

---

### ✅ Get Group By Id

**GET** `/group/:id`

---

### ✅ Get Group Members

**GET** `/group/:groupId/members`

---

### ✅ Delete Group (Admin)

**DELETE** `/group/:groupId`

---

### ✅ Delete Member from group (Admin)

**DELETE** `/group/:groupId/member/:memberId`

---

## ✉️ Invite APIs

> Invite routes require auth unless mentioned

### ✅ Send Invite

**POST** `/group/:groupId/invite`

Body:

```json
{
  "email": "ravi@gmail.com"
}
```

✅ Returns:

* inviteId
* invite link (with token)

---

### ✅ Verify Invite Token (No Auth)

**GET** `/group/invite/verify/:token`

---

### ✅ Join Group Using Invite

**POST** `/group/join`

Header:

```
Authorization: Bearer <MEMBER_TOKEN>
```

Body:

```json
{
  "token": "<INVITE_TOKEN>"
}
```

---

## 💸 Expense APIs

> Requires auth:

```
Authorization: Bearer <ACCESS_TOKEN>
```

### ✅ Create Expense

**POST** `/:groupId/createExpense`

Body example:

```json
{
  "description": "Dinner",
  "amount": 600,
  "paidBy": "<USER_ID>",
  "splitType": "equal",
  "splitDetails": [
    { "user": "<USER_ID_1>", "amount": 150 },
    { "user": "<USER_ID_2>", "amount": 150 },
    { "user": "<USER_ID_3>", "amount": 150 },
    { "user": "<USER_ID_4>", "amount": 150 }
  ]
}
```

---

### ✅ Get Group Expenses

**GET** `/:groupId/getExpense`

---

### ✅ Get Expense by Id

**GET** `/:expenseId/getExpenseById`

---

### ✅ Update Expense

**PATCH** `/:groupId/:expenseId/updateExpense`

Body similar to createExpense.

---

### ✅ Delete Expense

**DELETE** `/:groupId/:expenseId/deleteExpense`

---

## 🤝 Settlement APIs

> Requires auth:

```
Authorization: Bearer <ACCESS_TOKEN>
```

### ✅ Get Group Balance

**GET** `/groups/:groupId/balance`

---

### ✅ Get Settlement Suggestions

**GET** `/groups/:groupId/settlements/suggestions`

---

### ✅ Create Settlement (Record Payment)

**POST** `/groups/:groupId/settlements`

Body:

```json
{
  "from": "<DEBTOR_ID>",
  "to": "<CREDITOR_ID>",
  "amount": 200
}
```

---

### ✅ Get Settlement Logs

**GET** `/groups/:groupId/settlements/logs`

---

## 🔔 Notification APIs

> **Important**: app.js should mount like:

```js
app.use("/api/notifications", notificationrouter);
```

Then endpoints become:

### ✅ Get My Notifications

**GET** `/notifications`

---

### ✅ Mark one notification read

**PATCH** `/notifications/:notificationId/read`

---

### ✅ Mark all read

**PATCH** `/notifications/read-all`

---

## ✅ Standard Response Format

Success:

```json
{
  "statusCode": true,
  "data": {},
  "message": "..."
}
```

Errors:

```json
{
  "statusCode": false,
  "message": "..."
}
```

---



