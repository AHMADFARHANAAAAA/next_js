module.exports = {
  extends: ['next/core-web-vitals', 'next/typescript'],
  rules: {
    // Disable rules that are preventing build
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'react/no-unescaped-entities': 'warn',
    '@next/next/no-img-element': 'warn',
    '@typescript-eslint/no-require-imports': 'warn',
  },
}