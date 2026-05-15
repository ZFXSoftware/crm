export type Customer = {
  id: string
  name: string
  email: string
  company: string
  plan: 'Starter' | 'Growth' | 'Enterprise'
  status: 'Active' | 'Trial' | 'At Risk'
  mrr: number
  lastContact: string
}

export const customersSeed: Customer[] = [
  { id: 'CUS-1001', name: 'Amelia Grant', email: 'amelia@northwind.co', company: 'Northwind', plan: 'Growth', status: 'Active', mrr: 2400, lastContact: '2 days ago' },
  { id: 'CUS-1002', name: 'Noah Woods', email: 'noah@contoso.com', company: 'Contoso', plan: 'Starter', status: 'Trial', mrr: 400, lastContact: 'Yesterday' },
  { id: 'CUS-1003', name: 'Sofia Kim', email: 'sofia@fabrikam.io', company: 'Fabrikam', plan: 'Enterprise', status: 'Active', mrr: 7200, lastContact: '6 days ago' },
  { id: 'CUS-1004', name: 'Liam Perez', email: 'liam@wideworld.org', company: 'Wide World', plan: 'Growth', status: 'At Risk', mrr: 1800, lastContact: '12 days ago' },
  { id: 'CUS-1005', name: 'Isabella Chen', email: 'isabella@adventure.works', company: 'Adventure Works', plan: 'Growth', status: 'Active', mrr: 2600, lastContact: '3 days ago' },
  { id: 'CUS-1006', name: 'Ethan Baker', email: 'ethan@tailspin.ai', company: 'Tailspin', plan: 'Starter', status: 'Active', mrr: 600, lastContact: 'Today' },
]

export type Deal = {
  id: string
  company: string
  stage: 'Discovery' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won'
  owner: string
  value: number
  probability: number
}

export const dealsSeed: Deal[] = [
  { id: 'D-221', company: 'Fabrikam', stage: 'Qualified', owner: 'Amelia', value: 14000, probability: 55 },
  { id: 'D-222', company: 'Contoso', stage: 'Discovery', owner: 'Noah', value: 6000, probability: 25 },
  { id: 'D-223', company: 'Tailspin', stage: 'Proposal', owner: 'Sofia', value: 21000, probability: 65 },
  { id: 'D-224', company: 'Adventure Works', stage: 'Negotiation', owner: 'Liam', value: 32000, probability: 78 },
  { id: 'D-225', company: 'Wide World', stage: 'Qualified', owner: 'Ethan', value: 9000, probability: 50 },
  { id: 'D-226', company: 'Northwind', stage: 'Won', owner: 'Amelia', value: 45000, probability: 100 },
]

export const monthlySeries = [
  { m: 'Jan', revenue: 42, cost: 28, leads: 120 },
  { m: 'Feb', revenue: 46, cost: 30, leads: 150 },
  { m: 'Mar', revenue: 54, cost: 34, leads: 180 },
  { m: 'Apr', revenue: 60, cost: 36, leads: 165 },
  { m: 'May', revenue: 69, cost: 40, leads: 210 },
  { m: 'Jun', revenue: 72, cost: 44, leads: 240 },
  { m: 'Jul', revenue: 78, cost: 48, leads: 260 },
  { m: 'Aug', revenue: 82, cost: 50, leads: 280 },
  { m: 'Sep', revenue: 88, cost: 54, leads: 300 },
  { m: 'Oct', revenue: 92, cost: 56, leads: 320 },
  { m: 'Nov', revenue: 98, cost: 58, leads: 350 },
  { m: 'Dec', revenue: 104, cost: 62, leads: 370 },
]

export type Bill = {
  id: string
  vendor: string
  category: 'Software' | 'Services' | 'Office' | 'Ads'
  amount: number
  dueDate: string
  status: 'Paid' | 'Pending' | 'Overdue'
}

export const billsSeed: Bill[] = [
  { id: 'B-901', vendor: 'Cloud Hosting', category: 'Services', amount: 1840, dueDate: '2026-03-05', status: 'Pending' },
  { id: 'B-902', vendor: 'Workspace Licenses', category: 'Software', amount: 920, dueDate: '2026-03-02', status: 'Paid' },
  { id: 'B-903', vendor: 'Office Rent', category: 'Office', amount: 4200, dueDate: '2026-03-01', status: 'Paid' },
  { id: 'B-904', vendor: 'Search Ads', category: 'Ads', amount: 1600, dueDate: '2026-02-25', status: 'Overdue' },
  { id: 'B-905', vendor: 'Contractor Support', category: 'Services', amount: 2300, dueDate: '2026-03-10', status: 'Pending' },
]
