const { Telegraf, Markup } = require('telegraf');
const db = require('./db/database');
const { getTransfers } = require('./services/solscan');
const { Connection } = require('@solana/web3.js');

const bot = new Telegraf(process.env.BOT_TOKEN);
const connection = new Connection(process.env.RPC_ENDPOINT);

// ========================
//  Клавиатуры и инструкции
// ========================
const mainKeyboard = Markup.keyboard([
  ['➕ Добавить кошелек', '⚙️ Фильтры'],
  ['📜 История транзакций', '❓ Помощь']
]).resize();

const filterKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('Минимальная сумма', 'set_min_amount')],
  [Markup.button.callback('Конкретный получатель', 'set_receiver')]
]);

const instructions = {
  add_wallet: `📥 *Отправьте адрес кошелька Solana*\nФормат: 44 символа\nПример: \`D3ad...Beef\``,
  filters: `⚙️ Выберите тип фильтра:`,
  history: `📆 Укажите период в днях:\nПример: \`7\``
};

// ========================
//  Обработчики команд
// ========================
bot.start((ctx) => 
  ctx.replyWithMarkdown('🔔 *Бот для отслеживания транзакций Solana*', mainKeyboard));

bot.hears('➕ Добавить кошелек', (ctx) => 
  ctx.replyWithMarkdown(instructions.add_wallet));

bot.hears('⚙️ Фильтры', (ctx) => 
  ctx.replyWithMarkdown(instructions.filters, filterKeyboard));

bot.hears('📜 История транзакций', async (ctx) => {
  const history = await db.getHistory(ctx.chat.id);
  ctx.replyWithMarkdown(formatHistory(history), mainKeyboard);
});

// ========================
//  Обработчики callback
// ========================
bot.action(/set_(.+)/, (ctx) => {
  const filterType = ctx.match[1];
  ctx.replyWithMarkdown(`Введите ${filterType === 'min_amount' ? 'сумму в SOL' : 'адрес получателя'}:`);
});

// ========================
//  Обработка ввода данных
// ========================
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  
  // Валидация адреса
  if (/^[1-9A-HJ-NP-Za-km-z]{44}$/.test(text)) {
    await db.addWallet(ctx.chat.id, text);
    ctx.replyWithMarkdown(`✅ Кошелек \`${text.slice(0,5)}...\` добавлен!`, mainKeyboard);
  }
  
  // Обработка фильтров
  else if (ctx.session.waitingFilter) {
    await applyFilter(ctx);
  }
});

// ========================
//  Запуск бота
// ========================
bot.launch().then(() => 
  console.log('🟢 Бот запущен с кнопочным интерфейсом!'));
