# Firestore Security Specification

## 1. Data Invariants
1. **User Profiles (`/users/{userId}`)**:
   - A user can only write to their own profile where document ID matches `request.auth.uid`.
   - Cannot spoof or escalate admin roles or tamper with `userId`.
2. **Service Reports (`/service_reports/{reportId}`)**:
   - Requires verified pastor authentication (`request.auth != null`).
   - `authorId` must match `request.auth.uid`.
   - Content strings must adhere to maximum length limits (10,000 chars) to prevent Denial of Wallet.
   - Read access is restricted to authenticated pastoral team members or the creator.
3. **Care Prayers (`/care_prayers/{prayerId}`)**:
   - Creating a prayer request is open to congregants/anonymous users with valid schema (category, content <= 2000 chars).
   - Only authorized pastors or the author can update/delete prayer requests. Incrementing `prayerCount` requires explicit action validation.
4. **Donations (`/donations/{donationId}`)**:
   - Donation creation requires valid numeric amount > 0 and fund name.
   - Users can only read their own donations, while unauthenticated reads are blocked.

## 2. The Dirty Dozen Test Payloads
1. **Payload 1 (Spoofed Author ID)**: User A tries to create a service report with User B's `authorId`. -> Expected: PERMISSION_DENIED.
2. **Payload 2 (Unauthenticated Report Write)**: Unauthenticated client tries to create or update `/service_reports/123`. -> Expected: PERMISSION_DENIED.
3. **Payload 3 (Denial of Wallet 1MB String)**: Attacker attempts to post a 1MB payload to `summary`. -> Expected: PERMISSION_DENIED.
4. **Payload 4 (Ghost Field Poisoning)**: Malicious write includes `isAdmin: true` inside a report or user profile. -> Expected: PERMISSION_DENIED.
5. **Payload 5 (Cross-User Profile Hijack)**: User A tries to update `/users/{UserB}`. -> Expected: PERMISSION_DENIED.
6. **Payload 6 (Negative Donation Injection)**: Attacker tries to create a donation with `amount: -500`. -> Expected: PERMISSION_DENIED.
7. **Payload 7 (Unbounded Prayer String)**: Attacker injects a prayer content of length > 2000. -> Expected: PERMISSION_DENIED.
8. **Payload 8 (Invalid Category Enum)**: Attacker injects an invalid category `category: 'malicious_sql'`. -> Expected: PERMISSION_DENIED.
9. **Payload 9 (Blanket Query Scraping)**: Unauthenticated client queries all donation records. -> Expected: PERMISSION_DENIED.
10. **Payload 10 (Immutable Field Mutation)**: User attempts to change `createdAt` or `authorId` on an existing report. -> Expected: PERMISSION_DENIED.
11. **Payload 11 (Path Variable Injection Attack)**: Document ID containing forbidden characters or > 128 characters. -> Expected: PERMISSION_DENIED.
12. **Payload 12 (Direct Client Admin Escalation)**: Modifying `/admins/{uid}` directly without root permissions. -> Expected: PERMISSION_DENIED.
