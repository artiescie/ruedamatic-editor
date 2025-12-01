module.exports = {
  root: true,
  // parser: "babel-eslint",
  // parserOptions: {
  //   sourceType: "module"
  // },
  parser: "vue-eslint-parser",
  parserOptions: {
    "ecmaVersion": 2020,
    "sourceType": "module"
  },
  env: {
    browser: true,
    node: true
  },
  extends: "standard",
  globals: {
    __static: true
  },
  plugins: ["vue"],
  rules: {
    // allow paren-less arrow functions
    "arrow-parens": 0,
    // allow async-await
    "generator-star-spacing": 0,
    // allow debugger during development
    "no-debugger": process.env.NODE_ENV === "production" ? 2 : 0,
    // rc oct 2024 allow backtick
    "quotes": ["error", "single", { "allowTemplateLiterals": true }]
  }
}
