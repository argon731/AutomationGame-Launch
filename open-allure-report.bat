@echo off
echo Generating Allure Report...
echo.

echo Step 1: Generating report...
allure generate allure-results --clean -o allure-report

echo.
echo Step 2: Opening report...
allure open allure-report

pause
