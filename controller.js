target.addEventListener('DOMSubtreeModified', function (e) {
  // define variables
  let
    odds,
    betType,
    amount,
    horseName,
    matchedAmount;
  // check if event from odds or price matched cols
  if(
    (e.target.parentElement.parentElement.parentElement.className == 'level-0 tick')
    ||
    (e.target.parentElement.parentElement.className == 'level-0 tick')
  ) {
    if(e.target.className == 'formatted-price numeric-value') {// odds
      odds = e.target.innerText;
      if(e.target.parentElement.parentElement.children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-blue-no-flash.png') {
        betType = 'lay';
      } else if(e.target.parentElement.parentElement.children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-green-no-flash.png') {
        betType = 'bet';
      }
      amount = e.target.parentElement.parentElement.parentElement.children[1].innerText;
      horseName = e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0];
    } else if(e.target.className == 'formatted-currency numeric-value') {// amount
      amount = e.target.innerText;
      if(e.target.parentElement.parentElement.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-blue-no-flash.png') {
        betType = 'lay';
      } else if(e.target.parentElement.parentElement.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-green-no-flash.png') {
        betType = 'bet';
      }
      odds = e.target.parentElement.parentElement.children[0].children[1].innerText;
      horseName = e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0];
    }
    if(!!betType && !!odds && !!amount && !!horseName) {
      const MATCHED_AMOUNT_SELECTOR = '#contract-collapse-6922068-control > div > div.contract-group-stats > span > span > span';
      matchedAmount = document.querySelector(MATCHED_AMOUNT_SELECTOR).innerText;
      const exchange = 'smarkets';
      const data = {
        betType,
        odds,
        amount,
        horseName,
        matchedAmount,
        exchange
      };
      const output = JSON.stringify(data);
      console.log(output);
    }
  }
});
