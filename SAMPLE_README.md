# Financial & Microfinance Management Platform (Sample Edition)

This is a complete sample package of the **Financial & Microfinance Management Platform**, designed for Microfinance Institutions (MFI), Self-Help Groups (SHG), Center Banking, and Personal Savings & Loan operations.

---

## 🚀 Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI & Components:** React 19, Tailwind CSS v4, Radix UI, Lucide Icons, Recharts
- **Backend & Database:** Node.js, MongoDB with Mongoose ORM
- **Authentication:** NextAuth.js (Session & JWT based, Role-Based Access Control)
- **Document Processing:** pdf-lib, jsPDF, ExcelJS, docxtemplater

---

## 📦 What's Included in this Sample

1. **Microfinance (MFI) Lifecycle:**
   - Client onboarding, KYC, review, and admin approval workflows.
   - Group / Center formation, employee center allocations, and center meetings.
   - Loan disbursement / provide portal, schemes (weekly/monthly amortization).
   - Weekly collection desk, arrear recovery desk, and pre-closure management.

2. **Smart Savings & Personal Loan Module:**
   - Savings account setup with tiered interest/deposit cycles.
   - 3-month savings tenure verification and automated eligibility audits.
   - Personal loan appraisal, manual sanctioning, verification, and disbursement.
   - Savings refund calculator and bilingual refund claim form generator.

3. **Printing & Passbook Automation:**
   - Multi-tier scheme passbook overlay and dynamic fallback generator.
   - Printable Loan Repayment Cards with member photos and signature boxes.
   - Official savings refund forms and collection day-sheets.

4. **Accounting & Comprehensive Reports:**
   - Real-time Center & Branch Day Sheet (Debit/Credit reconciliations).
   - Demand vs Collection, Arrears Aging, Pre-closure registers, and Summary dashboards.
   - Role-Based Access Control (Admin, Branch Manager, Field Officer, Teller).

---

## 🛠️ Quick Start Instructions

### Prerequisites
- Node.js (v18.18+ or v20+ recommended)
- MongoDB running locally or a MongoDB Atlas connection URI

### Step 1: Install Dependencies
Open a terminal in this extracted directory:
```bash
npm install
```

### Step 2: Configure Environment
A pre-configured `.env` file is already provided. Review or adjust values if needed:
```env
NEXTAUTH_SECRET="your-32-character-random-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
MONGODB_URI="mongodb://localhost:27017/sample_db"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NODE_ENV="development"
```

### Step 3: Run the Development Server
```bash
npm run dev
```

### Step 4: Access the Dashboard
Open your web browser and navigate to:
```
http://localhost:3000
```

---

## 🔒 Security & Privacy Notice
All production database connection strings, live Cloudflare credentials, and proprietary secret keys have been sanitized and replaced with safe local development placeholders.
