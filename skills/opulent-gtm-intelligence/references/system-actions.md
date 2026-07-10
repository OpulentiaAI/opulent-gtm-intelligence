# CRM, Email, Calendar, and Storage Actions

## Before any write

1. Confirm the target workspace, account, record, or thread.
2. Inspect existing records and recent activity to prevent duplicates.
3. Confirm the connection and authorization required by the runtime.
4. Show or retain the exact payload for consequential writes.
5. Follow the runtime's confirmation policy for sending, submitting, deleting, or transmitting sensitive data.

## CRM

Use the client's CRM as the system of record when connected. Match by domain, verified email, external ID, or record ID before creating anything.

Write:

- source and source date;
- confidence;
- fit score and component scores;
- why-now signal;
- contact role and verified path;
- next action, owner, and due date; and
- do-not-contact or suppression state.

Do not overwrite human-verified values with estimates. Verify every create or update by reading the record back.

## Email

Default to a draft unless sending is explicitly authorized. Ground every claim in the packet. Preserve the thread, recipients, and sender identity.

After creating or sending, capture draft ID or message ID, account, recipients, subject, and verification method.

## Calendar

Confirm timezone, attendees, duration, and meeting purpose. Do not create or modify an event without the required authorization. Verify by reading back the event ID and final attendee list.

## File storage

Reuse the existing client folder. Store the final packet, source appendix, and export under a dated run folder. Avoid uploading sensitive research to a new third party without explicit authorization.

## Completion log

Record each action as:

```text
System | action | target | identifier | verification | result
```

Use `verified`, `drafted`, `blocked`, `skipped`, or `needs review`. Never report an unverified write as complete.
