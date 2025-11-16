// V3 markers for incremental code updates (SEARCH/REPLACE blocks)
export const SEARCH_START = "<<<<<<< SEARCH";
export const DIVIDER = "=======";
export const REPLACE_END = ">>>>>>> REPLACE";

// V3 file operation markers
export const NEW_FILE_START = "<<<<<<< NEW_FILE_START ";
export const NEW_FILE_END = " >>>>>>> NEW_FILE_END";
export const UPDATE_FILE_START = "<<<<<<< UPDATE_FILE_START ";
export const UPDATE_FILE_END = " >>>>>>> UPDATE_FILE_END";

// Project metadata markers
export const PROJECT_NAME_START = "<<<<<<< PROJECT_NAME_START";
export const PROJECT_NAME_END = ">>>>>>> PROJECT_NAME_END";

// System prompt for follow-up modifications using incremental updates
export const FOLLOW_UP_SYSTEM_PROMPT = `You are an expert UI/UX and Front-End Developer modifying existing files (HTML, CSS, JavaScript).
You MUST output ONLY the changes required using the following UPDATE_FILE_START and SEARCH/REPLACE format. Do NOT output the entire file.
Do NOT explain the changes or what you did, just return the expected results.
Update Format Rules:
1. Start with ${PROJECT_NAME_START}.
2. Add the name of the project, right after the start tag.
3. Close the start tag with the ${PROJECT_NAME_END}.
4. Start with ${UPDATE_FILE_START}
5. Provide the name of the file you are modifying (index.html, style.css, script.js, etc.).
6. Close the start tag with the ${UPDATE_FILE_END}.
7. Start with ${SEARCH_START}
8. Provide the exact lines from the current code that need to be replaced.
9. Use ${DIVIDER} to separate the search block from the replacement.
10. Provide the new lines that should replace the original lines.
11. End with ${REPLACE_END}
12. You can use multiple SEARCH/REPLACE blocks if changes are needed in different parts of the file.
13. To insert code, use an empty SEARCH block (only ${SEARCH_START} and ${DIVIDER} on their lines) if inserting at the very beginning, otherwise provide the line *before* the insertion point in the SEARCH block and include that line plus the new lines in the REPLACE block.
14. To delete code, provide the lines to delete in the SEARCH block and leave the REPLACE block empty (only ${DIVIDER} and ${REPLACE_END} on their lines).
15. IMPORTANT: The SEARCH block must *exactly* match the current code, including indentation and whitespace.
Example Modifying Code:
${UPDATE_FILE_START}index.html${UPDATE_FILE_END}
${SEARCH_START}
    <h1>Old Title</h1>
${DIVIDER}
    <h1>New Title</h1>
${REPLACE_END}
Example Updating CSS:
${UPDATE_FILE_START}style.css${UPDATE_FILE_END}
${SEARCH_START}
body {
    background: white;
}
${DIVIDER}
body {
    background: linear-gradient(to right, #667eea, #764ba2);
}
${REPLACE_END}
For creating new files, use the following format:
1. Start with ${NEW_FILE_START}.
2. Add the name of the file, right after the start tag.
3. Close the start tag with the ${NEW_FILE_END}.
4. Start the file content with the triple backticks and appropriate language marker.
5. Insert the file content there.
6. Close with the triple backticks.`;

export const PROMPTS_FOR_AI = [
  // Business & SaaS
  "Create a modern SaaS landing page with a hero section featuring a product demo, benefits section with icons, pricing plans comparison table, customer testimonials with photos, FAQ accordion, and a prominent call-to-action footer.",
  "Create a professional startup landing page with animated hero section, problem-solution showcase, feature highlights with screenshots, team members grid, investor logos, press mentions, and email signup form.",
  "Create a business consulting website with a hero banner, services we offer section with hover effects, case studies carousel, client testimonials, team profiles with LinkedIn links, blog preview, and contact form.",
  
  // E-commerce & Retail
  "Create an e-commerce product landing page with hero image carousel, product features grid, size/color selector, customer reviews with star ratings, related products section, add to cart button, and shipping information.",
  "Create an online store homepage with navigation menu, banner slider, featured products grid with hover effects, category cards, special offers section, newsletter signup, and footer with social links.",
  "Create a fashion brand website with a full-screen hero image, new arrivals section, shop by category grid, Instagram feed integration, brand story section, and styling lookbook gallery.",
  
  // Food & Restaurant
  "Create a restaurant website with a hero section showing signature dishes, menu with categories and prices, chef's special highlights, reservation form with date picker, location map, opening hours, and customer reviews.",
  "Create a modern coffee shop website with a cozy hero image, menu board with drinks and pastries, about our story section, location finder, online ordering button, and Instagram gallery showing café atmosphere.",
  "Create a food delivery landing page with cuisine categories, featured restaurants carousel, how it works steps, delivery zones map, app download buttons, promotional offers banner, and customer testimonials.",
  
  // Real Estate & Property
  "Create a real estate agency website with property search filters (location, price, bedrooms), featured listings grid with images, virtual tour options, mortgage calculator, agent profiles, neighborhood guides, and contact form.",
  "Create a luxury property showcase website with full-screen image slider, property details with floor plans, amenities icons, 360° virtual tour button, location highlights, similar properties section, and inquiry form.",
  
  // Creative & Portfolio
  "Create a professional portfolio website for a photographer with a masonry image gallery, project categories filter, full-screen lightbox viewer, about me section with photo, services offered, client logos, and contact form.",
  "Create a creative agency portfolio with animated hero section, featured projects showcase with case studies, services we provide, team members grid, client testimonials slider, awards section, and get a quote form.",
  "Create a UX/UI designer portfolio with hero section showcasing best work, projects grid with filter tags, detailed case studies with before/after, design process timeline, skills and tools, testimonials, and hire me button.",
  
  // Personal & Blog
  "Create a personal brand website with an engaging hero section, about me with professional photo, skills and expertise cards, featured blog posts, speaking engagements, social media links, and newsletter signup.",
  "Create a modern blog website with featured post hero, article cards grid with thumbnails, categories sidebar, search functionality, author bio section, related posts, social sharing buttons, and comment section.",
  "Create a travel blog with full-width destination photos, travel stories grid, interactive world map showing visited places, travel tips section, gear recommendations, and subscription form.",
  
  // Health & Fitness
  "Create a fitness gym website with motivational hero video, class schedule timetable, trainer profiles with specializations, membership pricing comparison, transformation gallery, facilities photos, and trial class signup form.",
  "Create a yoga studio website with calming hero section, class types with descriptions, instructor bios with photos, weekly schedule calendar, pricing packages, meditation tips blog, studio location map, and booking form.",
  "Create a health & wellness landing page with hero section, service offerings, nutritionist/trainer profiles, success stories before/after, health blog articles, free consultation booking, and testimonials slider.",
  
  // Education & Learning
  "Create an online course landing page with course overview, curriculum breakdown with expandable modules, instructor credentials, student testimonials with videos, pricing and enrollment options, FAQ section, and money-back guarantee badge.",
  "Create a university/school website with hero carousel, academic programs grid, campus life photo gallery, upcoming events calendar, faculty directory, admissions process timeline, virtual campus tour, and application form.",
  "Create a tutoring service website with subjects offered, tutor profiles with qualifications, pricing plans, scheduling calendar, student success stories, free trial lesson signup, learning resources, and parent testimonials.",
  
  // Events & Entertainment
  "Create an event conference website with hero countdown timer, speaker lineup with bios, schedule/agenda tabs, venue information with map, ticket tiers and pricing, sponsors logos grid, past event highlights, and registration form.",
  "Create a music festival landing page with artist/band lineup, stage schedule, venue map, ticket options with early bird pricing, photo gallery from previous years, camping information, FAQ, and buy tickets button.",
  "Create a wedding website with couple's story, event timeline, venue details with directions, RSVP form, photo gallery, gift registry links, accommodation suggestions, and message board for guests.",
  
  // Professional Services
  "Create a law firm website with practice areas grid, attorney profiles with expertise, case results/wins, legal resources blog, testimonials, office locations, consultation booking form, and trust badges.",
  "Create a dental clinic website with services offered, meet the dentist section with credentials, patient testimonials, before/after smile gallery, insurance accepted, appointment booking system, emergency contact, and dental tips blog.",
  "Create an architecture firm website with portfolio of completed projects with large images, services overview, design process timeline, team members, awards and recognition, sustainable design approach, and project inquiry form.",
  
  // Technology & Apps
  "Create an app landing page with hero section showing app screenshots, key features with icons, how it works steps, pricing plans, user testimonials, app store download buttons, video demo, and early access signup.",
  "Create a software product page with hero demo video, features comparison table, integration logos, API documentation link, use cases with examples, security certifications, customer stories, and free trial signup.",
  
  // Non-profit & Community
  "Create a non-profit organization website with mission statement hero, our impact statistics, current campaigns, donation form with amounts, volunteer opportunities, success stories, upcoming events, and newsletter signup.",
  "Create a community organization website with welcome hero, about our mission, programs and services offered, event calendar, member spotlights, resources library, donation/support options, and get involved form.",
  
  // Misc & Utility (keeping a few interactive examples)
  "Create an interactive weather dashboard with current conditions, 5-day forecast cards, hourly temperature graph, air quality index, UV index, sunrise/sunset times, and location search with autocomplete.",
  "Create a modern calculator with basic operations, scientific mode toggle, calculation history log, memory functions, keyboard support, light/dark theme switch, and copy result button.",
];