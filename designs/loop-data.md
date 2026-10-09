# Real data for the console's Loop screen (DEP loop engine)

## Loop settings (.docspec `loop:` — `dep loop`)
part                 state                                   why
loop                 on                                      set in .docspec
recording requests   on                                      by default
usage reports        on                                      by default
heartbeat            on, acts by rules                       set in .docspec
proposals            wait for review                         by default
models               off                                     by default
(DEP_LOOP=off in the environment switches everything off)

## Heartbeat — owners
owner        last beat   next beat   interval   woke   signals now
@dep-core    10:42       10:43       1m         yes    13 review_due
@backend     10:40       10:48       8m         no     —
@qa          10:41       10:43       2m         yes    1 message
@frontend    09:10       11:10       2h         no     —

beats today: 212 · woke: 31 · wake ratio 0.15 · kill switch: off

## Signals (most pressing first)
message         inbox/backend/msg.3f2a1c — @pm wrote: Can refunds be partial?
follow_up_due   docs/reference/refund-flow.md — waiting on @qa since 05:40, past 4h
task            docs/how-to/release.md — open work you own
watched_change  docs/reference/payments-spec.md changed (watched by refund-flow.md)
review_due      docs/tutorials/write-your-first-dep-document.md — past its review date

## Recent actions (beat @backend:2026-10-09T10:40)
done          ask @qa about refund-flow.md (follow-up 2 of 3)
done          reply to @pm — "Partial refunds are covered by the suite."
refused       close_loop docs/reference/ledger.md — @backend does not own it
escalate      refund-flow.md has waited on @qa through 3 follow-ups → to the person (held until 08:00, quiet hours)

## Escalations waiting for the person
refund-flow.md — waited on @qa through 3 follow-ups without an answer
thread msg.91bc — exchange between @backend and @qa reached 4 messages without settling

## What the agent has learned (requests game, 10 days, seed 1)
Advice it relies on (rules):
- When the tier is gold: choose convert. Acted on 249; 205 passed.
- When the tier is platinum: choose convert. Acted on 299; 248 passed.
- When the size is large and the tier is new: choose refuse. Acted on 19; 10 passed.
- When the size is small, the currency is USD and the tier is new: choose defer. Acted on 23; 12 passed.
Habits (absorbed by nights): 2
What you told it:
- When the currency is USD and the tier is new: choose defer. Acted on 47; 47 passed.
Notes from you: "Gold customers in refunds should be asked first."

Pass rate by day: 0.31 0.49 0.57 0.67 0.71 0.68 0.68 0.79 0.72 0.74 (with your edit: 0.94 by day 9)
Store: 51 active claims · 8 rules · 2 habits · nights: 7 kept, 0 undone

## Follow-up outcomes (scored by the heartbeat, never by the owner)
answered in time  +1.0   18
answered late     +0.5    6
never answered    −0.5    4
Advice shown when a loop falls due: "choose follow-up" (whom you ask weighs most)
