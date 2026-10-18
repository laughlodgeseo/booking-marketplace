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
    title: "Find the Dubai that fits your days",
    excerpt:
      "Waterfront mornings, central city days and a little space to slow down. Start with the way you want to spend your time.",
    dateLabel: "Area Guide",
    tag: "Area Guide",
    coverUrl: "/images/blog/best-areas.webp",
    body: [
      "Choosing a neighborhood is really choosing the shape of a day. Before looking at a particular home, think about what brings you to Dubai: time by the water, a few days exploring the city, a working trip, or a longer stay with everyday routines to keep.",
      "Downtown puts the city’s familiar landmarks into the story of your trip. Dubai Marina offers a waterfront setting, while Palm Jumeirah gives a different perspective on the coastline. Business Bay is another central area to consider. Each name covers a broader district, so look at the actual location of the property rather than the area label alone.",
      "Write down the places you expect to visit most often. Compare a home’s address with those plans, and check how you would travel between them. A photograph of a beautiful view tells you very little about the daily journeys you will actually make.",
      "Then look inside. The bedroom arrangement, bathrooms, guest capacity and listed facilities need to work for your group. A generous living area might matter more than a particular view; a kitchen or workspace might change the way a longer stay feels.",
      "The photographs in our editorial gallery are there to help you notice the atmosphere you like. The property listing is where to check the details of a specific home. Keep inspiration and the practical decision together, but use the actual listing for the final comparison.",
      "When you find a place that feels right, search with your dates and guest count. Review availability, the current quote and the reservation terms. If you are still deciding between areas, tell our team what your days need to include; that is a useful place to start the conversation.",
    ],
  },
  {
    slug: "how-we-keep-stays-consistent",
    title: "The care you feel, before you notice it",
    excerpt:
      "A considered arrival begins with preparation, property care and clear communication.",
    dateLabel: "Hospitality",
    tag: "Hospitality",
    coverUrl: "/images/blog/stays-consistent.webp",
    body: [
      "The easiest moments of a stay tend to have practical work behind them. A space that feels ready, information that makes sense and a clear way to ask a question all contribute to the experience of arriving somewhere new.",
      "Preparation begins with the home itself. Cleaning, linen, the arrangement of the rooms and property readiness need to be considered together. The details depend on the property and the operating arrangement agreed for it.",
      "Good presentation helps a guest imagine being there, but a photograph is only one part of the story. Read the listing’s facilities and room details. Check the arrangements that matter to your group rather than assuming every home offers the same things.",
      "Arrival is another important moment. Keep the instructions supplied for your reservation, and clarify timing questions before travelling. If your plans change, share the updated information so the team can understand what you need.",
      "During a stay, a useful question is a specific one. Include your booking reference, describe the issue and explain where in the home it occurs. Those details help the team understand the situation and coordinate the next step.",
      "For an owner, these moments connect the appearance of a property with the experience of staying in it. Discuss preparation, maintenance coordination, communication and responsibilities when agreeing the management scope for your home.",
    ],
  },
  {
    slug: "booking-flow-explained",
    title: "From finding a home to settling in",
    excerpt:
      "The details to check between your first search and the moment you open the door.",
    dateLabel: "Booking",
    tag: "Booking",
    coverUrl: "/images/blog/booking-flow.webp",
    body: [
      "Start a search with the details that shape the reservation: your dates, the number of guests and the area you have in mind. The more closely a search reflects your real plans, the more useful the comparison becomes.",
      "Open the individual home and look beyond the first photograph. Read the sleeping arrangements, bathrooms, capacity, location and listed facilities. Note any rules or conditions that affect the way your group plans to use the space.",
      "A nightly amount is a starting point, rather than the whole decision. Review the quote and booking summary for the dates you selected, including any applicable fees, taxes or deposit requirements.",
      "Read the cancellation and refund terms before confirming. Policies belong to the reservation, and the effect of a change or cancellation depends on the terms that apply to that booking. Ask for clarification if you are unsure about a condition.",
      "Follow the confirmation status shown for your reservation. Keep the booking reference, payment information and messages together so you can refer to them if you need support. Do not treat an unfinished checkout as a confirmed stay.",
      "As the trip approaches, review the arrival instructions supplied for your booking. Check any timing details, share questions with the team and keep the contact information available while travelling. Then there is a little less to think about when you reach the door.",
    ],
  },
];
