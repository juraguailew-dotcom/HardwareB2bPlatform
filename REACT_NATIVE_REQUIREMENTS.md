# React Native App - System Requirements
## Hardware B2B Platform Mobile Application

---

## 1. PROJECT OVERVIEW

**Current Stack:**
- Frontend: React 19.2 (Web)
- Backend: Node.js + Express 5.2
- Database: PostgreSQL 
- Real-time: Socket.io
- Authentication: JWT + CSRF
- Image Storage: Cloudinary + Local (S3/Cloud Storage)
- Payments: Stripe
- Communications: Twilio (SMS), Nodemailer (Email)

**Target Mobile Platforms:** iOS & Android

---

## 2. DEVELOPMENT ENVIRONMENT SETUP

### 2.1 Required Software & Tools

**Core Development:**
- Node.js 18+ LTS or 20+ LTS
- npm 9+ or yarn 3+
- Watchman 4.7+ (macOS mandatory, improves build speed)

**Mobile Development Kit:**
- **For iOS Development (macOS Required):**
  - Xcode 14+ (from App Store)
  - CocoaPods 1.12+
  - iOS SDK 13.0+ (minimum target)
  - Command Line Tools for Xcode
  - 20+ GB free disk space

- **For Android Development:**
  - Android Studio 4.0+
  - Android SDK 31+
  - API level 31 minimum (recommended: API 33+)
  - Android NDK (r21 or compatible)
  - Java Development Kit (JDK) 11+
  - 8+ GB available RAM
  - 30+ GB free disk space

**Cross-Platform Tools:**
- React Native CLI (v12.0+)
- Expo CLI (alternative for managed workflow)
- Git 2.30+

### 2.2 Development Environment Specifications

**Recommended Machine Specs:**
```
CPU:     8-core processor minimum (Intel i7/M1 or higher)
RAM:     16 GB minimum (32 GB recommended)
Storage: 100+ GB SSD (separate partitions for iOS/Android simulators)
OS:      macOS 12+ (for iOS) / Windows 10+ or Linux (Android only)
```

---

## 3. REACT NATIVE TECHNOLOGY STACK

### 3.1 Core Framework & Libraries

**Essential Dependencies:**
```json
{
  "react": "^18.2.0",
  "react-native": "^0.73.0",
  "expo": "^50.0.0",
  "@react-navigation/native": "^6.1.0",
  "@react-navigation/bottom-tabs": "^6.5.0",
  "@react-navigation/stack": "^6.3.0",
  "@react-navigation/drawer": "^6.6.0",
  "axios": "^1.13.0",
  "socket.io-client": "^4.8.0"
}
```

### 3.2 UI Framework & Styling

**Choose One:**

**Option A: Native Base** (Recommended - Web/Native compatible)
```json
{
  "native-base": "^3.4.0",
  "@react-native-foundation/react-native-vector-icons": "^10.0.0",
  "react-native-svg": "^14.0.0"
}
```

**Option B: React Native Paper** (Material Design)
```json
{
  "react-native-paper": "^5.12.0",
  "react-native-vector-icons": "^10.0.0"
}
```

**Option C: Elements (Simpler)**
```json
{
  "@rneui/themed": "^4.0.0",
  "@rneui/base": "^4.0.0"
}
```

### 3.3 State Management

**Choose One:**

**Option A: Redux Toolkit** (Large app)
```json
{
  "@reduxjs/toolkit": "^1.9.0",
  "react-redux": "^8.1.0",
  "redux": "^4.2.0"
}
```

**Option B: Zustand** (Lightweight)
```json
{
  "zustand": "^4.4.0"
}
```

**Option C: Recoil** (Atomic)
```json
{
  "recoil": "^0.7.0"
}
```

### 3.4 Forms & Validation

```json
{
  "react-hook-form": "^7.50.0",
  "zod": "^3.22.0",
  "@hookform/resolvers": "^3.3.0"
}
```

### 3.5 Image & File Handling

```json
{
  "react-native-image-picker": "^5.11.0",
  "react-native-document-picker": "^9.0.0",
  "react-native-fs": "^2.20.0",
  "react-native-image-crop-picker": "^0.39.0",
  "react-native-cached-image": "^1.4.3"
}
```

### 3.6 Maps & Location

```json
{
  "react-native-maps": "^1.7.0",
  "@react-native-camera/camera": "^5.5.0",
  "react-native-geolocation-service": "^5.3.0"
}
```

### 3.7 Real-Time Communication

```json
{
  "socket.io-client": "^4.8.0",
  "react-native-voip-push-notification": "^3.4.0"
}
```

### 3.8 Payment Integration

```json
{
  "@stripe/stripe-react-native": "^0.31.0",
  "react-native-paypal-checkout": "^2.0.0"
}
```

### 3.9 Notifications & Analytics

```json
{
  "@react-native-firebase/app": "^18.8.0",
  "@react-native-firebase/messaging": "^18.8.0",
  "@react-native-firebase/analytics": "^18.8.0",
  "react-native-push-notification": "^8.1.0"
}
```

### 3.10 Storage & Offline

```json
{
  "@react-native-async-storage/async-storage": "^1.21.0",
  "react-native-sqlite-storage": "^6.0.0",
  "watermelondb": "^0.27.0"
}
```

### 3.11 Security

```json
{
  "react-native-keychain": "^8.1.0",
  "react-native-securerandom": "^1.0.0",
  "rn-secure-storage": "^2.0.0"
}
```

### 3.12 Utility Libraries

```json
{
  "lodash": "^4.17.0",
  "date-fns": "^2.30.0",
  "uuid": "^9.0.0",
  "moment": "^2.29.0"
}
```

---

## 4. BACKEND API REQUIREMENTS

### 4.1 API Endpoints to Support

**Authentication:**
- `POST /api/auth/register` - Shop & Contractor registration
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh-token` - JWT refresh
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Password reset
- `POST /api/auth/verify-email` - Email verification

**Products:**
- `GET /api/products` - List (with filters/pagination)
- `GET /api/products/:id` - Get details
- `GET /api/products/search` - Full-text search
- `POST /api/products` - Create (shop only)
- `PUT /api/products/:id` - Update (shop owner only)
- `POST /api/products/:id/images` - Upload images
- `DELETE /api/products/:id/images` - Delete image

**Requests/Orders:**
- `GET /api/requests` - List requests (with filters)
- `POST /api/requests` - Create request (contractor)
- `GET /api/requests/:id` - Get request details
- `PUT /api/requests/:id/status` - Update status
- `DELETE /api/requests/:id` - Cancel request

**Favorites:**
- `GET /api/favorites` - Get user favorites
- `POST /api/favorites/:productId` - Add to favorites
- `DELETE /api/favorites/:productId` - Remove from favorites

**Reviews & Ratings:**
- `GET /api/reviews/:userId` - Get user reviews
- `POST /api/reviews` - Post review
- `PUT /api/reviews/:id` - Edit review
- `DELETE /api/reviews/:id` - Delete review

**Chat:**
- `GET /api/chat/conversations` - List conversations
- `GET /api/chat/messages/:conversationId` - Get messages
- `POST /api/chat/messages` - Send message
- `POST /api/chat/attachments` - Upload file

**User Profile:**
- `GET /api/users/me` - Current user profile
- `PUT /api/users/me` - Update profile
- `POST /api/users/avatar` - Upload avatar
- `GET /api/users/:id` - Get other user profile

**Inventory (Shop):**
- `GET /api/inventory` - Stock levels
- `PUT /api/inventory/:productId` - Update stock

**Analytics:**
- `GET /api/analytics/shop` - Shop analytics (sales, revenue)
- `GET /api/analytics/contractor` - Contractor analytics

**Notifications:**
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark read
- `DELETE /api/notifications/:id` - Delete

### 4.2 API Response Format Requirement

All endpoints must return consistent JSON:
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Success message",
  "error": null,
  "pagination": { "page": 1, "limit": 20, "total": 100 }
}
```

### 4.3 Authentication System

- **JWT tokens** with `exp` claim (15-minute access)
- **Refresh token** mechanism (7-14 days)
- **Token storage** in secure headers (Authorization: Bearer)
- **CSRF protection** for state-changing requests
- **Rate limiting** on auth endpoints (5 requests/minute)

### 4.4 API Versioning

Support multiple API versions:
- `/api/v1/products`
- `/api/v2/products`
- Maintain backward compatibility for 2-3 versions

---

## 5. FEATURE REQUIREMENTS FOR MOBILE

### 5.1 Core Features to Support

**User Management:**
- [ ] Registration (shop & contractor)
- [ ] Email verification
- [ ] Login/Logout
- [ ] Profile management
- [ ] Avatar upload
- [ ] Password change/reset
- [ ] Account deletion

**Product Catalog:**
- [ ] Browse products with pagination
- [ ] Search products (full-text)
- [ ] Filter by category/price/shop
- [ ] View product details
- [ ] Image gallery (zoom, swipe)
- [ ] Add to favorites
- [ ] View reviews/ratings

**Requests/Orders (Contractors):**
- [ ] Create purchase request
- [ ] Add/remove items
- [ ] Bulk pricing calculation
- [ ] Request history
- [ ] Track request status
- [ ] Cancel requests
- [ ] Request templates (recurring)

**Shop Management:**
- [ ] Add/edit products
- [ ] Upload product images (6-10 at once)
- [ ] Manage inventory/stock
- [ ] View orders/requests
- [ ] Manage pricing tiers
- [ ] Accept/reject requests

**Chat & Communication:**
- [ ] Real-time messaging (Socket.io)
- [ ] File/image sharing
- [ ] Typing indicators
- [ ] Message history
- [ ] Conversation list
- [ ] Read receipts

**Payments:**
- [ ] View invoice/quote
- [ ] Process payments (Stripe)
- [ ] Payment history
- [ ] Download invoices (PDF)

**Notifications:**
- [ ] Push notifications (Firebase)
- [ ] In-app notifications
- [ ] Email notifications (optional)
- [ ] SMS alerts (for critical events)
- [ ] Notification preferences

**Reviews & Ratings:**
- [ ] View reviews
- [ ] Post reviews
- [ ] Rate users/shops
- [ ] View ratings history

**Offline Support:**
- [ ] View cached product list
- [ ] Cache favorite items
- [ ] Sync when online
- [ ] Queue requests when offline

---

## 6. DATABASE REQUIREMENTS

### 6.1 Database Compatibility

- **PostgreSQL 13+** (remote on backend)
- **SQLite** (mobile local storage for caching)
- **Realm** (optional, advanced offline features)

### 6.2 Local Storage Schema (Mobile)

```sql
-- Cache Tables (updated from API)
CREATE TABLE local_products (
    id INTEGER PRIMARY KEY,
    name TEXT,
    price REAL,
    images TEXT,
    synced_at TIMESTAMP
);

CREATE TABLE local_favorites (
    id INTEGER PRIMARY KEY,
    product_id INTEGER UNIQUE,
    added_at TIMESTAMP,
    synced INTEGER DEFAULT 0
);

CREATE TABLE offline_requests (
    id TEXT PRIMARY KEY,
    data TEXT,
    created_at TIMESTAMP,
    synced INTEGER DEFAULT 0
);

CREATE TABLE local_user (
    id INTEGER PRIMARY KEY,
    token TEXT,
    refresh_token TEXT,
    user_type TEXT,
    synced_at TIMESTAMP
);
```

---

## 7. INFRASTRUCTURE REQUIREMENTS

### 7.1 Backend Server Specifications

**Minimum:**
```
CPU:       2 vCore
RAM:       2 GB
Storage:   20 GB SSD
Bandwidth: 10 Mbps
```

**Recommended:**
```
CPU:       4 vCore
RAM:       4-8 GB
Storage:   100 GB SSD
Bandwidth: 100 Mbps
Auto-scaling: Yes
```

**Deployment Platform Options:**
- Render (current: Node.js, PostgreSQL)
- Heroku
- AWS EC2 + RDS
- DigitalOcean App Platform
- Railway.app
- Vercel (API routes only)

### 7.2 Database Server

**PostgreSQL Specifications:**
- Version: 13+
- Storage: 50+ GB (scalable)
- Connections: 100+ concurrent
- Backup: Daily + weekly archives
- Replication: Read replicas for scaling

**Options:**
- Neon (current compatible)
- AWS RDS
- Digital Ocean Managed DB
- Render Database

### 7.3 File Storage (Images)

**Current Setup:**
- Cloudinary (recommended for images)
- S3 (AWS alternative)
- Firebase Storage (alternative)

**Requirements:**
- Images: 50 GB initial
- Auto-scaling
- CDN enabled
- 5-99 days retention policy

### 7.4 Real-Time Communication

**Socket.io Server:**
- Co-hosted with Node.js backend
- Redis adapter (for horizontal scaling)
- Connection timeout: 60s
- Reconnect: 5 attempts, 1s delay

### 7.5 Email & SMS Services

**Email:**
- SMTP server (Gmail, SendGrid, Mailgun)
- 1,000+ emails/day capacity
- Templates stored on backend

**SMS (Twilio):**
- 500+ messages/month capacity
- Scalable on demand
- Supported countries: Global

---

## 8. SECURITY REQUIREMENTS

### 8.1 Mobile-Specific Security

**Authentication:**
- [ ] Store JWT in secure storage (NOT AsyncStorage)
- [ ] Use Keychain (iOS) / Keystore (Android)
- [ ] 2FA support (optional)
- [ ] Biometric authentication (fingerprint/face)

**Data Protection:**
- [ ] Encrypt sensitive data at rest
- [ ] SSL/TLS for all network requests
- [ ] Certificate pinning (prevent MITM)
- [ ] Code obfuscation & minification

**Permissions:**
- [ ] Camera (for product photos/verification)
- [ ] Gallery (image upload)
- [ ] Location (for map features)
- [ ] Contacts (optional: find businesses)
- [ ] Microphone (optional: voice messages)

**Compliance:**
- [ ] GDPR compliance (user data)
- [ ] Data deletion on logout
- [ ] Privacy policy in app
- [ ] Terms & conditions acceptance

### 8.2 API Security

- [ ] Rate limiting (100 req/min per user)
- [ ] CORS configured properly
- [ ] Input validation (all fields)
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS protection headers
- [ ] CSRF tokens
- [ ] Data sanitization before storage

---

## 9. PERFORMANCE REQUIREMENTS

### 9.1 App Performance Targets

**Startup Time:**
- Cold start: < 3 seconds
- Warm start: < 1 second

**Network:**
- API response time: < 2 seconds (95th percentile)
- Image load time: < 1 second
- Chat message delivery: < 500ms

**Memory:**
- Initial bundle: < 50 MB
- Runtime memory: < 200 MB (basic operations)
- Max cache size: 100-200 MB

**Battery:**
- Background sync: < 5% battery/hour
- Active use: < 30% battery/hour

### 9.2 Optimization Strategies

**Code:**
- [ ] Lazy loading for screens
- [ ] Code splitting
- [ ] Tree-shaking unused code
- [ ] Minification & compression

**Images:**
- [ ] WebP format with JPEG fallback
- [ ] Responsive images (1x, 2x, 3x)
- [ ] Lazy loading in lists (FlatList optimization)
- [ ] Progressive JPEG
- [ ] Local image caching with TTL

**Network:**
- [ ] Request batching
- [ ] Pagination (20-50 items/page)
- [ ] GraphQL (optional, reduces over-fetching)
- [ ] Offline queue for failed requests

**Database:**
- [ ] Indexing on frequently queried fields
- [ ] Query optimization
- [ ] Connection pooling

---

## 10. TESTING REQUIREMENTS

### 10.1 Testing Strategy

**Unit Testing:**
```json
{
  "jest": "^29.0.0",
  "@testing-library/react-native": "^12.0.0"
}
```

**E2E Testing:**
```json
{
  "detox": "^20.0.0",
  "detox-cli": "^20.0.0"
}
```

**Test Coverage Goals:**
- Utilities: 90%+
- Components: 70%+
- Overall: 70%+ minimum

### 10.2 Device Testing

**iOS:**
- iPhone 13, 14, 15 (latest)
- iPad Air/Pro
- iOS 13, 14, 15, 16, 17 (current versions)

**Android:**
- Samsung Galaxy S21-S24
- Google Pixel 6-8
- Android 12, 13, 14, 15 (current versions)
- Tablets: iPad Pro equivalent

---

## 11. CI/CD PIPELINE REQUIREMENTS

### 11.1 Build & Deployment

**Tools:**
```json
{
  "eas-cli": "^3.0.0",
  "fastlane": "^2.213.0"
}
```

**Build Servers:**
- EAS Build (Expo recommended)
- GitHub Actions
- Bitrise
- Jenkins

**Pipeline Stages:**
1. Code checkout
2. Lint & format check
3. Unit tests
4. Build (iOS & Android)
5. E2E tests
6. App Store/Play Store upload

### 11.2 App Store Requirements

**iOS App Store:**
- Apple Developer account ($99/year)
- Provisioning profiles & certificates
- Build signing
- Review time: 24-48 hours

**Google Play Store:**
- Google Developer account ($25 one-time)
- Signing key generation
- Play Console configuration
- Review time: 2-4 hours

---

## 12. DEVELOPMENT ROADMAP

### Phase 1: MVP (Months 1-2)
- [x] Project setup & infrastructure
- [x] Authentication system
- [x] Product listing & search
- [x] User profiles
- [x] Basic UI components

### Phase 2: Core Features (Months 2-3)
- [x] Requests/Orders system
- [x] Chat messaging (Socket.io)
- [x] Image upload & management
- [x] Favorites system
- [x] Reviews & ratings

### Phase 3: Enhanced (Months 3-4)
- [x] Payments (Stripe integration)
- [x] Push notifications (Firebase)
- [x] Analytics & reporting
- [x] Offline support
- [x] Admin dashboard (mobile-friendly)

### Phase 4: Polish (Months 4+)
- [x] Performance optimization
- [x] Security hardening
- [x] Accessibility improvements
- [x] App Store release
- [x] Play Store release

---

## 13. COST ESTIMATION

### 13.1 Monthly Recurring Costs

| Service | Cost | Notes |
|---------|------|-------|
| Backend Hosting (Render) | $50-100 | Scalable |
| Database (PostgreSQL) | $50-150 | Neon/AWS RDS |
| Image Storage (Cloudinary) | $30-100 | Pay-as-you-go |
| Firebase (Analytics/Push) | $0-50 | Free tier available |
| Twilio (SMS) | $20-100 | Pay-per-use |
| Email Service | $0-50 | SendGrid/Mailgun |
| App Store Hosting | $50-200 | CDN/storage |
| Domain & SSL | $15-30 | Annual/included |
| **Total** | **$215-780** | Depends on scale |

### 13.2 Development Costs

| Item | Cost |
|------|------|
| Team (3-4 months) | $30,000-60,000 |
| Testing & QA | $5,000-10,000 |
| Design & UX | $5,000-15,000 |
| Infrastructure Setup | $2,000-5,000 |
| **Total** | **$42,000-90,000** |

---

## 14. TEAM COMPOSITION

**Recommended Team:**
- 1x React Native Developer (lead)
- 1x Backend Developer (API enhancements)
- 1x iOS Developer (native modules/optimization)
- 1x Android Developer (native modules/optimization)
- 1x QA Engineer
- 1x DevOps Engineer (optional)
- 1x UI/UX Designer

**Total: 6-7 people**

---

## 15. DEPLOYMENT CHECKLIST

- [ ] Code repository setup (GitHub/GitLab)
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations tested
- [ ] API rate limiting enabled
- [ ] Error logging setup (Sentry)
- [ ] Analytics configured
- [ ] Push notification service tested
- [ ] Payment gateway sandbox tested
- [ ] iOS provisioning profiles generated
- [ ] Android signing key generated
- [ ] TestFlight build uploaded (iOS)
- [ ] Google Play Store internal test created
- [ ] Beta testing (50+ users minimum)
- [ ] App Store review submission
- [ ] Play Store release

---

## 16. MONITORING & MAINTENANCE

### 16.1 Monitoring Tools

```json
{
  "sentry": "^7.0.0",
  "@react-native-firebase/analytics": "^18.0.0",
  "@react-native-firebase/crashlytics": "^18.0.0"
}
```

**Metrics to Track:**
- Crash rate (target: < 0.1%)
- API response time
- User session duration
- Feature usage
- Revenue per transaction

### 16.2 Maintenance Schedule

- Daily: Monitor crash logs, error rates
- Weekly: Performance metrics review
- Monthly: Security patches, dependency updates
- Quarterly: Major feature releases

---

## 17. ALTERNATIVE APPROACHES

### Option A: Code Sharing (Recommended)
- Monorepo (Nx/Turbo)
- Shared business logic
- Shared components (React Native Web)
- 30-40% code reuse

**Pros:** Developer efficiency, consistency
**Cons:** More complex setup

### Option B: Native Development (iOS/Android)
- Swift (iOS) + Kotlin (Android)
- Maximum performance
- Full platform capabilities

**Pros:** Best performance & UI
**Cons:** 2x development effort, different codebases

### Option C: Cross-Platform (Flutter)
- Dart language
- Different ecosystem

**Pros:** Similar reach
**Cons:** Learning curve, smaller community than RN

---

## CONCLUSION

**React Native is optimal for this project because:**
✅ Code reuse (web + mobile)
✅ Faster time-to-market
✅ Single developer team (JavaScript)
✅ Strong community & libraries
✅ Proven for complex apps (Shopify, Discord, Airbnb)
✅ Easy iteration based on user feedback

**Critical success factors:**
1. Strong backend API (already 90% ready)
2. Experienced React Native developer lead
3. Proper offline support strategy
4. Performance testing from day 1
5. Comprehensive beta testing

**Estimated Timeline:** 4-5 months for MVP + Android/iOS releases
