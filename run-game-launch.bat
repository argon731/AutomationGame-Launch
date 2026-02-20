@echo off
echo Running specific test file...
echo.

npx playwright test tests/game-launch-only.spec.ts --headed

echo.
echo Test completed!
pause
