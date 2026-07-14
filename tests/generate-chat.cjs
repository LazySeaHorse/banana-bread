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

  const argumentTopics = [
    {
      participants: ['Alice', 'Bob'],
      keywords: ['budget', 'money', 'expensive', 'cost', 'project', 'finance'],
      messages: [
        "We need to discuss the project budget!",
        "Why? I thought the budget was already approved.",
        "It is too expensive, we are spending too much money!",
        "But the cost is justified for this quality.",
        "No way, we can't afford these cost figures.",
        "We have the finance team backing us on this budget.",
        "Let's look at the financial report again. It's crazy.",
        "I will send the budget spreadsheet over."
      ]
    },
    {
      participants: ['Charlie', 'Dana'],
      keywords: ['server', 'database', 'crash', 'down', 'broken', 'deploy'],
      messages: [
        "Did you deploy the new database schema?",
        "Yes, I did. Is something broken?",
        "The production server is completely down!",
        "Wait, what? The database server crashed?",
        "Yes, the server is unresponsive. Check the deploy logs.",
        "I'm looking at the database deploy now, it looks clean.",
        "Well, it's not clean because the system is broken!",
        "Okay, restarting the database server now."
      ]
    }
  ];

  for (let i = 0; i < 2000; i++) {
    // Normal message
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
    if (Math.random() < 0.05) {
      text += " <This message was edited>";
    }
    lines.push(`${dateStr}, ${timeStr} - ${sender}: ${text}`);

    // Every 400 messages, inject an argument burst!
    if (i > 0 && i % 400 === 0) {
      const topic = argumentTopics[(i / 400 - 1) % argumentTopics.length];
      // Generate 25 messages in rapid succession (10 to 60 seconds apart)
      for (let j = 0; j < 25; j++) {
        const secondsToAdd = Math.floor(Math.random() * 50) + 10;
        current.setSeconds(current.getSeconds() + secondsToAdd);

        const dayB = String(current.getDate()).padStart(2, '0');
        const monthB = String(current.getMonth() + 1).padStart(2, '0');
        const yearB = current.getFullYear();
        const hoursB = String(current.getHours()).padStart(2, '0');
        const minutesB = String(current.getMinutes()).padStart(2, '0');
        const dateStrB = `${dayB}/${monthB}/${yearB}`;
        const timeStrB = `${hoursB}:${minutesB}`;

        const senderB = topic.participants[j % topic.participants.length];
        let textB = topic.messages[j % topic.messages.length];
        if (j >= topic.messages.length) {
          textB = `We must check the ${topic.keywords[j % topic.keywords.length]} again, it's very important!`;
        }
        lines.push(`${dateStrB}, ${timeStrB} - ${senderB}: ${textB}`);
      }
    }
  }

  const filePath = path.join(__dirname, 'dummy-chat.txt');
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  console.log(`Generated ${lines.length} messages chat with arguments at ${filePath}`);
}

generateChat();
