# 🚀 Deployment Guide - Upasna Psychology Website

## **📋 Branch Structure**

| **Branch** | **Purpose** | **AWS Amplify** | **URL** | **Status** |
|------------|-------------|-----------------|---------|------------|
| **`main`** | Production | ✅ **Deployed** | `main.d21it9hal3ownf.amplifyapp.com` | Live |
| **`dev`** | Development | ✅ **Deployed** | `dev.d21it9hal3ownf.amplifyapp.com` | Live |

---

## **🔧 AWS AMPLIFY SETUP**

### **Current Configuration:**
- **Production**: `main` branch → Auto-deploy to production URL
- **Development**: `dev` branch → Auto-deploy to development URL

### **To Set Up Dev Branch on AWS Amplify:**

1. **Go to AWS Amplify Console**
   - Navigate to: https://console.aws.amazon.com/amplify/
   - Select your app: `upasna-psychology-website`

2. **Add Dev Branch Deployment**
   - Click "Branch management" or "Branches"
   - Click "Add branch"
   - **Branch name**: `dev`
   - **Environment**: Development
   - **Build settings**: Use same as main branch
   - **Auto-deploy**: Enable

3. **Result URLs:**
   - **Production**: `main.d21it9hal3ownf.amplifyapp.com`
   - **Development**: `dev.d21it9hal3ownf.amplifyapp.com`

---

## **💻 DEVELOPMENT WORKFLOW**

### **Local Development:**
```bash
# 1. Switch to dev branch
git checkout dev

# 2. Make your changes
# Edit files, test locally

# 3. Test locally
python3 -m http.server 8080
# Visit: http://localhost:8080

# 4. Commit changes to dev
git add .
git commit -m "feat: Your feature description"
git push origin dev
# Auto-deploys to: dev.d21it9hal3ownf.amplifyapp.com
```

### **Production Deployment:**
```bash
# 1. Switch to main branch
git checkout main

# 2. Merge dev changes
git merge dev

# 3. Push to production
git push origin main
# Auto-deploys to: main.d21it9hal3ownf.amplifyapp.com
```

---

## **🎯 WORKFLOW SUMMARY**

### **Development Process:**
1. **Work on `dev` branch** → Test locally → Push to dev → Test on dev URL
2. **When ready for production** → Merge dev to main → Push to main → Live on production URL

### **Benefits:**
- ✅ **Safe Development**: Test on dev URL before production
- ✅ **No Downtime**: Production stays stable during development
- ✅ **Easy Rollback**: Can revert to previous main branch if needed
- ✅ **Team Collaboration**: Multiple developers can work on dev branch

---

## **📊 CURRENT STATUS**

- **Production URL**: `main.d21it9hal3ownf.amplifyapp.com` ✅ **LIVE**
- **Development URL**: `dev.d21it9hal3ownf.amplifyapp.com` ✅ **LIVE**
- **Local Development**: `http://localhost:8080` ✅ **ACTIVE**

---

## **🔄 QUICK COMMANDS**

```bash
# Switch to dev for development
git checkout dev

# Switch to main for production
git checkout main

# Start local server
python3 -m http.server 8080

# Check current branch
git branch

# Check deployment status
git log --oneline -3
```

---

**Last Updated**: September 25, 2025  
**Status**: ✅ **READY FOR DEVELOPMENT**
