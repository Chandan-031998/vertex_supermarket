# Architecture Notes

## Layers
- Presentation: React + Tailwind dashboard and POS UI
- API: Express REST endpoints
- Service layer: reusable business logic
- Data layer: Prisma ORM + MySQL

## Security
- JWT access and refresh tokens
- bcrypt password hashing
- role and permission middleware
- helmet, cors, rate limiting
- audit logging hooks

## Main entities
- users, roles, permissions
- categories, products, inventory movements
- customers, suppliers
- purchases, purchase items
- sales, sale items, sale payments

## Suggested next enhancements
- Store/branch support
- GST summary reports
- Batch and expiry stock handling
- Purchase GRN verification
- Thermal invoice printing
- Barcode scanning
- Loyalty points auto rules
- Low-stock and expiry schedulers
