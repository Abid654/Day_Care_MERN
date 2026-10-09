# Online Daycare Centre — Parent Flow Guide

Yeh guide parent account ko register karne aur parent dashboard use karne ka tareeqa batati hai. Ismein wohi actions shamil hain jo current application/backend support karta hai.

## Parent flow at a glance

```text
Sign Up → Login → Parent Dashboard
                     ├─ My Profile
                     ├─ Suggested Daycares / Find Daycare
                     ├─ Daycare Details → Booking Request
                     ├─ My Bookings (pending / reviewed status)
                     ├─ Payments & Invoices
                     ├─ Reviews (availability notice)
                     └─ Family Updates, Attendance, Messages
```

## 1. Parent account banana

1. Login page se **Create account / Sign up** link kholen. Registration page `/register` par bhi available hai.
2. Account type mein **Parent** select karein.
3. Yeh details bharein:
   - Full name
   - Email address
   - Phone number
   - Residential address
   - Password aur confirm password
4. Form submit karein. Required fields aur invalid email/phone/password par form error dikhata hai.
5. Account create hone ke baad app Login page par le jati hai. Apne email aur password se sign in karein.
6. Parent account `/parent/dashboard` par jata hai. Parent-only pages login ke baghair open nahi hote.

## 2. Dashboard ka istemal

Dashboard ke top navigation se relevant section par jayen. Mobile screen par dashboard sections ko neeche scroll karke dekha ja sakta hai. Account/profile control se profile kholen; account menu se **Log out** karein.

### My Profile

Profile control se form khol kar apni details complete ya update karein:

- Parent name, contact number, residential address aur preferred area/city
- Emergency contact ka naam, phone, relationship aur additional details
- Child support type: full-time ya part-time
- Care start aur end time

Required fields bharein aur **Save profile** dabayen. Form mein pehle se saved details hon to unhein badal kar dobara save karein. Account email profile form mein read-only hai. Parent profile photo upload/change/remove bhi available hai.

> Profile mein required care duration start/end time ke zariye record hota hai. Sirf profile mein preference save karna daycare booking request nahi bhejta.

### Suggested Daycares

Suggested section approved daycare listings dikhata hai aur preferred area se match hone walon ko pehle rakhta hai. Agar suggestions kam hon ya area match na ho, **Find Daycare** se tamam listed options dekh sakte hain. Suggestions area-based hain; yeh availability ya placement ki guarantee nahi detin.

### Find Daycare

Search filters:

- **Location:** city ya area ka naam
- **Care setting:** home-based ya facility
- **Minimum experience:** saalon mein
- **Maximum monthly fee:** rupees mein

Filter match hone par daycare cards mein naam, location, services, listed fee aur photos dikhte hain. **View full daycare profile** dabayen to `/daycares/:daycareId` par details, provider information aur profile mein available facilities dekhein.

Search ke waqt rate monthly listed fee hai. Agar fee listing mein maujood na ho to provider se fee confirm karein.

### Daycare book karna aur My Bookings

1. **Find Daycare** ya **Suggested Daycares** mein provider select karein aur **View full daycare profile** kholen.
2. Contact panel mein **Request a booking** dabayen.
3. Child ka naam aur date of birth, full-time/part-time care type, start/end dates, aur optional notes bharein.
4. **Send booking request** dabayen. App request ko **Pending** status mein save karke dashboard par le jati hai.
5. Daycare apne dashboard ke **Booking Requests** section se request **Accept** ya **Reject** kar sakta hai. Parent ko status notification milti hai; updated state **My Bookings** mein dekhein.

Request bhejne ya accept hone se payment charge nahi hoti aur childcare placement final nahi maana jata. Daycare se fees aur enrollment ke next steps confirm karein. Is flow mein parent child details booking request ke saath deta hai; daycare ki enrollment/child records alag se manage hoti hain.

### Payments

Payments section linked daycare ke banaye hue invoices aur recorded payment history dikhata hai. Invoice amount, paid amount, balance, due date, payment method/reference aur status dekhein. Recorded payment ke liye receipt print option ho sakta hai.

Parent ke liye online/mobile payment shuru karne ka endpoint maujood nahi. Payment provider/daycare ke saath directly arrange karein; status tabhi update hoga jab daycare/backend payment record kare. App card charge ya mobile-wallet transfer process nahi karti.

### Reviews

Reviews section filhaal batata hai ke review submit karna available nahi. Backend mein parent review submission route nahi hai; is liye koi review save ya publish nahi hota.

## 3. Dashboard ke doosre available sections

- **My children:** linked daycare family record mein shamil bachon ki details.
- **Attendance history:** daycare ke recorded check-in/check-out aur status.
- **Updates & events / Daily updates:** daycare ke share kiye huay notices aur child updates.
- **Send a message:** linked daycare ko general request ya complaint bhejne ke liye. Daycare linked na ho to pehle daycare se apne registered parent account ko family record se link karwayen.
- **Requests & complaints:** apne bheje huay messages aur unka current status.

## 4. Current feature boundaries

Current backend approved daycare listings aur details, parent profile, parent booking requests, daycare accept/reject review, linked family portal, payment records, requests aur complaints support karta hai. Parent-side payment initiation aur review creation abhi implement nahi hain. Daycare listings mein full-time/part-time availability aur dedicated skills data public search filter ke liye available nahi, is liye provider se details confirm karein.

## 5. Common issues

- **Login nahi hota:** registration mein diya hua email/password check karein. Parent dashboard ke liye parent account zaroori hai.
- **Profile save nahi hota:** required fields, valid phone numbers, support type aur care start/end times complete karein. End time start time ke baad hona chahiye.
- **Koi daycare nahi mil raha:** location filter clear karke dekhein; sirf admin-approved listings search mein aati hain.
- **Booking/invoice nahi dikh rahi:** yeh records linked daycare se aate hain. Daycare se registered email ke zariye family record link karne aur record banane ko kahen.
- **Logout:** account menu mein **Log out** chunen. Dobara use karne ke liye Login page par sign in karein.
