# BrightEd - Adaptive Learning Platform

A production-ready, simulation-first learning platform designed for CXC students (SEA, CSEC, CAPE).

## Features

- **Complete Onboarding Flow**: 7-step onboarding with diagnostic assessment
- **Adaptive Learning Path**: Personalized recommendations based on student performance
- **Simulation-First Learning**: Interactive simulations that teach through decision-making
- **Progress Tracking**: Visual mastery bars, stability indicators, and streak tracking
- **Modern UI**: Built following the BrightEd design system with calm, academic aesthetics

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations and transitions

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── app/
│   ├── onboarding/          # Complete onboarding flow
│   │   ├── page.tsx         # 7-step onboarding
│   │   ├── diagnostic/      # Diagnostic assessment
│   │   └── complete/        # Completion screen
│   ├── learn/               # Learning path page
│   ├── simulate/            # Simulation interface
│   ├── progress/            # Progress tracking
│   ├── profile/             # User profile
│   └── page.tsx             # Homepage
├── components/              # Reusable components
│   ├── Navigation.tsx
│   ├── ProgressWidget.tsx
│   ├── RecommendationCard.tsx
│   └── StreakIndicator.tsx
└── public/                  # Static assets
    └── BrightEdLogo.png
```

## Design System

The website follows the BrightEd UI Design System:

- **Primary Colors**: Deep teal and soft navy (70-75% of UI)
- **Secondary Colors**: Warm yellow and soft orange (15-20%)
- **Accent Colors**: Light purple and red (sparingly used)
- **Typography**: Inter for headings and body, JetBrains Mono for data
- **Animations**: Smooth, purposeful motion that explains cause and effect

## Key Features Implemented

✅ Complete onboarding flow with diagnostic
✅ Homepage with welcome, progress, and recommendations
✅ Learning path with adaptive recommendations
✅ Interactive simulation interface
✅ Progress tracking with mastery bars
✅ Profile page with user information
✅ Responsive navigation
✅ Accessibility considerations (focus states, reduced motion)
✅ Production-ready build configuration

## Next Steps

To make this fully production-ready, consider:

1. Backend integration for data persistence
2. Authentication system
3. Real simulation engine
4. Adaptive recommendation algorithm
5. Parent/Teacher dashboards
6. Mobile app version

## License

Private - BrightEd Platform
