import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  { ignores: ["src/generated/**", ".next/**", "node_modules/**"] },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
