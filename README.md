# CostLess Warehouse Management System

A comprehensive grocery warehouse management platform that leverages advanced data processing and intelligent inventory logistics to streamline procurement and product management.

## Overview

This system modernizes a 19-year-old SQL Server grocery warehouse system (CostLessWarehouse) to a React/Express/PostgreSQL architecture, handling 300+ products, 100+ vendors, and 9 retail stores.

## Tech Stack

- **Frontend**: React with TypeScript, Shadcn/ui components, TanStack Query
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS
- **Real-time**: WebSocket data synchronization
- **Data Processing**: CSV import capabilities, ETL migration tools

## Key Features

### Product Management
- Comprehensive product configuration tracking
- Dynamic unit conversion logic with authentic business data
- Transfer cost override system for legacy inventory management
- Flexible inventory controls with precise calculations

### Inventory Management
- Real-time inventory tracking across 9 retail locations
- Automated annual inventory rollup system
- Purchase order management with 10-key rapid entry
- Transfer order processing between stores

### Business Intelligence
- Professional PDF output for printed purchase orders
- Numeric values with comma formatting
- Data reduction from 9 years to 3+ years (starting 1/1/2022)
- Comprehensive reporting and analytics

### Data Migration
- Complete ETL migration from legacy SQL Server system
- 2,910+ products migrated with 99.7% accuracy
- Authentic CSV data import and validation
- Backup and restore functionality for data protection

## Critical Business Requirements

1. **Rapid 10-key Entry Experience**: Maintains the speed of the original system
2. **Perfect Inventory Accuracy**: Zero-tolerance for inventory discrepancies  
3. **Data Integrity**: Uses only authentic business data, no placeholders
4. **Professional Output**: Print-ready purchase orders and reports
5. **Legacy Compatibility**: Handles cost overrides for older inventory

## Database Structure

The system maintains dual ID structures:
- `id`: Internal database primary key
- `product_id`: Business identifier for legacy compatibility

Key tables:
- `products`: Product catalog with pricing and specifications
- `transfer_cost_overrides`: Cost adjustments for legacy inventory
- `purchase_orders`: Vendor order management
- `transfer_orders`: Inter-store inventory transfers
- `inventory`: Real-time stock levels by location

## Development Guidelines

### Architecture
- Frontend handles presentation and user interaction
- Backend manages data persistence and business logic
- Minimize file count by consolidating similar components
- Use TypeScript throughout for type safety

### Data Handling
- Generate data models first in `shared/schema.ts`
- Use Drizzle ORM for all database operations
- Implement proper error handling and validation
- Create backups before major data operations

### UI/UX Standards
- Rapid keyboard navigation for warehouse operators
- Clear visual indicators for cost overrides and alerts
- Responsive design for various screen sizes
- Professional styling suitable for business environment

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up database:
   ```bash
   npm run db:push
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `REPLIT_DOMAINS`: Comma-separated list of allowed domains

## Data Migration

The system includes comprehensive migration tools for importing legacy data:
- Product catalogs with authentic pricing
- Historical purchase and transfer orders
- Vendor information and relationships
- Inventory adjustments and corrections

## Version Control

This project includes:
- Comprehensive `.gitignore` for proper file management
- Database backup utilities in `server/backup-utils.ts`
- SQL backup files for critical data restoration
- Automated backup creation before major operations

## Contributing

1. Always create backups before modifying critical data
2. Use authentic business data only
3. Maintain TypeScript type safety
4. Follow existing architectural patterns
5. Test thoroughly with real-world scenarios

## License

Private project for CostLess Warehouse operations.