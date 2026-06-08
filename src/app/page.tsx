import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#1a1a2e', background: '#fff' }}>
      <style>{`
        .lp-nav-inner { max-width: 1100px; margin: 0 auto; padding: 0 40px; display: flex; justify-content: space-between; align-items: center; }
        .lp-inner { max-width: 680px; margin: 0 auto; padding: 0 24px; }
        .lp-wide { max-width: 1100px; margin: 0 auto; padding: 0 40px; }
        .lp-features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .lp-subjects-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .lp-pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
        .lp-steps-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .lp-testimonials-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .lp-faq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 40px; }
        @media (max-width: 768px) {
          .lp-nav-inner { padding: 0 20px; }
          .lp-wide { padding: 0 20px; }
          .lp-features-grid { grid-template-columns: 1fr; gap: 20px; }
          .lp-subjects-grid { grid-template-columns: 1fr; }
          .lp-pricing-grid { grid-template-columns: 1fr; }
          .lp-steps-grid { grid-template-columns: 1fr; gap: 20px; }
          .lp-testimonials-grid { grid-template-columns: 1fr; }
          .lp-faq-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)', position: 'sticky', top: 0, background: '#fff', zIndex: 100, padding: '16px 0' }}>
        <div className="lp-nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🎓</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#534AB7', lineHeight: 1 }}>Distinction</div>
              <div style={{ fontSize: 11, color: '#888780', lineHeight: 1 }}>PLE Tutor</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link href="/dashboard" style={{ fontSize: 14, color: '#534AB7', textDecoration: 'none', fontWeight: 500 }}>Dashboard</Link>
            <Link href="/login" style={{ fontSize: 14, color: '#5F5E5A', textDecoration: 'none' }}>Sign in</Link>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 500, color: '#fff', background: '#534AB7', padding: '8px 18px', borderRadius: 20, textDecoration: 'none' }}>
              Start free →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background: 'linear-gradient(135deg, #534AB7 0%, #7F77DD 100%)', color: '#fff', padding: '72px 24px 80px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 500, marginBottom: 24 }}>
            🇺🇬 Built for Uganda · P7 PLE Preparation
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 700, lineHeight: 1.2, marginBottom: 20 }}>
            Help your child achieve a Distinction in PLE
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', opacity: 0.88, lineHeight: 1.7, marginBottom: 36, maxWidth: 560, margin: '0 auto 36px' }}>
            Uganda&apos;s first AI-powered P7 tutor with adaptive learning. Personalised practice in Maths, English and Science — identifying your child&apos;s weak areas and focusing on them until mastered.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login" style={{ fontSize: 16, fontWeight: 600, color: '#534AB7', background: '#fff', padding: '15px 32px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              Start 3-day free trial
            </Link>
            <a href="#how-it-works" style={{ fontSize: 16, fontWeight: 500, color: '#fff', background: 'rgba(255,255,255,0.2)', padding: '15px 32px', borderRadius: 12, textDecoration: 'none' }}>
              See how it works
            </a>
          </div>
          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 16 }}>No credit card needed · Cancel any time</p>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginTop: 56, flexWrap: 'wrap' }}>
            {[
              { value: '200+', label: 'PLE-style questions' },
              { value: '3', label: 'PLE subjects covered' },
              { value: 'AI', label: 'Powered adaptive tutor' },
              { value: '24/7', label: 'Available any time' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{s.value}</div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section style={{ padding: '72px 0' }}>
        <div className="lp-inner">
          <div style={{ fontSize: 12, fontWeight: 600, color: '#534AB7', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>The Challenge</div>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, marginBottom: 20, lineHeight: 1.3 }}>
            P7 is the most important exam of a child&apos;s primary education
          </h2>
          <p style={{ fontSize: 15, color: '#5F5E5A', lineHeight: 1.85, marginBottom: 16 }}>
            The Primary Leaving Examination determines which secondary school your child attends. Yet most P7 students lack access to personalised academic support — class sizes are large, teacher time is limited, and revision materials are generic rather than tailored to each child&apos;s specific gaps.
          </p>
          <p style={{ fontSize: 15, color: '#5F5E5A', lineHeight: 1.85 }}>
            Distinction PLE Tutor changes that. For less than the cost of one private tuition session, your child gets a dedicated AI tutor available every day — adapting to their specific weaknesses and building their confidence question by question.
          </p>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ background: '#F8F9FF', padding: '72px 0' }} id="how-it-works">
        <div className="lp-wide">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#534AB7', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>What it does</div>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, lineHeight: 1.3 }}>
              Everything a P7 student needs — in one app
            </h2>
          </div>

          <div className="lp-features-grid">
            {[
              { icon: '🎯', title: 'Adaptive Learning', desc: 'The app identifies your child\'s weak areas and automatically focuses practice on them — while keeping strong areas sharp. Every session is personalised, not random.', color: '#534AB7', bg: '#EEEDFE' },
              { icon: '🔢', title: 'Maths Word Problems — Broken Down', desc: 'Word problems lose more marks than any other topic. Our step-by-step scaffold teaches children to understand the story, identify key numbers, choose the right operation and solve confidently.', color: '#BA7517', bg: '#FAEEDA' },
              { icon: '🤖', title: 'AI Tutor — Always Available', desc: 'Your child can ask the AI tutor any question — anytime. They can even photograph their handwritten working and get specific feedback on exactly where they went wrong.', color: '#1D9E75', bg: '#E1F5EE' },
              { icon: '📝', title: 'Timed Mock Exams', desc: 'Full PLE-style mock papers with a countdown timer and automatic grade projection (D1–D9). Students build exam confidence and parents see realistic grade predictions.', color: '#D85A30', bg: '#FAECE7' },
              { icon: '📊', title: 'Parent Dashboard', desc: 'A dedicated view showing your child\'s mastery per subject, weak areas that need urgent attention, recent session history and their projected PLE grade — updated in real time.', color: '#534AB7', bg: '#EEEDFE' },
              { icon: '🏆', title: 'Gamified & Encouraging', desc: 'Points, streaks, achievement badges and grade projections keep children motivated. Short 20-40 minute sessions fit around school — no overwhelming marathon study sessions.', color: '#1D9E75', bg: '#E1F5EE' },
            ].map(f => (
              <div key={f.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', background: '#fff', borderRadius: 16, padding: 20, border: '0.5px solid rgba(0,0,0,0.07)' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: f.color, marginBottom: 6 }}>{f.title}</div>
                  <div style={{ fontSize: 14, color: '#5F5E5A', lineHeight: 1.7 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW TO USE ── */}
      <section style={{ padding: '72px 0' }}>
        <div className="lp-wide">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#534AB7', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Getting started</div>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, lineHeight: 1.3 }}>
              Up and running in under 2 minutes
            </h2>
          </div>
          <div className="lp-steps-grid">
            {[
              { step: '1', title: 'Create your parent account', desc: 'Sign up with your email address. No technical knowledge needed.' },
              { step: '2', title: 'Add your child\'s profile', desc: 'Enter their name, school and PLE year. Choose an avatar. Done.' },
              { step: '3', title: 'Start the first session', desc: 'Tap any subject card to begin. The app learns from the very first question answered.' },
              { step: '4', title: 'Check progress any time', desc: 'Visit the Parent Dashboard to see mastery levels, weak areas and projected grade — updated after every session.' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#534AB7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                  {s.step}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 14, color: '#5F5E5A', lineHeight: 1.65 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUBJECTS ── */}
      <section style={{ background: '#F8F9FF', padding: '72px 0' }}>
        <div className="lp-wide">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#534AB7', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Curriculum</div>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, lineHeight: 1.3 }}>
              Aligned to the Uganda NCDC P7 syllabus
            </h2>
          </div>
          <div className="lp-subjects-grid">
            {[
              { icon: '🔢', name: 'Mathematics', color: '#BA7517', bg: '#FAEEDA', topics: ['Fractions & Decimals', 'Ratio & Proportion', 'Percentages', 'LCM & HCF', 'Geometry & Area', 'Money & Financial Maths', 'Word Problems', 'Statistics & Data', 'Algebra Basics', 'Long Division', 'Time & Speed', 'Measurement'] },
              { icon: '📖', name: 'English Language', color: '#1D9E75', bg: '#E1F5EE', topics: ['Grammar & Tenses', 'Parts of Speech', 'Vocabulary & Idioms', 'Reading Comprehension', 'Punctuation & Spelling', 'Direct & Indirect Speech', 'Sentence Construction', 'Composition Writing', 'Letter Writing', 'Oral Literature'] },
              { icon: '🔬', name: 'Integrated Science', color: '#534AB7', bg: '#EEEDFE', topics: ['Food Chains & Webs', 'Human Body Systems', 'Living Things', 'Environment & Ecology', 'States of Matter', 'Health & Nutrition', 'Plants & Reproduction', 'Soil & Agriculture', 'Water & Weather', 'Energy & Forces'] },
            ].map(s => (
              <div key={s.name} style={{ background: '#fff', borderRadius: 16, padding: 20, border: '0.5px solid rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{s.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: s.color }}>{s.name}</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {s.topics.map(t => (
                    <span key={t} style={{ fontSize: 11, background: s.bg, color: s.color, padding: '4px 10px', borderRadius: 20, fontWeight: 500 }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ENDORSEMENT ── */}
      <section style={{ padding: '72px 0' }}>
        <div className="lp-wide">
          <div style={{ fontSize: 12, fontWeight: 600, color: '#534AB7', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 24, textAlign: 'center' }}>Professional Endorsement</div>

          <div style={{ background: '#F8F9FF', border: '2px dashed rgba(83,74,183,0.25)', borderRadius: 16, padding: 32, textAlign: 'center', maxWidth: 500, margin: '0 auto 32px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#534AB7', marginBottom: 8 }}>Endorsement Coming Soon</div>
            <div style={{ fontSize: 13, color: '#888780', lineHeight: 1.6 }}>
              We are working with leading Ugandan education professionals to review and endorse Distinction PLE Tutor. Their testimonial will appear here shortly.
            </div>
          </div>

          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', marginBottom: 20, textAlign: 'center' }}>What parents are saying</div>
          <div className="lp-testimonials-grid">
            {[
              { quote: 'My daughter used to dread maths word problems. After two weeks on the app, she is actually excited to practise. Her teacher noticed the improvement.', name: 'Parent, Kampala', initials: 'NK' },
              { quote: 'The parent dashboard shows me exactly which topics need work. I feel like I am finally involved in my son\'s revision — even though I am not a science expert myself.', name: 'Parent, Wakiso', initials: 'JO' },
            ].map((t, i) => (
              <div key={i} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 24, color: '#534AB7', marginBottom: 10 }}>&ldquo;</div>
                <p style={{ fontSize: 14, color: '#5F5E5A', lineHeight: 1.75, marginBottom: 16, fontStyle: 'italic' }}>{t.quote}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#534AB7' }}>{t.initials}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ background: '#F8F9FF', padding: '72px 0' }}>
        <div className="lp-wide">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#534AB7', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Pricing</div>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, marginBottom: 8 }}>Simple, affordable pricing</h2>
            <p style={{ fontSize: 15, color: '#5F5E5A' }}>Less than one private tuition session — for unlimited daily access all term.</p>
          </div>

          <div className="lp-pricing-grid" style={{ maxWidth: 800, margin: '0 auto' }}>
            {/* Free tier */}
            <div style={{ background: '#fff', borderRadius: 20, padding: 28, border: '0.5px solid rgba(0,0,0,0.10)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Free Trial</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>3 days <span style={{ fontSize: 16, fontWeight: 400, color: '#888780' }}>free</span></div>
              <div style={{ fontSize: 13, color: '#5F5E5A', marginBottom: 20 }}>Full access — no payment needed to start</div>
              {['All subjects and topics', 'AI Tutor with image upload', 'Mock exams', 'Parent dashboard', 'Adaptive learning'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ color: '#1D9E75', fontWeight: 600 }}>✓</span>
                  <span style={{ fontSize: 14, color: '#5F5E5A' }}>{f}</span>
                </div>
              ))}
              <Link href="/login" style={{ display: 'block', textAlign: 'center', marginTop: 24, padding: '13px', background: '#F1EFE8', borderRadius: 10, fontSize: 15, fontWeight: 600, color: '#534AB7', textDecoration: 'none' }}>
                Start free trial
              </Link>
            </div>

            {/* Premium tier */}
            <div style={{ background: '#534AB7', borderRadius: 20, padding: 28, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Premium</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#fff', marginBottom: 4 }}>UGX 25,000 <span style={{ fontSize: 16, fontWeight: 400, opacity: 0.75 }}>/month</span></div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>Pay via MTN or Airtel Mobile Money</div>
              {['All free trial features included', 'Unlimited daily practice sessions', 'Full AI Tutor with image upload', 'Complete mock exam library', 'Detailed progress & weak area reports', 'Up to 3 student profiles'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ color: '#FFD166', fontWeight: 600 }}>✓</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>{f}</span>
                </div>
              ))}
              <Link href="/login" style={{ display: 'block', textAlign: 'center', marginTop: 24, padding: '13px', background: '#fff', borderRadius: 10, fontSize: 15, fontWeight: 600, color: '#534AB7', textDecoration: 'none' }}>
                Start free trial →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: '72px 0' }}>
        <div className="lp-wide">
          <div style={{ fontSize: 12, fontWeight: 600, color: '#534AB7', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 40, textAlign: 'center' }}>Frequently asked questions</div>
          <div className="lp-faq-grid">
            {[
              { q: 'Does my child need a smartphone?', a: 'Yes — the app works on any Android or iPhone with a browser. No download needed, it runs directly from the web.' },
              { q: 'What if my child has never used an app like this before?', a: 'The app is designed for 11-13 year olds. The interface is colourful, simple and encouraging. Most children are comfortable within minutes.' },
              { q: 'How much time should my child spend on the app each day?', a: 'We recommend 20-40 minutes per day. Short, consistent sessions are far more effective than occasional long sessions.' },
              { q: 'Can I see what my child is studying?', a: 'Yes — the Parent Dashboard shows exactly which subjects and topics they have practised, their accuracy, their weak areas, and their projected PLE grade.' },
              { q: 'Is the content aligned to UNEB and the Uganda curriculum?', a: 'Yes. All questions are written for the P7 PLE syllabus set by UNEB and the NCDC, with authentic Ugandan contexts throughout.' },
              { q: 'What happens after the 3-day free trial?', a: 'You will receive a prompt to subscribe at UGX 25,000 per month via Mobile Money. Your child\'s progress and data are always saved.' },
            ].map((faq, i) => (
              <div key={i} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)', paddingBottom: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{faq.q}</div>
                <div style={{ fontSize: 14, color: '#5F5E5A', lineHeight: 1.7 }}>{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ background: 'linear-gradient(135deg, #534AB7 0%, #7F77DD 100%)', padding: '72px 24px', textAlign: 'center', color: '#fff' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, marginBottom: 16, lineHeight: 1.3 }}>
            Give your child the best chance at a Distinction
          </div>
          <p style={{ fontSize: 16, opacity: 0.85, marginBottom: 36, lineHeight: 1.7 }}>
            Join families across Uganda who are using Distinction PLE Tutor to prepare their children for the most important exam of primary school.
          </p>
          <Link href="/login" style={{ display: 'inline-block', fontSize: 17, fontWeight: 600, color: '#534AB7', background: '#fff', padding: '16px 40px', borderRadius: 14, textDecoration: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            Start your 3-day free trial →
          </Link>
          <p style={{ fontSize: 12, opacity: 0.65, marginTop: 16 }}>No credit card · No commitment · Cancel any time</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '32px 40px', borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🎓</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#534AB7' }}>Distinction PLE Tutor</span>
          </div>
          <p style={{ fontSize: 12, color: '#888780' }}>
            Helping Uganda&apos;s P7 students achieve their best in the Primary Leaving Examination.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link href="/dashboard" style={{ fontSize: 12, color: '#534AB7', textDecoration: 'none' }}>Dashboard</Link>
            <Link href="/login" style={{ fontSize: 12, color: '#534AB7', textDecoration: 'none' }}>Sign in</Link>
            <Link href="/login" style={{ fontSize: 12, color: '#534AB7', textDecoration: 'none' }}>Create account</Link>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <p style={{ fontSize: 11, color: '#888780' }}>© 2025 Distinction PLE Tutor. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
