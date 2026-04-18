/**
 * Shared industry list used across Analyze, BrandSetup, and MyBrands pages.
 * Extend here to add more industries — all pages will pick them up automatically.
 */
export const INDUSTRIES = [
  // Technology
  "SaaS / Software",
  "Mobile Apps",
  "Cybersecurity",
  "Artificial Intelligence / AI",
  "Web3 / Blockchain",
  "IT Services & Consulting",
  "Hardware / Electronics",

  // Commerce
  "E-commerce / Online Retail",
  "Retail / Physical Stores",
  "Wholesale / Distribution",
  "Marketplace / Platform",
  "Dropshipping",

  // Finance
  "Fintech / Financial Technology",
  "Banking & Financial Services",
  "Insurance",
  "Accounting & Bookkeeping",
  "Investment & Wealth Management",
  "Cryptocurrency / DeFi",

  // Marketing & Media
  "Digital Marketing Agency",
  "Advertising & PR",
  "Content Creation / Media",
  "Social Media Management",
  "SEO / Growth Agency",
  "Branding & Design Agency",

  // Professional Services
  "Consulting / Business Coaching",
  "Legal Services",
  "HR & Recruitment",
  "Management Consulting",
  "Research & Analytics",

  // Health & Wellness
  "Healthcare / MedTech",
  "Mental Health & Therapy",
  "Fitness & Sports",
  "Nutrition & Supplements",
  "Beauty & Personal Care",
  "Pharmaceuticals",

  // Education
  "EdTech / Online Learning",
  "Tutoring & Coaching",
  "Corporate Training",
  "Schools & Universities",

  // Food & Hospitality
  "Food & Beverage",
  "Restaurant / Café",
  "Food Delivery",
  "Travel & Tourism",
  "Hotels & Hospitality",
  "Events & Entertainment",

  // Real Estate & Construction
  "Real Estate",
  "Property Management",
  "Architecture & Interior Design",
  "Construction & Engineering",

  // Creative & Lifestyle
  "Fashion & Apparel",
  "Luxury Goods",
  "Arts & Crafts",
  "Photography & Videography",
  "Music & Podcasting",
  "Gaming & Esports",
  "Sports & Recreation",

  // Social Impact
  "Non-profit / NGO",
  "Social Enterprise",
  "Government & Public Sector",
  "Religious / Faith-based",

  // Other
  "Logistics & Supply Chain",
  "Agriculture & AgriTech",
  "Energy & CleanTech",
  "Automotive",
  "Manufacturing",
  "Creator / Influencer",
  "Freelancer / Solopreneur",
  "Other",
] as const;

export type Industry = typeof INDUSTRIES[number];
