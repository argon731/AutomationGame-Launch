

// import { test, expect } from '@playwright/test';
// import { allure } from 'allure-playwright';
// import * as fs from 'fs';
// import * as path from 'path';
// import ExcelJS from 'exceljs';
// import { exec } from 'child_process';
// import cv from '@techstark/opencv-js';
// import { Jimp } from 'jimp';
// import { games, provider } from './Evoplay';

// // Initialize OpenCV
// let cvReady = false;
// const initCV = async () => {
//   if (cvReady) return;
//   await new Promise<void>((resolve) => {
//     if (cv.Mat) {
//       cvReady = true;
//       resolve();
//     } else {
//       cv.onRuntimeInitialized = () => {
//         cvReady = true;
//         console.log('✅ OpenCV initialized');
//         resolve();
//       };
//     }
//   });
// };

// // Fast template matching using OpenCV
// async function findImageInScreenshot(
//   screenshotBuffer: Buffer,
//   templatePath: string,
//   threshold: number = 0.01  // Set to 1% threshold
// ): Promise<{ x: number; y: number; found: boolean; confidence: number }> {
//   try {
//     await initCV();
//     const startTime = Date.now();
    
//     // Read images using Jimp first, then convert to OpenCV Mat
//     const screenshot = await Jimp.read(screenshotBuffer);
//     const template = await Jimp.read(templatePath);
    
//     // Convert Jimp to OpenCV Mat
//     const screenshotMat = cv.matFromImageData({
//       data: screenshot.bitmap.data,
//       width: screenshot.width,
//       height: screenshot.height
//     });
    
//     const templateMat = cv.matFromImageData({
//       data: template.bitmap.data,
//       width: template.width,
//       height: template.height
//     });
    
//     // Perform template matching
//     const result = new cv.Mat();
//     const mask = new cv.Mat();
//     cv.matchTemplate(screenshotMat, templateMat, result, cv.TM_CCOEFF_NORMED, mask);
    
//     // Find best match
//     const minMax = cv.minMaxLoc(result, mask);
//     const confidence = minMax.maxVal;
//     const location = minMax.maxLoc;
    
//     const centerX = location.x + Math.floor(template.width / 2);
//     const centerY = location.y + Math.floor(template.height / 2);
    
//     // Cleanup
//     screenshotMat.delete();
//     templateMat.delete();
//     result.delete();
//     mask.delete();
    
//     console.log(`⚡ OpenCV match in ${Date.now() - startTime}ms - ${(confidence * 100).toFixed(1)}%`);
    
//     if (confidence >= threshold) {
//       console.log(`✅ Template score: ${(confidence * 100).toFixed(2)}% (threshold ${(threshold * 100).toFixed(2)}%)`);
//       return { x: centerX, y: centerY, found: true, confidence };
//     }
    
//     return { x: 0, y: 0, found: false, confidence };
//   } catch (error) {
//     console.log(`❌ OpenCV Error: ${error}`);
//     return { x: 0, y: 0, found: false, confidence: 0 };
//   }
// }

// // ========================================
// // PARALLEL TEMPLATE MATCHING SYSTEM
// // ========================================

// interface TemplateMatchResult {
//   templateName: string;
//   templatePath: string;
//   isMatched: boolean;
//   confidence: number;
//   x: number;
//   y: number;
//   matchTime: number;
// }

// interface ParallelMatchOptions {
//   threshold?: number;
//   stopOnFirstMatch?: boolean;
//   templatesDir?: string;
//   includePatterns?: RegExp[];  // Filter templates by name pattern
//   excludePatterns?: RegExp[];  // Exclude templates by name pattern
// }

// /**
//  * Check all templates in parallel against a single screenshot
//  * @param target - Playwright page or popup to screenshot
//  * @param options - Configuration options
//  * @returns Results containing matched/unmatched templates with confidence scores
//  */
// async function checkAllTemplatesParallel(
//   target: any,
//   options: ParallelMatchOptions = {}
// ): Promise<{
//   screenshot: Buffer;
//   matched: TemplateMatchResult[];
//   unmatched: TemplateMatchResult[];
//   totalTemplates: number;
//   totalMatched: number;
//   executionTime: number;
// }> {
//   const startTime = Date.now();
  
//   const {
//     threshold = 0.01,
//     stopOnFirstMatch = false,
//     templatesDir = path.join(process.cwd(), 'templates'),
//     includePatterns = [],
//     excludePatterns = []
//   } = options;
  
//   console.log(`\n🔍 === PARALLEL TEMPLATE MATCHING ===`);
//   console.log(`📂 Templates directory: ${templatesDir}`);
//   console.log(`🎯 Threshold: ${(threshold * 100).toFixed(1)}%`);
//   console.log(`⚡ Stop on first match: ${stopOnFirstMatch}`);
  
//   try {
//     // Verify templates directory exists
//     if (!fs.existsSync(templatesDir)) {
//       throw new Error(`Templates directory not found: ${templatesDir}`);
//     }
    
//     // Take single screenshot
//     console.log(`📸 Taking screenshot...`);
//     const screenshotStartTime = Date.now();
//     const screenshot = await target.screenshot();
//     console.log(`✅ Screenshot captured in ${Date.now() - screenshotStartTime}ms`);
    
//     // Load all template files
//     let templateFiles = fs.readdirSync(templatesDir).filter(file => 
//       file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
//     );
    
//     if (templateFiles.length === 0) {
//       throw new Error(`No template images found in: ${templatesDir}`);
//     }
    
//     // Apply include/exclude filters
//     if (includePatterns.length > 0) {
//       templateFiles = templateFiles.filter(file => 
//         includePatterns.some(pattern => pattern.test(file))
//       );
//     }
    
//     if (excludePatterns.length > 0) {
//       templateFiles = templateFiles.filter(file => 
//         !excludePatterns.some(pattern => pattern.test(file))
//       );
//     }
    
//     console.log(`📋 Found ${templateFiles.length} template(s) to check`);
//     console.log(`   Templates: ${templateFiles.slice(0, 5).join(', ')}${templateFiles.length > 5 ? '...' : ''}`);
    
//     // Create parallel matching promises
//     const matchPromises = templateFiles.map(async (templateFile): Promise<TemplateMatchResult> => {
//       const templatePath = path.join(templatesDir, templateFile);
//       const matchStartTime = Date.now();
      
//       try {
//         const result = await findImageInScreenshot(screenshot, templatePath, threshold);
//         const matchTime = Date.now() - matchStartTime;
        
//         return {
//           templateName: templateFile,
//           templatePath: templatePath,
//           isMatched: result.found,
//           confidence: result.confidence,
//           x: result.x,
//           y: result.y,
//           matchTime: matchTime
//         };
//       } catch (error) {
//         console.log(`⚠️ Error matching ${templateFile}: ${error}`);
//         return {
//           templateName: templateFile,
//           templatePath: templatePath,
//           isMatched: false,
//           confidence: 0,
//           x: 0,
//           y: 0,
//           matchTime: Date.now() - matchStartTime
//         };
//       }
//     });
    
//     // Execute all matches in parallel
//     let results: TemplateMatchResult[];
    
//     if (stopOnFirstMatch) {
//       console.log(`⚡ Racing templates (stop on first match)...`);
//       // Use Promise.race to stop on first match
//       results = await new Promise<TemplateMatchResult[]>(async (resolve) => {
//         const allResults: TemplateMatchResult[] = [];
//         let resolved = false;
        
//         await Promise.all(
//           matchPromises.map(async (promise) => {
//             const result = await promise;
//             allResults.push(result);
            
//             if (result.isMatched && !resolved) {
//               resolved = true;
//               console.log(`🎯 First match found: ${result.templateName} (${(result.confidence * 100).toFixed(1)}%)`);
//               resolve(allResults);
//             }
//           })
//         );
        
//         if (!resolved) {
//           resolve(allResults);
//         }
//       });
//     } else {
//       console.log(`🔄 Checking all templates in parallel...`);
//       results = await Promise.all(matchPromises);
//     }
    
//     // Separate matched and unmatched
//     const matched = results.filter(r => r.isMatched).sort((a, b) => b.confidence - a.confidence);
//     const unmatched = results.filter(r => !r.isMatched);
    
//     const executionTime = Date.now() - startTime;
    
//     // Log summary
//     console.log(`\n📊 === MATCHING RESULTS ===`);
//     console.log(`✅ Matched: ${matched.length}/${results.length} templates`);
//     console.log(`❌ Unmatched: ${unmatched.length}`);
//     console.log(`⏱️  Total execution time: ${executionTime}ms`);
    
//     if (matched.length > 0) {
//       console.log(`\n🎯 Matched Templates (sorted by confidence):`);
//       matched.forEach((m, idx) => {
//         console.log(`   ${idx + 1}. ${m.templateName} - ${(m.confidence * 100).toFixed(2)}% at (${m.x}, ${m.y}) [${m.matchTime}ms]`);
//       });
//     } else {
//       console.log(`⚠️ No templates matched above ${(threshold * 100).toFixed(1)}% threshold`);
//     }
    
//     return {
//       screenshot,
//       matched,
//       unmatched,
//       totalTemplates: results.length,
//       totalMatched: matched.length,
//       executionTime
//     };
    
//   } catch (error) {
//     const executionTime = Date.now() - startTime;
//     console.log(`❌ Parallel template matching failed: ${error}`);
    
//     return {
//       screenshot: Buffer.from(''),
//       matched: [],
//       unmatched: [],
//       totalTemplates: 0,
//       totalMatched: 0,
//       executionTime
//     };
//   }
// }

// /**
//  * Detect game UI state using parallel template matching
//  * Common use cases: loading screen, ready screen, spin-ready screen
//  * @param target - Playwright page or popup
//  * @param statePatterns - Map of state names to template name patterns
//  * @param threshold - Confidence threshold (default 1%)
//  * @returns Detected state name or null
//  */
// async function detectGameState(
//   target: any,
//   statePatterns: Record<string, RegExp[]>,
//   threshold: number = 0.01
// ): Promise<{ state: string | null; confidence: number; matchedTemplate: string | null }> {
//   console.log(`\n🎮 Detecting game state...`);
  
//   try {
//     const screenshot = await target.screenshot();
//     const templatesDir = path.join(process.cwd(), 'templates');
    
//     // Check each state's templates
//     for (const [stateName, patterns] of Object.entries(statePatterns)) {
//       console.log(`🔍 Checking for state: ${stateName}`);
      
//       const templateFiles = fs.readdirSync(templatesDir).filter(file => 
//         (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) &&
//         patterns.some(pattern => pattern.test(file))
//       );
      
//       if (templateFiles.length === 0) {
//         console.log(`⚠️ No templates found for state: ${stateName}`);
//         continue;
//       }
      
//       // Check all templates for this state in parallel
//       const matchPromises = templateFiles.map(async (file) => {
//         const templatePath = path.join(templatesDir, file);
//         const result = await findImageInScreenshot(screenshot, templatePath, threshold);
//         return { file, ...result };
//       });
      
//       const results = await Promise.all(matchPromises);
//       const bestMatch = results.reduce((best, current) => 
//         current.confidence > best.confidence ? current : best
//       );
      
//       if (bestMatch.found) {
//         console.log(`✅ State detected: ${stateName} (${bestMatch.file}, ${(bestMatch.confidence * 100).toFixed(1)}%)`);
//         return {
//           state: stateName,
//           confidence: bestMatch.confidence,
//           matchedTemplate: bestMatch.file
//         };
//       }
//     }
    
//     console.log(`❌ No game state detected`);
//     return { state: null, confidence: 0, matchedTemplate: null };
    
//   } catch (error) {
//     console.log(`❌ Game state detection error: ${error}`);
//     return { state: null, confidence: 0, matchedTemplate: null };
//   }
// }

// // Wait for network to be idle (no requests for specified time)
// async function waitForNetworkIdle(
//   target: any,
//   idleTime: number = 2000,
//   timeout: number = 30000
// ): Promise<void> {
//   return new Promise((resolve) => {
//     let lastRequestTime = Date.now();
//     let requestCount = 0;
//     let checkInterval: NodeJS.Timeout;
//     let timeoutTimer: NodeJS.Timeout;
    
//     const onRequest = () => {
//       requestCount++;
//       lastRequestTime = Date.now();
//     };
    
//     const onResponse = () => {
//       requestCount = Math.max(0, requestCount - 1);
//       lastRequestTime = Date.now();
//     };
    
//     target.on('request', onRequest);
//     target.on('response', onResponse);
//     target.on('requestfinished', onResponse);
//     target.on('requestfailed', onResponse);
    
//     const cleanup = () => {
//       clearInterval(checkInterval);
//       clearTimeout(timeoutTimer);
//       target.off('request', onRequest);
//       target.off('response', onResponse);
//       target.off('requestfinished', onResponse);
//       target.off('requestfailed', onResponse);
//     };
    
//     checkInterval = setInterval(() => {
//       const timeSinceLastRequest = Date.now() - lastRequestTime;
//       if (requestCount === 0 && timeSinceLastRequest >= idleTime) {
//         console.log(`🌐 Network idle detected (no activity for ${idleTime}ms)`);
//         cleanup();
//         resolve();
//       }
//     }, 100);
    
//     timeoutTimer = setTimeout(() => {
//       console.log(`⏱️ Network idle timeout reached (${timeout}ms)`);
//       cleanup();
//       resolve();
//     }, timeout);
//   });
// }

// // Wait for any network activity within a time window
// async function waitForNetworkActivity(
//   target: any,
//   timeout: number = 3000
// ): Promise<boolean> {
//   return new Promise((resolve) => {
//     let resolved = false;
//     let timer: NodeJS.Timeout;
//     const cleanup = (result: boolean) => {
//       if (resolved) return;
//       resolved = true;
//       clearTimeout(timer);
//       target.off('request', onActivity);
//       target.off('response', onActivity);
//       target.off('requestfinished', onActivity);
//       target.off('requestfailed', onActivity);
//       resolve(result);
//     };
//     const onActivity = () => cleanup(true);
//     target.on('request', onActivity);
//     target.on('response', onActivity);
//     target.on('requestfinished', onActivity);
//     target.on('requestfailed', onActivity);
//     timer = setTimeout(() => {
//       console.log(`⚠️ No network activity detected within ${timeout}ms`);
//       cleanup(false);
//     }, timeout);
//   });
// }

// // Click helper that keeps clicking until network activity is seen or timeout reached
// async function clickWithNetworkValidation(
//   target: any,
//   x: number,
//   y: number,
//   maxDurationMs: number = 8000,
//   perAttemptTimeoutMs: number = 2000
// ): Promise<boolean> {
//   const deadline = Date.now() + maxDurationMs;
//   let attempt = 1;
//   while (Date.now() < deadline) {
//     const remaining = Math.max(500, deadline - Date.now());
//     const activityTimeout = Math.min(perAttemptTimeoutMs, remaining);
//     console.log(`🖱️ Click attempt #${attempt} at (${x}, ${y}) [activity timeout: ${activityTimeout}ms]`);
//     try {
//       const activityPromise = waitForNetworkActivity(target, activityTimeout);
//       await target.mouse.move(x, y);
//       await target.waitForTimeout(100);
//       await target.mouse.click(x, y);
//       const activityDetected = await activityPromise;
//       if (activityDetected) {
//         console.log('📡 Network activity detected after click.');
//         return true;
//       }
//       console.log('⚠️ Still no network activity after click, retrying...');
//       await target.waitForTimeout(250);
//     } catch (error) {
//       console.log(`❌ Click attempt failed: ${error}`);
//     }
//     attempt++;
//   }
//   console.log('❌ Unable to trigger network activity before timeout elapsed.');
//   return false;
// }

// // Function to check balance via API
// // Check balance from API stored in page
// async function getBalanceFromPage(page: any): Promise<number | null> {
//   try {
//     const parseBalanceText = (text: string): number | null => {
//       const normalized = text.replace(/\s+/g, ' ').trim();
//       const numeric = Number.parseFloat(normalized.replace(/[^0-9.+\-]/g, ''));
//       return Number.isFinite(numeric) ? numeric : null;
//     };

//     // 1) Prefer the balance captured from login response and stored on window
//     const storedBalance = await page
//       .evaluate(() => (window as any).__currentBalance ?? null)
//       .catch(() => null);

//     if (typeof storedBalance === 'number' && Number.isFinite(storedBalance)) {
//       console.log(`💰 Current balance (stored): ${storedBalance}`);
//       return storedBalance;
//     }

//     // 2) Fallback: read from UI (requested XPath)
//     const balanceXPath = "//div[contains(@class,'p-2 lg:p-3')]//p[1]";
//     const balanceText = await page
//       .locator(balanceXPath)
//       .first()
//       .textContent({ timeout: 2000 })
//       .catch(() => null);

//     if (balanceText) {
//       const parsed = parseBalanceText(balanceText);
//       if (parsed !== null) {
//         console.log(`💰 Current balance (UI): ${parsed}`);
//         return parsed;
//       }
//       console.log(`⚠️ Could not parse balance text: "${balanceText.trim()}"`);
//     }

//     return null;
//   } catch (error) {
//     console.log(`❌ Balance check error: ${error}`);
//     return null;
//   }
// }

// // Set balance in page context
// async function setBalanceInPage(page: any, balance: number): Promise<void> {
//   try {
//     await page.evaluate((bal: number) => {
//       (window as any).__currentBalance = bal;
//     }, balance);
//   } catch (error) {
//     console.log(`❌ Failed to set balance: ${error}`);
//   }
// }

// async function compareBalances(balance1: number | null, balance2: number | null): Promise<{ changed: boolean; diff: number | null }> {
//   if (balance1 === null || balance2 === null) {
//     console.log(`⚠️ Cannot compare balances - one or both are null`);
//     return { changed: false, diff: null };
//   }
  
//   const diff = balance2 - balance1;
//   const changed = Math.abs(diff) > 0.01; // Allow tiny rounding differences
  
//   if (changed) {
//     console.log(`📊 Balance CHANGED: ${balance1.toFixed(2)} → ${balance2.toFixed(2)} (${diff > 0 ? '+' : ''}${diff.toFixed(2)})`);
//   } else {
//     console.log(`📊 Balance UNCHANGED: ${balance1.toFixed(2)}`);
//   }
  
//   return { changed, diff };
// }

// // Fetch balance from API using login credentials
// async function getBalanceFromAPI(page: any): Promise<number | null> {
//   try {
//     console.log(`🔄 Calling /api/login to fetch balance...`);
    
//     const response = await page.evaluate(async () => {
//       try {
//         const res = await fetch('https://demo-api.torrospins.com/api/login', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           body: JSON.stringify({
//             username: 'qa-kate',
//             password: 'test1234'
//           })
//         });
        
//         if (!res.ok) {
//           console.log(`API response not OK: ${res.status}`);
//           return { error: `HTTP ${res.status}`, balance: null };
//         }
        
//         const data = await res.json();
//         const balance = data?.user?.balance;
        
//         if (typeof balance === 'number') {
//           return { error: null, balance: balance };
//         }
        
//         return { error: 'Balance not found in response', balance: null };
//       } catch (e: any) {
//         return { error: e.message || 'Network error', balance: null };
//       }
//     });
    
//     if (response.error) {
//       console.log(`⚠️ API balance fetch error: ${response.error}`);
//       return null;
//     }
    
//     if (response.balance !== null && typeof response.balance === 'number') {
//       console.log(`💰 Balance from API (user.balance): ${response.balance.toFixed(2)}`);
//       return response.balance;
//     }
    
//     return null;
//   } catch (error) {
//     console.log(`❌ API balance fetch error: ${error}`);
//     return null;
//   }
// }

// // ========================================
// // MULTI-SIGNAL RACING ARCHITECTURE
// // ========================================

// // Wait for game to fully launch using multiple signals (RACE TO FIRST)
// async function waitForGameLaunch(
//   page: any,
//   popup: any,
//   options: {
//     timeout?: number;
//     minStableTime?: number;
//   } = {}
// ): Promise<{ success: boolean; signal: string; time: number }> {
//   const timeout = options.timeout ?? 15000;
//   const minStableTime = options.minStableTime ?? 1000;
//   const startTime = Date.now();
  
//   console.log(`🎮 Waiting for game launch (timeout: ${timeout}ms)...`);
  
//   const target = popup && !popup.isClosed() ? popup : page;
//   const signals: { name: string; promise: Promise<string> }[] = [];
  
//   // Signal 1: API Success Response (200)
//   signals.push({
//     name: 'API-200',
//     promise: new Promise<string>((resolve) => {
//       const handler = (response: any) => {
//         const url = response.url();
//         if ((url.includes('demo-api.torrospins.com') || url.includes('client.petros04.com')) && 
//             response.status() === 200) {
//           page.off('response', handler);
//           popup?.off('response', handler);
//           resolve('API-200');
//         }
//       };
//       page.on('response', handler);
//       if (popup) popup.on('response', handler);
//     })
//   });
  
//   // Signal 2: WebSocket Connection (if game uses WS)
//   signals.push({
//     name: 'WebSocket',
//     promise: new Promise<string>((resolve) => {
//       const handler = (ws: any) => {
//         page.off('websocket', handler);
//         popup?.off('websocket', handler);
//         resolve('WebSocket');
//       };
//       page.on('websocket', handler);
//       if (popup) popup.on('websocket', handler);
//     })
//   });
  
//   // Signal 3: Popup window opened
//   if (popup) {
//     signals.push({
//       name: 'Popup',
//       promise: (async () => {
//         await popup.waitForLoadState('domcontentloaded', { timeout }).catch(() => {});
//         return 'Popup';
//       })()
//     });
//   }
  
//   // Signal 4: Network becomes idle after activity
//   signals.push({
//     name: 'NetworkIdle',
//     promise: (async () => {
//       await waitForNetworkIdle(target, minStableTime, timeout);
//       return 'NetworkIdle';
//     })()
//   });
  
//   // Signal 5: Game canvas/iframe appears
//   signals.push({
//     name: 'GameElement',
//     promise: (async () => {
//       await target.waitForSelector('canvas, iframe[src*="game"], iframe[src*="play"]', {
//         timeout: timeout,
//         state: 'visible'
//       }).catch(() => {});
//       return 'GameElement';
//     })()
//   });
  
//   // Timeout fallback
//   signals.push({
//     name: 'Timeout',
//     promise: new Promise<string>((resolve) => {
//       setTimeout(() => resolve('Timeout'), timeout);
//     })
//   });
  
//   try {
//     // Race all signals - first one wins!
//     const winningSignal = await Promise.race(signals.map(s => s.promise));
//     const elapsedTime = Date.now() - startTime;
    
//     if (winningSignal === 'Timeout') {
//       console.log(`⏱️ Game launch timed out after ${timeout}ms`);
//       return { success: false, signal: 'Timeout', time: elapsedTime };
//     }
    
//     console.log(`✅ Game launched! Signal: ${winningSignal} (${elapsedTime}ms)`);
    
//     // Small stabilization wait after first signal
//     await target.waitForTimeout(500);
    
//     return { success: true, signal: winningSignal, time: elapsedTime };
//   } catch (error) {
//     const elapsedTime = Date.now() - startTime;
//     console.log(`❌ Game launch error: ${error}`);
//     return { success: false, signal: 'Error', time: elapsedTime };
//   }
// }

// // Wait for spin to complete using multiple signals (RACE TO FIRST)
// async function waitForSpinComplete(
//   page: any,
//   popup: any,
//   options: {
//     balanceBefore: number | null;
//     timeout?: number;
//     networkIdleTime?: number;
//   }
// ): Promise<{ complete: boolean; signal: string; balanceAfter: number | null; time: number }> {
//   const timeout = options.timeout ?? 10000;
//   const networkIdleTime = options.networkIdleTime ?? 800;
//   const startTime = Date.now();
  
//   console.log(`🎰 Waiting for spin to complete (timeout: ${timeout}ms)...`);
  
//   const target = popup && !popup.isClosed() ? popup : page;
//   const signals: { name: string; promise: Promise<string> }[] = [];
  
//   // Signal 1: Balance API response
//   signals.push({
//     name: 'BalanceAPI',
//     promise: new Promise<string>((resolve) => {
//       const handler = async (response: any) => {
//         const url = response.url();
//         if (url.includes('balance') || url.includes('account') || url.includes('wallet')) {
//           page.off('response', handler);
//           popup?.off('response', handler);
          
//           // Small delay to let page process the balance
//           await page.waitForTimeout(200);
//           const newBalance = await getBalanceFromPage(page);
          
//           if (newBalance !== null && options.balanceBefore !== null) {
//             if (Math.abs(newBalance - options.balanceBefore) > 0.01) {
//               resolve('BalanceAPI');
//               return;
//             }
//           }
//         }
//       };
//       page.on('response', handler);
//       if (popup) popup.on('response', handler);
//     })
//   });
  
//   // Signal 2: Network becomes idle (no activity)
//   signals.push({
//     name: 'NetworkIdle',
//     promise: (async () => {
//       await waitForNetworkIdle(target, networkIdleTime, timeout);
//       return 'NetworkIdle';
//     })()
//   });
  
//   // Signal 3: Balance changes in UI (poll every 500ms)
//   signals.push({
//     name: 'BalanceUI',
//     promise: (async () => {
//       const pollInterval = 500;
//       const maxPolls = Math.floor(timeout / pollInterval);
      
//       for (let i = 0; i < maxPolls; i++) {
//         await page.waitForTimeout(pollInterval);
//         const currentBalance = await getBalanceFromPage(page);
        
//         if (currentBalance !== null && options.balanceBefore !== null) {
//           if (Math.abs(currentBalance - options.balanceBefore) > 0.01) {
//             return 'BalanceUI';
//           }
//         }
//       }
//       return 'BalanceUI-Timeout';
//     })()
//   });
  
//   // Signal 4: WebSocket message (spin result)
//   signals.push({
//     name: 'WebSocket',
//     promise: new Promise<string>((resolve) => {
//       const handler = (ws: any) => {
//         ws.on('framereceived', (event: any) => {
//           const payload = event.payload;
//           // Check if payload contains spin result indicators
//           if (payload && (payload.includes('result') || payload.includes('win') || payload.includes('balance'))) {
//             page.off('websocket', handler);
//             popup?.off('websocket', handler);
//             resolve('WebSocket');
//           }
//         });
//       };
//       page.on('websocket', handler);
//       if (popup) popup.on('websocket', handler);
//     })
//   });
  
//   // Timeout fallback
//   signals.push({
//     name: 'Timeout',
//     promise: new Promise<string>((resolve) => {
//       setTimeout(() => resolve('Timeout'), timeout);
//     })
//   });
  
//   try {
//     // Race all signals - first one wins!
//     const winningSignal = await Promise.race(signals.map(s => s.promise));
//     const elapsedTime = Date.now() - startTime;
    
//     // Get final balance
//     const balanceAfter = await getBalanceFromPage(page);
    
//     if (winningSignal === 'Timeout' || winningSignal === 'BalanceUI-Timeout') {
//       console.log(`⏱️ Spin timed out after ${timeout}ms`);
//       return { complete: false, signal: winningSignal, balanceAfter, time: elapsedTime };
//     }
    
//     console.log(`✅ Spin completed! Signal: ${winningSignal} (${elapsedTime}ms)`);
    
//     return { complete: true, signal: winningSignal, balanceAfter, time: elapsedTime };
//   } catch (error) {
//     const elapsedTime = Date.now() - startTime;
//     console.log(`❌ Spin completion error: ${error}`);
//     const balanceAfter = await getBalanceFromPage(page);
//     return { complete: false, signal: 'Error', balanceAfter, time: elapsedTime };
//   }
// }

// // Two-stage game workflow with OpenCV spin detection
// async function clickSpinButton(
//   page: any,
//   popup: any,
//   gameName: string,
//   preloadedScreenshot?: Buffer
// ): Promise<{ success: boolean; coordinates?: { x: number; y: number } }> {
//   const templatesDir = path.join(process.cwd(), 'templates');
  
//   // Check if templates directory exists
//   if (!fs.existsSync(templatesDir)) {
//     console.log(`⚠️ Templates directory not found at: ${templatesDir}`);
//     return { success: false };
//   }
  
//   // Get all image files from templates folder
//   const templateFiles = fs.readdirSync(templatesDir).filter(file => 
//     file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
//   );
  
//   if (templateFiles.length === 0) {
//     console.log(`⚠️ No template images found in: ${templatesDir}`);
//     return { success: false };
//   }
  
//   // Use ALL templates for spin detection
//   const candidateTemplates = templateFiles;
  
//   console.log(`🔍 Checking ALL ${candidateTemplates.length} template(s): ${candidateTemplates.join(', ')}`);
  
//   try {
//     const target = popup && !popup.isClosed() ? popup : page;
    
//     // Get device pixel ratio for coordinate conversion
//     const devicePixelRatio = await target.evaluate(() => window.devicePixelRatio || 1).catch(() => 1);
//     const pixelRatio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
//     console.log(`🖥️ Device pixel ratio: ${pixelRatio}`);
    
//     // Store spin button coordinates for export
//     let spinButtonCoordinates: { x: number; y: number } | null = null;
    
//     // Get initial balance from API BEFORE any spins (for final comparison)
//     console.log(`💰 Fetching initial balance from API...`);
//     const initialBalance = await getBalanceFromAPI(page);
//     if (initialBalance !== null) {
//       console.log(`💰 Initial balance (API): ${initialBalance.toFixed(2)}`);
//     } else {
//       console.log(`⚠️ Could not fetch initial balance from API`);
//     }
    
//     // ========================================
//     // STAGE 1: PRE-GAME - Click first spin to enter real game
//     // ========================================
//     console.log(`\n🎮 === STAGE 1: PRE-GAME ===`);
//     console.log(`⏳ Detecting Spin button and "Don't Show Next Time" with OpenCV...`);
    
//     // Use preloaded screenshot or take new one
//     let stage1Screenshot: Buffer;
//     if (preloadedScreenshot) {
//       console.log(`📸 Using preloaded screenshot for Stage 1`);
//       stage1Screenshot = preloadedScreenshot;
//     } else {
//       await waitForNetworkIdle(target, 1000, 10000);
//       stage1Screenshot = await target.screenshot();
//     }
    
//     // Find spin button with OpenCV
//     let stage1Match: { x: number; y: number; confidence: number } | null = null;
//     for (const templateFile of candidateTemplates) {
//       const templatePath = path.join(templatesDir, templateFile);
//       const result = await findImageInScreenshot(stage1Screenshot, templatePath);
//       if (result.found && (!stage1Match || result.confidence > stage1Match.confidence)) {
//         stage1Match = { x: result.x, y: result.y, confidence: result.confidence };
//       }
//     }
    
//     // Find "Don't Show Next Time" checkbox with OpenCV
//     const dontShowTemplates = templateFiles.filter((f) => /dont|show|next|time|checkbox/i.test(f));
//     let dontShowMatch: { x: number; y: number; confidence: number } | null = null;
    
//     if (dontShowTemplates.length > 0) {
//       console.log(`🔍 Looking for "Don't Show Next Time" checkbox...`);
//       for (const templateFile of dontShowTemplates) {
//         const templatePath = path.join(templatesDir, templateFile);
//         const result = await findImageInScreenshot(stage1Screenshot, templatePath);
//         if (result.found && (!dontShowMatch || result.confidence > dontShowMatch.confidence)) {
//           dontShowMatch = { x: result.x, y: result.y, confidence: result.confidence };
//           console.log(`✅ Found "Don't Show Next Time" template: ${templateFile}`);
//         }
//       }
//     }
    
//     // Also check for any template that's not spin-related (might be the checkbox)
//     if (!dontShowMatch) {
//       const nonSpinTemplates = templateFiles.filter((f) => !/spin/i.test(f));
//       for (const templateFile of nonSpinTemplates) {
//         const templatePath = path.join(templatesDir, templateFile);
//         const result = await findImageInScreenshot(stage1Screenshot, templatePath);
//         if (result.found && (!dontShowMatch || result.confidence > dontShowMatch.confidence)) {
//           dontShowMatch = { x: result.x, y: result.y, confidence: result.confidence };
//           console.log(`✅ Found checkbox template: ${templateFile}`);
//         }
//       }
//     }
    
//     if (!stage1Match) {
//       console.log(`⚠️ Stage 1: No spin button found`);
//       return { success: false };
//     }
    
//     const stage1ClickX = Math.floor(stage1Match.x / pixelRatio);
//     const stage1ClickY = Math.floor(stage1Match.y / pixelRatio);
//     console.log(`🎯 Stage 1: Spin button found at (${stage1ClickX}, ${stage1ClickY}) - Confidence: ${(stage1Match.confidence * 100).toFixed(2)}%`);
    
//     // Store coordinates for export
//     spinButtonCoordinates = { x: stage1ClickX, y: stage1ClickY };
    
//     // Click "Don't Show Next Time" checkbox first if found
//     if (dontShowMatch) {
//       const dontShowClickX = Math.floor(dontShowMatch.x / pixelRatio);
//       const dontShowClickY = Math.floor(dontShowMatch.y / pixelRatio);
//       console.log(`🖱️ Stage 1: Clicking "Don't Show Next Time" at (${dontShowClickX}, ${dontShowClickY}) - Confidence: ${(dontShowMatch.confidence * 100).toFixed(2)}%`);
//       await target.mouse.move(dontShowClickX, dontShowClickY);
//       await target.mouse.click(dontShowClickX, dontShowClickY);
//       await target.waitForTimeout(200);
//     }
    
//     // Click first spin to enter real game (does NOT count toward 3 spins)
//     console.log(`🖱️ Stage 1: Clicking spin button to enter real game...`);
//     await target.mouse.move(stage1ClickX, stage1ClickY);
//     await target.mouse.click(stage1ClickX, stage1ClickY);
    
//     // Wait for real game to load using network idle (short polling)
//     console.log(`⏳ Stage 1: Waiting for real game to load...`);
//     await waitForNetworkIdle(target, 1500, 15000);
//     console.log(`✅ Stage 1: Real game loaded`);
    
//     // ========================================
//     // STAGE 2: REAL GAME - Perform exactly 3 spins
//     // ========================================
//     console.log(`\n🎰 === STAGE 2: REAL GAME (3 Spins) ===`);
    
//     for (let spinNum = 1; spinNum <= 3; spinNum++) {
//       console.log(`\n🔄 --- Spin #${spinNum}/3 ---`);
      
//       // Take fresh screenshot for spin button detection
//       console.log(`📸 Taking screenshot for spin detection...`);
//       const spinScreenshot = await target.screenshot();
      
//       // Detect spin button with OpenCV
//       let spinMatch: { x: number; y: number; confidence: number } | null = null;
//       for (const templateFile of candidateTemplates) {
//         const templatePath = path.join(templatesDir, templateFile);
//         const result = await findImageInScreenshot(spinScreenshot, templatePath);
//         if (result.found && (!spinMatch || result.confidence > spinMatch.confidence)) {
//           spinMatch = { x: result.x, y: result.y, confidence: result.confidence };
//         }
//       }
      
//       if (!spinMatch) {
//         console.log(`⚠️ Spin #${spinNum}: No spin button found, retrying...`);
//         // Short polling: retry detection
//         for (let retry = 0; retry < 5; retry++) {
//           await target.waitForTimeout(200); // Short polling interval
//           const retryScreenshot = await target.screenshot();
//           for (const templateFile of candidateTemplates) {
//             const templatePath = path.join(templatesDir, templateFile);
//             const result = await findImageInScreenshot(retryScreenshot, templatePath);
//             if (result.found && (!spinMatch || result.confidence > spinMatch.confidence)) {
//               spinMatch = { x: result.x, y: result.y, confidence: result.confidence };
//             }
//           }
//           if (spinMatch) break;
//         }
        
//         if (!spinMatch) {
//           console.log(`❌ Spin #${spinNum}: Failed to detect spin button after retries`);
//           continue;
//         }
//       }
      
//       const spinClickX = Math.floor(spinMatch.x / pixelRatio);
//       const spinClickY = Math.floor(spinMatch.y / pixelRatio);
//       console.log(`🎯 Spin #${spinNum}: Button at (${spinClickX}, ${spinClickY}) - Confidence: ${(spinMatch.confidence * 100).toFixed(2)}%`);
      
//       // Click spin button
//       console.log(`🖱️ Spin #${spinNum}: Clicking...`);
//       await target.mouse.move(spinClickX, spinClickY);
//       await target.mouse.click(spinClickX, spinClickY);
      
//       // Wait for spin to complete using network idle (no balance checking)
//       console.log(`⏳ Spin #${spinNum}: Waiting for spin to complete...`);
//       await waitForNetworkIdle(target, 800, 10000);
//       console.log(`✅ Spin #${spinNum}: Complete`);
//     }
    
//     console.log(`\n✅ All 3 spins completed for ${gameName}`);
    
//     // ========================================
//     // STAGE 3: CLOSE GAME & BALANCE CHECK
//     // ========================================
//     console.log(`\n💰 === STAGE 3: BALANCE CHECK ===`);
    
//     // Close the game (popup or modal)
//     console.log(`🚪 Closing game...`);
//     if (popup && !popup.isClosed()) {
//       await popup.close().catch(() => {});
//       console.log(`✅ Popup closed`);
//     }
    
//     // Short wait for balance to update
//     await page.waitForTimeout(1000);
    
//     // Fetch final balance from API and compare
//     console.log(`🔄 Fetching final balance from API...`);
//     const finalBalance = await getBalanceFromAPI(page);
    
//     if (finalBalance !== null && initialBalance !== null) {
//       const balanceDiff = finalBalance - initialBalance;
//       console.log(`💰 Balance BEFORE spins: ${initialBalance.toFixed(2)}`);
//       console.log(`💰 Balance AFTER spins: ${finalBalance.toFixed(2)}`);
      
//       if (Math.abs(balanceDiff) > 0.01) {
//         console.log(`📊 Balance CHANGED: ${balanceDiff > 0 ? '+' : ''}${balanceDiff.toFixed(2)}`);
//       } else {
//         console.log(`📊 Balance UNCHANGED`);
//       }
//     } else if (finalBalance !== null) {
//       console.log(`💰 Final balance: ${finalBalance.toFixed(2)}`);
//     } else {
//       console.log(`⚠️ Could not fetch final balance from API`);
//     }
    
//     // Return success with spin button coordinates
//     return { 
//       success: true, 
//       coordinates: spinButtonCoordinates || undefined 
//     };
    
//   } catch (error) {
//     console.log(`❌ Error in game workflow: ${error}`);
//     return { success: false };
//   }
// }

// // Games and provider are imported from ./game-config.ts

// test.describe('Game Launch Tests', () => {
//   test.setTimeout(3600000); // 60 minutes per test

//   test('Test all game launches', async ({ page }) => {
//     await page.setViewportSize({ width: 1920, height: 1080 });
//     allure.epic('Game Launch Tests');
//     allure.feature(provider);

//     let apiStatusCode: number | null = null;
//     let apiResponseTime: number | null = null;
//     let requestStartTime: number | null = null;
//     let accessToken: string = '';

//     // Track games status
//     const openedGames: { name: string; responseTime: number | null; screenshot?: Buffer }[] = [];
//     const notOpenedGames: { name: string; reason: string; screenshot?: Buffer }[] = [];
//     const gamesNotFound: { name: string; screenshot?: Buffer }[] = [];
    
//     // Track spin button coordinates for each game
//     const spinCoordinates: { name: string; x: number; y: number; coordinateKey: string }[] = [];

//     // Capture API request start time
//     page.on('request', (request) => {
//       if (request.url().includes('demo-api.torrospins.com/api/player/request-link')) {
//         requestStartTime = Date.now();
//       }
//     });

//     // Capture API response for verification
//     page.on('response', async (response) => {
//       if (response.url().includes('demo-api.torrospins.com/api/player/request-link')) {
//         apiStatusCode = response.status();
//         if (requestStartTime) {
//           apiResponseTime = Date.now() - requestStartTime;
//           console.log('');
//           console.log(`API Response Time: ${apiResponseTime} ms`);
//         }
//       }
      
//       // Capture access token from login
//       if (response.url().includes('/api/login') && response.status() === 200) {
//         try {
//           const loginData = await response.json();
//           accessToken = loginData?.access_token || '';
//           const initialBalance = loginData?.user?.balance;
          
//           if (accessToken) {
//             console.log(`🔑 Access token captured: ${accessToken.substring(0, 20)}...`);
//           }
          
//           if (initialBalance !== undefined) {
//             console.log(`💰 Initial balance: ${initialBalance}`);
//             // Store balance in page context
//             await setBalanceInPage(page, initialBalance);
//           }
//         } catch (e) {
//           console.log(`⚠️ Could not parse login response`);
//         }
//       }
//     });

//     // ----- LOGIN FLOW -----
//     await allure.step('Login to TorroSpin', async () => {
//       await page.goto('https://casino.torrospins.com/');
//       await page.waitForTimeout(5000);

//       await page.click("//button[@id='loginButton']//p[1]");
//       await page.fill("//input[@placeholder='Username or Email *']", "qa-kate");
//       await page.fill("//input[@type='password']", "test1234");
//       await page.locator("text=Remember Me").click();
//       await page.click("//button[contains(@class,'flex justify-center')]");
//       await page.waitForTimeout(2000);
//     });

//     // ----- PROVIDER FILTER -----
//     await allure.step('Apply Provider Filter', async () => {
//       await page.locator("(//button[contains(@class,'text-black text-base')]//span)[2]").click();
//       await page.locator(`//button[contains(.,'${provider}')]`).click();
//       await page.locator("//button[normalize-space(text())='Filter']").click();
//       await page.waitForTimeout(1000);
//     });

//     // ----- LOOP THROUGH GAMES -----
//     console.log('Games that are launching:');
//     games.forEach((game, index) => console.log(`${index + 1}. ${game}`));
//     console.log(`Total games: ${games.length}\n`);

//     for (const gameName of games) {
//       await allure.step(`Processing game: ${gameName}`, async () => {
//         allure.story(gameName);

//         apiStatusCode = null;
//         const searchTerm = gameName.trim();
//         const searchBox = page.getByPlaceholder('Search Games');

//         // Search for the game
//         await allure.step('Search game', async () => {
//           await searchBox.fill(searchTerm);
//           await page.waitForTimeout(500);
//         });

//         // Find game cards
//         const cardNodes = page.locator("(//div[contains(@class,'rounded-[7px] bg-[#141929]')]//div)");
//         await cardNodes.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

//         const totalCards = await cardNodes.count();
//         if (totalCards === 0) {
//           console.log(`� Game not found: ${searchTerm} - No game cards visible`);
//           const screenshot = await page.screenshot();
//           gamesNotFound.push({ name: searchTerm, screenshot: screenshot });
//           await allure.attachment(`Not Found - ${searchTerm}`, screenshot, 'image/png');
//           await allure.attachment(`No cards for: ${searchTerm}`, `No visible game cards found`, 'text/plain');
//           await searchBox.fill('');
//           return;
//         }

//         const maxCards = Math.min(totalCards, 40);
//         let matchedCard: ReturnType<typeof cardNodes.nth> | null = null;

//         for (let i = 0; i < maxCards; i++) {
//           const card = cardNodes.nth(i);
//           const titleEl = card.locator('xpath=.//p[contains(@class,"font-medium line-clamp-1")]').first();
//           const titleText = ((await titleEl.textContent({ timeout: 3000 }).catch(() => '')) ?? '').trim();
          
//           // Skip empty cards
//           if (!titleText) continue;
          
//           console.log(`Card ${i}: "${titleText}"`);
          
//           if (titleText === searchTerm) {
//             matchedCard = card;
//             console.log(`✅ Found match at index ${i}: "${titleText}"`);
//             break;
//           }
//         }

//         if (!matchedCard) {
//           console.log(`🔍 Game not found: ${searchTerm} - No exact match in search results`);
//           const screenshot = await page.screenshot();
//           gamesNotFound.push({ name: searchTerm, screenshot: screenshot });
//           await allure.attachment(`Not Found - ${searchTerm}`, screenshot, 'image/png');
//           await allure.attachment(`No match for: ${searchTerm}`, `No exact match found in top ${maxCards} cards`, 'text/plain');
//           await searchBox.fill('');
//           return;
//         }

//         await matchedCard.scrollIntoViewIfNeeded().catch(() => {});
//         await page.waitForTimeout(300);

//         // ----- HOVER & CLICK PLAY -----
//         await allure.step('Hover and click play', async () => {
//           // Re-verify title before clicking
//           const verifyTitleEl = matchedCard!.locator('xpath=.//p[contains(@class,"font-medium line-clamp-1")]').first();
//           const verifyTitle = ((await verifyTitleEl.textContent({ timeout: 3000 }).catch(() => '')) ?? '').trim();
          
//           if (verifyTitle !== searchTerm) {
//             await allure.attachment(`Title changed: ${searchTerm}`, `Current title: ${verifyTitle}`, 'text/plain');
//             await searchBox.fill('');
//             return;
//           }

//           // Hover on the card with force
//           await matchedCard!.hover({ force: true });
//           await page.waitForTimeout(800);

//           // Find play button within the matched card
//           const playBtn = matchedCard!.locator('xpath=.//button[contains(@class,"shrink-0 py-2.5")]');
//           await playBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

//           if (await playBtn.isVisible()) {
//             const popupPromise = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
//             await playBtn.click();

//             const isLaunchUrl = (u: string) =>
//               u.includes('demo-api.torrospins.com') || u.includes('client.petros04.com');

//             let launchResponse = await page.waitForResponse(r => isLaunchUrl(r.url()), { timeout: 10000 }).catch(() => null);
//             const popup = await popupPromise;

//             if (!launchResponse && popup) {
//               await popup.waitForLoadState('domcontentloaded').catch(() => {});
//               launchResponse = await popup.waitForResponse(r => isLaunchUrl(r.url()), { timeout: 10000 }).catch(() => null);
//               if (popup) await allure.attachment(`Popup URL: ${searchTerm}`, popup.url(), 'text/plain');
//             }

//             // ----- VERIFY STATUS -----
//             if (launchResponse) {
//               const status = launchResponse.status();
//               if (status === 200) {
//                 console.log(`✅ Game launched: ${searchTerm} (Status: 200)`);
                
//                 // Use multi-signal racing to detect game load
//                 const launchResult = await waitForGameLaunch(page, popup, {
//                   timeout: 15000,
//                   minStableTime: 1000
//                 });
                
//                 console.log(`🎮 Game load result - Signal: ${launchResult.signal}, Time: ${launchResult.time}ms`);
                
//                 // Determine the target (popup or page)
//                 const gameTarget = popup && !popup.isClosed() ? popup : page;
                
//                 // Take screenshot immediately after game loads
//                 let successScreenshot: Buffer;
//                 if (popup && !popup.isClosed()) {
//                   await popup.waitForLoadState('load').catch(() => {});
//                   successScreenshot = await popup.screenshot({ fullPage: false });
//                 } else {
//                   // Try to find game iframe in the modal
//                   const gameIframe = page.frameLocator('iframe').first();
//                   const iframeExists = await page.locator('iframe').first().isVisible().catch(() => false);
                  
//                   if (iframeExists) {
//                     // Take screenshot of the modal/iframe container
//                     const modalContainer = page.locator('iframe').first();
//                     successScreenshot = await modalContainer.screenshot();
//                   } else {
//                     // Fallback to full page screenshot
//                     successScreenshot = await page.screenshot({ fullPage: false });
//                   }
//                 }
//                 openedGames.push({ name: searchTerm, responseTime: apiResponseTime, screenshot: successScreenshot });
//                 await allure.attachment(`Screenshot - ${searchTerm}`, successScreenshot, 'image/png');
                
//                 // ----- CLICK SPIN BUTTON -----
//                 await allure.step('Click spin button', async () => {
//                   const spinResult = await clickSpinButton(page, popup, searchTerm, successScreenshot);
//                   if (spinResult.success) {
//                     await allure.attachment(`Spin clicked - ${searchTerm}`, 'Spin button clicked successfully', 'text/plain');
//                     // Take screenshot after spin
//                     const afterSpinTarget = popup && !popup.isClosed() ? popup : page;
//                     const afterSpinScreenshot = await afterSpinTarget.screenshot();
//                     await allure.attachment(`After Spin - ${searchTerm}`, afterSpinScreenshot, 'image/png');
                    
//                     // Store coordinates if found
//                     if (spinResult.coordinates) {
//                       const coordKey = `${spinResult.coordinates.x},${spinResult.coordinates.y}`;
//                       spinCoordinates.push({ 
//                         name: searchTerm, 
//                         x: spinResult.coordinates.x, 
//                         y: spinResult.coordinates.y,
//                         coordinateKey: coordKey
//                       });
//                       console.log(`📍 Stored coordinates for ${searchTerm}: (${spinResult.coordinates.x}, ${spinResult.coordinates.y})`);
//                     }
//                   }
//                 });
//               } else {
//                 const screenshotTarget = popup && !popup.isClosed() ? popup : page;
//                 const screenshot = await screenshotTarget.screenshot();
//                 notOpenedGames.push({ name: searchTerm, reason: `HTTP Status: ${status}`, screenshot: screenshot });
//                 await allure.attachment(`Error - ${searchTerm}`, screenshot, 'image/png');
//                 await allure.attachment(`Status for ${searchTerm}`, `HTTP: ${status}`, 'text/plain');
//                 console.log(`❌ Failed: ${searchTerm} (Status: ${status})`);
//               }
//             } else if (apiStatusCode === 200) {
//               console.log(`✅ Game launched via captured API: ${searchTerm} (Status: 200)`);
              
//               // Use multi-signal racing to detect game load
//               const launchResult = await waitForGameLaunch(page, popup, {
//                 timeout: 15000,
//                 minStableTime: 1000
//               });
              
//               console.log(`🎮 Game load result - Signal: ${launchResult.signal}, Time: ${launchResult.time}ms`);
              
//               // Determine the target (popup or page)
//               const gameTarget = popup && !popup.isClosed() ? popup : page;
              
//               // Take screenshot immediately after game loads
//               let successScreenshot: Buffer;
//               if (popup && !popup.isClosed()) {
//                 await popup.waitForLoadState('load').catch(() => {});
//                 successScreenshot = await popup.screenshot({ fullPage: false });
//               } else {
//                 // Try to find game iframe in the modal
//                 const iframeExists = await page.locator('iframe').first().isVisible().catch(() => false);
                
//                 if (iframeExists) {
//                   // Take screenshot of the modal/iframe container
//                   const modalContainer = page.locator('iframe').first();
//                   successScreenshot = await modalContainer.screenshot();
//                 } else {
//                   // Fallback to full page screenshot
//                   successScreenshot = await page.screenshot({ fullPage: false });
//                 }
//               }
//               openedGames.push({ name: searchTerm, responseTime: apiResponseTime, screenshot: successScreenshot });
//               await allure.attachment(`Screenshot - ${searchTerm}`, successScreenshot, 'image/png');
              
//               // ----- CLICK SPIN BUTTON (API path) -----
//               await allure.step('Click spin button', async () => {
//                 const spinResult = await clickSpinButton(page, popup, searchTerm, successScreenshot);
//                 if (spinResult.success) {
//                   await allure.attachment(`Spin clicked - ${searchTerm}`, 'Spin button clicked successfully', 'text/plain');
//                   const afterSpinTarget = popup && !popup.isClosed() ? popup : page;
//                   const afterSpinScreenshot = await afterSpinTarget.screenshot();
//                   await allure.attachment(`After Spin - ${searchTerm}`, afterSpinScreenshot, 'image/png');
                  
//                   // Store coordinates if found
//                   if (spinResult.coordinates) {
//                     const coordKey = `${spinResult.coordinates.x},${spinResult.coordinates.y}`;
//                     spinCoordinates.push({ 
//                       name: searchTerm, 
//                       x: spinResult.coordinates.x, 
//                       y: spinResult.coordinates.y,
//                       coordinateKey: coordKey
//                     });
//                     console.log(`📍 Stored coordinates for ${searchTerm}: (${spinResult.coordinates.x}, ${spinResult.coordinates.y})`);
//                   }
//                 }
//               });
//             } else {
//               const screenshotTarget = popup && !popup.isClosed() ? popup : page;
//               const screenshot = await screenshotTarget.screenshot();
//               notOpenedGames.push({ name: searchTerm, reason: `API Status: ${apiStatusCode}`, screenshot: screenshot });
//               await allure.attachment(`Error - ${searchTerm}`, screenshot, 'image/png');
//               await allure.attachment(`API Status for ${searchTerm}`, `Status: ${apiStatusCode}`, 'text/plain');
//               console.log(`❌ Could not launch game: ${searchTerm}`);
//             }
            
//             // Close popup if exists
//             if (popup && !popup.isClosed()) {
//               await popup.close().catch(() => {});
//             }
//           }
//         });

//         // ----- CLOSE GAME MODAL -----
//         await allure.step('Close game modal', async () => {
//           const closeBtn = page.locator("(//div[@role='button']/following-sibling::div)[3]");
//           await closeBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
//           if (await closeBtn.isVisible()) {
//             await closeBtn.click();
//             console.log(`✅ Closed game modal for ${gameName}`);
//           }
//         });

//         await searchBox.fill('');
//       });
//     }

//     // ----- SUMMARY -----
//     console.log('\n========================================');
//     console.log('           GAME LAUNCH SUMMARY          ');
//     console.log('========================================\n');
    
//     console.log(`✅ OPENED GAMES (${openedGames.length}):`);
//     console.log('----------------------------------------');
//     openedGames.forEach((game, index) => {
//       const ms = game.responseTime !== null ? `${game.responseTime} ms` : 'N/A';
//       console.log(`${index + 1}. ${game.name} - ${ms}`);
//     });
    
//     console.log(`\n🔍 GAMES NOT FOUND (${gamesNotFound.length}):`);
//     console.log('----------------------------------------');
//     gamesNotFound.forEach((game, index) => {
//       console.log(`${index + 1}. ${game.name}`);
//     });
    
//     console.log(`\n❌ NOT OPENED GAMES (${notOpenedGames.length}):`);
//     console.log('----------------------------------------');
//     notOpenedGames.forEach((game, index) => {
//       console.log(`${index + 1}. ${game.name} - ${game.reason}`);
//     });
    
//     console.log('\n========================================');
//     console.log(`Total: ${openedGames.length} opened, ${gamesNotFound.length} not found, ${notOpenedGames.length} failed`);
//     console.log('========================================\n');

//     // ----- EXPORT TO EXCEL -----
//     console.log('📊 Generating Excel report with screenshots...');
    
//     const workbook = new ExcelJS.Workbook();
//     workbook.creator = 'Game Launch Test Automation';
//     workbook.created = new Date();
    
//     // Create "All Games" sheet - all games in order
//     const allGamesSheet = workbook.addWorksheet('All Games');
//     allGamesSheet.columns = [
//       { header: 'No.', key: 'no', width: 6 },
//       { header: 'Game Name', key: 'name', width: 45 },
//       { header: 'Status', key: 'status', width: 18 },
//       { header: 'Response Time (ms)', key: 'responseTime', width: 20 },
//       { header: 'Reason/Notes', key: 'reason', width: 30 },
//       { header: 'Screenshot', key: 'screenshot', width: 60 }
//     ];
    
//     // Style header row for All Games
//     allGamesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
//     allGamesSheet.getRow(1).fill = {
//       type: 'pattern',
//       pattern: 'solid',
//       fgColor: { argb: 'FF673AB7' }
//     };
//     allGamesSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
//     // Add all games in order with their status
//     for (let i = 0; i < games.length; i++) {
//       const gameName = games[i];
//       const rowNum = i + 2;
      
//       // Find which category this game belongs to
//       const openedGame = openedGames.find(g => g.name === gameName);
//       const notFoundGame = gamesNotFound.find(g => g.name === gameName);
//       const failedGame = notOpenedGames.find(g => g.name === gameName);
      
//       let status = '';
//       let responseTime: string | number = 'N/A';
//       let reason = '';
//       let screenshot: Buffer | undefined;
//       let statusColor = 'FFFFFFFF';
      
//       if (openedGame) {
//         status = '✅ OPENED';
//         responseTime = openedGame.responseTime ?? 'N/A';
//         reason = 'Successfully launched';
//         screenshot = openedGame.screenshot;
//         statusColor = 'FF4CAF50'; // Green
//       } else if (notFoundGame) {
//         status = '🔍 NOT FOUND';
//         reason = 'Game not found in search';
//         screenshot = notFoundGame.screenshot;
//         statusColor = 'FFFF9800'; // Orange
//       } else if (failedGame) {
//         status = '❌ FAILED';
//         reason = failedGame.reason;
//         screenshot = failedGame.screenshot;
//         statusColor = 'FFF44336'; // Red
//       } else {
//         status = '⏭️ SKIPPED';
//         reason = 'Not processed';
//         statusColor = 'FF9E9E9E'; // Gray
//       }
      
//       const row = allGamesSheet.addRow({
//         no: i + 1,
//         name: gameName,
//         status: status,
//         responseTime: responseTime,
//         reason: reason
//       });
      
//       // Set row height for screenshot
//       allGamesSheet.getRow(rowNum).height = 150;
//       allGamesSheet.getRow(rowNum).alignment = { vertical: 'middle' };
      
//       // Color the status cell based on result
//       row.getCell('status').fill = {
//         type: 'pattern',
//         pattern: 'solid',
//         fgColor: { argb: statusColor }
//       };
//       row.getCell('status').font = { bold: true };
      
//       // Add screenshot if available
//       if (screenshot) {
//         const imageId = workbook.addImage({
//           buffer: screenshot as any,
//           extension: 'png',
//         });
        
//         allGamesSheet.addImage(imageId, {
//           tl: { col: 5, row: rowNum - 1 },
//           ext: { width: 350, height: 180 }
//         });
//       }
//     }
    
//     // Create "Opened Games" sheet
//     const openedSheet = workbook.addWorksheet('Opened Games');
//     openedSheet.columns = [
//       { header: 'No.', key: 'no', width: 6 },
//       { header: 'Game Name', key: 'name', width: 45 },
//       { header: 'Response Time (ms)', key: 'responseTime', width: 20 },
//       { header: 'Status', key: 'status', width: 12 },
//       { header: 'Screenshot', key: 'screenshot', width: 60 }
//     ];
    
//     // Style header row
//     openedSheet.getRow(1).font = { bold: true };
//     openedSheet.getRow(1).fill = {
//       type: 'pattern',
//       pattern: 'solid',
//       fgColor: { argb: 'FF4CAF50' }
//     };
//     openedSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
//     // Add opened games data with screenshots
//     for (let i = 0; i < openedGames.length; i++) {
//       const game = openedGames[i];
//       const rowNum = i + 2;
      
//       openedSheet.addRow({
//         no: i + 1,
//         name: game.name,
//         responseTime: game.responseTime ?? 'N/A',
//         status: '✅ OPENED'
//       });
      
//       // Set row height for screenshot
//       openedSheet.getRow(rowNum).height = 150;
//       openedSheet.getRow(rowNum).alignment = { vertical: 'middle' };
      
//       // Add screenshot if available
//       if (game.screenshot) {
//         const imageId = workbook.addImage({
//           buffer: game.screenshot as any,
//           extension: 'png',
//         });
        
//         openedSheet.addImage(imageId, {
//           tl: { col: 4, row: rowNum - 1 },
//           ext: { width: 350, height: 180 }
//         });
//       }
//     }
    
//     // Create "Not Opened Games" sheet
//     const notOpenedSheet = workbook.addWorksheet('Not Opened Games');
//     notOpenedSheet.columns = [
//       { header: 'No.', key: 'no', width: 6 },
//       { header: 'Game Name', key: 'name', width: 45 },
//       { header: 'Reason', key: 'reason', width: 25 },
//       { header: 'Status', key: 'status', width: 15 },
//       { header: 'Screenshot', key: 'screenshot', width: 60 }
//     ];
    
//     // Style header row
//     notOpenedSheet.getRow(1).font = { bold: true };
//     notOpenedSheet.getRow(1).fill = {
//       type: 'pattern',
//       pattern: 'solid',
//       fgColor: { argb: 'FFF44336' }
//     };
//     notOpenedSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
//     // Add not opened games data with screenshots
//     for (let i = 0; i < notOpenedGames.length; i++) {
//       const game = notOpenedGames[i];
//       const rowNum = i + 2;
      
//       notOpenedSheet.addRow({
//         no: i + 1,
//         name: game.name,
//         reason: game.reason,
//         status: '❌ FAILED'
//       });
      
//       // Set row height for screenshot
//       notOpenedSheet.getRow(rowNum).height = 150;
//       notOpenedSheet.getRow(rowNum).alignment = { vertical: 'middle' };
      
//       // Add screenshot if available
//       if (game.screenshot) {
//         const imageId = workbook.addImage({
//           buffer: game.screenshot as any,
//           extension: 'png',
//         });
        
//         notOpenedSheet.addImage(imageId, {
//           tl: { col: 4, row: rowNum - 1 },
//           ext: { width: 350, height: 180 }
//         });
//       }
//     }
    
//     // Create "Games Not Found" sheet
//     const notFoundSheet = workbook.addWorksheet('Games Not Found');
//     notFoundSheet.columns = [
//       { header: 'No.', key: 'no', width: 6 },
//       { header: 'Game Name', key: 'name', width: 45 },
//       { header: 'Status', key: 'status', width: 15 },
//       { header: 'Screenshot', key: 'screenshot', width: 60 }
//     ];
    
//     // Style header row
//     notFoundSheet.getRow(1).font = { bold: true };
//     notFoundSheet.getRow(1).fill = {
//       type: 'pattern',
//       pattern: 'solid',
//       fgColor: { argb: 'FFFF9800' }
//     };
//     notFoundSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
//     // Add not found games data with screenshots
//     for (let i = 0; i < gamesNotFound.length; i++) {
//       const game = gamesNotFound[i];
//       const rowNum = i + 2;
      
//       notFoundSheet.addRow({
//         no: i + 1,
//         name: game.name,
//         status: '🔍 NOT FOUND'
//       });
      
//       // Set row height for screenshot
//       notFoundSheet.getRow(rowNum).height = 150;
//       notFoundSheet.getRow(rowNum).alignment = { vertical: 'middle' };
      
//       // Add screenshot if available
//       if (game.screenshot) {
//         const imageId = workbook.addImage({
//           buffer: game.screenshot as any,
//           extension: 'png',
//         });
        
//         notFoundSheet.addImage(imageId, {
//           tl: { col: 3, row: rowNum - 1 },
//           ext: { width: 350, height: 180 }
//         });
//       }
//     }
    
//     // Create Summary sheet
//     const summarySheet = workbook.addWorksheet('Summary');
//     summarySheet.columns = [
//       { header: 'Metric', key: 'metric', width: 25 },
//       { header: 'Value', key: 'value', width: 15 }
//     ];
    
//     summarySheet.getRow(1).font = { bold: true };
//     summarySheet.getRow(1).fill = {
//       type: 'pattern',
//       pattern: 'solid',
//       fgColor: { argb: 'FF2196F3' }
//     };
    
//     summarySheet.addRow({ metric: 'Total Games Tested', value: games.length });
//     summarySheet.addRow({ metric: 'Games Opened', value: openedGames.length });
//     summarySheet.addRow({ metric: 'Games Not Found', value: gamesNotFound.length });
//     summarySheet.addRow({ metric: 'Games Failed to Open', value: notOpenedGames.length });
//     summarySheet.addRow({ metric: 'Success Rate', value: `${((openedGames.length / games.length) * 100).toFixed(2)}%` });
//     summarySheet.addRow({ metric: 'Provider', value: provider });
//     summarySheet.addRow({ metric: 'Test Date', value: new Date().toLocaleString() });
    
//     // Create Spin Coordinates sheet - Group games with same coordinates
//     const coordinatesSheet = workbook.addWorksheet('Spin Coordinates');
//     coordinatesSheet.columns = [
//       { header: 'Coordinates (X, Y)', key: 'coordinates', width: 20 },
//       { header: 'Game Count', key: 'count', width: 15 },
//       { header: 'Game Names', key: 'games', width: 80 }
//     ];
    
//     // Style header row
//     coordinatesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
//     coordinatesSheet.getRow(1).fill = {
//       type: 'pattern',
//       pattern: 'solid',
//       fgColor: { argb: 'FF9C27B0' }
//     };
//     coordinatesSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
//     // Group games by coordinates
//     const coordinateGroups = new Map<string, string[]>();
//     spinCoordinates.forEach(item => {
//       const existing = coordinateGroups.get(item.coordinateKey) || [];
//       existing.push(item.name);
//       coordinateGroups.set(item.coordinateKey, existing);
//     });
    
//     // Sort by game count (descending) then by coordinates
//     const sortedGroups = Array.from(coordinateGroups.entries())
//       .sort((a, b) => {
//         if (b[1].length !== a[1].length) {
//           return b[1].length - a[1].length; // More games first
//         }
//         return a[0].localeCompare(b[0]); // Then by coordinates alphabetically
//       });
    
//     // Add data rows
//     sortedGroups.forEach(([coordKey, gamesList]) => {
//       coordinatesSheet.addRow({
//         coordinates: coordKey,
//         count: gamesList.length,
//         games: gamesList.join(', ')
//       });
//     });
    
//     // Add summary at the end
//     coordinatesSheet.addRow({});
//     coordinatesSheet.addRow({
//       coordinates: 'Total Unique Coordinates:',
//       count: coordinateGroups.size,
//       games: `${spinCoordinates.length} games tested`
//     });
    
//     console.log(`📊 Spin Coordinates Summary:`);
//     console.log(`   Total games with coordinates: ${spinCoordinates.length}`);
//     console.log(`   Unique coordinate positions: ${coordinateGroups.size}`);
    
//     // Save Excel file
//     const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
//     const excelPath = path.join(process.cwd(), `game-launch-report-${timestamp}.xlsx`);
//     await workbook.xlsx.writeFile(excelPath);
    
//     console.log(`✅ Excel report saved: ${excelPath}`);
    
//     // Auto-open Excel file
//     console.log('📂 Opening Excel file...');
//     exec(`start "" "${excelPath}"`, (error) => {
//       if (error) {
//         console.log(`⚠️ Could not auto-open Excel: ${error.message}`);
//       }
//     });
    
//     // Also attach to Allure
//     const excelBuffer = await workbook.xlsx.writeBuffer();
//     await allure.attachment('Game Launch Report.xlsx', Buffer.from(excelBuffer), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//   });
// });
