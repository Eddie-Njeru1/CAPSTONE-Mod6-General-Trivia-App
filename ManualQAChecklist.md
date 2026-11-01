# Manual QA Checklist — Trivia App

Mark each item as Pass, Fail, or Not Tested.

## 1. Desktop
- [ ] Landing page displays correctly.
- [ ] Welcome banner and category tiles display correctly.
- [ ] Category icons and colors display correctly.
- [ ] Category pagination works.
- [ ] Navigation links work.
- [ ] Quiz loads and answers can be selected.
- [ ] Results display correctly.
- [ ] Scoreboard displays correctly.
- [ ] Dashboard displays correctly.

## 2. Mobile
- [ ] Layout fits a mobile screen.
- [ ] Text and buttons are readable and usable.
- [ ] Category tiles display correctly.
- [ ] Pagination works.
- [ ] Navigation is usable.
- [ ] Quiz and results display correctly.

## 3. Authentication
### Logged out
- [ ] Landing, login, and signup pages are accessible.
- [ ] Protected routes redirect or block access.

### Logged-in normal user
- [ ] Home, quiz, results, scoreboard, and dashboard are accessible.
- [ ] Admin page is blocked.

### Logged-in admin
- [ ] Admin page is accessible.
- [ ] Admin controls are visible.

## 4. Installed PWA
- [ ] App installs successfully.
- [ ] App opens in standalone mode.
- [ ] Layout displays correctly.
- [ ] Offline indicator appears when disconnected.
- [ ] App remains usable offline where supported.
- [ ] Reconnecting restores online status.
- [ ] Update prompt works when an update is available.

## 5. Final checks
- [ ] No unexpected browser console errors.
- [ ] No broken images or icons.
- [ ] No horizontal scrolling on mobile.

## Issues found
Record any failed checks, steps to reproduce, and screenshots if available.