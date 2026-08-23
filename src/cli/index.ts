#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import readline from 'readline';
import dotenv from 'dotenv';
import { Gaid3Agent } from '../agent/core.js';
import { SafetyGuardian } from '../agent/safety.js';

dotenv.config();

const program = new Command();
const agent = new Gaid3Agent();

function displayBanner() {
  console.log(
    chalk.hex('#EC612C')(`
   ██████╗  █████╗ ██╗██████╗ ██████╗ 
  ██╔════╝ ██╔══██╗██║██╔══██╗╚════██╗
  ██║  ███╗███████║██║██║  ██║ █████╔╝
  ██║   ██║██╔══██║██║██║  ██║ ╚═══██╗
  ╚██████╔╝██║  ██║██║██████╔╝██████╔╝
   ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝ ╚═════╝ 
  `)
  );
  console.log(chalk.bold.hex('#89CFF0')('  Web3 Onboarding AI Agent powered by Walrus Memory\n'));
  console.log(chalk.gray('  Commands: /memory, /safety <action>, /sync, /help, exit\n'));
  console.log(chalk.gray('─'.repeat(65)));
}

async function startInteractiveSession() {
  displayBanner();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.hex('#90EE90')('You > ')
  });

  // Initial welcome
  const spinner = ora('Recalling Walrus decentralized memory...').start();
  const initRes = await agent.chat('Hello');
  spinner.stop();
  console.log(chalk.bold.hex('#EC612C')('\nGaid3:'));
  console.log(initRes.message + '\n');

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log(chalk.hex('#EC612C')('\nGoodbye! Your memory is safely stored on Walrus.\n'));
      process.exit(0);
    }

    if (input === '/help') {
      console.log(chalk.yellow('\nAvailable Commands:'));
      console.log('  /memory          - View recalled Walrus memory facts and profile');
      console.log('  /safety <text>   - Run pre-flight security evaluation on an action');
      console.log('  /sync            - Certify & persist memory snapshot to Walrus');
      console.log('  exit             - Quit the CLI session\n');
      rl.prompt();
      return;
    }

    if (input === '/memory') {
      const profile = agent.getMemory().getProfile();
      console.log(chalk.cyan('\n=== Decentalized Walrus Memory Profile ==='));
      console.log(`• Level: ${profile.experienceLevel}`);
      console.log(`• Preferred Chains: ${profile.preferredChains.join(', ') || 'None'}`);
      console.log(`• Preferred Wallets: ${profile.preferredWallets.join(', ') || 'None'}`);
      console.log(`• Risk Tolerance: ${profile.riskTolerance}`);
      console.log(`• Walrus Blob ID: ${profile.walrusBlobId || 'Pending initial sync'}`);
      console.log(`• Stored Facts (${profile.rawDurableFacts.length}):`);
      profile.rawDurableFacts.forEach((f) => console.log(`  - [${f.category}] ${f.statement}`));
      console.log('==========================================\n');
      rl.prompt();
      return;
    }

    if (input.startsWith('/safety ')) {
      const query = input.replace('/safety ', '');
      const evalResult = SafetyGuardian.evaluateAction(query);
      console.log(chalk.yellow('\n=== Safety Pre-Flight Assessment ==='));
      console.log(`• Risk Score: ${evalResult.riskScore}/100`);
      console.log(`• Irreversible Action: ${evalResult.isIrreversible ? 'YES ⚠️' : 'No'}`);
      if (evalResult.warnings.length) {
        console.log(`• Warnings:\n  ${evalResult.warnings.join('\n  ')}`);
      }
      console.log(`• Recommended Step: ${evalResult.safeNextStep}`);
      console.log('====================================\n');
      rl.prompt();
      return;
    }

    if (input === '/sync') {
      const syncSpin = ora('Certifying memory state to Walrus Testnet...').start();
      const syncRes = await agent.getMemory().syncToWalrus();
      syncSpin.succeed(chalk.green(`Synced to Walrus! Blob ID: ${syncRes.blobId} (Epoch ${syncRes.epoch})`));
      rl.prompt();
      return;
    }

    // Normal chat turn
    const chatSpin = ora('Gaid3 is thinking & checking memory...').start();
    const res = await agent.chat(input);
    chatSpin.stop();

    if (res.safetyAssessment && res.safetyAssessment.riskScore >= 70) {
      console.log(chalk.bgRed.white.bold(' ⚠️  SECURITY NOTICE DETECTED '));
    }

    console.log(chalk.bold.hex('#EC612C')('\nGaid3:'));
    console.log(res.message);

    if (res.newFactsSaved && res.newFactsSaved.length > 0) {
      console.log(chalk.gray(`\n[Walrus Memory: Stored ${res.newFactsSaved.length} new durable fact(s)]`));
    }
    console.log('');
    rl.prompt();
  });
}

program
  .name('gaid3')
  .description('Web3 Onboarding AI Agent powered by Walrus Memory')
  .version('1.0.0')
  .action(startInteractiveSession);

program.parse(process.argv);
