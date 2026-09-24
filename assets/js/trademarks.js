// Well-known brand names the generator must never suggest.
// This is a coarse safety net, not a trademark search: a name that passes
// can still be protected. The UI links to TMview for a real search.

const BRANDS = [
  'adidas', 'adobe', 'airbnb', 'alibaba', 'amazon', 'android', 'apple', 'asana',
  'audi', 'autodesk', 'bing', 'bitly', 'blackberry', 'booking', 'bosch', 'bumble',
  'canva', 'chrome', 'cisco', 'cloudflare', 'coinbase', 'dell', 'deliveroo',
  'discord', 'disney', 'docusign', 'dropbox', 'duolingo', 'ebay', 'etsy',
  'evernote', 'facebook', 'figma', 'firefox', 'fitbit', 'flickr', 'garmin',
  'github', 'gitlab', 'gmail', 'google', 'grammarly', 'groupon', 'honda', 'hubspot',
  'ikea', 'instagram', 'intel', 'jira', 'kickstarter', 'klarna', 'lego', 'linkedin',
  'lyft', 'mailchimp', 'mastercard', 'mcdonalds', 'meta', 'microsoft', 'miro',
  'monday', 'mozilla', 'netflix', 'nike', 'nintendo', 'notion', 'nvidia', 'oracle',
  'paypal', 'peloton', 'pinterest', 'playstation', 'porsche', 'quora', 'reddit',
  'revolut', 'roblox', 'salesforce', 'samsung', 'shopify', 'siemens', 'skype',
  'slack', 'snapchat', 'sony', 'soundcloud', 'flixbus', 'hellofresh', 'teamviewer', 'trivago', 'spotify', 'squarespace', 'starbucks', 'steam',
  'stripe', 'telegram', 'tesla', 'tiktok', 'tinder', 'toyota', 'trello', 'tumblr',
  'twitch', 'twitter', 'uber', 'visa', 'vimeo', 'volkswagen', 'walmart', 'whatsapp',
  'wikipedia', 'wix', 'wordpress', 'xbox', 'yahoo', 'youtube', 'zalando', 'zapier',
  'zendesk', 'zoom',
];

const BRAND_SET = new Set(BRANDS);

export function isKnownBrand(name) {
  return BRAND_SET.has(String(name).toLowerCase().replace(/[^a-z0-9]/g, ''));
}

export function trademarkSearchUrl(name) {
  // TMview covers the DPMA, EUIPO and most national offices in one search.
  return `https://www.tmdn.org/tmview/#/tmview/results?page=1&pageSize=30&criteria=C&basicSearch=${encodeURIComponent(name)}`;
}
