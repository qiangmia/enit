// The Records Room — skim & scan practice content.
// Four Week 9 documents. Each has 2 skim questions and 3 scan targets.

export const DOCUMENTS = [
  {
    id: 'breach-report',
    title: 'The Breach Report',
    kicker: 'DOCUMENT 1 · INCIDENT REPORT',
    source: 'NovaNet Solutions · Security Lead',
    paragraphs: [
      `It was Monday morning at NovaNet Solutions when Lin Mei-hui first noticed something was wrong. At 02:43, the access log had shown an unusual number of login attempts from an IP address in another country. By the time she had checked the log in more detail, someone had already tried to sign in to several admin accounts.`,
      `"I've just seen it," said Mason, the IT Analyst, as he sat down next to Lin. "Three different admin accounts have had failed logins in the last twenty minutes. Two of them have used very similar passwords."`,
      `"We've had a problem like this once before," Lin replied. "But this time, it looks more organised. I think someone has been trying to guess our credentials."`,
      `Lin had not seen a targeted attack of this kind since she had joined NovaNet. Within five minutes, her team had blocked the suspicious IP address at the firewall. They had also forced a password reset for every admin account, and they had turned on multi-factor authentication for accounts that had not used it before.`,
      `"Good call," said Chen from the support desk. "I have already had two users ask me why they were logged out. I've told them it's a precaution."`,
      `"Keep a record of every call," Lin said. "So far, we haven't found any proof that anyone has actually broken in. But we need to check everything."`,
      `For the next three hours, the team checked access logs, email logs and file permissions. They found one short window of time at 02:46 when an old, unused admin account had been accessed. The account had too many privileges, and the team had never disabled it. Luckily, the attacker had only been able to look at a system health page — they had not downloaded any customer data.`,
      `The logs also showed how patient the attacker had been. For almost two days, one IP address had tried a small number of common passwords on many different accounts — never enough on any single account to trigger a lockout. That pattern is exactly what credential stuffing looks like, and it was the reason nobody had noticed anything until Monday morning.`,
      `"Should we tell the customers?" Chen asked. "Not yet," Lin said. "So far, we have only seen failed logins and one short session. If we announce a breach before we understand it, we will worry thousands of people for no reason. But if we find that data has left the building, we will tell them the same day."`,
      `"This could have been much worse," Lin told the meeting. "We have since disabled that account, applied a critical patch to the login server, and reviewed all of our admin privileges. We have also made it a rule that unused admin accounts must be removed within 24 hours."`,
      `Before lunch, Lin added a short section to the report called "What we have learned". It listed three things: the old account should have been removed a year ago, the patch had been available for two weeks, and the login server had no alert for repeated failures. None of these were new problems. They had simply been invisible.`,
      `By late morning, Lin was writing the incident report. She knew the team had acted quickly, but she also knew they had not checked for that old account in their last security review. It was a small gap — and it had nearly become a serious breach. Now, she just hoped they would not leave that gap open again.`,
    ],
    skim: [
      {
        prompt: 'What is the report mainly about?',
        options: [
          'A security team detecting and containing a breach.',
          'A customer asking for a refund.',
          'A new product launch at NovaNet.',
          'A phishing email sent to customers.',
        ],
        answer_index: 0,
        explanation: 'The whole report follows one incident: detection, containment and the report.',
      },
      {
        prompt: 'Which sentence best describes the team’s response?',
        options: [
          'They blocked the source, reset credentials and closed the old account.',
          'They shut down the company for a week.',
          'They paid the attacker to stop.',
          'They ignored the alert until Monday.',
        ],
        answer_index: 0,
        explanation: 'The response was block, reset, enable MFA and disable the old account.',
      },
    ],
    scan: [
      {
        prompt: 'At what time did the suspicious activity start?',
        paragraph: 0,
        phrase: '02:43',
        explanation: 'Paragraph 1: “At 02:43, the access log had shown an unusual number of login attempts…”',
      },
      {
        prompt: 'Which account was accessed at 02:46?',
        paragraph: 6,
        phrase: 'old, unused admin account',
        explanation: 'Paragraph 7: the team found that an old, unused admin account had been accessed.',
      },
      {
        prompt: 'How long had the attacker been trying passwords?',
        paragraph: 7,
        phrase: 'almost two days',
        explanation: 'Paragraph 8: the attacker tried a few passwords on many accounts for almost two days.',
      },
    ],
  },
  {
    id: 'stolen-passwords',
    title: 'Stolen Passwords, Stolen Data',
    kicker: 'DOCUMENT 2 · NEWS REPORT',
    source: 'Adapted from BBC News',
    paragraphs: [
      `Fashion brand The North Face and luxury jeweller Cartier have become the latest retailers to report that customer data has been stolen in cyber attacks.`,
      `North Face emailed some customers to say it had discovered a "small-scale" attack in April. Cartier said that "an unauthorised party gained temporary access to our system". Both brands said that data such as customers' names and email addresses was taken, but that financial information was not.`,
      `This is part of a wave of attacks on well-known retailers. Adidas, Victoria's Secret and Harrods have all reported incidents in recent weeks. Marks and Spencer and the Co-op had their operations severely disrupted when they were targeted in April.`,
      `The most important detail is how the North Face attack happened. The company told customers that the hackers used a technique called credential stuffing. In this type of attack, criminals take usernames and passwords that were stolen in an earlier breach and try them on a different website. They are betting that customers have reused the same password on more than one account.`,
      `If the bet works, the criminals get in. North Face said the attackers may have been able to see some users' shipping addresses and purchase histories. Affected customers were told they would need to change their passwords. Cartier, by contrast, said that passwords and card details had not been accessed, and that it had "contained the issue".`,
      `Why are shops such a popular target? "Retailers are overflowing with customer information," said James Hadley, founder of the cyber-security company Immersive. That makes them "easy targets for attackers". He also warned that stolen data can be used much later, to impersonate a real company and trick people into giving away even more. Criminals are, he said, "often content to play the long game".`,
    ],
    skim: [
      {
        prompt: 'What is the article mainly about?',
        options: [
          'A wave of retail data breaches and credential stuffing.',
          'How to buy clothes online safely.',
          'A new BBC television programme.',
          'How to create a strong password.',
        ],
        answer_index: 0,
        explanation: 'The article connects several retail breaches and explains credential stuffing.',
      },
      {
        prompt: 'Why are retailers described as “easy targets”?',
        options: [
          'They store a lot of customer information.',
          'They have no computers.',
          'They never report attacks.',
          'They use only old software.',
        ],
        answer_index: 0,
        explanation: 'James Hadley says retailers are “overflowing with customer information”.',
      },
    ],
    scan: [
      {
        prompt: 'Which two companies are named in the first paragraph?',
        paragraph: 0,
        phrase: 'The North Face',
        explanation: 'Paragraph 1 names The North Face and Cartier.',
      },
      {
        prompt: 'What kind of attack did North Face discover?',
        paragraph: 1,
        phrase: 'small-scale',
        explanation: 'Paragraph 2: North Face discovered a “small-scale” attack in April.',
      },
      {
        prompt: 'What did Cartier say was not accessed?',
        paragraph: 4,
        phrase: 'passwords and card details',
        explanation: 'Paragraph 5: Cartier said passwords and card details had not been accessed.',
      },
    ],
  },
  {
    id: 'freezer-hack',
    title: 'The Freezer Hack',
    kicker: 'DOCUMENT 3 · TECH REPORT',
    source: 'Adapted from BBC News · Shiona McCallum',
    source_url: 'https://www.bbc.com/news/articles/ckpqg8lve73go',
    paragraphs: [
      `Supermarkets across Europe have been hit by a suspected cyber-attack affecting their fridges and freezers. The incident has raised concerns about the security of internet-connected hardware, from industrial machinery to ordinary domestic appliances.`,
      `Smart devices connected to the internet include fridges, central heating systems and even washing machines. Being online makes them easier to control remotely, but in theory any device that goes online can be exploited by malicious actors.`,
      `That does not mean hackers can easily take control of them. Big brands generally go to great lengths to make their technology secure, and there is no evidence that domestic appliances were targeted in the supermarket attacks in November.`,
      `Exploits have been found before. In 2015, researchers showed how a vulnerability in a Samsung smart fridge could allow them to intercept internet traffic.`,
      `Ciaran Martin, former chief executive of the UK's National Cyber Security Centre (NCSC), said manufacturers needed to do more. “There's a lot more that we need to demand of big tech to give us safer devices and products in the first place,” he said. He advised consumers to keep devices updated and enable multi-factor authentication wherever possible.`,
      `Since April 2024, UK law has required manufacturers of certain consumer smart devices to meet minimum cyber security standards, including requirements around passwords and security updates.`,
      `The NCSC said it was working with international partners and industry to understand the supermarket incidents, but it was unaware of any impact on the UK. However, researchers from UK Cyber Defence have identified more than 800 refrigeration and building-control interfaces associated with British retailers that can be accessed over the public internet.`,
      `That does not necessarily mean they can be hacked, but it could leave them exposed to attackers exploiting weak passwords or software vulnerabilities. The government has already held talks with senior food retailers about cyber resilience.`,
      `It would not be the first time that hacks have raised concern about food supply. When UK supermarkets M&S and the Co-op were targeted by ransomware hackers in May 2025, the retailers struggled to stock some shop shelves with fresh deliveries. Customers across the UK complained of empty shelves in the days following the attack.`,
      `Tom Hegel, a researcher at cyber-security firm SentinelOne, said retailers must be clearer about responsibility. “The question retailers need to answer is who owns the security of that equipment, not just who repairs it,” he said. He warned that once an attacker can operate those controls, legitimate functions such as defrosting become tools for disruption. “Changing a setting can destroy physical stock, not just interrupt a computer system.”`,
      `Outside the home, connected technology is used to manage industrial machinery and vehicles. Cyber security expert Ken Munro pointed to a 2015 demonstration in which researchers remotely hacked a Jeep through its internet-connected entertainment system. The vehicle industry later fixed the problem.`,
      `Munro said UK utilities were generally good at securing mobile connections, but standards varied around the world. His biggest concern was smaller, poorly funded utility companies that may still rely on older, vulnerable equipment. Olivier Daloy, a cybersecurity expert at Zscaler, added that without proper protections, “any factory or equipment” connected to the internet — from carmakers to electricity or transport infrastructure — could face similar risks.`,
    ],
    skim: [
      {
        prompt: 'What is the article mainly about?',
        options: [
          'A cyber-attack on supermarket freezers and the risks of connected devices.',
          'How to repair a supermarket freezer after a power cut.',
          'A new law that bans smart appliances.',
          'Why supermarkets are removing frozen food.',
        ],
        answer_index: 0,
        explanation: 'The article uses the freezer attack to examine the wider security of internet-connected devices.',
      },
      {
        prompt: 'What advice does the article give to consumers?',
        options: [
          'Keep devices updated and enable multi-factor authentication.',
          'Disconnect every smart device immediately.',
          'Only buy appliances made before 2015.',
          'Use the same password on every device.',
        ],
        answer_index: 0,
        explanation: 'Ciaran Martin says updates and multi-factor authentication are simple steps that take only a few seconds.',
      },
    ],
    scan: [
      {
        prompt: 'Which brand’s smart fridge did researchers exploit?',
        paragraph: 3,
        phrase: 'Samsung',
        explanation: 'Paragraph 4: in 2015, researchers showed how a Samsung smart fridge could be exploited.',
      },
      {
        prompt: 'How many refrigeration and building-control interfaces did UK Cyber Defence find?',
        paragraph: 6,
        phrase: 'more than 800',
        explanation: 'Paragraph 7: researchers found more than 800 interfaces linked to British retailers.',
      },
      {
        prompt: 'When did ransomware hackers target M&S and the Co-op?',
        paragraph: 8,
        phrase: 'May 2025',
        explanation: 'Paragraph 9: the retailers were targeted in May 2025 and later struggled to stock shelves.',
      },
    ],
  },
  {
    id: 'what-we-learned',
    title: 'What We Have Learned',
    kicker: 'DOCUMENT 4 · INCIDENT UPDATE',
    source: 'NovaNet Solutions · Follow-up note',
    paragraphs: [
      `Before lunch, Lin added a short section to the report called "What we have learned". It listed three things: the old account should have been removed a year ago, the patch had been available for two weeks, and the login server had no alert for repeated failures.`,
      `None of these were new problems. They had simply been invisible. The team has since disabled the account, applied the patch, reviewed admin privileges, and made a rule that unused admin accounts must be removed within 24 hours.`,
      `The breach was contained. The gap was closed. The next review will check every old account before it becomes a door.`,
    ],
    skim: [
      {
        prompt: 'What is the main lesson of this section?',
        options: [
          'Small security gaps can nearly become serious breaches.',
          'Patches are unnecessary.',
          'Old accounts are safe if nobody uses them.',
          'Alerts are optional.',
        ],
        answer_index: 0,
        explanation: 'The section lists small, invisible gaps that almost became a serious breach.',
      },
      {
        prompt: 'What is the purpose of the section?',
        options: [
          'To list what the team learned and changed.',
          'To blame the attacker.',
          'To announce a new product.',
          'To describe the weather.',
        ],
        answer_index: 0,
        explanation: 'It is a follow-up note: what was learned and what changed.',
      },
    ],
    scan: [
      {
        prompt: 'How long had the patch been available?',
        paragraph: 0,
        phrase: 'two weeks',
        explanation: 'Paragraph 1: the patch had been available for two weeks.',
      },
      {
        prompt: 'What rule did the team make about unused admin accounts?',
        paragraph: 1,
        phrase: 'within 24 hours',
        explanation: 'Paragraph 2: unused admin accounts must be removed within 24 hours.',
      },
      {
        prompt: 'What did the login server lack?',
        paragraph: 0,
        phrase: 'no alert for repeated failures',
        explanation: 'Paragraph 1: the login server had no alert for repeated failures.',
      },
    ],
  },
];

export const SKIM_SECONDS = 60;
export const SCAN_SECONDS = 45;
export const SKIM_POINTS = 100;
export const SCAN_POINTS = 100;
export const TIME_BONUS_MAX = 50;
export const SCAN_WRONG_PENALTY = 20;
export const SCAN_WRONG_SECONDS = 5;
export const TOTAL_TASKS = DOCUMENTS.length * 5;
export const MAX_SCORE = DOCUMENTS.length * (2 * (SKIM_POINTS + TIME_BONUS_MAX) + 3 * (SCAN_POINTS + TIME_BONUS_MAX));
