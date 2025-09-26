# 🧠 Psychology Website - Deployment Setup Guide

## 📊 Current Status

### ✅ **Product Manager Portfolio** (Adarsh)
- **Branches**: `dev` and `main` branches ✅
- **Deployment**: 
  - **Dev Environment**: AWS Amplify dev branch ✅
  - **Production Environment**: AWS Amplify production branch ✅
- **Status**: ✅ **Properly configured with separate environments**

### ✅ **Upasna Psychology Website** (Correctly Configured)
- **Branches**: `main` (production) and `dev` (development) branches ✅
- **Deployment**: 
  - **Production**: `main` branch → Custom domain (already connected) ✅
  - **Development**: `dev` branch → New Amplify app needed
- **Status**: ✅ **Branch structure correct, needs dev Amplify app**

## 🔧 **Required Actions for Upasna Psychology Website**

### 1. **AWS Amplify Configuration**
You need to set up a **second Amplify app** for development:

```bash
# In AWS Amplify Console:
1. Create new Amplify app for development
2. Connect to GitHub repository: upasna-psychology-website
3. Select 'dev' branch
4. This will be your development environment
5. Keep your existing app connected to 'main' branch for production
```

### 2. **Branch Strategy**
```
main (production) → Custom Domain (existing setup)
dev (development) → New Amplify App (to be created)
```

### 3. **Current Setup**
- **`main` branch**: Already connected to your custom domain (production)
- **`dev` branch**: Ready to be connected to new Amplify app (development)

## 🚀 **Deployment Process**

### **Development Workflow:**
1. Make changes on `dev` branch
2. Push to `dev` → Deploys to development Amplify app
3. Test on development URL

### **Production Workflow:**
1. Merge `dev` into `main` branch
2. Push to `main` → Deploys to production (custom domain)
3. Your custom domain gets updated

## 📋 **Next Steps**

1. **Create new Amplify app** for development (connect to `dev` branch)
2. **Keep existing Amplify app** connected to `main` branch (production with custom domain)
3. **Test development workflow**
4. **Verify both environments** are working

## 🔍 **Verification Checklist**

- [ ] Development Amplify app created (connected to `dev` branch)
- [ ] Production Amplify app working (connected to `main` branch with custom domain)
- [ ] Development deployment working
- [ ] Production deployment working
- [ ] Custom domain accessible
- [ ] Both environments isolated

## 📞 **Support**

If you need help with the AWS Amplify setup or GitHub secrets configuration, please let me know!
