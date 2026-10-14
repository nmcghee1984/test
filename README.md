# UofG Life

A React Native / Expo prototype for a University of Glasgow campus companion. It brings the core app areas together in one lightweight, login-free experience: today's timetable, campus facilities and lifts, study-space availability, and university events.

## Run locally

1. Install Node.js (LTS) and npm.
2. From this directory run `npm install`.
3. Run `npx expo start`, then open the project in Expo Go or an iOS/Android simulator.

## Prototype scope

All timetable, map, capacity, booking, and event content is clearly labelled sample data in `src/data/mockData.ts`. Interactions (switching tabs and days, selecting map pins, saving a study space, and saving an event) run locally in the app. There are no UofG account credentials, live university APIs, or real bookings. The data module is the boundary to replace with approved University of Glasgow services when available.

The prototype is designed for quick access: it opens directly to the dashboard without an account gate, surfaces the next class and nearby study options, and uses simple native components rather than heavy map or animation dependencies.
