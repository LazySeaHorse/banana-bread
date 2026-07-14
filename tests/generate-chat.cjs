const fs = require('fs');
const path = require('path');

const participants = ['Alice', 'Bob', 'Charlie', 'Dana'];
const messages = [
  "Hello!",
  "How is it going?",
  "Check this out!",
  "<Media omitted>",
  "Haha that's funny!",
  "Are we meeting today?",
  "Yes, at 5 PM.",
  "Great, see you then.",
  "Don't forget the files.",
  "Already sent them.",
  "Thanks!",
  "No problem.",
  "Let's do this again.",
  "Absolutely.",
  "I'm on my way.",
  "Same here.",
];

function generateChat() {
  const lines = [];
  // Start from Jan 1st 2026, 10:00 AM
  let current = new Date(2026, 0, 1, 10, 0, 0);

  for (let i = 0; i < 2000; i++) {
    // Increment time by a random amount (between 1 minute and 12 hours)
    const minutesToAdd = Math.floor(Math.random() * 720) + 1;
    current.setMinutes(current.getMinutes() + minutesToAdd);

    const day = String(current.getDate()).padStart(2, '0');
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const year = current.getFullYear();
    const hours = String(current.getHours()).padStart(2, '0');
    const minutes = String(current.getMinutes()).padStart(2, '0');

    const dateStr = `${day}/${month}/${year}`;
    const timeStr = `${hours}:${minutes}`;

    const sender = participants[Math.floor(Math.random() * participants.length)];
    let text = messages[Math.floor(Math.random() * messages.length)];

    // Randomly edit some messages
    if (Math.random() < 0.05) {
      text += " <This message was edited>";
    }

    lines.push(`${dateStr}, ${timeStr} - ${sender}: ${text}`);
  }

  const filePath = path.join(__dirname, 'dummy-chat.txt');
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  console.log(`Generated 2000 messages chat at ${filePath}`);
}

generateChat();
