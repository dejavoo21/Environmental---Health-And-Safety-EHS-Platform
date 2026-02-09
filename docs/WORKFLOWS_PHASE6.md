# Workflows – EHS Portal Phase 6
## Security, Trust & Self-Service

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-04 |
| Status | Draft |
| Phase | 6 – Security, Trust & Self-Service |

---

## 1. Overview

This document defines the key workflows for Phase 6 security features including access requests, password reset, two-factor authentication, and account security management.

---

## 2. Access Request Workflow

### 2.1 Self-Service Access Request Submission

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│              WORKFLOW: SELF-SERVICE ACCESS REQUEST SUBMISSION                    │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   START     │
│  (Visitor)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Navigate to         │
│ /request-access     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Fill Request Form   │
│ - Full name         │
│ - Email             │
│ - Organisation code │
│ - Requested role    │
│ - Reason (optional) │
│ - Accept terms      │
└──────────┬──────────┘
           │
           ▼
       ┌───────────┐
       │  Submit   │
       └─────┬─────┘
             │
             ▼
     ┌───────────────┐     No     ┌────────────────────┐
     │ Valid org     │───────────>│ Show error:        │
     │ code?         │            │ "Organisation not  │
     └───────┬───────┘            │  found"            │
             │ Yes                └────────────────────┘
             ▼
     ┌───────────────┐     Yes    ┌────────────────────┐
     │ Duplicate     │───────────>│ Show error:        │
     │ pending       │            │ "Request already   │
     │ request?      │            │  pending"          │
     └───────┬───────┘            └────────────────────┘
             │ No
             ▼
     ┌───────────────┐     Yes    ┌────────────────────┐
     │ Email already │───────────>│ Show error:        │
     │ registered?   │            │ "Account exists,   │
     └───────┬───────┘            │  use forgot pwd"   │
             │ No                 └────────────────────┘
             ▼
┌─────────────────────┐
│ Create access       │
│ request record      │
│ Status: pending     │
│ Generate ref number │
│ Set expiry (30 days)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Send confirmation   │
│ email to requester  │
│ with reference #    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Log event to        │
│ security audit      │
│ ACCESS_REQUEST_     │
│ CREATED             │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Show success page   │
│ with reference #    │
└──────────┬──────────┘
           │
           ▼
       ┌───────┐
       │  END  │
       └───────┘
```

### 2.2 Admin Approval Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│              WORKFLOW: ADMIN ACCESS REQUEST APPROVAL                             │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   START     │
│   (Admin)   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Navigate to         │
│ Admin > Access      │
│ Requests            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ View pending        │
│ requests queue      │
│ (sorted by date)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Select request      │
│ to review           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ View request        │
│ details:            │
│ - Name, email       │
│ - Requested role    │
│ - Reason            │
│ - Submitted date    │
└──────────┬──────────┘
           │
           ▼
       ┌───────────┐
       │ Decision? │
       └─────┬─────┘
             │
     ┌───────┴───────┐
     │               │
     ▼               ▼
┌─────────┐    ┌─────────┐
│ APPROVE │    │ REJECT  │
└────┬────┘    └────┬────┘
     │               │
     ▼               ▼
┌────────────┐  ┌────────────┐
│ Optionally │  │ Optionally │
│ adjust role│  │ enter      │
│            │  │ reason     │
└─────┬──────┘  └─────┬──────┘
      │               │
      ▼               ▼
┌────────────┐  ┌────────────┐
│ Create new │  │ Update     │
│ user:      │  │ request:   │
│ - Generate │  │ status =   │
│   temp pwd │  │ 'rejected' │
│ - Set force│  │ decision_by│
│   pwd chg  │  │ decision_at│
└─────┬──────┘  └─────┬──────┘
      │               │
      ▼               ▼
┌────────────┐  ┌────────────┐
│ Update     │  │ Send       │
│ request:   │  │ rejection  │
│ status =   │  │ email      │
│ 'approved' │  │ (if config)│
└─────┬──────┘  └─────┬──────┘
      │               │
      ▼               ▼
┌────────────┐  ┌────────────┐
│ Send       │  │ Log:       │
│ welcome    │  │ ACCESS_    │
│ email with │  │ REQUEST_   │
│ temp pwd   │  │ REJECTED   │
└─────┬──────┘  └─────┬──────┘
      │               │
      ▼               │
┌────────────┐        │
│ Log:       │        │
│ ACCESS_    │        │
│ REQUEST_   │        │
│ APPROVED   │        │
│            │        │
│ Log:       │        │
│ USER_      │        │
│ CREATED    │        │
└─────┬──────┘        │
      │               │
      └───────┬───────┘
              │
              ▼
          ┌───────┐
          │  END  │
          └───────┘
```

### 2.3 Access Request State Machine

```
                      ┌─────────────────────────────────────────────┐
                      │                                             │
                      │            ACCESS REQUEST STATES             │
                      │                                             │
                      └─────────────────────────────────────────────┘

                                    ┌─────────┐
                         ┌─────────│ PENDING │─────────┐
                         │         └────┬────┘         │
                         │              │              │
        ┌────────────────┤              │              ├────────────────┐
        │                │              │              │                │
        ▼                │              ▼              │                ▼
   ┌─────────┐           │       ┌───────────┐        │          ┌─────────┐
   │APPROVED │           │       │  EXPIRED  │        │          │REJECTED │
   └─────────┘           │       └───────────┘        │          └─────────┘
        │                │       (auto after          │                │
        │                │        30 days)            │                │
        ▼                │                            │                ▼
   User created          │                            │           Email sent
   Welcome email         │                            │           (optional)
                         │                            │
                         │       ┌───────────┐        │
                         └──────>│ CANCELLED │<───────┘
                                 └───────────┘
                                 (if email verified
                                  user cancels)
```

---

## 3. Password Reset Workflow

### 3.1 Forgot Password Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│              WORKFLOW: FORGOT PASSWORD (REQUEST RESET)                           │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   START     │
│   (User)    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Click "Forgot       │
│ Password?" on       │
│ login page          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Enter email address │
└──────────┬──────────┘
           │
           ▼
       ┌───────────┐
       │  Submit   │
       └─────┬─────┘
             │
             ▼
     ┌───────────────┐     No
     │ Rate limit    │───────────────┐
     │ exceeded?     │               │
     └───────┬───────┘               │
             │ Yes                   │
             ▼                       │
┌────────────────────┐               │
│ Show message:      │               │
│ "Too many requests,│               │
│  try later"        │               │
│        │           │               │
│        ▼           │               │
│      END           │               │
└────────────────────┘               │
                                     │
                     ┌───────────────┘
                     │
                     ▼
             ┌───────────────┐     No     ┌────────────────────┐
             │ User exists   │───────────>│ (Do nothing -      │
             │ with email?   │            │  no user enum)     │
             └───────┬───────┘            └──────────┬─────────┘
                     │ Yes                           │
                     ▼                               │
             ┌───────────────┐                       │
             │ Invalidate    │                       │
             │ existing      │                       │
             │ tokens        │                       │
             └───────┬───────┘                       │
                     │                               │
                     ▼                               │
             ┌───────────────┐                       │
             │ Generate new  │                       │
             │ token (64 hex)│                       │
             └───────┬───────┘                       │
                     │                               │
                     ▼                               │
             ┌───────────────┐                       │
             │ Store hashed  │                       │
             │ token with    │                       │
             │ expiry (30min)│                       │
             └───────┬───────┘                       │
                     │                               │
                     ▼                               │
             ┌───────────────┐                       │
             │ Send reset    │                       │
             │ email with    │                       │
             │ link          │                       │
             └───────┬───────┘                       │
                     │                               │
                     ▼                               │
             ┌───────────────┐                       │
             │ Log:          │                       │
             │ PASSWORD_     │                       │
             │ RESET_REQUEST │                       │
             └───────┬───────┘                       │
                     │                               │
                     └───────────────┬───────────────┘
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │ ALWAYS show same message:     │
                     │ "If this email exists, you    │
                     │  will receive reset           │
                     │  instructions"                │
                     └───────────────┬───────────────┘
                                     │
                                     ▼
                                 ┌───────┐
                                 │  END  │
                                 └───────┘
```

### 3.2 Reset Password Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│              WORKFLOW: RESET PASSWORD (FROM EMAIL LINK)                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   START     │
│   (User)    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Click link in       │
│ reset email         │
│ /reset-password     │
│ ?token=xxx          │
└──────────┬──────────┘
           │
           ▼
     ┌───────────────┐     No     ┌────────────────────┐
     │ Token format  │───────────>│ Show error:        │
     │ valid?        │            │ "Invalid link"     │
     └───────┬───────┘            │ [Request new]      │
             │ Yes                └────────────────────┘
             ▼
     ┌───────────────┐
     │ Hash token    │
     │ and lookup    │
     └───────┬───────┘
             │
             ▼
     ┌───────────────┐     No     ┌────────────────────┐
     │ Token exists  │───────────>│ Show error:        │
     │ and unused?   │            │ "Link expired or   │
     └───────┬───────┘            │  already used"     │
             │ Yes                │ [Request new]      │
             ▼                    └────────────────────┘
     ┌───────────────┐     No
     │ Token not     │───────────>│ (Same as above)    │
     │ expired?      │            │                    │
     └───────┬───────┘            └────────────────────┘
             │ Yes
             ▼
┌─────────────────────┐
│ Show reset form:    │
│ - New password      │
│ - Confirm password  │
│ - Strength meter    │
└──────────┬──────────┘
           │
           ▼
       ┌───────────┐
       │  Submit   │
       └─────┬─────┘
             │
             ▼
     ┌───────────────┐     No     ┌────────────────────┐
     │ Passwords     │───────────>│ Show error:        │
     │ match?        │            │ "Passwords don't   │
     └───────┬───────┘            │  match"            │
             │ Yes                └────────────────────┘
             ▼
     ┌───────────────┐     No     ┌────────────────────┐
     │ Meets         │───────────>│ Show error with    │
     │ complexity?   │            │ requirements       │
     └───────┬───────┘            └────────────────────┘
             │ Yes
             ▼
     ┌───────────────┐     Yes    ┌────────────────────┐
     │ Same as       │───────────>│ Show error:        │
     │ recent pwd?   │            │ "Cannot reuse      │
     │ (last 5)      │            │  recent password"  │
     └───────┬───────┘            └────────────────────┘
             │ No
             ▼
┌─────────────────────┐
│ Update user:        │
│ - Hash new password │
│ - Set pwd_changed_at│
│ - Add to history    │
│ - Clear lockout     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Mark token as used  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Log:                │
│ PASSWORD_RESET_     │
│ COMPLETE            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Send confirmation   │
│ email: "Password    │
│ changed successfully"│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Redirect to login   │
│ with success        │
│ message             │
└──────────┬──────────┘
           │
           ▼
       ┌───────┐
       │  END  │
       └───────┘
```

---

## 4. Two-Factor Authentication Workflows

### 4.1 2FA Setup Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│              WORKFLOW: ENABLE TWO-FACTOR AUTHENTICATION                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   START     │
│   (User)    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Navigate to         │
│ Security Centre     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Click "Enable       │
│ Two-Factor          │
│ Authentication"     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ System generates:   │
│ - TOTP secret       │
│ - QR code           │
│ - Manual entry key  │
│ (Stored encrypted   │
│  but NOT enabled)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Display setup page: │
│ - Instructions      │
│ - QR code           │
│ - Manual key        │
│ - Verification      │
│   code input        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ User scans QR with  │
│ authenticator app   │
│ (Google Auth, etc.) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ User enters 6-digit │
│ code from app       │
└──────────┬──────────┘
           │
           ▼
       ┌───────────┐
       │  Verify   │
       └─────┬─────┘
             │
             ▼
     ┌───────────────┐     No     ┌────────────────────┐
     │ Code valid?   │───────────>│ Show error:        │
     │ (±1 window)   │            │ "Invalid code,     │
     └───────┬───────┘            │  please try again" │
             │ Yes                └────────────────────┘
             ▼
┌─────────────────────┐
│ Generate 10 backup  │
│ codes               │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Store (hashed):     │
│ - Backup codes      │
│ Enable 2FA:         │
│ - is_enabled = true │
│ - enabled_at = NOW  │
│ Update user:        │
│ - has_2fa = true    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Display backup      │
│ codes page:         │
│ - List of 10 codes  │
│ - Download option   │
│ - "I've saved them" │
│   checkbox          │
└──────────┬──────────┘
           │
           ▼
     ┌───────────────┐     No     ┌────────────────────┐
     │ User confirms │───────────>│ Cannot proceed     │
     │ saved codes?  │            │ until confirmed    │
     └───────┬───────┘            └────────────────────┘
             │ Yes
             ▼
┌─────────────────────┐
│ Log:                │
│ 2FA_ENABLED         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Send email:         │
│ "2FA enabled on     │
│  your account"      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Show success +      │
│ return to Security  │
│ Centre              │
└──────────┬──────────┘
           │
           ▼
       ┌───────┐
       │  END  │
       └───────┘
```

### 4.2 Login with 2FA Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│              WORKFLOW: LOGIN WITH TWO-FACTOR AUTHENTICATION                      │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   START     │
│   (User)    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Enter email and     │
│ password on login   │
│ page                │
└──────────┬──────────┘
           │
           ▼
       ┌───────────┐
       │  Submit   │
       └─────┬─────┘
             │
             ▼
     ┌───────────────┐     No     ┌────────────────────┐
     │ Credentials   │───────────>│ Show error:        │
     │ valid?        │            │ "Invalid email or  │
     └───────┬───────┘            │  password"         │
             │ Yes                │ Log: LOGIN_FAILURE │
             ▼                    └────────────────────┘
     ┌───────────────┐
     │ Check user    │
     │ has_2fa_      │
     │ enabled       │
     └───────┬───────┘
             │
     ┌───────┴───────┐
     │               │
     ▼               ▼
  2FA OFF         2FA ON
     │               │
     ▼               ▼
┌─────────┐    ┌─────────────────────┐
│ Normal  │    │ Generate temp token │
│ login   │    │ (5 min expiry)      │
│ (JWT)   │    │ Return:             │
└────┬────┘    │ {requires2FA: true, │
     │         │  tempToken: xxx}    │
     ▼         └──────────┬──────────┘
   END                    │
                          ▼
              ┌─────────────────────┐
              │ Show 2FA prompt:    │
              │ - 6-digit code      │
              │ - "Use backup code" │
              │   link              │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ User enters code    │
              │ (TOTP or backup)    │
              └──────────┬──────────┘
                         │
                         ▼
                     ┌───────────┐
                     │  Submit   │
                     └─────┬─────┘
                           │
                           ▼
                   ┌───────────────┐
                   │ Is this a     │
                   │ backup code?  │
                   └───────┬───────┘
                           │
               ┌───────────┴───────────┐
               │                       │
               ▼                       ▼
          TOTP Code              Backup Code
               │                       │
               ▼                       ▼
       ┌───────────────┐       ┌───────────────┐
       │ Verify TOTP   │       │ Find matching │
       │ (±1 window)   │       │ unused backup │
       └───────┬───────┘       │ code hash     │
               │               └───────┬───────┘
               │                       │
       ┌───────┴───────────────────────┴───────┐
       │                                       │
       ▼                                       ▼
   VALID                                   INVALID
       │                                       │
       ▼                                       ▼
┌─────────────────┐                ┌────────────────────┐
│ If backup:      │                │ Increment attempts │
│ - Mark used     │                │ (5 max)            │
│ - Warn if < 3   │                └──────────┬─────────┘
│   remaining     │                           │
└────────┬────────┘                           ▼
         │                             ┌───────────────┐
         ▼                             │ Max attempts  │
┌─────────────────┐                    │ reached?      │
│ Generate full   │                    └───────┬───────┘
│ JWT token       │                            │
└────────┬────────┘                    ┌───────┴───────┐
         │                             │               │
         ▼                             ▼               ▼
┌─────────────────┐                  Yes              No
│ Log:            │                   │               │
│ LOGIN_SUCCESS   │                   ▼               ▼
│ (+ 2FA_BACKUP   │            ┌──────────┐    ┌──────────┐
│  if backup used)│            │ Require  │    │ Show:    │
└────────┬────────┘            │ re-enter │    │ "Invalid │
         │                     │ password │    │  code"   │
         ▼                     └──────────┘    └──────────┘
     ┌───────┐
     │  END  │
     └───────┘
```

### 4.3 Disable 2FA Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│              WORKFLOW: DISABLE TWO-FACTOR AUTHENTICATION                         │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   START     │
│   (User)    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Navigate to         │
│ Security Centre     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Click "Disable      │
│ Two-Factor          │
│ Authentication"     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Show confirmation   │
│ dialog with         │
│ warning message     │
└──────────┬──────────┘
           │
           ▼
       ┌───────────────┐     Cancel    ┌────────────────────┐
       │ User confirms?│──────────────>│ Close dialog       │
       └───────┬───────┘               └────────────────────┘
               │ Yes
               ▼
┌─────────────────────┐
│ Prompt for current  │
│ TOTP code or        │
│ backup code         │
└──────────┬──────────┘
           │
           ▼
       ┌───────────┐
       │  Submit   │
       └─────┬─────┘
             │
             ▼
     ┌───────────────┐     No     ┌────────────────────┐
     │ Code valid?   │───────────>│ Show error:        │
     │               │            │ "Invalid code"     │
     └───────┬───────┘            └────────────────────┘
             │ Yes
             ▼
┌─────────────────────┐
│ Delete:             │
│ - user_2fa record   │
│ - backup codes      │
│ Update user:        │
│ - has_2fa = false   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Log:                │
│ 2FA_DISABLED        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Send email:         │
│ "2FA disabled -     │
│  if not you, take   │
│  action immediately"│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Show success        │
│ message             │
└──────────┬──────────┘
           │
           ▼
       ┌───────┐
       │  END  │
       └───────┘
```

---

## 5. Account Security Workflows

### 5.1 Account Lockout Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│              WORKFLOW: ACCOUNT LOCKOUT (BRUTE FORCE PROTECTION)                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│ LOGIN ATTEMPT       │
│ (failed)            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Increment           │
│ failed_login_       │
│ attempts            │
└──────────┬──────────┘
           │
           ▼
     ┌───────────────┐     No     ┌────────────────────┐
     │ Attempts ≥    │───────────>│ Return normal      │
     │ threshold     │            │ "invalid creds"    │
     │ (default 10)? │            │ error              │
     └───────┬───────┘            └────────────────────┘
             │ Yes
             ▼
┌─────────────────────┐
│ Set locked_until =  │
│ NOW + lockout       │
│ duration (15 min)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Log:                │
│ ACCOUNT_LOCKED      │
│ with IP, attempts   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Return error:       │
│ "Account locked.    │
│  Try again in       │
│  X minutes"         │
└──────────┬──────────┘
           │
           ▼
       ┌───────┐
       │  END  │
       └───────┘

                    ════════════════════════════

┌─────────────────────┐
│ NEXT LOGIN ATTEMPT  │
│ (for locked acct)   │
└──────────┬──────────┘
           │
           ▼
     ┌───────────────┐     No     ┌────────────────────┐
     │ locked_until  │───────────>│ Proceed with       │
     │ IS NOT NULL   │            │ normal login       │
     │ AND > NOW?    │            └────────────────────┘
     └───────┬───────┘
             │ Yes
             ▼
┌─────────────────────┐
│ Return error:       │
│ "Account locked.    │
│  Time remaining:    │
│  X minutes"         │
└──────────┬──────────┘
           │
           ▼
       ┌───────┐
       │  END  │
       └───────┘

                    ════════════════════════════

┌─────────────────────┐
│ SUCCESSFUL LOGIN    │
│ (after lockout      │
│  expires)           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Reset:              │
│ - failed_attempts=0 │
│ - locked_until=NULL │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Log:                │
│ ACCOUNT_UNLOCKED    │
│ (via successful     │
│  login)             │
└──────────┬──────────┘
           │
           ▼
       ┌───────┐
       │  END  │
       └───────┘
```

### 5.2 Security Centre View Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│              WORKFLOW: VIEW SECURITY CENTRE                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   START     │
│   (User)    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Click profile →     │
│ "Security"          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Fetch user security │
│ data:               │
│ - 2FA status        │
│ - Last login        │
│ - Password changed  │
│ - Recent logins     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Display Security    │
│ Centre:             │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Account Status  │ │
│ │ ✓ Active        │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ 2FA Status      │ │
│ │ ○ Disabled      │ │
│ │ [Enable 2FA]    │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Password        │ │
│ │ Last changed:   │ │
│ │ 30 days ago     │ │
│ │ [Change pwd]    │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Recent Logins   │ │
│ │ Today 09:15     │ │
│ │  192.168.x.x    │ │
│ │ [View all]      │ │
│ └─────────────────┘ │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ User can:           │
│ - Enable/disable 2FA│
│ - Change password   │
│ - View login history│
│ - Regenerate backup │
│   codes (if 2FA on) │
└──────────┬──────────┘
           │
           ▼
       ┌───────┐
       │  END  │
       └───────┘
```

---

## 6. Theme Switching Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│              WORKFLOW: SWITCH THEME (LIGHT/DARK)                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   START     │
│   (User)    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Click theme toggle  │
│ in header or        │
│ settings            │
└──────────┬──────────┘
           │
           ▼
     ┌───────────────────────────────────────┐
     │ Current theme?                        │
     └───────────────┬───────────────────────┘
                     │
     ┌───────────────┼───────────────┐
     │               │               │
     ▼               ▼               ▼
   LIGHT          SYSTEM          DARK
     │               │               │
     ▼               ▼               ▼
  → DARK         → LIGHT         → LIGHT
   (toggle)       (cycle)         (toggle)
     │               │               │
     └───────────────┴───────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│ 1. Update CSS: document.documentElement    │
│    .setAttribute('data-theme', newTheme)   │
│                                             │
│ 2. Save to localStorage                     │
│    (instant apply on reload)                │
│                                             │
│ 3. If logged in: API call                   │
│    PUT /api/users/me/theme                  │
│    { theme_preference: newTheme }           │
└───────────────────────┬─────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────┐
│ UI updates immediately:                     │
│ - Background colours                        │
│ - Text colours                              │
│ - Chart colours                             │
│ - Form elements                             │
│ (no page reload required)                   │
└───────────────────────┬─────────────────────┘
                        │
                        ▼
                    ┌───────┐
                    │  END  │
                    └───────┘
```

---

## 7. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Solution Architect | Initial draft |
