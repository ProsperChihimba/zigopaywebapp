# Zigopay demo script

About 10 minutes. It shows the manual payment-to-release loop disappearing: the customer pays, and the release order arrives without anyone at the cargo company touching it.

## Before the demo

- Sign in at https://zigopaywebapp.vercel.app with the admin account.
- Have a phone ready that can receive SMS (and, once connected, WhatsApp). Use it as the demo customer.
- Have a way to pay into a TCB account from that phone or a bank app. Keep amounts tiny (an invoice of $1 is TZS 2,700).
- Each invoice opens a real TCB account and uses one of the Daraja partner's account slots. Don't create throwaway invoices.

## Script

| # | Show | Say |
| --- | --- | --- |
| 1 | **Dashboard** | "This is what the cargo company sees each morning: what came in today, who still owes, and what's waiting at the warehouse." |
| 2 | **Customers → New Customer**: add the demo customer with the demo phone | "A merchant who ships with us." |
| 3 | **Cargo → New Cargo**: record a small cargo, type the demo phone number | "Goods arrive at the warehouse. Typing the phone finds the customer." |
| 4 | **Invoices → Create invoice**: pick the customer, tick the cargo, price it at $1 | "Today the merchant would travel to the office for this invoice." |
| 5 | **Invoice page**: wait for the TCB account number and "SMS: Sent"; show the SMS on the phone; open the PDF | "Instead, it reaches their phone within seconds, with a bank account that belongs to this invoice only." |
| 6 | **Pay part** (e.g. TZS 1,000) into the TCB account | "They can pay from any bank or mobile wallet." |
| 7 | **Invoice page**: the Daraja payment row, "Partly paid", the balance SMS | "No proof of payment, no bank statement. Zigopay knows the moment the bank does." |
| 8 | **Pay the rest** | |
| 9 | **Invoice page**: "Paid", the release order box; show the release order SMS and PDF | "The release order is issued automatically. Nobody approved it by hand." |
| 10 | **Release orders → Mark collected** | "At the warehouse, staff confirm the handover once. It can't be used twice." |
| 11 | **Payments → Download CSV** | "Finance gets every payment, matched to its invoice, ready to reconcile." |

## If something goes wrong

- **No account number on the invoice**: the invoice page shows Daraja's answer. "Check with Daraja" means the bank may have opened it anyway; don't create a second invoice for the same cargo.
- **Paid but still "Unpaid"**: the webhook didn't arrive. Check Vercel Logs for `/api/webhooks/daraja`. To carry on, use **Record payment manually** on the invoice page.
- **SMS "Not sent"**: the reason is shown under it. Use **Resend** once fixed.
