# Vertex Supermarket Management System

A deployment-ready monorepo starter for a supermarket ERP built with:

- Frontend: React.js + Vite + Tailwind CSS
- Backend: Node.js + Express.js
- Database: MySQL + Prisma ORM
- Authentication: JWT access + refresh tokens
- Architecture: REST API

This starter is based on the uploaded supermarket requirements covering POS/billing, inventory, purchase/supplier management, accounting/GST, reports, user/staff management, CRM, and add-ons.

## Monorepo structure

- `frontend/` React app
- `backend/` Express API
- `docs/` architecture and API notes

## Included modules

- Auth
- Dashboard
- Products
- Categories
- Customers
- Suppliers
- Purchases
- Sales / POS
- Inventory
- Reports
- Role-based access

## Quick start

### Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Default seeded users

- Super Admin: `admin@vertex.local` / `Admin@123`
- Manager: `manager@vertex.local` / `Manager@123`
- Cashier: `cashier@vertex.local` / `Cashier@123`

## Notes

- This is a strong production starter with working auth, RBAC, Prisma schema, and CRUD foundations.
- Some advanced business rules like full GST workflows, thermal printer drivers, WhatsApp ordering, delivery routing, and real-time barcode hardware integration are scaffolded but not fully implemented.
