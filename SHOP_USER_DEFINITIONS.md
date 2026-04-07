# Shop User Definitions & Code Locations

## Executive Summary

This document identifies all code locations where Shop Users are defined, instantiated, or referenced in the `/frontend/src/components/shop/` directory. The analysis covers 5 component files that manage different aspects of the Shop User experience.

**Key Finding:** The shop directory does **NOT** define any Shop User classes or instantiations. Instead, it provides **Shop User functionality** through components that interact with the backend API. The actual Shop User model is defined in the backend (`backend/models/userModel.js`).

---

## 📁 Files Analyzed

| File | Purpose | Shop User References |
|------|---------|---------------------|
| `AddProduct.js` | Product creation form | None (uses API) |
| `EditProduct.js` | Product editing form | Uses `useAuth()` for email |
| `InventoryManagement.js` | Inventory tracking | None (uses API) |
| `RequestFulfillment.js` | Order fulfillment | None (uses API) |
| `SalesAnalytics.js` | Sales reporting | None (uses API) |

---

## 🔍 Code Locations Analysis

### 1. **AddProduct.js**
**Path:** `frontend/src/components/shop/AddProduct.js`

**Shop User Definition:** ❌ None
**Shop User Instantiation:** ❌ None
**Database Schema References:** ❌ None
**API Response Objects:** ✅ Yes

**API Calls:**
```javascript
// Line ~180
const response = await api.post('/products', productData);
const newProductId = response.data.product.id;

// Line ~190
await uploadProductImages(newProductId, images.map(img => img.file));
```

**Product Data Structure:**
```javascript
{
    name: string,
    description: string,
    category: string,  // 'tools', 'materials', 'paint', 'safety', 'electrical', 'plumbing', 'lumber', 'hardware', 'fasteners', 'roofing', 'adhesives', 'garden'
    unit_price: number,
    bulk_price: number | null,
    minimum_bulk_quantity: number | null,
    stock_quantity: number,
    unit_type: string,  // 'pieces', 'boxes', 'pairs', 'sets', 'feet', 'meters', 'gallons', 'pounds'
    pricing_method: string,  // 'unit', 'bulk', 'measure', 'volume', 'kit', 'bundle'
    sku: string,
    brand: string,
    tags: string[]
}
```

---

### 2. **EditProduct.js**
**Path:** `frontend/src/components/shop/EditProduct.js`

**Shop User Definition:** ❌ None
**Shop User Instantiation:** ❌ None
**Database Schema References:** ❌ None
**API Response Objects:** ✅ Yes

**Auth Context Usage:**
```javascript
// Line ~25
const { userEmail } = useAuth();

// Line ~60
useEffect(() => {
    if (userEmail) setAuthEmail(userEmail);
}, [userEmail]);
```

**API Calls:**
```javascript
// Line ~75
const res = await getProduct(id);
const p = res.data;

// Line ~220
await updateProduct(id, {
    name: product.name,
    description: product.description,
    category: product.category,
    unit_price: parseFloat(product.unit_price),
    bulk_price: product.bulk_price ? parseFloat(product.bulk_price) : null,
    minimum_bulk_quantity: product.minimum_bulk_quantity ? parseInt(product.minimum_bulk_quantity) : null,
    stock_quantity: parseInt(product.stock_quantity),
    unit_type: product.unit_type,
    pricing_method: product.pricing_method,
    sku: product.sku,
    brand: product.brand,
    tags: product.tags
});
```

**Re-authentication Dialog:**
```javascript
// Line ~240
const res = await apiLogin({ email: authEmail, password: authPassword });
if (res.data.token) {
    setAuthenticated(true);
    setAuthDialogOpen(false);
    submitUpdate();
}
```

---

### 3. **InventoryManagement.js**
**Path:** `frontend/src/components/shop/InventoryManagement.js`

**Shop User Definition:** ❌ None
**Shop User Instantiation:** ❌ None
**Database Schema References:** ❌ None
**API Response Objects:** ✅ Yes

**API Calls:**
```javascript
// Line ~55
const response = await api.get('/inventory');
setInventory(response.data);

// Line ~65
await api.put(`/products/${editDialog.product.id}/stock`, {
    stock_quantity: editDialog.newStock
});

// Line ~85
const res = await uploadProductImages(imageDialog.product.id, imageFiles);

// Line ~110
const res = await deleteProductImage(product.id, imageUrl);
```

**Inventory Item Structure:**
```javascript
{
    id: number,
    name: string,
    category: string,
    unit_price: number,
    stock_quantity: number,
    low_stock: boolean,  // true if stock < 10
    critical_stock: boolean,  // true if stock < 5
    images: string[],
    created_at: string
}
```

**GST Calculation:**
```javascript
// Line ~20
const GST_RATE = 0.10;
const withGST = (price) => parseFloat(price) * (1 + GST_RATE);
```

---

### 4. **RequestFulfillment.js**
**Path:** `frontend/src/components/shop/RequestFulfillment.js`

**Shop User Definition:** ❌ None
**Shop User Instantiation:** ❌ None
**Database Schema References:** ❌ None
**API Response Objects:** ✅ Yes

**API Calls:**
```javascript
// Line ~75
const response = await api.get('/requests');
setRequests(response.data);

// Line ~90
await api.put(`/requests/${requestId}/status`, { 
    status: newStatus, 
    ...extra  // tracking_number, tracking_notes
});

// Line ~105
await api.put('/requests/bulk/status', { 
    request_ids: selected, 
    status: bulkStatus 
});

// Line ~125
await api.put(`/requests/${partialDialog.request.id}/partial-fulfill`, {
    fulfilled_items: partialItems.map(i => ({ 
        request_item_id: i.id, 
        fulfilled_quantity: i.fulfilled_quantity 
    })),
    tracking_number: partialTracking
});
```

**Request Object Structure:**
```javascript
{
    id: number,
    contractor_name: string,
    request_date: string,
    total_amount: number,
    status: string,  // 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
    partial_fulfilled: boolean,
    items: [
        {
            id: number,
            name: string,
            quantity: number
        }
    ]
}
```

**SLA Monitoring:**
```javascript
// Line ~30
const SLA_HOURS = { pending: 24, confirmed: 48 };

const isSlaBreached = (request) => {
    const threshold = SLA_HOURS[request.status];
    if (!threshold) return false;
    const hours = (Date.now() - new Date(request.request_date)) / 3600000;
    return hours > threshold;
};
```

---

### 5. **SalesAnalytics.js**
**Path:** `frontend/src/components/shop/SalesAnalytics.js`

**Shop User Definition:** ❌ None
**Shop User Instantiation:** ❌ None
**Database Schema References:** ❌ None
**API Response Objects:** ✅ Yes

**API Calls:**
```javascript
// Line ~65
const response = await api.get(`/analytics/sales?period=${period}`);
setData(response.data);
```

**Analytics Data Structure:**
```javascript
{
    total: {
        total_revenue: number,
        order_count: number,
        unique_customers: number,
        avg_order_value: number,
        revenue_trend: number,  // percentage change
        orders_trend: number,
        customers_trend: number,
        avg_value_trend: number
    },
    recentRequests: [
        {
            request_date: string,
            total_amount: number
        }
    ],
    categoryBreakdown: [
        {
            category: string,
            order_count: number
        }
    ],
    topProducts: [
        {
            name: string,
            total_revenue: number,
            order_count: number
        }
    ]
}
```

---

## 🎯 Shop User Types Analysis

### **Finding: No Shop User Subtypes Exist**

After analyzing all 5 files in the shop directory, I found **NO evidence** of different Shop User types (e.g., ShopAdmin, ShopCustomer). 

The platform implements a **single Shop User role** with the following characteristics:

| Characteristic | Implementation |
|----------------|----------------|
| **User Type** | Single type: `shop` |
| **Authentication** | JWT token with email/password |
| **Permissions** | All shop users have identical permissions |
| **Verification** | Admin-verified before full access |
| **Capabilities** | Product management, inventory, fulfillment, analytics |

### **Shop User Capabilities (All Shop Users)**

1. **Product Management**
   - Add new products
   - Edit existing products
   - Upload/delete product images
   - Set pricing (unit, bulk, measure-based)
   - Manage inventory stock levels

2. **Order Fulfillment**
   - View all contractor requests
   - Update request status (pending → confirmed → shipped → delivered)
   - Bulk status updates
   - Partial fulfillment
   - Add tracking numbers
   - Export to CSV

3. **Sales Analytics**
   - View revenue over time
   - Analyze requests by category
   - Track top products
   - Monitor trends (week/month/year)

4. **Inventory Management**
   - View all products with stock levels
   - Track inventory value (with 10% GST)
   - Monitor low stock alerts
   - Manage product images

---

## 🔐 Shop User Authentication

### **Backend User Model** (Referenced but not in shop directory)
**Path:** `backend/models/userModel.js`

```javascript
// From analysis of backend code
const User = {
    async findByEmail(email) {
        const result = await getPool().query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0];
    },
    
    async findById(id) {
        const result = await getPool().query(
            'SELECT id, email, user_type, company_name, phone, address, verified, created_at FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0];
    },
    
    async create(userData) {
        const { email, password_hash, user_type, company_name, phone, address, tax_id } = userData;
        
        const result = await getPool().query(
            `INSERT INTO users 
            (email, password_hash, user_type, company_name, phone, address, tax_id, verified) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING id, email, user_type, company_name`,
            [email, password_hash, user_type, company_name, phone, address, tax_id, false]
        );
        
        return result.rows[0];
    },
    
    async verifyUser(id) {
        const result = await getPool().query(
            'UPDATE users SET verified = true WHERE id = $1 RETURNING id, email, verified',
            [id]
        );
        return result.rows[0];
    }
};
```

**User Schema (from ERD.md):**
```sql
USERS {
    id              int         PK
    email           varchar     UK  "NOT NULL"
    password_hash   varchar         "NOT NULL"
    user_type       varchar         "shop | contractor | admin"
    company_name    varchar
    phone           varchar
    address         text
    tax_id          varchar
    verified        boolean         "DEFAULT false"
    created_at      timestamp       "DEFAULT NOW()"
    deleted_at      timestamp       "soft delete"
}
```

**Requests Schema (actual table name — previously `orders`):**
```sql
REQUESTS {
    id                  int         PK
    contractor_id       int         FK  "→ users.id"
    shop_id             int         FK  "→ users.id"
    request_date        timestamp       "DEFAULT NOW()"
    status              varchar         "pending|confirmed|shipped|delivered|cancelled"
    total_amount        decimal
    delivery_address    text
    delivery_date       date
    notes               text
    tracking_status     varchar         "DEFAULT 'awaiting_dispatch'"
    payment_status      varchar         "DEFAULT 'unpaid'"
    payment_intent_id   varchar
    cancelled_by        int         FK  "→ users.id"
}

---

## 📊 API Endpoints Used by Shop Components

| Component | Endpoint | Method | Purpose |
|-----------|----------|--------|---------|
| AddProduct | `/products` | POST | Create new product |
| AddProduct | `/products/:id/images` | POST | Upload product images |
| EditProduct | `/products/:id` | GET | Fetch product details |
| EditProduct | `/products/:id` | PUT | Update product |
| InventoryManagement | `/inventory` | GET | Fetch all products with stock |
| InventoryManagement | `/products/:id/stock` | PUT | Update stock quantity |
| InventoryManagement | `/products/:id/images` | POST | Upload images |
| InventoryManagement | `/products/:id/images` | DELETE | Delete image |
| RequestFulfillment | `/requests` | GET | Fetch all requests |
| RequestFulfillment | `/requests/:id/status` | PUT | Update request status |
| RequestFulfillment | `/requests/bulk/status` | PUT | Bulk update status |
| RequestFulfillment | `/requests/:id/partial-fulfill` | PUT | Partial fulfillment |
| SalesAnalytics | `/analytics/sales` | GET | Fetch sales analytics |

---

## 🏗️ Component Architecture

### **Shared Dependencies**

All shop components share these dependencies:

```javascript
// API Service
import api from '../../services/api';

// Currency Utility
import CURRENCY from '../../utils/currency';

// Material-UI Components
import { 
    Container, Paper, Typography, Grid, 
    CircularProgress, Alert, Box, ...
} from '@mui/material';
```

### **State Management Pattern**

Each component follows this pattern:

```javascript
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [success, setSuccess] = useState('');

useEffect(() => {
    fetchData();
}, []);

const fetchData = async () => {
    try {
        setLoading(true);
        const response = await api.get('/endpoint');
        setData(response.data);
    } catch (err) {
        setError('Failed to load data');
    } finally {
        setLoading(false);
    }
};
```

---

## 📝 Summary

### **What Exists:**
1. ✅ **5 Shop Functionality Components** - Product management, inventory, fulfillment, analytics
2. ✅ **Backend User Model** - Defines `shop` user type
3. ✅ **API Integration** - All components use backend APIs
4. ✅ **Authentication** - JWT-based with role checking

### **What Does NOT Exist:**
1. ❌ **Shop User Class Definitions** - No classes in frontend
2. ❌ **Shop User Subtypes** - No ShopAdmin, ShopCustomer, etc.
3. ❌ **Database Schema in Frontend** - Schema is backend-only
4. ❌ **User Instantiation** - No user creation in shop components

### **Shop User Type:**
- **Single Role:** `shop` (hardware suppliers)
- **Capabilities:** Product management, inventory, order fulfillment, sales analytics
- **Verification:** Required by Admin before full access
- **Authentication:** JWT token with email/password
- **Permissions:** All shop users have identical permissions

---

*Document created: 2026-03-31*
*Analysis scope: frontend/src/components/shop/ (5 files)*
*Status: Complete analysis of Shop User definitions and code locations*