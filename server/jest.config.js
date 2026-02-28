/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    collectCoverageFrom: [
        'src/routes/**/*.ts',
        'src/utils/**/*.ts',
        '!src/**/*.d.ts',
    ],
    // Test timeout — DB əlaqəsi olduğu üçün daha uzun
    testTimeout: 15000,
};
