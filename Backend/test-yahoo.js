import yahooFinance from 'yahoo-finance2';
async function run() {
  const quote = await yahooFinance.quote('RELIANCE.NS');
  console.log("regularMarketPrice:", quote.regularMarketPrice);
  console.log("postMarketPrice:", quote.postMarketPrice);
}
run();
