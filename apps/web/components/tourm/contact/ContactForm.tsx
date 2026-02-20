"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { createContactSubmission } from "@/lib/api/contact";
import type { AppLocale } from "@/lib/i18n/config";

type FormState = "idle" | "sending" | "sent";
type ContactTopic = "BOOKING" | "OWNERS" | "PARTNERS" | "OTHER";

type TopicOption = {
  value: ContactTopic;
  label: string;
};

type ContactFormCopy = {
  sectionEyebrow: string;
  sectionTitle: string;
  sectionBody: string;
  includeDetailsTitle: string;
  includeDetails: string[];
  sentTitle: string;
  sentBody: string;
  sendAnother: string;
  labels: {
    name: string;
    email: string;
    phone: string;
    topic: string;
    message: string;
  };
  placeholders: {
    name: string;
    email: string;
    phone: string;
    message: string;
  };
  topics: TopicOption[];
  sending: string;
  sendMessage: string;
  submitNote: string;
  fallbackError: string;
};

const COPY: Record<AppLocale, ContactFormCopy> = {
  en: {
    sectionEyebrow: "Message us",
    sectionTitle: "Send details once and let us route it correctly",
    sectionBody: "Add enough context in your first message so we can respond quickly with accurate next steps.",
    includeDetailsTitle: "Include these details for faster response",
    includeDetails: [
      "Booking inquiry: travel dates, guest count, and property link",
      "Owner inquiry: area, unit type, and preferred management model",
      "Support inquiry: booking ID and a clear issue summary",
    ],
    sentTitle: "Message sent successfully",
    sentBody:
      "Thank you. Our team will review and respond as soon as possible. For urgent matters, call +971 50 234 8756.",
    sendAnother: "Send another message",
    labels: {
      name: "Name",
      email: "Email",
      phone: "Phone",
      topic: "Topic",
      message: "Message",
    },
    placeholders: {
      name: "Your name",
      email: "you@example.com",
      phone: "+971...",
      message: "Tell us what you need help with.",
    },
    topics: [
      { value: "BOOKING", label: "Booking inquiry" },
      { value: "OWNERS", label: "Owner onboarding" },
      { value: "PARTNERS", label: "Partnership" },
      { value: "OTHER", label: "Other" },
    ],
    sending: "Sending...",
    sendMessage: "Send message",
    submitNote: "By sending this message, you agree that we may contact you regarding your inquiry.",
    fallbackError: "Failed to send message",
  },
  ar: {
    sectionEyebrow: "راسلنا",
    sectionTitle: "أرسل التفاصيل مرة واحدة وسنتولى توجيهها بدقة",
    sectionBody: "أضف سياقاً كافياً في رسالتك الأولى لنرد بسرعة وبخطوات تالية واضحة.",
    includeDetailsTitle: "أضف هذه المعلومات لتسريع الاستجابة",
    includeDetails: [
      "استفسار حجز: تواريخ السفر وعدد الضيوف ورابط العقار",
      "استفسار مالك: المنطقة ونوع الوحدة ونموذج الإدارة المفضل",
      "استفسار دعم: رقم الحجز وملخص واضح للمشكلة",
    ],
    sentTitle: "تم إرسال الرسالة بنجاح",
    sentBody: "شكراً لك. سيقوم فريقنا بالمراجعة والرد في أقرب وقت. للحالات العاجلة اتصل على +971 50 234 8756.",
    sendAnother: "إرسال رسالة أخرى",
    labels: {
      name: "الاسم",
      email: "البريد الإلكتروني",
      phone: "الهاتف",
      topic: "الموضوع",
      message: "الرسالة",
    },
    placeholders: {
      name: "اسمك",
      email: "you@example.com",
      phone: "+971...",
      message: "أخبرنا بما تحتاج إليه.",
    },
    topics: [
      { value: "BOOKING", label: "استفسار حجز" },
      { value: "OWNERS", label: "تسجيل مالك" },
      { value: "PARTNERS", label: "شراكة" },
      { value: "OTHER", label: "أخرى" },
    ],
    sending: "جارٍ الإرسال...",
    sendMessage: "إرسال الرسالة",
    submitNote: "بإرسال هذه الرسالة، فإنك توافق على أن نتواصل معك بخصوص استفسارك.",
    fallbackError: "تعذر إرسال الرسالة",
  },
};

const INPUT_CLASS =
  "mt-2 w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-primary shadow-[0_8px_22px_rgba(15,23,42,0.06)] outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-200/30 placeholder:text-secondary/45";

export default function ContactForm(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [topic, setTopic] = useState<ContactTopic>("BOOKING");
  const [message, setMessage] = useState<string>("");

  const canSend = useMemo(() => {
    if (state !== "idle") return false;
    if (name.trim().length < 2) return false;
    if (!email.includes("@")) return false;
    if (message.trim().length < 12) return false;
    return true;
  }, [email, message, name, state]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;

    setError(null);
    setState("sending");
    try {
      await createContactSubmission({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        topic,
        message: message.trim(),
      });
      setState("sent");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : copy.fallbackError);
      setState("idle");
    }
  }

  const arrowClass = props.locale === "ar" ? "h-4 w-4 rotate-180" : "h-4 w-4";

  return (
    <section id="contact-form" className="relative w-full scroll-mt-24 py-14 sm:py-18">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">{copy.sectionEyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">{copy.sectionTitle}</h2>
            <p className="mt-2 text-sm text-secondary/82 sm:text-base">{copy.sectionBody}</p>

            <div className="mt-6 rounded-2xl border border-indigo-100/90 bg-white/88 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-semibold text-primary">{copy.includeDetailsTitle}</p>
              <ul className="mt-4 space-y-2">
                {copy.includeDetails.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-secondary/84">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-lg bg-indigo-100">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-[2rem] border border-indigo-100/90 bg-white/88 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.10)] sm:p-8">
            {state === "sent" ? (
              <div className="rounded-2xl border border-indigo-200/85 bg-indigo-50/65 p-6">
                <p className="text-lg font-semibold text-primary">{copy.sentTitle}</p>
                <p className="mt-2 text-sm text-secondary/82">{copy.sentBody}</p>
                <button
                  type="button"
                  onClick={() => {
                    setState("idle");
                    setError(null);
                    setName("");
                    setEmail("");
                    setPhone("");
                    setTopic("BOOKING");
                    setMessage("");
                  }}
                  className="mt-6 rounded-2xl border border-indigo-200/85 bg-white px-4 py-3 text-sm font-semibold text-primary transition hover:bg-indigo-50"
                >
                  {copy.sendAnother}
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary/60">{copy.labels.name}</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder={copy.placeholders.name}
                      autoComplete="name"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary/60">{copy.labels.email}</span>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder={copy.placeholders.email}
                      autoComplete="email"
                      inputMode="email"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary/60">{copy.labels.phone}</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder={copy.placeholders.phone}
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary/60">{copy.labels.topic}</span>
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value as ContactTopic)}
                      className={INPUT_CLASS}
                    >
                      {copy.topics.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary/60">{copy.labels.message}</span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className={`${INPUT_CLASS} min-h-[140px] resize-y`}
                    placeholder={copy.placeholders.message}
                  />
                </label>

                <button
                  type="submit"
                  disabled={!canSend}
                  className={[
                    "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition",
                    canSend
                      ? "border border-indigo-300/80 bg-indigo-600 text-white hover:bg-indigo-700"
                      : "cursor-not-allowed border border-indigo-200 bg-indigo-100/70 text-indigo-300",
                  ].join(" ")}
                >
                  {state === "sending" ? copy.sending : copy.sendMessage}
                  <ArrowRight className={arrowClass} />
                </button>

                {error ? (
                  <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {error}
                  </div>
                ) : null}

                <p className="text-xs text-secondary/60">{copy.submitNote}</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
