# Personal Portfolio Website

A modern, responsive personal portfolio website built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- **Modern Stack**: Built with Next.js 15, React 19, and TypeScript
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Animations**: Smooth animations using Framer Motion
- **UI Components**: Beautifully designed components using shadcn/ui
- **Multi-page Structure**:
  - Home: Hero section with features
  - About: Skills and experience
  - Projects: Portfolio showcase
  - Blog: Technical writing and insights
  - Contact: Contact form and information

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

Install dependencies:

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

### Build

Build for production:

```bash
npm run build
```

Start production server:

```bash
npm start
```

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Project Structure

```
personal-website/
├── src/
│   ├── app/
│   │   ├── about/
│   │   ├── blog/
│   │   ├── contact/
│   │   ├── projects/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── components/
│       ├── ui/
│       ├── Navigation.tsx
│       └── Footer.tsx
├── public/
└── package.json
```

## Customization

1. Update content in each page component
2. Modify theme colors in `globals.css`
3. Add your own projects, blog posts, and experience
4. Update social links in `Footer.tsx`
5. Customize navigation items in `Navigation.tsx`

## Deployment

This project can be deployed on:
- Vercel (recommended)
- Netlify
- Any platform supporting Next.js

## License

MIT
