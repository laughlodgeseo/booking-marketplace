import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { BLOG_POSTS } from "@/lib/content/blog-posts";
import {
  EditorialFaq,
  ImageHandoff,
  ParallaxCards,
  PhotoEssay,
  PracticalSteps,
  StaySelector,
  type Scene,
} from "./DepthScenes";
import ScrollWords from "./ScrollWords";
const picture = (id: string) => `/images/gallery/${id}.webp`;
const photos = {
  chair: picture("1618220179428-22790b461013"),
  kitchen: picture("1600489000022-c2086d79f9d4"),
  bed: picture("1595526114035-0d45ed16cfbf"),
  bath: picture("1584622650111-993a426fbf0a"),
  evening: picture("1564078516393-cf04bd966897"),
  breakfast: picture("1621045081424-97aa08903f76"),
  pool: picture("1562016600-ece13e8ba570"),
};
export function JournalStories({
  ar,
  exclude,
}: {
  ar: boolean;
  exclude?: string;
}) {
  return (
    <section className="v4-reading">
      <ScrollWords
        text={
          ar
            ? "قبل أن تصل، تعرف إلى المدينة."
            : "A little local knowledge goes a long way."
        }
      />
      <ParallaxCards>
        {BLOG_POSTS.filter((post) => post.slug !== exclude).map((post) => (
          <Link
            className="v4-reading-card"
            href={`/blog/${post.slug}`}
            key={post.slug}
          >
            <div>
              <Image
                src={post.coverUrl}
                alt={post.title}
                fill
                sizes="(max-width:759px) 90vw, 30vw"
                className="object-cover"
              />
            </div>
            <h3>
              {post.title}
              <ArrowUpRight size={22} />
            </h3>
            <p>{post.excerpt}</p>
            <span className="story-link">
              {ar ? "اقرأ المقال بالإنجليزية" : "Read the story"}
              <ArrowUpRight size={17} />
            </span>
          </Link>
        ))}
      </ParallaxCards>
    </section>
  );
}
export function ConnectedPaths({
  ar,
  owner = false,
}: {
  ar: boolean;
  owner?: boolean;
}) {
  const entries = owner
    ? [
        {
          href: "/services",
          title: ar ? "العناية، بالتفصيل." : "See the care behind the stay.",
          src: photos.bed,
        },
        {
          href: "/contact?topic=owners",
          title: ar ? "لنناقش عقارك." : "Tell us about your property.",
          src: "/areas/business-bay.webp",
        },
      ]
    : [
        {
          href: "/properties",
          title: ar ? "حوّل الفكرة إلى إقامة." : "Find a place for your plans.",
          src: "/areas/dubai-marina.webp",
        },
        {
          href: "/gallery",
          title: ar ? "اكتشف إحساس المساحات." : "Spend a little longer inside.",
          src: photos.chair,
        },
      ];
  return (
    <nav
      className="v4-connected"
      aria-label={ar ? "اكتشف المزيد" : "Keep exploring"}
    >
      {entries.map((entry) => (
        <Link href={entry.href} key={entry.href}>
          <div>
            <Image
              src={entry.src}
              alt=""
              fill
              sizes="(max-width:759px) 90vw, 45vw"
              className="object-cover"
            />
          </div>
          <span>{entry.title}</span>
          <ArrowUpRight size={30} />
        </Link>
      ))}
    </nav>
  );
}
export function GuestPlanning({ ar }: { ar: boolean }) {
  const b = (en: string, arabic: string) => (ar ? arabic : en);
  const items: Scene[] = [
    {
      title: b("Start with your days.", "ابدأ بأيامك."),
      body: b(
        "Set your dates and the number of people coming with you. Then think about where those days will take you: a morning by the water, a working afternoon, or evenings in the city. Your neighborhood is part of your stay.",
        "حدد التواريخ وعدد الضيوف، ثم فكر في شكل يومك: صباح قرب الماء، أو فترة عمل هادئة، أو أمسيات في المدينة. الحي جزء من تجربة إقامتك.",
      ),
      src: "/areas/dubai-creek-harbour.webp",
      alt: b("Dubai Creek Harbour waterfront", "الواجهة المائية في خور دبي"),
      href: "/blog/best-areas-to-stay-in-dubai",
      label: b("Find your neighborhood", "اختر حيّك"),
    },
    {
      title: b("Look beyond the photograph.", "تأمل ما وراء الصورة."),
      body: b(
        "Read the home’s bedroom and bathroom details, guest capacity, location and listed amenities. A beautiful room is only the beginning: the right home should work for the people and routines you’re bringing with you.",
        "اقرأ تفاصيل غرف النوم والحمامات والسعة والموقع والمرافق المدرجة. جمال الغرفة هو البداية؛ والأهم أن تلائم الأشخاص وروتينهم اليومي.",
      ),
      src: photos.kitchen,
      alt: b("A kitchen arranged for everyday living", "مطبخ للحياة اليومية"),
      href: "/properties",
      label: b("Explore the stays", "استكشف الإقامات"),
    },
    {
      title: b("Know the whole picture.", "اعرف التفاصيل كاملة."),
      body: b(
        "Before confirming, review the total, the cancellation terms and any deposit or additional fee shown for your dates. Keep your confirmation and arrival instructions close. If something is unclear, ask our team before you book.",
        "قبل التأكيد، راجع الإجمالي وشروط الإلغاء وأي تأمين أو رسوم إضافية موضحة لتواريخك. احتفظ بالتأكيد وتعليمات الوصول، واسأل فريقنا عن أي تفاصيل غير واضحة.",
      ),
      src: photos.bed,
      alt: b("A calm bedroom in soft daylight", "غرفة نوم هادئة في ضوء النهار"),
      href: "/pricing",
      label: b("Understand the details", "افهم التفاصيل"),
    },
  ];
  return (
    <PracticalSteps
      title={b(
        "A good stay starts with a little thought.",
        "الإقامة الجميلة تبدأ بقليل من التفكير.",
      )}
      intro={b(
        "A simple way to choose a home that feels right before you ever turn the key.",
        "خطوات بسيطة لاختيار مكان يلائمك قبل أن تفتح الباب.",
      )}
      items={items}
    />
  );
}
export function HomeStayStyles({ ar }: { ar: boolean }) {
  const b = (en: string, a: string) => (ar ? a : en);
  return (
    <StaySelector
      title={b("Make room for your kind of day.", "مساحة ليوم يشبهك.")}
      choices={[
        {
          title: b("Unhurried mornings.", "صباح بلا عجلة."),
          body: b(
            "A quiet corner. Your first coffee. Somewhere to take the day as it comes. Think about natural light, living space and the neighborhood you want to wake up in.",
            "ركن هادئ وقهوتك الأولى، ومساحة لتبدأ اليوم على مهل. فكر في الضوء ومساحة المعيشة والحي الذي ترغب أن تستيقظ فيه.",
          ),
          src: photos.breakfast,
          alt: b(
            "A bright breakfast table surrounded by plants",
            "طاولة إفطار مضيئة تحيط بها النباتات",
          ),
          href: "/properties",
          label: b("Find your space", "ابحث عن مساحتك"),
        },
        {
          title: b("A little more together.", "وقت أكثر معاً."),
          body: b(
            "Room to meet around the table, cook something simple, and spend time in the same place. Check the sleeping arrangements and guest capacity to find a home that works for everyone.",
            "مساحة للاجتماع حول الطاولة وتحضير وجبة بسيطة وقضاء الوقت معاً. راجع ترتيبات النوم وسعة الضيوف لاختيار مكان يناسب الجميع.",
          ),
          src: photos.kitchen,
          alt: b(
            "An open kitchen with space to prepare a meal",
            "مطبخ مفتوح لتحضير الطعام",
          ),
          href: "/properties",
          label: b("Explore the stays", "استكشف الإقامات"),
        },
        {
          title: b("Stay a little longer.", "أقم لوقت أطول."),
          body: b(
            "When a trip becomes part of your routine, the everyday details matter. Look for the facilities you need in the individual listing, and ask about longer dates before you settle on a place.",
            "حين تصبح الرحلة جزءاً من روتينك، تزداد أهمية التفاصيل اليومية. راجع المرافق في صفحة العقار واسأل عن تواريخ الإقامة الطويلة قبل الاختيار.",
          ),
          src: photos.evening,
          alt: b(
            "A living room settling into evening light",
            "غرفة معيشة في ضوء المساء",
          ),
          href: "/contact",
          label: b("Tell us your plans", "أخبرنا بخططك"),
        },
      ]}
    />
  );
}
export function CityFieldNotes({ ar }: { ar: boolean }) {
  return (
    <PhotoEssay
      title={
        ar
          ? "هناك أكثر من طريقة لتعيش دبي."
          : "There’s more than one way to be here."
      }
      body={
        ar
          ? [
              "قد تبدأ رحلتك بالأفق الشهير، لكن التفاصيل اليومية هي ما يجعل الحي قريباً منك. فكر في الأماكن التي ترغب في زيارتها وكيف تحب أن تقضي صباحك وأمسيتك.",
              "من واجهة الخور إلى إيقاع المدينة، اختر موقعاً يلائم خططك. راجع عنوان كل عقار وموقعه الفعلي قبل الحجز، بدلاً من الاكتفاء باسم المنطقة.",
            ]
          : [
              "The skyline might bring you here. The everyday details make a neighborhood feel like yours. Think about where you want to spend your time, and the kind of morning you’d like to wake up to.",
              "A waterfront setting, a central address, a quieter corner of the city. Each changes the pace of a trip. Check the individual home’s location and plan around the places that matter to you.",
            ]
      }
      photos={[
        {
          src: "/areas/dubai-creek-harbour.webp",
          alt: ar ? "خور دبي" : "Dubai Creek Harbour",
        },
        { src: "/areas/city-walk.webp", alt: ar ? "سيتي ووك" : "City Walk" },
        {
          src: "/areas/business-bay.webp",
          alt: ar ? "الخليج التجاري" : "Business Bay",
        },
      ]}
    />
  );
}
export function CityToRoom({ ar }: { ar: boolean }) {
  return (
    <ImageHandoff
      scenes={[
        {
          title: ar ? "الخارج، المدينة." : "Outside, the city.",
          body: ar
            ? "مساحات جديدة تستحق الاكتشاف. وأيام تصنعها على طريقتك."
            : "New places to find. A different view around every corner. A day that belongs to you.",
          src: "/areas/downtown-dubai.webp",
          alt: ar ? "أفق وسط مدينة دبي" : "Downtown Dubai skyline",
        },
        {
          title: ar ? "الداخل، وقتك." : "Inside, your time.",
          body: ar
            ? "اترك ضجيج اليوم عند الباب. وامنح نفسك مساحة تكون فيها على طبيعتك."
            : "Leave the day at the door. Settle into a quieter rhythm, in a room that gives you space to simply be.",
          src: photos.evening,
          alt: ar
            ? "غرفة معيشة في ضوء دافئ"
            : "A living space in warm evening light",
          href: "/gallery",
          label: ar ? "ألق نظرة بالداخل" : "Look inside",
        },
      ]}
    />
  );
}
export function GuestQuestions({ ar }: { ar: boolean }) {
  return (
    <EditorialFaq
      title={ar ? "قبل أن تفتح الباب." : "Before you open the door."}
      items={
        ar
          ? [
              {
                q: "كيف أختار الحي المناسب؟",
                a: "ابدأ بخططك اليومية. راجع موقع كل عقار والمسافات إلى الأماكن التي تهمك، ثم اختر الإقامة التي تلائمك بدلاً من الاعتماد على صورة الأفق فقط.",
              },
              {
                q: "هل صور المعرض لعقارات متاحة للحجز؟",
                a: "المعرض مجموعة صور للإلهام، مستقلة عن العقارات المتاحة. استخدم صفحة الإقامات لمعرفة الصور والمرافق والسعر الخاصة بالعقار الفعلي.",
              },
              {
                q: "أين أجد التكلفة الإجمالية؟",
                a: "ابحث بتواريخك وعدد الضيوف وراجع عرض السعر وملخص الحجز. تختلف الرسوم والضرائب والتأمين بحسب العقار والحجز، ويجب مراجعتها قبل الدفع.",
              },
              {
                q: "هل أستطيع التخطيط لإقامة أطول؟",
                a: "تواصل مع الفريق بالتواريخ وعدد الضيوف والمنطقة المفضلة وأي احتياجات يومية. سنناقش الخيارات والتفاصيل التي تحتاج إلى التحقق منها.",
              },
              {
                q: "لدي سؤال عن الوصول أو الحجز.",
                a: "راسل Booking@rentpropertyuae.com أو اتصل على +971 50 234 8756. إذا كان لديك حجز قائم، أضف مرجع الحجز لتسهيل متابعة الاستفسار.",
              },
            ]
          : [
              {
                q: "How do I choose the right neighborhood?",
                a: "Start with the way you plan to spend your days. Check each home’s actual location and the places you want to reach, then choose around your plans rather than a skyline photograph alone.",
              },
              {
                q: "Are the gallery photographs bookable homes?",
                a: "The gallery is an editorial collection for inspiration, separate from available inventory. Use the stays page to see the photographs, amenities and quote for an individual bookable property.",
              },
              {
                q: "Where can I see the full cost?",
                a: "Search with your dates and guest count, then review the quote and booking summary. Applicable fees, taxes and deposits depend on the property and reservation. Review them before payment.",
              },
              {
                q: "Can I plan a longer stay?",
                a: "Tell the team your dates, guest count, preferred area and the facilities that matter to your daily routine. We can discuss the options and the details to check before you decide.",
              },
              {
                q: "Who can help with arrival or a booking question?",
                a: "Email Booking@rentpropertyuae.com or call +971 50 234 8756. For an existing reservation, include your booking reference so the team can follow the details of your enquiry.",
              },
            ]
      }
    />
  );
}

type PageKind =
  | "owners"
  | "services"
  | "about"
  | "gallery"
  | "pricing"
  | "contact"
  | "blog";
export default function PageDepth({
  page,
  ar,
}: {
  page: PageKind;
  ar: boolean;
}) {
  const b = (en: string, a: string) => (ar ? a : en);
  if (page === "owners")
    return (
      <>
        <PhotoEssay
          dark
          title={b("A home is more than its address.", "البيت أكثر من عنوان.")}
          body={[
            b(
              "Your property has a character of its own. Light, layout, furnishings and the way it is presented all shape the guest’s first impression. A useful conversation starts with understanding what makes your home different.",
              "لعقارك شخصيته الخاصة. الضوء والتخطيط والأثاث وطريقة التقديم تصنع الانطباع الأول للضيف. تبدأ المناقشة المفيدة بفهم ما يميز بيتك.",
            ),
            b(
              "We look at the experience as a whole: how a guest discovers the home, how it is prepared, and how the practical details are communicated. The right management arrangement begins with a clear, property-specific scope.",
              "ننظر إلى التجربة كاملة: اكتشاف العقار وتجهيزه وتوضيح التفاصيل العملية. ويبدأ نموذج الإدارة المناسب بنطاق واضح يخص عقارك.",
            ),
          ]}
          photos={[
            {
              src: photos.chair,
              alt: b(
                "Thoughtful furnishing and natural light",
                "أثاث مدروس وضوء طبيعي",
              ),
            },
            {
              src: photos.bed,
              alt: b("A carefully arranged bedroom", "غرفة نوم مرتبة"),
            },
            {
              src: photos.kitchen,
              alt: b("Everyday kitchen details", "تفاصيل المطبخ اليومية"),
            },
          ]}
        />
        <PracticalSteps
          title={b(
            "From a first conversation to a clear plan.",
            "من المحادثة الأولى إلى خطة واضحة.",
          )}
          intro={b(
            "Before a property becomes a stay, we agree what looking after it should mean.",
            "قبل أن يصبح العقار وجهة للإقامة، نتفق على معنى العناية به.",
          )}
          items={[
            {
              title: b("Tell us about your home.", "حدثنا عن بيتك."),
              body: b(
                "Share the area, property type, bedroom count, current condition and your preferred timeline. Photographs and a brief outline of your priorities help us make the first conversation specific to you.",
                "شارك المنطقة ونوع العقار وعدد غرف النوم وحالته الحالية والجدول الزمني الذي تفكر فيه. تساعد الصور وأولوياتك في جعل النقاش مناسباً لك.",
              ),
              src: "/areas/business-bay.webp",
              alt: b(
                "Residential towers in Business Bay",
                "أبراج سكنية في الخليج التجاري",
              ),
            },
            {
              title: b("Agree the details.", "اتفق على التفاصيل."),
              body: b(
                "Discuss preparation, guest care, cleaning and maintenance coordination. Ask how fees, owner responsibilities, availability and reporting will work. Confirm the agreed scope and terms in writing before committing.",
                "ناقش التجهيز والعناية بالضيف وتنسيق النظافة والصيانة. استوضح الرسوم ومسؤوليات المالك والتوافر والتقارير، وأكد النطاق والشروط كتابياً قبل الالتزام.",
              ),
              src: photos.chair,
              alt: b("A furnished interior detail", "تفصيل من مساحة مؤثثة"),
              href: "/pricing",
              label: b("Understand the arrangement", "افهم نموذج الإدارة"),
            },
            {
              title: b("Bring the home together.", "اجمع تفاصيل البيت."),
              body: b(
                "Prepare the property information, photographs and documents requested during onboarding. Keep a shared understanding of the home’s readiness and the next steps. Your owner account is the place to review the information made available to you.",
                "جهز معلومات العقار وصوره والمستندات المطلوبة خلال التسجيل. اتفق على حالة الجاهزية والخطوات التالية، وراجع المعلومات المتاحة لك من حساب المالك.",
              ),
              src: photos.bed,
              alt: b(
                "A bedroom ready for presentation",
                "غرفة نوم جاهزة للتقديم",
              ),
              href: "/signup?role=vendor",
              label: b("Start your owner profile", "ابدأ ملف المالك"),
            },
          ]}
        />
        <EditorialFaq
          title={b("A few things owners ask us.", "أسئلة يطرحها الملاك.")}
          items={[
            {
              q: b(
                "What should I share before we speak?",
                "ماذا أشارك قبل المحادثة؟",
              ),
              a: b(
                "The property’s area, size, condition, furnishing status and your goals are a good starting point. Include any dates when the home needs to remain available for your own use.",
                "ابدأ بمنطقة العقار ومساحته وحالته وتأثيثه وأهدافك، وأضف التواريخ التي تحتاج فيها إلى استخدامه شخصياً.",
              ),
            },
            {
              q: b(
                "Is the management fee the same for every property?",
                "هل رسوم الإدارة واحدة لكل العقارات؟",
              ),
              a: b(
                "Scope and fees depend on the property and the services agreed. Ask for a written breakdown of the arrangement and responsibilities rather than assuming a standard package applies.",
                "يعتمد النطاق والرسوم على العقار والخدمات المتفق عليها. اطلب شرحاً مكتوباً للرسوم والمسؤوليات بدلاً من افتراض تطبيق باقة موحدة.",
              ),
            },
            {
              q: b(
                "How do we discuss maintenance and preparation?",
                "كيف نناقش الصيانة والتجهيز؟",
              ),
              a: b(
                "Use the initial conversation to agree how work is coordinated, which decisions need your approval and how costs are communicated. These details should form part of the arrangement for your home.",
                "اتفق خلال المناقشة الأولى على تنسيق العمل والقرارات التي تحتاج موافقتك وطريقة إبلاغك بالتكاليف. يجب أن تكون هذه التفاصيل جزءاً من اتفاق عقارك.",
              ),
            },
            {
              q: b("Where do I begin?", "من أين أبدأ؟"),
              a: b(
                "Send an owner enquiry through the contact page, or create an owner profile. Share a little about the property so the team can help you identify the next step.",
                "أرسل استفسار مالك من صفحة التواصل أو أنشئ ملف مالك، وشارك معلومات أولية عن العقار لتحديد الخطوة التالية.",
              ),
            },
          ]}
        />
        <ConnectedPaths ar={ar} owner />
      </>
    );
  if (page === "services")
    return (
      <>
        <PhotoEssay
          title={b(
            "The smallest details leave the longest impression.",
            "أصغر التفاصيل تترك الأثر الأطول.",
          )}
          body={[
            b(
              "A clear surface. A comfortable place to sit. A room that makes sense as soon as you enter it. Hospitality is felt through small details that work together, rather than through a long list of promises.",
              "سطح مرتب ومكان مريح للجلوس وغرفة يسهل فهم تفاصيلها منذ الدخول. يظهر حسن الضيافة في تفاصيل صغيرة تتكامل، لا في قائمة طويلة من الوعود.",
            ),
            b(
              "Preparation, property care and communication each play a different part. The services agreed for a home should support the experience of staying there, from the first questions to the last day.",
              "للتجهيز والعناية بالعقار والتواصل أدوار مختلفة. يجب أن تدعم الخدمات المتفق عليها تجربة الإقامة من الاستفسار الأول إلى اليوم الأخير.",
            ),
          ]}
          photos={[
            {
              src: photos.bath,
              alt: b("A clean, bright bathroom", "حمام نظيف ومضيء"),
            },
            {
              src: photos.breakfast,
              alt: b("An inviting dining corner", "ركن طعام مريح"),
            },
            {
              src: photos.chair,
              alt: b(
                "Furnishing details in natural light",
                "تفاصيل أثاث في ضوء طبيعي",
              ),
            },
          ]}
        />
        <PracticalSteps
          title={b("Care has a rhythm of its own.", "للعناية إيقاعها الخاص.")}
          intro={b(
            "The work behind the room changes as a stay moves from preparation to arrival and beyond.",
            "يتغير العمل وراء الغرفة مع انتقال الإقامة من التجهيز إلى الوصول وما بعده.",
          )}
          items={[
            {
              title: b("Before the stay.", "قبل الإقامة."),
              body: b(
                "Property presentation, cleaning coordination and readiness checks help prepare a home for its next guests. The details are specific to the property and the agreed operating scope.",
                "يساعد تقديم العقار وتنسيق النظافة ومراجعة الجاهزية في تجهيزه لضيوفه القادمين. تختلف التفاصيل بحسب العقار ونطاق العمل المتفق عليه.",
              ),
              src: photos.bed,
              alt: b("Freshly arranged bedding", "سرير مرتب"),
            },
            {
              title: b("At the threshold.", "عند الوصول."),
              body: b(
                "Useful arrival information makes the first moments easier. Keep the check-in instructions for your reservation, confirm any timing questions and let the team know if your plans change.",
                "تجعل معلومات الوصول الواضحة اللحظات الأولى أسهل. احتفظ بتعليمات الدخول الخاصة بحجزك وأكد أي أسئلة عن التوقيت وأبلغ الفريق إذا تغيرت خططك.",
              ),
              src: photos.chair,
              alt: b("A welcoming interior corner", "ركن داخلي مريح"),
            },
            {
              title: b("While life happens.", "أثناء الإقامة."),
              body: b(
                "Questions and property issues need a clear point of contact. Share the booking reference and a description of what you need so the team can understand the situation and coordinate the next step.",
                "تحتاج الأسئلة وملاحظات العقار إلى جهة تواصل واضحة. شارك مرجع الحجز ووصف ما تحتاج إليه ليفهم الفريق الحالة وينسق الخطوة التالية.",
              ),
              src: photos.kitchen,
              alt: b(
                "A kitchen in an everyday living space",
                "مطبخ للحياة اليومية",
              ),
              href: "/contact",
              label: b("Speak with the team", "تحدث مع الفريق"),
            },
          ]}
        />
        <GuestQuestions ar={ar} />
        <ConnectedPaths ar={ar} />
      </>
    );
  if (page === "about")
    return (
      <>
        <CityToRoom ar={ar} />
        <PhotoEssay
          dark
          title={b("Two sides of the same home.", "جانبان للبيت نفسه.")}
          body={[
            b(
              "For the guest, a home is part of a journey. For the owner, it is a place with a story, responsibilities and potential. We are interested in what happens when those two perspectives are considered together.",
              "للضيف، البيت جزء من رحلة. وللمالك، هو مكان له قصة ومسؤوليات وإمكانات. نهتم بما يحدث حين نجمع بين هاتين النظرتين.",
            ),
            b(
              "Thoughtful presentation helps people imagine being there. Practical preparation helps the stay work. Clear communication connects the two. This is the approach behind Laugh & Lodge.",
              "يساعد التقديم المدروس الناس على تخيل الإقامة، ويجعل التجهيز العملي التجربة أفضل. ويربط التواصل الواضح بينهما. هذا هو النهج وراء لاف آند لودج.",
            ),
          ]}
          photos={[
            {
              src: photos.chair,
              alt: b("A personal interior detail", "تفصيل داخلي ذو شخصية"),
            },
            {
              src: "/areas/dubai-creek-harbour.webp",
              alt: b("Dubai from the waterfront", "دبي من الواجهة المائية"),
            },
            {
              src: photos.evening,
              alt: b(
                "A living space after the day ends",
                "مساحة معيشة بعد نهاية اليوم",
              ),
            },
          ]}
        />
        <GuestPlanning ar={ar} />
        <ConnectedPaths ar={ar} />
      </>
    );
  if (page === "gallery")
    return (
      <>
        <PhotoEssay
          title={b(
            "Look closer. The feeling is in the details.",
            "انظر عن قرب. الإحساس في التفاصيل.",
          )}
          body={[
            b(
              "A room is more than one wide photograph. The edge of a table, the way light meets a wall, the balance between texture and open space: these are the details that give an interior its own character.",
              "الغرفة أكثر من صورة واسعة واحدة. حافة طاولة، والتقاء الضوء بالجدار، والتوازن بين الملمس والمساحة المفتوحة؛ تفاصيل تمنح المكان شخصيته.",
            ),
            b(
              "Use this archive to notice what you respond to. Then explore actual property listings to check the home, facilities, location and availability for your trip. These photographs are editorial inspiration, not a promise of a particular booking.",
              "استخدم المعرض لتكتشف ما تحبه، ثم استكشف العقارات الفعلية لمراجعة المساحة والمرافق والموقع والتوافر. الصور للإلهام وليست وعداً بحجز محدد.",
            ),
          ]}
          photos={[
            {
              src: photos.chair,
              alt: b(
                "Color and texture in a sitting corner",
                "ألوان وملمس في ركن جلوس",
              ),
            },
            {
              src: photos.bath,
              alt: b(
                "Natural light on bathroom surfaces",
                "ضوء طبيعي على أسطح الحمام",
              ),
            },
            {
              src: photos.kitchen,
              alt: b(
                "A kitchen designed around daily routines",
                "مطبخ للروتين اليومي",
              ),
            },
          ]}
        />
        <HomeStayStyles ar={ar} />
        <GuestQuestions ar={ar} />
        <ConnectedPaths ar={ar} />
      </>
    );
  if (page === "pricing")
    return (
      <>
        <GuestPlanning ar={ar} />
        <EditorialFaq
          title={b("Clarity before commitment.", "وضوح قبل الالتزام.")}
          items={[
            {
              q: b(
                "Why can the rate change between dates?",
                "لماذا يختلف السعر بين التواريخ؟",
              ),
              a: b(
                "A quote is specific to the property, dates and guest details you select. Search with the final travel details and use the current booking summary when making a decision.",
                "يرتبط عرض السعر بالعقار والتواريخ وبيانات الضيوف. استخدم تفاصيل الرحلة النهائية وملخص الحجز الحالي عند اتخاذ قرارك.",
              ),
            },
            {
              q: b(
                "Are additional amounts included?",
                "هل يتضمن السعر مبالغ إضافية؟",
              ),
              a: b(
                "Check the quote for applicable cleaning charges, taxes, fees and any deposit requirements. Read the breakdown rather than treating a nightly amount as the entire cost.",
                "راجع عرض السعر لمعرفة رسوم التنظيف والضرائب والرسوم والتأمين المطبق. اقرأ التفصيل بدلاً من اعتبار السعر الليلي هو التكلفة الكاملة.",
              ),
            },
            {
              q: b(
                "Where do I find the cancellation terms?",
                "أين أجد شروط الإلغاء؟",
              ),
              a: b(
                "Review the cancellation policy and the terms shown for your reservation before confirming. The outcome of a cancellation depends on the policy that applies to the booking.",
                "راجع سياسة الإلغاء والشروط الخاصة بحجزك قبل التأكيد. تعتمد نتيجة الإلغاء على السياسة المطبقة على الحجز.",
              ),
            },
            {
              q: b(
                "Can an owner get a tailored proposal?",
                "هل يمكن للمالك الحصول على عرض مناسب لعقاره؟",
              ),
              a: b(
                "Share the property details and the service scope you have in mind. Discuss fees and responsibilities with the team and ask for the agreed arrangement in writing.",
                "شارك تفاصيل العقار ونطاق الخدمات الذي تفكر فيه، وناقش الرسوم والمسؤوليات مع الفريق واطلب الاتفاق كتابياً.",
              ),
            },
          ]}
        />
        <ConnectedPaths ar={ar} />
      </>
    );
  if (page === "contact")
    return (
      <>
        <PracticalSteps
          title={b(
            "A little context makes a better conversation.",
            "قليل من التفاصيل يصنع محادثة أفضل.",
          )}
          intro={b(
            "Share what matters to you. We’ll have a clearer place to begin.",
            "شارك ما يهمك لنبدأ من مكان أوضح.",
          )}
          items={[
            {
              title: b("Planning a stay?", "تخطط لإقامة؟"),
              body: b(
                "Tell us your dates, how many people are coming, preferred areas and the facilities you need. If you have seen a particular home, include its name or link.",
                "أخبرنا بالتواريخ وعدد الضيوف والمناطق المفضلة والمرافق المطلوبة. إذا أعجبك عقار محدد، أضف اسمه أو رابطه.",
              ),
              src: "/areas/dubai-marina.webp",
              alt: b(
                "Dubai Marina waterfront",
                "الواجهة المائية في دبي مارينا",
              ),
            },
            {
              title: b("Already on your way?", "لديك حجز قائم؟"),
              body: b(
                "Include your booking reference and the question you need help with. For an arrival query, share your expected arrival time and refer to the instructions supplied with your reservation.",
                "أضف مرجع الحجز والسؤال الذي تحتاج المساعدة بشأنه. ولأسئلة الوصول، شارك الوقت المتوقع وراجع التعليمات المرسلة مع الحجز.",
              ),
              src: photos.breakfast,
              alt: b(
                "A place to arrive and settle in",
                "مساحة للوصول والاستقرار",
              ),
            },
            {
              title: b("Thinking about your property?", "تفكر في عقارك؟"),
              body: b(
                "Share the location, size, condition and what you would like help with. A few photographs and your preferred timeline help us understand the property before we speak.",
                "شارك الموقع والمساحة والحالة وما تحتاج المساعدة فيه. تساعد الصور والجدول الزمني المفضل في فهم العقار قبل المحادثة.",
              ),
              src: photos.chair,
              alt: b("Details of a furnished home", "تفاصيل بيت مؤثث"),
              href: "/owners",
              label: b("Explore the owner approach", "اكتشف نهج الملاك"),
            },
          ]}
        />
        <GuestQuestions ar={ar} />
      </>
    );
  return (
    <>
      <CityFieldNotes ar={ar} />
      <ConnectedPaths ar={ar} />
    </>
  );
}
