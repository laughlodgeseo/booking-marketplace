export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  dateLabel: string;
  tag: string;
  coverUrl: string;
  body: string[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "best-areas-to-stay-in-dubai",
    title: "Best areas to stay in Dubai based on your trip goals",
    excerpt:
      "A simple guide to choosing Downtown, Marina, Business Bay, and more.",
    dateLabel: "Area Guide",
    tag: "Area Guide",
    coverUrl:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1800&q=80",
    body: [
      "Downtown Dubai is great if you want quick access to landmarks, shopping, and city life.",
      "Dubai Marina is ideal for walkability, waterfront dining, and lively evenings.",
      "Business Bay offers a good mix of central access and a calmer pace.",
      "Palm Jumeirah is best for resort-style stays and private space.",
    ],
  },
  {
    slug: "how-we-keep-stays-consistent",
    title: "How we keep stay quality consistent",
    excerpt:
      "From cleaning to inspections, this is how we keep standards steady for every stay.",
    dateLabel: "Operations",
    tag: "Hospitality",
    coverUrl:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1800&q=80",
    body: [
      "Every confirmed booking triggers cleaning and quality checks.",
      "Turnover readiness follows a clear workflow, not ad-hoc tasks.",
      "Escalations follow structured channels for better traceability.",
      "This keeps guest experience stable and gives owners clear visibility.",
    ],
  },
  {
    slug: "booking-flow-explained",
    title: "Booking flow explained: holds, quotes, and safe inventory",
    excerpt:
      "Why our booking flow prevents double booking and keeps totals consistent.",
    dateLabel: "Product",
    tag: "Booking",
    coverUrl:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1800&q=80",
    body: [
      "Search results are date-aware and checked against live availability before quote generation.",
      "Reservation holds are short and explicit to reduce booking conflicts.",
      "Pricing is calculated on the server so final totals match policy and fee rules.",
      "Status changes from hold to booking are traceable for support and finance teams.",
    ],
  },
];
