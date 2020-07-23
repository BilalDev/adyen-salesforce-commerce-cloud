module.exports = {
  "env": {
    "es6": true,
    "browser": true,
    "node": true,
    "jest": true,
  },
  "extends": [
    "airbnb-base",
    "prettier",
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
    "SitePreferences": "readonly",
    "document": "readonly",
    "window": "readonly",
    "location": "readonly",
  },
  "parser": "babel-eslint",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module",
    "ecmaFeatures": {
      "modules": true,
    },
  },
  "plugins": [
    "prettier",
  ],
  "ignorePatterns": [
    "*.ds",
  ],
  "rules": {
    "prettier/prettier": "error",
    "no-var": "error",
    "prefer-const": "warn",
    "complexity": [
      "warn",
      {
        "max": 2,
      },
    ],
    "eqeqeq": "error",
    "curly": "error",
    "import/no-unresolved": [
      2,
      {
        "ignore": [
          "^dw",
          "^base",
          "^\\*",
        ],
      },
    ],
    "import/extensions": ["error", { "js": "never" }],
    "import/no-extraneous-dependencies": "off",
    /* Rules below should be removed after they are gone. They default to "error",
       but those errors wont be fixed now, since the refactoring should solve those issues.
       We keep it as "warn" so we don't introduce them again while refactoring. */
    "block-scoped-var": "warn",
    "camelcase": "warn",
    "consistent-return": "warn",
    "default-case": "warn",
    "global-require": "warn",
    "guard-for-in": "warn",
    "import/no-dynamic-require": "warn",
    "import/prefer-default-export": "warn",
    "import/order": "warn",
    "import/no-cycle": "warn",
    "no-param-reassign": "warn",
    "no-use-before-define": "warn",
    "no-plusplus": "warn",
    "no-continue": "warn",
    "no-loop-func": "warn",
    "no-lonely-if": "warn",
    "no-restricted-syntax": "warn",
    "no-underscore-dangle": "warn",
    "no-restricted-properties": "warn",
    "no-restricted-globals": "warn",
    "no-unused-expressions": "warn",
    "no-unused-vars": "warn",
    "no-new-wrappers": "warn",
    "no-shadow": "warn",
    "no-multi-assign": "warn",
    "prefer-destructuring": "warn",
    "radix": "warn",
    "vars-on-top": "warn",
  },
};
