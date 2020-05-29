{
  "env": {
    "es6": true,
    "browser": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "prettier"
  ],
  "globals": {
    "$": "readonly",
    "Resources": "readonly",
    "order": "readonly",
    "request": "readonly",
    "response": "readonly",
    "session": "readonly",
    "dw": "readonly",
    "empty": "readonly",
    "Feature": "readonly",
    "Scenario": "readonly",
    "AdyenCheckout": "readonly",
    "storeDetails": "writable",
    "showStoreDetails": "readonly",
    "checkout": "readonly",
    "orderNo": "readonly",
    "pspReference": "readonly",
    "donationAmounts": "readonly",
    "adyenGivingBackgroundUrl": "readonly",
    "charityDescription": "readonly",
    "adyenGivingLogoUrl": "readonly",
    "charityName": "readonly",
    "charityWebsite": "readonly",
    "customer": "readonly",
    "actor": "readonly",
    "locate": "readonly",
    "describe": "readonly",
    "it": "readonly",
    "copyCardData": "readonly",
    "PIPELET_NEXT": "readonly",
    "PIPELET_ERROR": "readonly",
    "Urls": "readonly",
    "SitePreferences": "readonly"
  },
  "parserOptions": {
    "ecmaVersion": 2018,
    "ecmaFeatures": {
      "modules": true
    }
  },
  "plugins": [
    "prettier"
  ],
  "rules": {
    "prettier/prettier": "error",
    "no-var": "error",
    "prefer-const": "warn",
    "complexity": ["warn", {"max":  2}],
    "eqeqeq": "error"
  }
}