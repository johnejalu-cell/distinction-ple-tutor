import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#1a1a2e', background: '#fff', width: '100vw', marginLeft: 'calc(-50vw + 50%)', maxWidth: '100vw', overflowX: 'hidden' }}>
      <style>{`
        .lp-nav-inner { max-width: 1100px; margin: 0 auto; padding: 0 40px; display: flex; justify-content: space-between; align-items: center; }
        .lp-wide { max-width: 1100px; margin: 0 auto; padding: 0 40px; }
        .lp-inner { max-width: 680px; margin: 0 auto; padding: 0 24px; }
        .lp-features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .lp-subjects-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .lp-pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
        .lp-steps-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .lp-faq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 40px; }
        .lp-testimonials-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .lp-nav-link { font-size: 14px; color: #534AB7; text-decoration: none; font-weight: 500; white-space: nowrap; }
        .lp-stat-card { background: rgba(255,255,255,0.12); border-radius: 16px; padding: 20px 24px; text-align: center; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); }
        @media (max-width: 768px) {
          .lp-nav-inner { padding: 0 16px; }
          .lp-wide { padding: 0 20px; }
          .lp-features-grid { grid-template-columns: 1fr; gap: 14px; }
          .lp-subjects-grid { grid-template-columns: 1fr; }
          .lp-pricing-grid { grid-template-columns: 1fr; }
          .lp-steps-grid { grid-template-columns: 1fr; gap: 20px; }
          .lp-faq-grid { grid-template-columns: 1fr; }
          .lp-testimonials-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', zIndex: 100, padding: '14px 0' }}>
        <div className="lp-nav-inner">
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>🎓</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#534AB7', lineHeight: 1.1 }}>Get Ready</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#F59E0B', lineHeight: 1.1 }}>4 PLE</div>
            </div>
          </Link>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link href="/dashboard" className="lp-nav-link">Dashboard</Link>
            <Link href="/login" className="lp-nav-link">Sign in</Link>
            <Link href="/login" style={{
              fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap',
              background: 'linear-gradient(135deg, #534AB7, #7C3AED)',
              padding: '9px 20px', borderRadius: 25, textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(83,74,183,0.4)',
            }}>
              Start free →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 40%, #4C1D95 70%, #6D28D9 100%)',
        color: '#fff', padding: '80px 24px 100px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background decorations */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, background: 'rgba(245,158,11,0.15)', borderRadius: '50%', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 250, height: 250, background: 'rgba(139,92,246,0.3)', borderRadius: '50%', filter: 'blur(50px)' }} />

        <div style={{ maxWidth: 780, margin: '0 auto', position: 'relative' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 25, padding: '7px 18px', fontSize: 13, fontWeight: 600, color: '#FCD34D', marginBottom: 28, letterSpacing: '0.3px' }}>
            🇺🇬 Built for Uganda · P7 PLE Preparation
          </div>

          {/* App name */}
          <div style={{ fontSize: 'clamp(52px, 10vw, 96px)', fontWeight: 900, lineHeight: 1, marginBottom: 8, letterSpacing: '-2px' }}>
            <span style={{ color: '#fff' }}>Get Ready </span>
            <span style={{ color: '#F59E0B' }}>4 PLE</span>
          </div>

          {/* Strapline / headline */}
          <h1 style={{ fontSize: 'clamp(18px, 3vw, 26px)', fontWeight: 400, lineHeight: 1.5, marginBottom: 32, opacity: 0.9, maxWidth: 600, margin: '0 auto 32px' }}>
            Smart AI tutoring and exam revision for PLE preparation
          </h1>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <Link href="/login" style={{
              fontSize: 17, fontWeight: 700, color: '#1E1B4B',
              background: '#F59E0B', padding: '16px 36px',
              borderRadius: 14, textDecoration: 'none',
              boxShadow: '0 8px 30px rgba(245,158,11,0.5)',
              letterSpacing: '0.2px',
            }}>
              Start 3-day free trial
            </Link>
            <a href="#how-it-works" style={{
              fontSize: 17, fontWeight: 500, color: '#fff',
              background: 'rgba(255,255,255,0.15)', padding: '16px 32px',
              borderRadius: 14, textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.3)',
            }}>
              See how it works
            </a>
          </div>
          <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 60 }}>No credit card needed · Cancel any time</p>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 700, margin: '0 auto' }}>
            {[
              { value: '300+', label: 'PLE questions' },
              { value: '3', label: 'Subjects covered' },
              { value: 'AI', label: 'Powered tutor' },
              { value: '24/7', label: 'Always available' },
            ].map(s => (
              <div key={s.label} className="lp-stat-card">
                <div style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: '#F59E0B' }}>{s.value}</div>
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 3, lineHeight: 1.3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section style={{ padding: '72px 0', background: '#FAFAFA' }}>
        <div className="lp-inner">
          <div style={{ display: 'inline-block', background: '#EEF2FF', color: '#4338CA', fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 20, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            The Challenge
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, marginBottom: 20, lineHeight: 1.25, color: '#1E1B4B' }}>
            P7 is the most important exam of a child&apos;s primary education
          </h2>
          <p style={{ fontSize: 16, color: '#5F5E5A', lineHeight: 1.85, marginBottom: 16 }}>
            The Primary Leaving Examination determines which secondary school your child attends. Yet most P7 students lack access to personalised academic support — class sizes are large, teacher time is limited, and revision materials are generic rather than tailored to each child&apos;s specific gaps.
          </p>
          <p style={{ fontSize: 16, color: '#5F5E5A', lineHeight: 1.85 }}>
            <strong style={{ color: '#534AB7' }}>Get Ready 4 PLE</strong> changes that. For less than the cost of a single exercise book per month, your child gets a dedicated AI tutor available every day — adapting to their specific weaknesses and building their confidence question by question.
          </p>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '80px 0', background: '#fff' }} id="how-it-works">
        <div className="lp-wide">
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-block', background: '#EEF2FF', color: '#4338CA', fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 20, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              What it does
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, lineHeight: 1.25, color: '#1E1B4B' }}>
              Everything a P7 student needs — in one app
            </h2>
          </div>

          <div className="lp-features-grid">
            {[
              { icon: '🎯', title: 'Adaptive Learning', desc: 'The app identifies your child\'s weak areas and automatically focuses practice on them — while keeping strong areas sharp. Every session is personalised, not random.', color: '#4338CA', bg: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)' },
              { icon: '🤖', title: 'AI Tutor — Always Available', desc: 'Your child can ask the AI tutor any question anytime. They can even photograph their handwritten working and get specific feedback on exactly where they went wrong.', color: '#059669', bg: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' },
              { icon: '🔢', title: 'Maths Word Problems', desc: 'Word problems lose more marks than any other topic. Our step-by-step scaffold teaches children to understand the story, identify key numbers and solve confidently.', color: '#D97706', bg: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)' },
              { icon: '📝', title: 'Timed Mock Exams', desc: 'Full PLE-style mock papers with a countdown timer and automatic grade projection (D1–D9). Students build exam confidence and parents see realistic grade predictions.', color: '#DC2626', bg: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)' },
              { icon: '📊', title: 'Parent Dashboard', desc: 'See exactly which subjects and topics your child has practised, their accuracy, their weak areas and their projected PLE grade — updated after every session.', color: '#7C3AED', bg: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)' },
              { icon: '📖', title: 'Unlimited Revision Mode', desc: 'Beyond daily practice, students can enter unlimited revision sessions — perfect for intensive exam preparation. Questions never repeat within 7 days.', color: '#0369A1', bg: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' },
            ].map(f => (
              <div key={f.title} style={{ background: f.bg, borderRadius: 20, padding: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: f.color, marginBottom: 6 }}>{f.title}</div>
                  <div style={{ fontSize: 14, color: '#5F5E5A', lineHeight: 1.7 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW TO USE ── */}
      <section style={{ padding: '80px 0', background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)' }}>
        <div className="lp-wide">
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-block', background: 'rgba(245,158,11,0.2)', color: '#FCD34D', fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 20, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Getting started
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, lineHeight: 1.25, color: '#fff' }}>
              Up and running in 2 minutes
            </h2>
          </div>
          <div className="lp-steps-grid">
            {[
              { step: '1', title: 'Create your parent account', desc: 'Sign up with your email address. No technical knowledge needed.', color: '#F59E0B' },
              { step: '2', title: 'Add your child\'s profile', desc: 'Enter their name, school and PLE year. Choose an avatar. Done.', color: '#34D399' },
              { step: '3', title: 'Start the first session', desc: 'Tap any subject card to begin. The app learns from the very first question.', color: '#818CF8' },
              { step: '4', title: 'Track progress any time', desc: 'The Parent Dashboard shows mastery levels, weak areas and projected grade in real time.', color: '#F472B6' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: s.color, color: '#1E1B4B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, flexShrink: 0 }}>
                  {s.step}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#fff' }}>{s.title}</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUBJECTS ── */}
      <section style={{ padding: '80px 0', background: '#FAFAFA' }}>
        <div className="lp-wide">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-block', background: '#EEF2FF', color: '#4338CA', fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 20, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Curriculum
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, lineHeight: 1.25, color: '#1E1B4B' }}>
              Aligned to the Uganda NCDC P7 syllabus
            </h2>
          </div>
          <div className="lp-subjects-grid">
            {[
              { icon: '🔢', name: 'Mathematics', color: '#D97706', bg: '#FFFBEB', border: '#FCD34D', topics: ['Fractions & Decimals', 'Ratio & Proportion', 'Percentages', 'LCM & HCF', 'Geometry & Area', 'Money & Finance', 'Word Problems', 'Statistics & Data', 'Algebra Basics', 'Long Division', 'Time & Speed', 'Measurement'] },
              { icon: '📖', name: 'English Language', color: '#059669', bg: '#ECFDF5', border: '#6EE7B7', topics: ['Grammar & Tenses', 'Parts of Speech', 'Vocabulary & Idioms', 'Reading Comprehension', 'Punctuation & Spelling', 'Direct & Indirect Speech', 'Sentence Construction', 'Composition Writing', 'Letter Writing', 'Oral Literature'] },
              { icon: '🔬', name: 'Integrated Science', color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD', topics: ['Food Chains & Webs', 'Human Body Systems', 'Living Things', 'Environment & Ecology', 'States of Matter', 'Health & Nutrition', 'Plants & Reproduction', 'Soil & Agriculture', 'Water & Weather', 'Energy & Forces'] },
            ].map(s => (
              <div key={s.name} style={{ background: s.bg, borderRadius: 20, padding: 20, border: `1.5px solid ${s.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>{s.icon}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: s.color }}>{s.name}</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {s.topics.map(t => (
                    <span key={t} style={{ fontSize: 11, background: '#fff', color: s.color, padding: '4px 10px', borderRadius: 20, fontWeight: 600, border: `1px solid ${s.border}` }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ENDORSEMENT ── */}
      <section style={{ padding: '80px 0', background: '#fff' }}>
        <div className="lp-wide">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-block', background: '#EEF2FF', color: '#4338CA', fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 20, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Endorsement
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', border: '2px dashed #C4B5FD', borderRadius: 20, padding: 36, textAlign: 'center', maxWidth: 560, margin: '0 auto 32px' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎓</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#4338CA', marginBottom: 8 }}>Professional Endorsement Coming Soon</div>
            <div style={{ fontSize: 14, color: '#7C3AED', lineHeight: 1.7 }}>
              We are working with leading Ugandan education professionals to review and endorse Get Ready 4 PLE. Their testimonial will appear here shortly.
            </div>
          </div>

          <div style={{ fontSize: 16, fontWeight: 700, color: '#1E1B4B', marginBottom: 20, textAlign: 'center' }}>What parents are saying</div>
          <div className="lp-testimonials-grid">
            {[
              { quote: 'My daughter used to dread maths word problems. After two weeks on the app, she is actually excited to practise. Her teacher noticed the improvement.', name: 'Parent, Kampala', initials: 'NK', color: '#4338CA', bg: '#EEF2FF' },
              { quote: 'The parent dashboard shows me exactly which topics need work. I feel like I am finally involved in my son\'s revision — even though I am not a science expert myself.', name: 'Parent, Wakiso', initials: 'JO', color: '#059669', bg: '#ECFDF5' },
            ].map((t, i) => (
              <div key={i} style={{ background: t.bg, borderRadius: 20, padding: 24, border: `1.5px solid ${t.color}25` }}>
                <div style={{ fontSize: 28, color: t.color, marginBottom: 10, fontWeight: 900 }}>&ldquo;</div>
                <p style={{ fontSize: 14, color: '#5F5E5A', lineHeight: 1.75, marginBottom: 16, fontStyle: 'italic' }}>{t.quote}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff' }}>{t.initials}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{t.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ padding: '80px 0', background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)' }}>
        <div className="lp-wide">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-block', background: 'rgba(217,119,6,0.15)', color: '#D97706', fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 20, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Pricing
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, marginBottom: 8, color: '#1E1B4B' }}>Simple, affordable pricing</h2>
            <p style={{ fontSize: 16, color: '#92400E' }}>Less than the cost of a single exercise book — for unlimited daily access all term.</p>
          </div>

          <div className="lp-pricing-grid" style={{ maxWidth: 800, margin: '0 auto' }}>
            {/* Free tier */}
            <div style={{ background: '#fff', borderRadius: 24, padding: 28, border: '1.5px solid #E5E7EB', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Free Trial</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: '#1E1B4B', marginBottom: 4 }}>3 days <span style={{ fontSize: 16, fontWeight: 400, color: '#9CA3AF' }}>free</span></div>
              <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>Full access — no payment needed to start</div>
              {['All subjects and topics', 'AI Tutor with image upload', 'Mock exams', 'Parent dashboard', 'Adaptive learning'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ color: '#10B981', fontWeight: 700, fontSize: 16 }}>✓</span>
                  <span style={{ fontSize: 14, color: '#6B7280' }}>{f}</span>
                </div>
              ))}
              <Link href="/login" style={{ display: 'block', textAlign: 'center', marginTop: 24, padding: '13px', background: '#F3F4F6', borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#4338CA', textDecoration: 'none' }}>
                Start free trial
              </Link>
            </div>

            {/* Premium tier */}
            <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #4C1D95 100%)', borderRadius: 24, padding: 28, position: 'relative', overflow: 'hidden', boxShadow: '0 8px 40px rgba(76,29,149,0.4)' }}>
              <div style={{ position: 'absolute', right: -30, top: -30, width: 150, height: 150, background: 'rgba(245,158,11,0.15)', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', left: -20, bottom: -20, width: 100, height: 100, background: 'rgba(139,92,246,0.2)', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', top: 16, right: 16, background: '#F59E0B', color: '#1E1B4B', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20 }}>
                BEST VALUE
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Premium</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: '#fff', marginBottom: 4 }}>UGX 8,000 <span style={{ fontSize: 16, fontWeight: 400, opacity: 0.7 }}>/month</span></div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 20 }}>Pay via MTN or Airtel Mobile Money</div>
              {['All free trial features included', 'Unlimited daily practice sessions', 'Full AI Tutor with image upload', 'Complete mock exam library', 'Unlimited revision mode', 'Detailed progress & weak area reports', 'Up to 3 student profiles'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: 16 }}>✓</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>{f}</span>
                </div>
              ))}
              <Link href="/login" style={{ display: 'block', textAlign: 'center', marginTop: 24, padding: '13px', background: '#F59E0B', borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#1E1B4B', textDecoration: 'none' }}>
                Start free trial →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: '80px 0', background: '#fff' }}>
        <div className="lp-wide">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-block', background: '#EEF2FF', color: '#4338CA', fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 20, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              FAQ
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, color: '#1E1B4B' }}>Frequently asked questions</h2>
          </div>
          <div className="lp-faq-grid">
            {[
              { q: 'Does my child need a smartphone?', a: 'Yes — the app works on any Android or iPhone with a browser. No download needed, it runs directly from the web.' },
              { q: 'What if my child has never used an app like this before?', a: 'The app is designed for 11-13 year olds. The interface is colourful, simple and encouraging. Most children are comfortable within minutes.' },
              { q: 'How much time should my child spend on the app each day?', a: 'We recommend 20-40 minutes per day. Short, consistent sessions are far more effective than occasional long sessions.' },
              { q: 'Can I see what my child is studying?', a: 'Yes — the Parent Dashboard shows exactly which subjects and topics they have practised, their accuracy, weak areas and projected PLE grade.' },
              { q: 'Is the content aligned to UNEB and the Uganda curriculum?', a: 'Yes. All questions are written for the P7 PLE syllabus set by UNEB and the NCDC, with authentic Ugandan contexts throughout.' },
              { q: 'What happens after the 3-day free trial?', a: 'You receive a prompt to subscribe at UGX 8,000 per month via Mobile Money. Your child\'s progress and data are always saved.' },
            ].map((faq, i) => (
              <div key={i} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)', paddingBottom: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#1E1B4B' }}>{faq.q}</div>
                <div style={{ fontSize: 14, color: '#5F5E5A', lineHeight: 1.7 }}>{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4C1D95 100%)', padding: '80px 24px', textAlign: 'center', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, background: 'rgba(245,158,11,0.1)', borderRadius: '50%', filter: 'blur(60px)' }} />
        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative' }}>
          <div style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, marginBottom: 16, lineHeight: 1.2 }}>
            Give your child the best chance at PLE success
          </div>
          <p style={{ fontSize: 17, opacity: 0.8, marginBottom: 36, lineHeight: 1.7 }}>
            Join families across Uganda using Get Ready 4 PLE to prepare their children for the most important exam of primary school.
          </p>
          <Link href="/login" style={{
            display: 'inline-block', fontSize: 18, fontWeight: 800,
            color: '#1E1B4B', background: '#F59E0B',
            padding: '18px 44px', borderRadius: 16,
            textDecoration: 'none', boxShadow: '0 8px 30px rgba(245,158,11,0.5)',
            letterSpacing: '0.2px',
          }}>
            Start your 3-day free trial →
          </Link>
          <p style={{ fontSize: 13, opacity: 0.55, marginTop: 16 }}>No credit card · No commitment · Cancel any time</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '32px 40px', background: '#0F0D2E', color: 'rgba(255,255,255,0.6)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🎓</span>
            <div>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Get Ready </span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#F59E0B' }}>4 PLE</span>
            </div>
          </div>
          <p style={{ fontSize: 13 }}>Smart AI tutoring and exam revision for PLE preparation.</p>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link href="/dashboard" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Dashboard</Link>
            <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Sign in</Link>
            <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Create account</Link>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          © 2025 Get Ready 4 PLE. All rights reserved.
        </div>
      </footer>

    </div>
  )
}

