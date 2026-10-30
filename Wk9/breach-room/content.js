// Breach Room — game content
// All values are fixed so the lesson facts stay accurate.

export const TIMER_SECONDS = 75;
export const MAX_SCORE = 1025;

export const LOG_TARGETS = [
  {
    id: 'ip',
    label: 'Suspicious IP',
    hint: 'The address from another country',
    test: (line) => line.includes('203.0.113.77'),
  },
  {
    id: 'time',
    label: 'First burst',
    hint: 'When the failed logins jumped',
    test: (line) => line.includes('02:43'),
  },
  {
    id: 'account',
    label: 'Old admin account',
    hint: 'The account that should have been disabled',
    test: (line) => line.includes('legacy_admin'),
  },
];

export const LOG_LINES = [
  { t: '02:38:02', lvl: 'INFO', msg: 'login-api health check ok latency=38ms' },
  { t: '02:38:44', lvl: 'INFO', msg: 'backup job started target=db-02' },
  { t: '02:39:10', lvl: 'INFO', msg: 'user j.chen logged in src=10.20.4.18' },
  { t: '02:39:55', lvl: 'INFO', msg: 'firewall rules loaded count=214' },
  { t: '02:40:12', lvl: 'WARN', msg: 'failed login user=admin_ops src=198.51.100.23 geo=TW attempts=1' },
  { t: '02:40:40', lvl: 'INFO', msg: 'password policy check passed user=j.chen' },
  { t: '02:41:07', lvl: 'WARN', msg: 'failed login user=admin_ops src=203.0.113.77 geo=RO attempts=2' },
  { t: '02:41:35', lvl: 'INFO', msg: 'support ticket #4812 opened by chen' },
  { t: '02:41:58', lvl: 'WARN', msg: 'failed login user=backup_svc src=203.0.113.77 geo=RO attempts=3' },
  { t: '02:42:20', lvl: 'INFO', msg: 'mail queue healthy pending=4' },
  { t: '02:42:55', lvl: 'WARN', msg: 'failed login user=admin_ops src=203.0.113.77 geo=RO attempts=4' },
  { t: '02:43:12', lvl: 'ALERT', msg: '14 failed logins in 60s src=203.0.113.77 geo=RO' },
  { t: '02:43:40', lvl: 'INFO', msg: 'user m.lin opened incident channel #soc' },
  { t: '02:44:03', lvl: 'WARN', msg: 'failed login user=j.chen src=198.51.100.23 geo=TW attempts=2' },
  { t: '02:44:25', lvl: 'INFO', msg: 'session opened user=m.lin page=/dashboard' },
  { t: '02:44:51', lvl: 'WARN', msg: 'failed login user=admin_ops src=203.0.113.77 geo=RO attempts=5' },
  { t: '02:45:20', lvl: 'INFO', msg: 'password reset requested user=admin_ops by=helpdesk' },
  { t: '02:45:48', lvl: 'INFO', msg: 'mfa enrolment started user=admin_ops' },
  { t: '02:46:02', lvl: 'INFO', msg: 'firewall block src=198.51.100.23 rule=temp' },
  { t: '02:46:31', lvl: 'WARN', msg: 'login success user=legacy_admin src=203.0.113.77 geo=RO' },
  { t: '02:46:40', lvl: 'INFO', msg: 'session opened user=legacy_admin page=/health' },
  { t: '02:47:10', lvl: 'INFO', msg: 'session closed user=legacy_admin duration=00:00:31' },
  { t: '02:47:35', lvl: 'INFO', msg: 'patch status login-server pending=1' },
  { t: '02:47:58', lvl: 'WARN', msg: 'failed login user=backup_svc src=203.0.113.77 geo=RO attempts=6' },
  { t: '02:48:15', lvl: 'INFO', msg: 'firewall block src=203.0.113.77 rule=deny' },
  { t: '02:48:40', lvl: 'INFO', msg: 'password reset completed user=admin_ops' },
  { t: '02:49:02', lvl: 'INFO', msg: 'mfa enabled scope=admin_accounts' },
  { t: '02:49:31', lvl: 'INFO', msg: 'old admin account legacy_admin disabled by=m.lin' },
  { t: '02:49:58', lvl: 'INFO', msg: 'incident report draft created by=m.lin' },
  { t: '02:50:12', lvl: 'INFO', msg: 'backup job completed target=db-02' },
  { t: '02:50:35', lvl: 'INFO', msg: 'logout user=j.chen' },
  { t: '02:50:58', lvl: 'INFO', msg: 'health check ok service=login-api latency=41ms' },
  { t: '02:51:20', lvl: 'INFO', msg: 'access review scheduled date=Friday' },
  { t: '02:51:44', lvl: 'INFO', msg: 'firewall rules saved count=216' },
  { t: '02:52:05', lvl: 'INFO', msg: 'shift handover note added by=m.lin' },
  { t: '02:52:30', lvl: 'INFO', msg: 'end of log window' },
];

export const CONTAIN_CARDS = [
  {
    id: 'block',
    text: 'The team has blocked the suspicious IP address at the firewall.',
    correct: true,
    feedback: 'Correct. The address is blocked before it can try again.',
  },
  {
    id: 'reset',
    text: 'They have forced a password reset for every admin account.',
    correct: true,
    feedback: 'Correct. Every admin password is replaced.',
  },
  {
    id: 'mfa',
    text: 'They have turned on multi-factor authentication for admin accounts.',
    correct: true,
    feedback: 'Correct. A stolen password is no longer enough.',
  },
  {
    id: 'disable',
    text: 'They have disabled the old admin account.',
    correct: true,
    feedback: 'Correct. The unused account is closed for good.',
  },
  {
    id: 'customers',
    text: 'They have told every customer about the breach immediately.',
    correct: false,
    feedback: 'Too early. The team has not confirmed that customer data left the building.',
  },
  {
    id: 'shutdown',
    text: 'They have shut down the login server for the rest of the week.',
    correct: false,
    feedback: 'That stops the business, not the attacker.',
  },
  {
    id: 'delete',
    text: 'They have deleted the access logs to hide the mistake.',
    correct: false,
    feedback: 'Never delete evidence. The logs are how the team understands the attack.',
  },
  {
    id: 'ignore',
    text: 'They have ignored the alert until Monday morning.',
    correct: false,
    feedback: 'The alert cannot wait. Every minute gives the attacker more time.',
  },
];

export const REPORT_FRAGMENTS = [
  {
    id: 'f1',
    order: 1,
    text: 'At 02:43, the access log showed an unusual number of login attempts from an IP address in another country.',
  },
  {
    id: 'f2',
    order: 2,
    text: 'Within five minutes, the team had blocked the IP address and had forced a password reset for every admin account.',
  },
  {
    id: 'f3',
    order: 3,
    text: 'They had also turned on multi-factor authentication and had disabled an old admin account.',
  },
  {
    id: 'f4',
    order: 4,
    text: 'So far, they have not found any proof that customer data was downloaded.',
  },
];

export const QUIZ = [
  {
    id: 'q1',
    question: 'What is credential stuffing?',
    options: [
      'Guessing one password many times on one account.',
      'Trying stolen logins on many different websites.',
      'Sending phishing emails to customers.',
      'Deleting an old admin account.',
    ],
    answer: 1,
    explanation: 'Credential stuffing reuses logins stolen in an earlier breach on other sites.',
  },
  {
    id: 'q2',
    question: 'Why was the old admin account dangerous?',
    options: [
      'It had too many privileges and had never been disabled.',
      'It belonged to a customer.',
      'It had no password.',
      'It was shared with the marketing team.',
    ],
    answer: 0,
    explanation: 'An unused account with admin privileges is an open door.',
  },
  {
    id: 'q3',
    question: 'What had the attacker been able to do?',
    options: [
      'Download all customer data.',
      'Change every password.',
      'Look at a system health page only.',
      'Delete the access logs.',
    ],
    answer: 2,
    explanation: 'The team found one short session that only reached a health page.',
  },
];

export const POINTS = {
  logTarget: 100,
  logWrong: -10,
  logWrongTime: 5,
  containCorrect: 75,
  containWrong: -50,
  orderCorrect: 200,
  orderWrong: -50,
  quizCorrect: 75,
};
