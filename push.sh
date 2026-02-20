#!/bin/bash
cd /c/Users/rafae/OneDrive/Desktop/automation
git config core.autocrlf false
git config core.safecrlf false
git config user.name "argon731"
git config user.email "argon731@github.com"
git add . 2>/dev/null
git commit -m "Initial commit: Automation Game Launch project"
git branch -M main  
git remote remove origin 2>/dev/null
git remote add origin https://github.com/argon731/AutomationGame-Launch.git
git push -u origin main
