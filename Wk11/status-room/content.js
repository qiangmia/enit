/* content.js — the scene for Week 11's Status Room.
   Data only: no logic, so the game can be re-worded without touching main.js. */
window.STATUS_ROOM = {
  title: 'The Status Room',
  subtitle: 'One incident, three decisions, and a status page to write',

  intro: [
    'It is 03:00 at a cloud operations team in Taipei. A routing change went out at 02:50.',
    'You are the on-call team. Restore service with as little downtime as possible, then say what happened in the passive — the way an incident report should.',
    'Every wrong action costs minutes. The incident takes 15 minutes even when you do everything right.'
  ],

  board: {
    prompt: 'The servers look healthy, but requests are failing. Two tiles show where the traffic went and what it did when it got there.',
    hint: 'Read the numbers, not the colour. One tile is about the size of the load in each region; the other is about one machine.',
    tiles: [
      { id: 'latency', label: 'Latency (p95)', before: '180 ms', after: '2,400 ms', note: 'Requests that arrive are waiting far longer than usual.', correct: false, why: 'This is the symptom. It tells you users are affected, not why.' },
      { id: 'errors', label: 'Error rate', before: '0.1%', after: '18%', note: 'Almost one request in five is failing.', correct: false, why: 'Also the symptom. Errors climb when traffic cannot be served, but the number does not say where it went.' },
      { id: 'requests', label: 'Requests by region', before: 'SG 100% · FRA 40%', after: 'SG 40% · FRA 260%', note: 'Singapore traffic collapsed; Frankfurt more than doubled.', correct: true, why: 'This is where the traffic went: the new rule sent it away from the zone that was serving it.' },
      { id: 'replica', label: 'Replica load', before: '41%', after: '97%', note: 'The older zone is nearly saturated.', correct: true, why: 'And this is what it did when it got there. The replica is running, but it cannot answer fast enough.' },
      { id: 'deploy', label: 'Last deploy', before: '02:50', after: 'routing rule v14', note: 'The change that went out ten minutes before the first alert.', correct: false, why: 'Context, and a strong suspicion — but on its own it does not say why requests fail while servers are healthy.' },
      { id: 'alerts', label: 'Open alerts', before: '0', after: '3', note: 'Latency, error rate, and one from the replica.', correct: false, why: 'Alerts tell you something is wrong, not what it is.' }
    ],
    wrongCost: 2
  },

  decisions: [
    {
      time: '03:06',
      situation: 'The first alert has arrived. Requests to one availability zone are timing out, but the dashboard shows healthy servers. The routing rule went out sixteen minutes ago.',
      question: 'What do you do first?',
      actions: [
        { id: 'rollback', label: 'Roll back the routing change', correct: true, cost: 0, feedback: 'The change is the cause. Rolling it back stops new traffic going the wrong way. The service is not back yet — the old zone is now carrying everything.' },
        { id: 'restart', label: 'Restart the replica', correct: false, cost: 6, feedback: 'The replica is running; restarting it does not fix routing, and it comes back colder than before.' },
        { id: 'addservers', label: 'Add two more servers', correct: false, cost: 8, feedback: 'Traffic is not reaching the healthy servers. Adding capacity to machines nobody can reach buys nothing.' },
        { id: 'wait', label: 'Wait for the alert to clear', correct: false, cost: 5, feedback: 'Alerts do not clear themselves. The error rate keeps climbing while you watch.' }
      ]
    },
    {
      time: '03:11',
      situation: 'The rollback is running, but the older zone is saturated at 97%. Traffic that is still arriving has nowhere healthy to go.',
      question: 'What do you do now?',
      actions: [
        { id: 'failover', label: 'Move traffic to the second availability zone', correct: true, cost: 0, feedback: 'Failover drains the saturated replica. It is the only action that takes effect in seconds rather than minutes.' },
        { id: 'resize', label: 'Resize the replica now', correct: false, cost: 4, feedback: 'More capacity in the same zone helps — in four or five minutes, which is four or five minutes of errors.' },
        { id: 'wait2', label: 'Wait: the rollback will fix it', correct: false, cost: 6, feedback: 'The rollback stops the bad routing. It does not move the traffic that has already arrived.' },
        { id: 'hide', label: 'Turn off the error page', correct: false, cost: 3, flag: 'transparency', feedback: 'The page stops showing a friendly error and starts showing raw ones. You have hidden the message, not the problem.' }
      ]
    },
    {
      time: '03:16',
      situation: 'Service is stable. Nothing is confirmed about the cause yet, and the status page has one line on it from the last update.',
      question: 'What should the status page say now?',
      actions: [
        { id: 'oneclearline', label: 'One clear line: what was done and when', correct: true, cost: 0, feedback: 'Accurate, calm, and true. “A routing change was rolled back at 03:11. Service is being monitored.”' },
        { id: 'cause', label: 'Announce the cause: a bad rule from the platform team', correct: false, cost: 2, flag: 'credibility', feedback: 'You have not confirmed it. Naming a team before the post-mortem turns an incident into a blame story.' },
        { id: 'silence', label: 'Say nothing until the post-mortem', correct: false, cost: 3, feedback: 'Users are still refreshing the page. Silence reads as “nobody is working on it”.' }
      ]
    }
  ],

  lines: [
    {
      time: '03:08',
      frame: 'A routing change ___ ___ at 03:06.',
      blanks: [
        { answer: 'was' },
        { answer: 'rolled back' }
      ],
      chips: ['was', 'is', 'rolled back', 'rolled', 'rolls back'],
      note: 'Past passive: was + past participle. The change, not the team, is the subject.'
    },
    {
      time: '03:13',
      frame: 'Traffic ___ ___ to the second zone.',
      blanks: [
        { answer: 'was' },
        { answer: 'moved' }
      ],
      chips: ['was', 'is', 'moved', 'moving', 'move'],
      note: 'Past passive again. “Moving” would need a form of be and would still say the action is unfinished.'
    },
    {
      time: '03:19',
      frame: 'No data ___ ___.',
      frame_after: ' Service was restored at 03:19.',
      blanks: [
        { answer: 'was' },
        { answer: 'lost' }
      ],
      chips: ['was', 'is', 'lost', 'losing', 'lose'],
      note: 'The most common line in any status page. Short, passive, and complete.'
    }
  ],

  judgement: {
    prompt: 'The post-mortem needs one sentence about who acted. Which line belongs in the report?',
    options: [
      { id: 'mistakes', label: '“Mistakes were made during the rollout.”', correct: false, feedback: 'Grammatical, and useless. Who made them? A report that hides the actor cannot change anything.' },
      { id: 'team', label: '“The team rolled back the routing change at 03:06.”', correct: true, feedback: 'Names the action, not a villain. This is what accountability looks like in an incident report: the passive for the status page, the active for the post-mortem.' }
    ]
  },

  debrief: {
    question: 'What goes in the post-mortem, and who is named in it?',
    note: 'Answer out loud before you leave: the cause, the fix, the change that prevents a repeat — and whether the person who made the change is named, or only the change itself.'
  }
};
