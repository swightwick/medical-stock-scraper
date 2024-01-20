const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
const port = 3000;

let availableFlowers = [];
let lastScrapeTimestamp = '';

async function scrapeData() {
  try {
    let site = 'https://www.mamedica.co.uk/repeat-prescription/'
    const browser = await puppeteer.launch({ 
      headless: true
    });
    console.log('Opening Browser');
    const page = await browser.newPage();
    await page.goto(site);
    await page.setViewport({width: 1080, height: 1024});
    await page.waitForSelector('#field_3_31')
    await page.click('#label_3_31_0');
    await page.click('#label_3_45_0');
    await page.click('#label_3_32_0');
    await page.waitForSelector('#field_3_50 .selectric-scroll')
    
    // capture all the items in stock list
    let elements = await page.$$('#field_3_50 .selectric-scroll ul li');

    // loop trough items
    availableFlowers = [];
    for (let i = 1; i < elements.length; i++) {
      await page.click('#field_3_50 b.button');
      await page.click(`#field_3_50 .selectric-items .selectric-scroll ul li[data-index*="${i}"]`);
      const flower = await page.$eval(`#field_3_50 .selectric-items .selectric-scroll ul li[data-index*="${i}"]`, e => e.innerText);
      await page.waitForTimeout(10) 
      await page.$eval('#input_3_53', el => el.value = '1');
      await page.click('#field_3_77');
      await page.waitForTimeout(20) 
      const getCosts = await page.$eval('#input_3_67', e => e.value);
      const cost = getCosts.replace(/\s/g, '');
      await page.waitForTimeout(20) 
      availableFlowers.push({ "item": 
        {"flower": flower, "cost": cost}
      })
    }

    lastScrapeTimestamp = new Date().toLocaleString('en-GB', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });
    console.log('Scraped data at', lastScrapeTimestamp);
    await browser?.close();
    console.log('Closed browser')
  } catch (error) {
    console.error('Error during scraping:', error);
  }
}

function updateHtml() {
  const productAmount = availableFlowers.length
  const dataHtml = availableFlowers
    .map(
      (item) => `<li>
        <span class="flower">${item.item.flower}</span>
        <span class="price">${item.item.cost}</span>
      </li>`
    )
    .join('');

  // Display the scraped data as an unordered list
  app.get('/', (req, res) => {
    res.send(`
    <head>
    <meta charset="utf-8">
    <title>Stock</title>
    <link rel="stylesheet" type="text/css" href="/styles/main.css">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;500&display=swap');
    </style>
    </head>
      <body>
        <header>
          <h1>${productAmount} products available</h1>
          <span>Updated ${lastScrapeTimestamp}</span>
        </header>
        <ul>
          ${dataHtml}
        </ul>
      </body>
    </html>`
    );
  });
}

// Run the code immediately when the script starts
scrapeData().then(() => updateHtml());

const hours = 12;
const millisecondsInAnHour = 60 * 60 * 1000; // 1 hour = 60 minutes * 60 seconds * 1000 milliseconds
const intervalTime = hours * millisecondsInAnHour;

setInterval(async () => {
  await scrapeData();
  updateHtml();
}, intervalTime);

app.use('/styles', express.static(__dirname + '/public/styles'));
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Server is running' });
});