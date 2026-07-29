// Sample data for Boz's Morning Command Center.
// Realistic-but-fake. Swap for live Salesforce / Google sources later.
window.DASH = {
  user: "BOZ",
  greeting: "GOOD MORNING",
  intention: "Build the machine. Stay in the body.",
  now: { time: "6:42", ampm: "AM", weather: "Clear", temp: "64°", dateLong: "Sunday, May 31" },

  heroStats: [
    { label: "Revenue MTD", value: "$128.4K", accent: "orange", delta: "+18%" },
    { label: "Pipeline", value: "$2.4M", accent: "teal", delta: "+6 deals" },
    { label: "Goals On Track", value: "78%", accent: "gold", delta: "3 of 4" },
  ],

  health: {
    score: 82,
    rings: [
      { label: "Steps", value: "8,240", target: "10,000", pct: 82, accent: "teal" },
      { label: "Gym", value: "2", target: "3 / wk", pct: 67, accent: "orange" },
      { label: "Breathwork", value: "Done", target: "daily", pct: 100, accent: "gold" },
    ],
  },

  wholesaling: {
    pipeline: "$2.4M",
    mtd: 128400, goal: 175000,
    trend: "+18%",
    stages: [
      { label: "Under Contract", count: 4, accent: "teal" },
      { label: "Negotiating", count: 7, accent: "orange" },
      { label: "Leads", count: 23, accent: "dim" },
    ],
  },

  coaching: {
    published: 7, goal: 10,
    trend: "+2",
    // content output by weekday
    byDay: [
      { d: "M", v: 2 }, { d: "T", v: 1 }, { d: "W", v: 0 },
      { d: "T", v: 2 }, { d: "F", v: 1 }, { d: "S", v: 1 }, { d: "S", v: 0 },
    ],
  },

  habits: [
    { id: "breath", name: "Breathwork", note: "Microcosmic Orbit · 20 min, deep", streak: 14, done: true, accent: "teal" },
    { id: "steps", name: "Steps", note: "8,240 logged today", streak: 6, done: true, accent: "orange" },
    { id: "gym", name: "Gym Session", note: "Last: Thu, May 28", streak: 3, done: false, accent: "orange" },
    { id: "ifs", name: "IFS Journaling", note: "Parts check-in", streak: 9, done: true, accent: "teal" },
  ],

  bizTasks: [
    { id: "b1", title: "Call title co. — Oak St closing", due: "Today", pri: "high", done: false },
    { id: "b2", title: "Review JV agreement w/ Marcus", due: "Today", pri: "med", done: false },
    { id: "b3", title: "Send comps to buyer list", due: "Tue", pri: "low", done: false },
    { id: "b4", title: "Follow up — Mrs. Alvarez", due: "Wed", pri: "med", done: true },
  ],

  personalTasks: [
    { id: "p1", title: "Order anniversary gift", due: "Today", pri: "high", done: false },
    { id: "p2", title: "Book flights — July trip", due: "Mon", pri: "low", done: false },
    { id: "p3", title: "Schedule dentist", due: "—", pri: "low", done: false },
    { id: "p4", title: "Renew passport", due: "Jun 10", pri: "med", done: false },
  ],

  realEstate: [
    { addr: "1428 Oak St", buyer: "J. Alvarez", status: "Active", amount: "$1,240/mo", due: "Jun 1" },
    { addr: "705 Maple Dr", buyer: "T. Nguyen", status: "Active", amount: "$1,510/mo", due: "Jun 3" },
    { addr: "22 Linden Ave", buyer: "K. Brooks", status: "Pending", amount: "$980/mo", due: "Follow up Jun 5" },
    { addr: "88 Cedar Ln", buyer: "R. Diaz", status: "Active", amount: "$1,120/mo", due: "Jun 1" },
    { addr: "3 Birchwood Ct", buyer: "—", status: "Lead", amount: "—", due: "Call back" },
  ],

  // current week — Sunday May 31 2026 is "today"
  week: [
    { day: "MON", date: 25, events: [{ t: "9a", label: "Buyer calls" }] },
    { day: "TUE", date: 26, events: [{ t: "11a", label: "Walkthrough — Maple" }] },
    { day: "WED", date: 27, events: [{ t: "2p", label: "Coaching record" }] },
    { day: "THU", date: 28, events: [{ t: "7a", label: "Gym" }, { t: "4p", label: "JV sync" }] },
    { day: "FRI", date: 29, events: [{ t: "10a", label: "Title co." }] },
    { day: "SAT", date: 30, events: [] },
    { day: "SUN", date: 31, today: true, events: [{ t: "8a", label: "Breathwork" }, { t: "6p", label: "Family dinner" }] },
  ],

  importantDates: [
    { label: "Oak St Closing", date: "Jun 6", days: 6, accent: "orange", plan: "Confirm wire + walkthrough" },
    { label: "Maya's Birthday", date: "Jun 14", days: 14, accent: "teal", plan: "Book venue, order cake" },
    { label: "Coaching Cohort Launch", date: "Jul 1", days: 31, accent: "gold", plan: "Finish 3 modules, email list" },
  ],

  quotes: [
    "Discipline is the bridge between goals and accomplishment.",
    "The body keeps the score — so keep it strong.",
    "Move first. Motivation follows motion.",
    "You don't rise to your goals; you fall to your systems.",
  ],

  weeklyGoals: [
    { label: "IFS journaling — daily", accent: "teal", done: true },
    { label: "Breathwork streak → 21", accent: "gold", done: false },
    { label: "Ship 3 coaching videos", accent: "orange", done: false },
    { label: "Date night with partner", accent: "teal", done: false },
  ],
};
