import { test, expect, request } from '@playwright/test';
import { allure } from 'allure-playwright';
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { exec } from 'child_process';

// Track active network requests (excluding WebSockets)
class NetworkTracker {
  private activeRequests = new Set<string>();
  private lastActivityTime = Date.now();

  constructor(private target: any) {
    this.setupListeners();
  }

  private setupListeners() {
    this.target.on('request', (request: any) => {
      const url = request.url();
      // Ignore WebSocket upgrades and other persistent connections
      if (!url.includes('ws://') && !url.includes('wss://')) {
        this.activeRequests.add(request.url());
        this.lastActivityTime = Date.now();
      }
    });

    this.target.on('requestfinished', (request: any) => {
      this.activeRequests.delete(request.url());
      this.lastActivityTime = Date.now();
    });

    this.target.on('requestfailed', (request: any) => {
      this.activeRequests.delete(request.url());
      this.lastActivityTime = Date.now();
    });
  }

  isIdle(idleTime: number): boolean {
    const timeSinceLastActivity = Date.now() - this.lastActivityTime;
    return this.activeRequests.size === 0 && timeSinceLastActivity >= idleTime;
  }

  cleanup() {
    this.target.removeAllListeners('request');
    this.target.removeAllListeners('requestfinished');
    this.target.removeAllListeners('requestfailed');
  }
}

// Wait for network to be idle (excluding WebSockets)
async function waitForNetworkIdle(
  target: any,
  idleTime: number = 1000,
  timeout: number = 30000
): Promise<boolean> {
  return new Promise((resolve) => {
    const tracker = new NetworkTracker(target);
    let checkInterval: NodeJS.Timeout;
    let timeoutTimer: NodeJS.Timeout;

    const cleanup = () => {
      clearInterval(checkInterval);
      clearTimeout(timeoutTimer);
      tracker.cleanup();
    };

    checkInterval = setInterval(() => {
      if (tracker.isIdle(idleTime)) {
        console.log(`🌐 Network idle detected (no activity for ${idleTime}ms)`);
        cleanup();
        resolve(true);
      }
    }, 100);

    timeoutTimer = setTimeout(() => {
      console.log(`⏱️ Network idle timeout reached (${timeout}ms)`);
      cleanup();
      resolve(false);
    }, timeout);
  });
}

// Comprehensive game ready checker
async function isGameReady(
  page: any,
  popup: any | null,
  options: {
    checkIframe?: boolean;
    checkCanvas?: boolean;
    checkApiSignal?: boolean;
    timeout?: number;
  } = {}
): Promise<{ ready: boolean; signals: string[] }> {
  const {
    checkIframe = true,
    checkCanvas = true,
    checkApiSignal = true,
    timeout = 15000,
  } = options;

  const startTime = Date.now();
  const signals: string[] = [];
  const target = popup && !popup.isClosed() ? popup : page;

  console.log('🔍 Checking game readiness signals...');

  // Check for game iframe
  if (checkIframe) {
    try {
      const iframeLocator = target.locator('iframe').first();
      await iframeLocator.waitFor({ state: 'visible', timeout: 5000 });
      
      // Verify iframe has src and is loaded
      const iframeSrc = await iframeLocator.getAttribute('src');
      if (iframeSrc && iframeSrc.length > 0) {
        signals.push('✅ Game iframe visible and loaded');
        console.log('✅ Game iframe detected');
      }
    } catch (e) {
      console.log('⚠️ Game iframe not found or not loaded');
    }
  }

  // Check for canvas element (common in HTML5 games)
  if (checkCanvas) {
    try {
      const canvasLocator = target.locator('canvas').first();
      await canvasLocator.waitFor({ state: 'visible', timeout: 3000 });
      
      // Verify canvas has content
      const canvasExists = await canvasLocator.isVisible();
      if (canvasExists) {
        signals.push('✅ Game canvas element rendered');
        console.log('✅ Game canvas detected');
      }
    } catch (e) {
      console.log('⚠️ Game canvas not found');
    }
  }

  // Wait for network to stabilize
  const networkIdle = await waitForNetworkIdle(target, 1000, 10000);
  if (networkIdle) {
    signals.push('✅ Network activity stabilized');
    console.log('✅ Network idle confirmed');
  }

  // Check for game-ready API signals or DOM indicators
  if (checkApiSignal) {
    try {
      // Check for common game loading indicators being hidden/removed
      const loadingSelectors = [
        '[class*="loading"]',
        '[class*="spinner"]',
        '[id*="loader"]',
        '.loading-screen',
      ];

      let loadingGone = false;
      for (const selector of loadingSelectors) {
        const loadingElement = target.locator(selector).first();
        const isHidden = await loadingElement.isHidden({ timeout: 2000 }).catch(() => true);
        if (isHidden) {
          loadingGone = true;
          break;
        }
      }

      if (loadingGone) {
        signals.push('✅ Loading indicators removed');
        console.log('✅ Loading screen cleared');
      }
    } catch (e) {
      // Loading check failed, continue
    }

    // Additional check: Look for game UI elements
    try {
      const gameUISelectors = [
        'button[class*="spin"]',
        'button[class*="bet"]',
        'button[class*="play"]',
        '[class*="balance"]',
        '[class*="game-ui"]',
      ];

      for (const selector of gameUISelectors) {
        const uiElement = target.locator(selector).first();
        const isVisible = await uiElement.isVisible({ timeout: 2000 }).catch(() => false);
        if (isVisible) {
          signals.push('✅ Game UI elements visible');
          console.log('✅ Game UI detected');
          break;
        }
      }
    } catch (e) {
      // UI check failed, continue
    }
  }

  // Determine if game is ready based on signals
  const ready = signals.length >= 2; // At least 2 positive signals required
  const elapsed = Date.now() - startTime;

  console.log(`🎮 Game ready status: ${ready ? 'READY' : 'NOT READY'} (${elapsed}ms)`);
  console.log(`📊 Detected signals: ${signals.length > 0 ? signals.join(', ') : 'None'}`);

  return { ready, signals };
}


const games = [

 "Ranger Showdown",
"Apollo Ray of Luck",
"Nezha",
"Pai Gow Ways",
"Mahjong Princess",
"Caribbean Riches",
"Farm Of Fortune",
"Adventure To The West",
"Money Dragon",
"Pumpkins Go Lucky",
"Yeti Boom",
"Money Empire",
"Leprechaun Bonanza",
"Sweet Frenzy",
"City of Jewels",
"Mushroom Bandit",
"Mighty Sevens",
"Neko Riches",
"Candy Super Tumble",
"Frosty and Flamy",
"Fortune Jewels III",
"Nutty Riches",
"Fortune Jewels II",
"Boxing Fury",
"Golden Moon Empire",
"Wild Calavera",
"Fortune Jewels I",
"Ocean Carnival",
"Jungle Quest",
"Blade of Fortune",
"Wild Mafia",
"Alien Smash",
"Snake Treasure",
"Guardian of the Museum",
"Beasts of Luck",
"Roma",
"God Of Wealth",
"Legend Of Eagle",
"Neon Fantasy",
"Triple Happiness",
"Lucky Fortune",
"Space Conquest",
"Royale House",
"Sexy Vegas",
"Tiki Rush",
"Gold Rush Cowboys",
"Wild Wet Win",
"Royal Katt",
"Rich Cai Shen",
"Muay Thai Fighter",
"Poker Ways",
"Fishing Treasure",
"Fruits Mania",
"The Great Safari",
"Legend of Nian",
"The Nutcrackers",
"Mining Bonanza",
"Heavenly Fortunes 2",
"Ganesha Luck",
"Heavenly Fortunes",
"Safari Blitz",
"Goddess Of Egypt",
"The Maya Myth",
"Spin and Win",
"Fortune Lions",
"Honey Trap",
"Oceanic Melodies",
"Loki",
"Fiery Lava",
"Golden Horse Ride"
];

const provider = 'Fast Spin';

// =====================================================
// SHARED QUEUE CLASS - Non-blocking work distribution
// Both workers pull simultaneously without waiting
// =====================================================
class SharedGameQueue {
  private queue: string[];
  private currentIndex: number = 0;
  private stopFlag: boolean = false;

  constructor(games: string[]) {
    this.queue = [...games];
  }

  // Atomic get next game - both workers pull from same queue
  getNext(): { game: string; index: number } | null {
    if (this.stopFlag || this.currentIndex >= this.queue.length) {
      return null;
    }
    const index = this.currentIndex;
    const game = this.queue[index];
    this.currentIndex++;
    return { game, index };
  }

  stop(): void {
    this.stopFlag = true;
  }

  isStopped(): boolean {
    return this.stopFlag;
  }

  remaining(): number {
    return Math.max(0, this.queue.length - this.currentIndex);
  }

  total(): number {
    return this.queue.length;
  }

  processed(): number {
    return this.currentIndex;
  }
}

test.describe('Game Launch Tests', () => {
  test.setTimeout(3600000); // 60 minutes per test

  test('Test all game launches', async ({ browser }) => {
    // Create base browser contexts/pages for workers A-D
    const contextA = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const contextB = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const contextC = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const contextD = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    const pageC = await contextC.newPage();
    const pageD = await contextD.newPage();

    // Programmatically create worker E only (F-Z removed)
    const extraWorkerLetters = 'E'.split('');
    const extraContexts: any[] = [];
    const extraPages: { letter: string; page: any }[] = [];
    for (const letter of extraWorkerLetters) {
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      extraContexts.push(ctx);
      const pg = await ctx.newPage();
      extraPages.push({ letter, page: pg });
    }
    
    allure.epic('Game Launch Tests');
    allure.feature(provider);

    // Track games status (shared between workers)
    const openedGames: { name: string; responseTime: number | null; screenshot?: Buffer }[] = [];
    const notOpenedGames: { name: string; reason: string; screenshot?: Buffer }[] = [];
    const gamesNotFound: { name: string; screenshot?: Buffer }[] = [];

    // =====================================================
    // PARALLEL TWO-WORKER SYSTEM - TRUE PARALLELISM
    // Shared queue: Both workers pull from the SAME queue
    // Both workers run SIMULTANEOUSLY (not alternating)
    // =====================================================
    
    const sharedQueue = new SharedGameQueue(games);

    // Login function for a page
    const loginToPage = async (page: any, workerName: string) => {
      console.log(`🔐 [${workerName}] Logging in...`);
      await page.goto('https://casino.torrospin.com/');
      await page.waitForTimeout(5000);

      await page.click("//button[@id='loginButton']//p[1]");
      await page.fill("//input[@placeholder='Username or Email *']", "trs-usd@torrospin.com");
      await page.fill("//input[@type='password']", "t0rr0$p1n");
      await page.locator("text=Remember Me").click();
      await page.click("//button[contains(@class,'flex justify-center')]");
      await page.waitForTimeout(1000);
      
      // Apply provider filter
      await page.locator("(//button[contains(@class,'text-black text-base')]//span)[2]").click();
      await page.locator(`//button[contains(.,'${provider}')]`).click();
      await page.locator("//button[normalize-space(text())='Filter']").click();
      await page.waitForTimeout(1000);
      console.log(`✅ [${workerName}] Login complete`);
    };

    // Helper function to process a single game on a specific page
    const processGame = async (page: any, gameName: string, workerName: string): Promise<number> => {
      if (sharedQueue.isStopped()) return -1;
      
      console.log(`\n🔄 [${workerName}] Processing: ${gameName}`);
      
      let resultStatus = -1;
      
      const searchTerm = gameName.trim();
      const searchBox = page.getByPlaceholder('Search Games');

      // Search for the game (fill and press Enter)
      await searchBox.fill(searchTerm);
      await searchBox.press('Enter').catch(() => page.keyboard.press('Enter'));
      await page.waitForTimeout(500);

      // Find game cards
      const cardNodes = page.locator("(//div[contains(@class,'rounded-[7px] bg-[#141929]')]//div)");
      await cardNodes.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

      const totalCards = await cardNodes.count();
      if (totalCards === 0) {
        console.log(`⚡ [${workerName}] Game not found - Next game NOW!`);
        const screenshot = await page.screenshot({ type: 'png', timeout: 5000 }).catch(() => undefined);
        gamesNotFound.push({ name: searchTerm, screenshot: screenshot as any });
        searchBox.fill('').catch(() => {});
        return 0;
      }

      const maxCards = Math.min(totalCards, 40);
      let matchedCard: ReturnType<typeof cardNodes.nth> | null = null;

      for (let i = 0; i < maxCards; i++) {
        const card = cardNodes.nth(i);
        const titleEl = card.locator('xpath=.//p[contains(@class,"font-medium line-clamp-1")]').first();
        const titleText = ((await titleEl.textContent({ timeout: 3000 }).catch(() => '')) ?? '').trim();
        
        if (!titleText) continue;
        
        if (titleText === searchTerm) {
          matchedCard = card;
          console.log(`✅ [${workerName}] Found match at index ${i}: "${titleText}"`);
          break;
        }
      }

      if (!matchedCard) {
        console.log(`⚡ [${workerName}] Game not found - Next game NOW!`);
        const screenshot = await page.screenshot({ type: 'png', timeout: 5000 }).catch(() => undefined);
        gamesNotFound.push({ name: searchTerm, screenshot: screenshot as any });
        searchBox.fill('').catch(() => {});
        return 0;
      }

      matchedCard.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(100);

      // Hover and click play
      const verifyTitleEl = matchedCard.locator('xpath=.//p[contains(@class,"font-medium line-clamp-1")]');
      const verifyTitle = ((await verifyTitleEl.textContent().catch(() => '')) ?? '').trim();

      if (verifyTitle !== searchTerm) {
        await searchBox.fill('');
        return 0;
      }

      matchedCard.hover({ force: true }).catch(() => {});
      await page.waitForTimeout(200);

      const playBtn = matchedCard.locator('xpath=.//button[contains(@class,"shrink-0 py-2.5")]');
      
      try {
        await playBtn.waitFor({ state: 'visible', timeout: 3000 });
      } catch (error) {
        console.log(`⚡ [${workerName}] Play button not found - Next game NOW!`);
        const screenshot = await page.screenshot({ type: 'png', timeout: 5000 }).catch(() => undefined);
        gamesNotFound.push({ name: searchTerm, screenshot: screenshot as any });
        searchBox.fill('').catch(() => {});
        return 0;
      }

      const popupPromise = page.waitForEvent('popup', { timeout: 15000 }).catch(() => null);
      
      const startTime = Date.now();
      
      // Click and wait for API response
      const [apiResponse] = await Promise.all([
        page.waitForResponse(
          (resp: any) => resp.url().includes('/api/player/request-link'),
          { timeout: 20000 }
        ).catch(() => null),
        playBtn.click().catch((e: any) => {
          console.log(`⚠️ [${workerName}] Click error: ${e.message}`);
          return null;
        })
      ]);

      // If API response failed
      if (!apiResponse) {
        const screenshot = await page.screenshot();
        notOpenedGames.push({ name: searchTerm, reason: 'API timeout or click failed', screenshot });
        await allure.attachment(`API Timeout - ${searchTerm}`, screenshot, 'image/png');
        
        const closeBtn = page.locator("(//div[@role='button']/following-sibling::div)[3]");
        if (await closeBtn.isVisible({ timeout: 0 }).catch(() => false)) {
          await closeBtn.click({ timeout: 0 }).catch(() => {});
        }
        await searchBox.fill('');
        return -1;
      }

      const status = apiResponse.status();
      const responseTime = Date.now() - startTime;
      resultStatus = status;

      // ANSI color codes
      const statusColor = status === 200 ? '\x1b[32m' : '\x1b[31m';
      const resetColor = '\x1b[0m';
      console.log(`🎯 [${workerName}] ${searchTerm} → ${statusColor}API ${status}${resetColor} (${responseTime} ms)`);

      // ❌ NON-200 STATUS - SKIP IMMEDIATELY to next game (no waiting)
      if (status !== 200) {
        console.log(`⚡ [${workerName}] Non-200 status - Next game NOW!`);
        notOpenedGames.push({ name: searchTerm, reason: `API status ${status}` });
        // Clear search and close modals in background (non-blocking)
        searchBox.fill('').catch(() => {});
        popupPromise.then((popup: any) => { if (popup && !popup.isClosed()) popup.close().catch(() => {}); });
        page.locator("(//div[@role='button']/following-sibling::div)[3]").click({ timeout: 0 }).catch(() => {});
        return status; // Return immediately - next game starts NOW
      }

      const popup = await popupPromise;

      // ✅ SUCCESS - STATUS 200 - Take screenshot (wait 2s to allow game to initialize)
      console.log(`📸 [${workerName}] API 200 - Taking screenshot... (waiting 3s)`);
      await page.waitForTimeout(3000);
      const screenshot = await page.screenshot({ timeout: 800 }).catch(() => page.screenshot());
      
      if (popup && !popup.isClosed()) await popup.close().catch(() => {});
      
      const closeBtn = page.locator("(//div[@role='button']/following-sibling::div)[3]");
      if (await closeBtn.isVisible({ timeout: 0 }).catch(() => false)) {
        await closeBtn.click({ timeout: 0 }).catch(() => {});
        console.log(`\x1b[32m✅ [${workerName}] LAUNCHED - ${searchTerm}\x1b[0m`);
      }

      openedGames.push({ name: searchTerm, responseTime, screenshot });
      await allure.attachment(`SUCCESS - ${searchTerm}`, screenshot, 'image/png');
      await searchBox.fill('');

      return resultStatus;
    };

    // Worker function - runs on its own page, pulls from shared queue
    // NO WAITING - Each worker runs independently
    const runWorker = async (page: any, workerName: string): Promise<void> => {
      // Login first
      await loginToPage(page, workerName);
      
      const startTime = Date.now();
      console.log(`🚀 [${workerName}] Started at ${new Date().toISOString()} - pulling from shared queue`);
      console.log(`⚡ [${workerName}] Running independently - NOT waiting for other worker`);
      
      // Continuous loop - pull next game IMMEDIATELY after finishing current one
      while (true) {
        const next = sharedQueue.getNext();
        if (next === null) {
          console.log(`✅ [${workerName}] No more games to process`);
          break;
        }
        
        const { game: gameName, index } = next;
        console.log(`📍 [${workerName}] Processing index ${index}: ${gameName} (${sharedQueue.remaining()} remaining)`);
        
        // Process game immediately - no delays
        // Continue to next game regardless of status (200, 400, or any other)
        await processGame(page, gameName, workerName);
        
        // Next game IMMEDIATELY (no delay between games)
      }
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`🏁 [${workerName}] Finished at ${new Date().toISOString()} (Duration: ${duration}s)`);
    };

    // ----- LOOP THROUGH GAMES -----
    console.log('Games that are launching:');
    games.forEach((game, index) => console.log(`${index + 1}. ${game}`));
    console.log(`Total games: ${games.length}\n`);

    // Start parallel multi-worker system with shared queue
    console.log('\n' + '='.repeat(60));
    console.log('🚀 PARALLEL MULTI-WORKER SYSTEM - NON-BLOCKING SHARED QUEUE');
    console.log('='.repeat(60));
    console.log(`📊 Total games: ${games.length}`);
    console.log(`   Worker A: Independent execution - NO WAITING`);
    console.log(`   Worker B: Independent execution - NO WAITING`);
    console.log(`   Worker C: Independent execution - NO WAITING`);
    console.log(`   Worker D: Independent execution - NO WAITING`);
    for (const w of extraWorkerLetters) console.log(`   Worker ${w}: Independent execution - NO WAITING`);
    console.log('   ⚡ All workers START simultaneously via Promise.all');
    console.log('   ⚡ All workers RUN simultaneously on separate pages');
    console.log('   📋 Each worker pulls next game IMMEDIATELY when ready');
    console.log(`   🔄 TRUE PARALLEL: ${4 + extraWorkerLetters.length} games processing at same time`);
    console.log('   ✅ On 400 status → Close game and continue to next');
    console.log('='.repeat(60) + '\n');
    console.log('⏱️  Starting all workers NOW...');

    // Run all workers in TRUE PARALLEL using Promise.all
    // All workers pull from the SAME shared queue simultaneously
    const runPromises: Promise<void>[] = [
      runWorker(pageA, 'Worker A'),
      runWorker(pageB, 'Worker B'),
      runWorker(pageC, 'Worker C'),
      runWorker(pageD, 'Worker D'),
      ...extraPages.map(p => runWorker(p.page, `Worker ${p.letter}`))
    ];

    await Promise.all(runPromises);

    // Cleanup contexts (including extra E-Z contexts)
    await contextA.close();
    await contextB.close();
    await contextC.close();
    await contextD.close();
    for (const ctx of extraContexts) await ctx.close();

    console.log('\n' + '='.repeat(60));
    console.log('\x1b[32m✅ ALL GAMES PROCESSED\x1b[0m');
    console.log('='.repeat(60));

    // ----- SUMMARY -----
    console.log('\n========================================');
    console.log('           GAME LAUNCH SUMMARY          ');
    console.log('========================================\n');
    
    console.log(`✅ OPENED GAMES (${openedGames.length}):`);
    console.log('----------------------------------------');
    openedGames.forEach((game, index) => {
      const ms = game.responseTime !== null ? `${game.responseTime} ms` : 'N/A';
      console.log(`${index + 1}. ${game.name} - ${ms}`);
    });
    
    console.log(`\n🔍 GAMES NOT FOUND (${gamesNotFound.length}):`);
    console.log('----------------------------------------');
    gamesNotFound.forEach((game, index) => {
      console.log(`${index + 1}. ${game.name}`);
    });
    
    console.log(`\n❌ NOT OPENED GAMES (${notOpenedGames.length}):`);
    console.log('----------------------------------------');
    notOpenedGames.forEach((game, index) => {
      console.log(`${index + 1}. ${game.name} - ${game.reason}`);
    });
    
    console.log('\n========================================');
    console.log(`Total: ${openedGames.length} opened, ${gamesNotFound.length} not found, ${notOpenedGames.length} failed`);
    console.log('========================================\n');

    // ----- EXPORT TO EXCEL -----
    console.log('📊 Generating Excel report with screenshots...');
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Game Launch Test Automation';
    workbook.created = new Date();
    
    // Create "All Games" sheet - all games in order
    const allGamesSheet = workbook.addWorksheet('All Games');
    allGamesSheet.columns = [
      { header: 'No.', key: 'no', width: 6 },
      { header: 'Game Name', key: 'name', width: 45 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Response Time (ms)', key: 'responseTime', width: 20 },
      { header: 'Reason/Notes', key: 'reason', width: 30 },
      { header: 'Screenshot', key: 'screenshot', width: 60 }
    ];
    
    // Style header row for All Games
    allGamesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    allGamesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF673AB7' }
    };
    allGamesSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Add all games in order with their status
    for (let i = 0; i < games.length; i++) {
      const gameName = games[i];
      const rowNum = i + 2;
      
      // Find which category this game belongs to
      const openedGame = openedGames.find(g => g.name === gameName);
      const notFoundGame = gamesNotFound.find(g => g.name === gameName);
      const failedGame = notOpenedGames.find(g => g.name === gameName);
      
      let status = '';
      let responseTime: string | number = 'N/A';
      let reason = '';
      let screenshot: Buffer | undefined;
      let statusColor = 'FFFFFFFF';
      
      if (openedGame) {
        status = '✅ OPENED';
        responseTime = openedGame.responseTime ?? 'N/A';
        reason = 'Successfully launched';
        screenshot = openedGame.screenshot;
        statusColor = 'FF4CAF50'; // Green
      } else if (notFoundGame) {
        status = '🔍 NOT FOUND';
        reason = 'Game not found in search';
        screenshot = notFoundGame.screenshot;
        statusColor = 'FFFF9800'; // Orange
      } else if (failedGame) {
        status = '❌ FAILED';
        reason = failedGame.reason;
        screenshot = failedGame.screenshot;
        statusColor = 'FFF44336'; // Red
      } else {
        status = '⏭️ SKIPPED';
        reason = 'Not processed';
        statusColor = 'FF9E9E9E'; // Gray
      }
      
      const row = allGamesSheet.addRow({
        no: i + 1,
        name: gameName,
        status: status,
        responseTime: responseTime,
        reason: reason
      });
      
      // Set row height for screenshot
      allGamesSheet.getRow(rowNum).height = 150;
      allGamesSheet.getRow(rowNum).alignment = { vertical: 'middle' };
      
      // Color the status cell based on result
      row.getCell('status').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: statusColor }
      };
      row.getCell('status').font = { bold: true };
      
      // Add screenshot if available
      if (screenshot) {
        const imageId = workbook.addImage({
          buffer: screenshot as any,
          extension: 'png',
        });
        
        allGamesSheet.addImage(imageId, {
          tl: { col: 5, row: rowNum - 1 },
          ext: { width: 350, height: 180 }
        });
      }
    }
    
    // Create "Opened Games" sheet
    const openedSheet = workbook.addWorksheet('Opened Games');
    openedSheet.columns = [
      { header: 'No.', key: 'no', width: 6 },
      { header: 'Game Name', key: 'name', width: 45 },
      { header: 'Response Time (ms)', key: 'responseTime', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Screenshot', key: 'screenshot', width: 60 }
    ];
    
    // Style header row
    openedSheet.getRow(1).font = { bold: true };
    openedSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' }
    };
    openedSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Add opened games data with screenshots
    for (let i = 0; i < openedGames.length; i++) {
      const game = openedGames[i];
      const rowNum = i + 2;
      
      openedSheet.addRow({
        no: i + 1,
        name: game.name,
        responseTime: game.responseTime ?? 'N/A',
        status: '✅ OPENED'
      });
      
      // Set row height for screenshot
      openedSheet.getRow(rowNum).height = 150;
      openedSheet.getRow(rowNum).alignment = { vertical: 'middle' };
      
      // Add screenshot if available
      if (game.screenshot) {
        const imageId = workbook.addImage({
          buffer: game.screenshot as any,
          extension: 'png',
        });
        
        openedSheet.addImage(imageId, {
          tl: { col: 4, row: rowNum - 1 },
          ext: { width: 350, height: 180 }
        });
      }
    }
    
    // Create "Not Opened Games" sheet
    const notOpenedSheet = workbook.addWorksheet('Not Opened Games');
    notOpenedSheet.columns = [
      { header: 'No.', key: 'no', width: 6 },
      { header: 'Game Name', key: 'name', width: 45 },
      { header: 'Reason', key: 'reason', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Screenshot', key: 'screenshot', width: 60 }
    ];
    
    // Style header row
    notOpenedSheet.getRow(1).font = { bold: true };
    notOpenedSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF44336' }
    };
    notOpenedSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Add not opened games data with screenshots
    for (let i = 0; i < notOpenedGames.length; i++) {
      const game = notOpenedGames[i];
      const rowNum = i + 2;
      
      notOpenedSheet.addRow({
        no: i + 1,
        name: game.name,
        reason: game.reason,
        status: '❌ FAILED'
      });
      
      // Set row height for screenshot
      notOpenedSheet.getRow(rowNum).height = 150;
      notOpenedSheet.getRow(rowNum).alignment = { vertical: 'middle' };
      
      // Add screenshot if available
      if (game.screenshot) {
        const imageId = workbook.addImage({
          buffer: game.screenshot as any,
          extension: 'png',
        });
        
        notOpenedSheet.addImage(imageId, {
          tl: { col: 4, row: rowNum - 1 },
          ext: { width: 350, height: 180 }
        });
      }
    }
    
    // Create "Games Not Found" sheet
    const notFoundSheet = workbook.addWorksheet('Games Not Found');
    notFoundSheet.columns = [
      { header: 'No.', key: 'no', width: 6 },
      { header: 'Game Name', key: 'name', width: 45 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Screenshot', key: 'screenshot', width: 60 }
    ];
    
    // Style header row
    notFoundSheet.getRow(1).font = { bold: true };
    notFoundSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF9800' }
    };
    notFoundSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Add not found games data with screenshots
    for (let i = 0; i < gamesNotFound.length; i++) {
      const game = gamesNotFound[i];
      const rowNum = i + 2;
      
      notFoundSheet.addRow({
        no: i + 1,
        name: game.name,
        status: '🔍 NOT FOUND'
      });
      
      // Set row height for screenshot
      notFoundSheet.getRow(rowNum).height = 150;
      notFoundSheet.getRow(rowNum).alignment = { vertical: 'middle' };
      
      // Add screenshot if available
      if (game.screenshot) {
        const imageId = workbook.addImage({
          buffer: game.screenshot as any,
          extension: 'png',
        });
        
        notFoundSheet.addImage(imageId, {
          tl: { col: 3, row: rowNum - 1 },
          ext: { width: 350, height: 180 }
        });
      }
    }
    
    // Create Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 15 }
    ];
    
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2196F3' }
    };
    
    summarySheet.addRow({ metric: 'Total Games Tested', value: games.length });
    summarySheet.addRow({ metric: 'Games Opened', value: openedGames.length });
    summarySheet.addRow({ metric: 'Games Not Found', value: gamesNotFound.length });
    summarySheet.addRow({ metric: 'Games Failed to Open', value: notOpenedGames.length });
    summarySheet.addRow({ metric: 'Success Rate', value: `${((openedGames.length / games.length) * 100).toFixed(2)}%` });
    summarySheet.addRow({ metric: 'Provider', value: provider });
    summarySheet.addRow({ metric: 'Test Date', value: new Date().toLocaleString() });
    
    // Save Excel file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const excelPath = path.join(process.cwd(), `game-launch-report-${timestamp}.xlsx`);
    await workbook.xlsx.writeFile(excelPath);
    
    console.log(`✅ Excel report saved: ${excelPath}`);
    
    // Auto-open Excel file (cross-platform)
    console.log('📂 Opening Excel file...');
    try {
      if (process.platform === 'win32') {
        exec(`cmd /c start "" "${excelPath}"`, (error) => {
          if (error) console.log(`⚠️ Could not auto-open Excel: ${error.message}`);
        });
      } else if (process.platform === 'darwin') {
        exec(`open "${excelPath}"`, (error) => {
          if (error) console.log(`⚠️ Could not auto-open Excel: ${error.message}`);
        });
      } else {
        exec(`xdg-open "${excelPath}"`, (error) => {
          if (error) console.log(`⚠️ Could not auto-open Excel: ${error.message}`);
        });
      }
    } catch (e: any) {
      console.log(`⚠️ Could not auto-open Excel: ${e?.message || e}`);
    }
    
    // Also attach to Allure
    const excelBuffer = await workbook.xlsx.writeBuffer();
    await allure.attachment('Game Launch Report.xlsx', Buffer.from(excelBuffer), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
});
