# Manual QA Checklist — Trivia App

Mark each item as Pass, Fail, or Not Tested.

## 1. Desktop
- [x] Landing page displays correctly.
- [x] Welcome banner and category tiles display correctly.
- [x] Category icons and colors display correctly.
- [x] Category pagination works.
- [x] Navigation links work.
- [x] Quiz loads and answers can be selected.
- [x] Results display correctly.
- [x] Scoreboard displays correctly.
- [x] Dashboard displays correctly.

## 2. Mobile
- [x] Layout fits a mobile screen.
- [x] Text and buttons are readable and usable.
- [x] Category tiles display correctly.
- [x] Pagination works.
- [x] Navigation is usable.
- [x] Quiz and results display correctly.

## 3. Authentication
### Logged out
- [x] Landing, login, and signup pages are accessible.
- [x] Protected routes redirect or block access.

### Logged-in normal user
- [x] Home, quiz, results, scoreboard, and dashboard are accessible.
- [x] Admin page is blocked.

### Logged-in admin
- [x] Admin page is accessible.
- [x] Admin controls are visible.

## 4. Installed PWA
- [x] App installs successfully.
- [x] App opens in standalone mode.
- [x] Layout displays correctly.
- [x] Offline indicator appears when disconnected.
- [x] App remains usable offline where supported.
- [x] Reconnecting restores online status.
- [x] Update prompt works when an update is available.

## 5. Final checks
- [x] No unexpected browser console errors.
- [x] No broken images or icons.
- [x] No horizontal scrolling on mobile.

## Issues found
Record any failed checks, steps to reproduce, and screenshots if available.