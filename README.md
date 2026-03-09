<<<<<<< HEAD
# AgroX Application Source

This application has been manually scaffolded because `Node.js / npm` was not detected on this system.

## Project Structure
- **/backend**: Express server, Prisma schema, and API routes mapping to the existing SQL schema.
- **/frontend**: React + Vite application with Tailwind CSS, Recharts, and Lucide React. Contains a premium mock dashboard.

## Setup Instructions

1. **Install Node.js**: Please install Node.js (version 18 or above recommended) from [nodejs.org](https://nodejs.org).
2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   ```
   - Create a `.env` file in the `backend` folder with your PostgreSQL credentials:
     ```env
     DATABASE_URL="postgresql://user:password@localhost:5432/agrox_db_name?schema=public"
     JWT_SECRET="agrox-dev-secret"
     PORT=3001
     ```
   - Generate the Prisma Client:
     ```bash
     npx prisma generate
     ```
   - Run the development server:
     ```bash
     npm run dev
     ```

3. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   - Once running, the frontend will be available at `http://localhost:5173`. You will see the beautiful, premium Dashboard exactly as requested.

## Notes
- The models in `backend/prisma/schema.prisma` strictly match your SQL schema names and enums.
- The `user_roles` check configures RLS per transaction by pushing the JWT claims to `request.jwt.claims`.
=======
# agrox-app
>>>>>>> d77d8e26bf1068fa8f291e9dcddcd0f30adee34b
