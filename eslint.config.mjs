import globals from "globals";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { languageOptions: { globals: globals.browser },
    rules: {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn", // or "error"
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }
    ]
  } },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  //...tseslint.configs.strictTypeChecked,
  //...tseslint.configs.stylisticTypeChecked,
);
