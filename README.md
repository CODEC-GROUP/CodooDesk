# Next.js Project

A [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Table of Contents
- [Getting Started](#getting-started)
- [Development](#development)
- [Versioning System](#versioning-system)
- [Learn More](#learn-more)
- [Deployment](#deployment)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Development

The project follows standard Next.js development practices. After starting the development server, you can make changes to your application and see them reflected in real-time.

## Versioning System

This project uses a comprehensive versioning system with the following commands:

| Command | Description | Example |
|---------|-------------|---------|
| `version:patch` | Increments the patch version for bug fixes | 0.1.0 → 0.1.1 |
| `version:minor` | Increments the minor version for new features | 0.1.0 → 0.2.0 |
| `version:major` | Increments the major version for breaking changes | 0.1.0 → 1.0.0 |
| `version:dev` | Creates a development prerelease | 0.1.0 → 0.1.1-dev.0 |
| `version:beta` | Creates a beta prerelease | 0.1.0 → 0.1.1-beta.0 |
| `release` | Combines version increment and distribution build | - |
| `release:beta` | Creates a beta release with versioning | - |

### How to Use the Versioning System

For Development Builds:
```bash
npm run version:dev
```
This will create versions like 0.1.1-dev.0, 0.1.1-dev.1, etc.

For Beta Releases:
```bash
npm run version:beta
# or
npm run release:beta
```
This will create versions like 0.1.1-beta.0, 0.1.1-beta.1, etc.

For Production Releases:

For bug fixes:
```bash
npm run version:patch
# or
npm run release
```

For new features:
```bash
npm run version:minor
```

For breaking changes:
```bash
npm run version:major
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.