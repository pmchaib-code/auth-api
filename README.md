# Auth API — GDG Algiers Task 02

A small REST API demonstrating secure signup, login, password hashing, JWT issuing, and JWT verification.

## Stack
- Node.js and Express
- PostgreSQL
- bcryptjs for password hashing
- jsonwebtoken for JWT creation and verification
- Jest and Supertest for integration tests

## Requirements
Node.js 20+, npm, PostgreSQL.

## 1. Install dependencies
```bash
npm install
```

## 2. Create database and role
```bash
sudo -u postgres psql
```
Then run the following SQL, replacing the example password with a strong local password:
```sql
CREATE USER auth_app WITH PASSWORD 'CHANGE_ME';
CREATE DATABASE auth_api OWNER auth_app;
\q
```

## 3. Configure environment
```bash
cp .env.example .env
openssl rand -hex 32
```
Put the generated random value in `JWT_SECRET` in `.env`, and update `DATABASE_URL` with your chosen database password. Never commit `.env`.

## 4. Create the users table
```bash
npm run db:migrate
```

## 5. Run API
```bash
npm run dev
```
Health check:
```bash
curl http://localhost:3000/health
```

## Endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check API and database |
| POST | `/api/auth/signup` | Create an account |
| POST | `/api/auth/login` | Verify credentials and issue JWT |
| GET | `/api/auth/me` | Protected profile route; JWT required |

### Signup
```bash
curl -i -X POST http://localhost:3000/api/auth/signup -H 'Content-Type: application/json' -d '{"email":"student@example.com","password":"StrongPass123!"}'
```

### Login
```bash
curl -i -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@example.com","password":"StrongPass123!"}'
```

### JWT verification
Replace `PASTE_TOKEN_HERE` with `accessToken` returned by login:
```bash
curl -i http://localhost:3000/api/auth/me -H 'Authorization: Bearer PASTE_TOKEN_HERE'
```

## Automated tests
Use a dedicated test database only; the tests delete rows from its `users` table.
```bash
sudo -u postgres psql -c "CREATE DATABASE auth_api_test OWNER auth_app;"
TEST_DATABASE_URL='postgres://auth_app:CHANGE_ME@localhost:5432/auth_api_test' npm test
```

## Security notes
- Passwords are stored as bcrypt hashes, never plaintext.
- SQL uses parameterized queries.
- JWT verification explicitly accepts HS256 only.
- The JWT secret is read from environment variables and must be at least 32 characters.
- Invalid login responses do not reveal whether an email exists.
- `.env` is excluded from Git.

This is an educational starter, not a complete production identity system. Production deployments also need HTTPS, rate limiting, monitoring, secret rotation, and security review.
