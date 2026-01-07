// Quick test script to verify setup
require('dotenv').config();

console.log('🔍 Testing BYD Voice Assistant Setup\n');

// Check environment variables
const checks = [
  { name: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY },
  { name: 'ANTHROPIC_API_KEY', value: process.env.ANTHROPIC_API_KEY },
  { name: 'ELEVENLABS_API_KEY', value: process.env.ELEVENLABS_API_KEY }
];

let allGood = true;

checks.forEach(check => {
  if (!check.value || check.value.includes('your-') || check.value.includes('key-here')) {
    console.log(`❌ ${check.name}: Not configured`);
    allGood = false;
  } else {
    console.log(`✅ ${check.name}: Configured`);
  }
});

console.log('\n📦 Testing module imports...');

try {
  const OpenAI = require('openai');
  console.log('✅ OpenAI SDK loaded');
} catch (e) {
  console.log('❌ OpenAI SDK error:', e.message);
  allGood = false;
}

try {
  const Anthropic = require('@anthropic-ai/sdk');
  console.log('✅ Anthropic SDK loaded');
} catch (e) {
  console.log('❌ Anthropic SDK error:', e.message);
  allGood = false;
}

try {
  const fetch = require('node-fetch');
  console.log('✅ node-fetch loaded');
} catch (e) {
  console.log('❌ node-fetch error:', e.message);
  allGood = false;
}

console.log('\n📁 Testing knowledge base...');
const KnowledgeBaseLoader = require('./server/knowledge-base-loader');
try {
  const kb = KnowledgeBaseLoader.getInstance();
  const kbContent = kb.getKnowledgeBase();
  const competitors = kb.getCompetitors();

  console.log(`✅ Knowledge base loaded (${kbContent.length} chars)`);
  console.log(`✅ Competitors loaded (${competitors.length} entries)`);
} catch (e) {
  console.log('❌ Knowledge base error:', e.message);
  allGood = false;
}

console.log('\n' + '='.repeat(50));

if (allGood) {
  console.log('\n🎉 All checks passed! Ready to start.');
  console.log('\nRun: npm start');
  console.log('Then open: http://localhost:3000\n');
} else {
  console.log('\n⚠️  Please fix the issues above before starting.\n');
  console.log('Make sure to:');
  console.log('1. Add your API keys to .env file');
  console.log('2. Run: npm install\n');
  process.exit(1);
}
