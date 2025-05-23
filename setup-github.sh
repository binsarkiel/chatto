#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up Git repository for Chatto...${NC}"

# Initialize git if not already initialized
if [ ! -d .git ]; then
    echo -e "${GREEN}Initializing Git repository...${NC}"
    git init
fi

# Add all files
echo -e "${GREEN}Adding files to Git...${NC}"
git add .

# Commit changes
echo -e "${GREEN}Creating initial commit...${NC}"
git commit -m "Initial commit: Chatto - Real-time Chat Application"

# Get GitHub username
echo -e "${BLUE}Enter your GitHub username:${NC}"
read username

# Get repository name (default: Chatto)
echo -e "${BLUE}Enter repository name (press Enter for 'Chatto'):${NC}"
read repo_name
repo_name=${repo_name:-Chatto}

# Add remote origin
echo -e "${GREEN}Adding remote origin...${NC}"
git remote add origin "https://github.com/$username/$repo_name.git"

# Push to GitHub
echo -e "${GREEN}Pushing to GitHub...${NC}"
git push -u origin main

echo -e "${BLUE}Setup complete! Your code is now on GitHub at: https://github.com/$username/$repo_name${NC}" 